import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_API_KEY;

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
        const { carrito, total, id_operacion, id_direccion } = JSON.parse(event.body || '{}');

        if (!carrito || !total || !id_operacion) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Faltan datos requeridos (carrito, total, id_operacion).' }),
            };
        }

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
        const nombreComprador = perfilData.usuarios?.username || 'Comprador (Simulado)';

        // 4. Verificar si ya se procesó (IDEMPOTENCIA)
        const stripeIntentId = 'simulado_' + id_operacion;
        const { data: ventaExistente } = await supabase
            .from('ventas')
            .select('venta_id')
            .eq('id_stripe_intent', stripeIntentId)
            .maybeSingle();

        if (ventaExistente) {
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
                id_estado: 2, // 2 = Pagado (Simulado)
                id_stripe_intent: stripeIntentId,
                id_direccion: id_direccion,
                nombre_categoria: categoriaPrincipal
            })
            .select()
            .single();

        if (ventaError) {
            // Manejar carrera (race condition)
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
            id_estado: 1, // Pendiente
            precio_unitario: item.precio_venta,
            cantidad: item.cantidad || 1
        }));

        const { error: pedidosError } = await supabase.from('pedidos').insert(pedidos);
        if (pedidosError) throw pedidosError;

        // 6.1. Reducir Stock de los productos
        for (const item of carrito) {
            try {
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
                    
                    console.log(`[Stock-Simulado] Actualizado producto ${item.id_producto}: ${currentProduct.stock} -> ${nuevoStock}`);
                }
            } catch (stockErr) {
                console.error(`[Stock-Simulado] Error al actualizar stock del producto ${item.id_producto}:`, stockErr);
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
                    titulo: '¡Nueva venta (Simulada)!',
                    mensaje: `${nombreComprador} ha realizado una compra de prueba.`
                }]);
            }
        }

        // 8. Guardar Método de Pago Simulado
        try {
            await supabase.from('metodos_pago').insert({
                id_usuario: userId,
                id_stripe_customer: 'cus_simulado',
                id_stripe_payment_method: 'pm_simulado_' + id_operacion,
                ultimo4: '0000',
                tipo_metodo: 'visa_simulada',
            });
        } catch (err) {
            console.warn('Error al guardar método simulado:', err.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, venta_id: venta.venta_id }),
        };

    } catch (error) {
        console.error('Error en simular-pago:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
