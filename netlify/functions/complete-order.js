import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_API_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'ok' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { session_id, carrito, total, id_direccion } = JSON.parse(event.body || '{}');

        if (!session_id || !carrito || !total) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Faltan datos requeridos (session_id, carrito, total).' }),
            };
        }

        // 1. Obtener el token del usuario para actuar en su nombre (respeta RLS)
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };
        }

        const token = authHeader.split(' ')[1];
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        const { data: authUserData, error: authUserError } = await supabase.auth.getUser(token);
        if (authUserError || !authUserData?.user) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Usuario no válido' }) };
        }

        const userId = authUserData.user.id;

        // 2. Verificar la sesión en Stripe (Expandir para obtener el método de pago)
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['payment_intent.payment_method'],
        });
        
        if (!session || session.payment_status !== 'paid') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'El pago no ha sido completado en Stripe.' }),
            };
        }

        // 3. Obtener el perfil del comprador
        const { data: perfilData, error: perfilError } = await supabase
            .from('perfiles')
            .select('perfil_id, usuarios(username)')
            .eq('id_usuario', userId)
            .maybeSingle();

        if (perfilError || !perfilData) {
            throw new Error("No se pudo encontrar el perfil del usuario.");
        }

        const perfilId = perfilData.perfil_id;
        const nombreComprador = perfilData.usuarios?.username || 'Un comprador';

        // 4. Verificar si la venta ya existe (IDEMPOTENCIA)
        const stripeIntentId = session.payment_intent;
        const { data: ventaExistente } = await supabase
            .from('ventas')
            .select('venta_id')
            .eq('id_stripe_intent', stripeIntentId)
            .maybeSingle();

        if (ventaExistente) {
            console.log(`[Idempotencia] Venta ya procesada para el intent: ${stripeIntentId}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, venta_id: ventaExistente.venta_id, duplicado: true }),
            };
        }

            // 4.1 Extraer la categoría principal para la venta (del primer item)
        const categoriaPrincipal = carrito.length > 0 ? (carrito[0].categorias?.nombre_categoria || null) : null;

        // 5. Crear la Venta en Supabase
        let venta;
        const { data: nuevaVenta, error: ventaError } = await supabase
            .from('ventas')
            .insert({
                id_usuario: userId,
                monto_total: total,
                id_estado: 2, 
                id_stripe_intent: stripeIntentId,
                id_direccion: id_direccion,
                nombre_categoria: categoriaPrincipal
            })
            .select()
            .single();

        if (ventaError) {
            // Si hubo un error de "Duplicate Key" (código 23505), significa que otra instancia ganó la carrera
            if (ventaError.code === '23505') {
                const { data: reVenta } = await supabase
                    .from('ventas')
                    .select('venta_id')
                    .eq('id_stripe_intent', stripeIntentId)
                    .single();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, venta_id: reVenta.venta_id, duplicado: true }),
                };
            }
            throw ventaError;
        }
        venta = nuevaVenta;

        // 6. Crear los Pedidos (Items)
        const pedidos = carrito.map(item => ({
            perfil_id: perfilId,
            venta_id: venta.venta_id,
            id_producto: item.id_producto,
            id_tienda: item.id_tienda, 
            nombre_categoria: item.categorias?.nombre_categoria || null, // Guardar el nombre de la categoría
            id_estado: 1, 
            precio_unitario: item.precio_venta,
            cantidad: item.cantidad || 1,
            talla_seleccionada: item.talla_seleccionada || null,
            color_seleccionado: item.color_seleccionado || null
        }));

        console.log("Payload a insertar en pedidos:", JSON.stringify(pedidos, null, 2));
        const { error: pedidosError } = await supabase.from('pedidos').insert(pedidos);
        if (pedidosError) throw pedidosError;

        // 6.1. Reducir Stock de los productos
        for (const item of carrito) {
            try {
                // Usamos rpc para restar el stock de forma atómica si es posible, 
                // o una actualización directa si confiamos en la lógica secuencial
                const { data: currentProduct } = await supabase
                    .from('productos')
                    .select('stock')
                    .eq('id_producto', item.id_producto)
                    .single();

                if (currentProduct && currentProduct.stock !== null) {
                    const nuevoStock = Math.max(0, currentProduct.stock - (item.cantidad || 1));
                    await supabase
                        .from('productos')
                        .update({ stock: nuevoStock })
                        .eq('id_producto', item.id_producto);
                    
                    console.log(`[Stock] Actualizado producto ${item.id_producto}: ${currentProduct.stock} -> ${nuevoStock}`);
                }
            } catch (stockErr) {
                console.error(`[Stock] Error al actualizar stock del producto ${item.id_producto}:`, stockErr);
                // No lanzamos error para no romper la finalización del pedido si falla el stock
            }
        }

        // 7. Notificaciones a los vendedores
        const tiendasIds = [...new Set(carrito.map(item => item.id_tienda).filter(Boolean))];
        for (const idTienda of tiendasIds) {
            const { data: vendedorData } = await supabase
                .from('perfiles')
                .select('perfil_id')
                .eq('id_tienda', idTienda)
                .maybeSingle();

            if (vendedorData) {
                await supabase.from('notificaciones').insert([{
                    usuario_id: vendedorData.perfil_id,
                    titulo: '¡Nueva venta realizada!',
                    mensaje: `${nombreComprador} ha comprado productos de tu tienda. Pago confirmado vía Stripe.`
                }]);
            }
        }

        // 8. Guardar el Método de Pago (Si es nuevo y no es simulado)
        try {
            const paymentIntent = session.payment_intent;
            const paymentMethod = paymentIntent?.payment_method;

            if (paymentMethod && paymentMethod.id) {
                // Verificar si ya existe para este usuario
                const { data: existingMethod } = await supabase
                    .from('metodos_pago')
                    .select('id_metodo_pago')
                    .eq('id_usuario', userId)
                    .eq('id_stripe_payment_method', paymentMethod.id)
                    .maybeSingle();

                if (!existingMethod) {
                    const cardDetails = paymentMethod.card || {};
                    await supabase.from('metodos_pago').insert({
                        id_usuario: userId,
                        id_stripe_customer: session.customer,
                        id_stripe_payment_method: paymentMethod.id,
                        ultimo4: cardDetails.last4 || null,
                        tipo_metodo: paymentMethod.type || 'card',
                    });
                    console.log(`[MetodoPago] Guardado con éxito: ${paymentMethod.id}`);
                }
            }
        } catch (err) {
            console.warn('Error no crítico al guardar método de pago:', err.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, venta_id: venta.venta_id }),
        };

    } catch (error) {
        console.error('Error en complete-order:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
