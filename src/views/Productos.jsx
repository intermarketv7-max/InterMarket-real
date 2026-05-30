import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import NotificacionOperacion from '../components/NotificacionOperacion';
import ModalRegistroProducto from '../components/productos/ModalRegistroProducto';
import ModalEdicionProducto from '../components/productos/ModalEdicionProducto';
import ModalEliminacionProducto from '../components/productos/ModalEliminacionProducto';
import ModalDescuentoProducto from '../components/productos/ModalDescuentoProducto';
import TarjetasProductos from '../components/productos/TarjetasProductos';
import TablaProductos from '../components/productos/TablaProductos';  
import CuadroBusquedas from "../components/busquedas/CuadroBusquedas";
import Paginacion from "../components/ordenamiento/Paginacion";
import { useAuth } from '../context/AuthContext';

const Productos = () => {
    const { user } = useAuth();
    // --- ESTADOS DE DATOS ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [idTienda, setIdTienda] = useState(null);
    
    // --- ESTADOS DE MODALES Y UI ---
    const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
    const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
    const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
    const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);
    const [productoAEliminar, setProductoAEliminar] = useState(null);
    const [productoSeleccionadoDescuento, setProductoSeleccionadoDescuento] = useState(null);
    const [productoEditar, setProductoEditar] = useState(null);
    const [toast, setToast] = useState({ mostrar: false, mensaje: '', tipo: '' });
    
    // --- ESTADOS DE BÚSQUEDA Y PAGINACIÓN ---
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const [registrosPorPagina, establecerRegistrosPorPagina] = useState(5);
    const [paginaActual, establecerPaginaActual] = useState(1);
    const [procesandoIA, setProcesandoIA] = useState(false);

    const [nuevoProducto, setNuevoProducto] = useState({
        nombre_producto: '',
        descripcion: '',
        precio_venta: '',
        precio_compra: '',
        categoria_id: '',
        url_imagenes: '',
        id_estado: '2',
        stock: '',
        tallas: [],
        colores: []
    });

    // ================== CARGAR DATOS ==================
    const cargarProductos = async () => {
        try {
            setCargando(true);
            if (!user) return;
            
            // Buscar tienda del perfil
            const { data: perfilData } = await supabase.from('perfiles').select('id_tienda').eq('id_usuario', user.id).maybeSingle();
            const id_tienda_vendedor = perfilData?.id_tienda;
            setIdTienda(id_tienda_vendedor);

            if (!id_tienda_vendedor) {
                setProductos([]);
                setCargando(false);
                return;
            }

            const { data, error } = await supabase
                .from("productos")
                .select(`*, categorias (nombre_categoria)`)
                .eq("id_tienda", id_tienda_vendedor)
                .order("creado_en", { ascending: false });

            if (error) throw error;
            setProductos(data || []);
        } catch (err) {
            console.error("Error:", err.message);
            setToast({ mostrar: true, mensaje: "Error al cargar productos", tipo: "error" });
        } finally {
            setCargando(false);
        }
    };

    const cargarCategorias = async () => {
        try {
            const { data, error } = await supabase
                .from("categorias")
                .select("*")
                .order("nombre_categoria");
            if (error) throw error;
            setCategorias(data || []);
        } catch (err) {
            console.error("Error categorías:", err.message);
        }
    };

    // ================== FILTRADO Y PAGINACIÓN (Lógica Categorías) ==================
    useEffect(() => {
        if (!textoBusqueda.trim()) {
            setProductosFiltrados(productos);
        } else {
            const busqueda = textoBusqueda.toLowerCase().trim();
            const filtrados = productos.filter((p) => {
                const nombreStr = p.nombre_producto ? String(p.nombre_producto).toLowerCase() : "";
                const catStr = p.categorias?.nombre_categoria ? String(p.categorias.nombre_categoria).toLowerCase() : "";
                return nombreStr.includes(busqueda) || catStr.includes(busqueda);
            });
            setProductosFiltrados(filtrados);
        }
    }, [textoBusqueda, productos]);

    useEffect(() => {
        establecerPaginaActual(1);
    }, [textoBusqueda]);

    const productosPaginados = productosFiltrados.slice(
        (paginaActual - 1) * registrosPorPagina,
        paginaActual * registrosPorPagina
    );

    // ================== MANEJADORES CRUD ==================
    const manejarCambioBusqueda = (e) => setTextoBusqueda(e.target.value);

    const manejoCambioInput = (e) => {
        const { name, value } = e.target;
        setNuevoProducto((prev) => ({ ...prev, [name]: value }));
    };

    const manejoCambioInputEdicion = (e) => {
        const { name, value } = e.target;
        setProductoEditar((prev) => ({ ...prev, [name]: value }));
    };

    const parsearNumero = (valor) => Number.parseFloat(String(valor).replace(",", "."));

    // --- SISTEMA AUTOMATIZADO DE SEGURIDAD Y MODERACIÓN (IA) ---
    const analizarSeguridadProducto = async (producto) => {
        try {
            // En un entorno real, aquí se llamaría a una API de OpenAI o Gemini
            // Por ahora, simulamos el análisis siguiendo las reglas del usuario
            const contenido = `${producto.nombre_producto} ${producto.descripcion}`.toLowerCase();
            
            // Reglas de detección (Sustancias, Armas, Fraude, etc.)
            const patronesInfraccion = [
                { cat: 'Drogas', keywords: ['droga', 'dr0ga', 'm0lly', 'marihuana', 'cocaina', 'tusi', 'extasis', 'fentanyl', 'receta medica', 'pastilla azul'] },
                { cat: 'Armas', keywords: ['pistola', 'fusil', 'municion', 'explosivo', 'granada', 'cuchillo mariposa', 'puñal', 'arma blanca'] },
                { cat: 'Fraude', keywords: ['clonada', 'dinero facil', 'hackeo', 'cuentas robadas', 'streaming gratis', 'software malicioso', 'malware'] },
                { cat: 'Contenido Adulto', keywords: ['porno', 'xxx', 'servicios sexuales', 'escort', 'masajes con final'] }
            ];

            let infraccionEncontrada = null;
            for (const p of patronesInfraccion) {
                if (p.keywords.some(k => contenido.includes(p.cat === 'Drogas' ? k.replace('o', '0') : k) || contenido.includes(k))) {
                    infraccionEncontrada = p;
                    break;
                }
            }

            if (infraccionEncontrada) {
                return {
                    aprobado: false,
                    nivel_riesgo: "alto",
                    motivo: `El producto parece estar relacionado con ${infraccionEncontrada.cat}, lo cual viola nuestras políticas de seguridad.`,
                    categoria_infraccion: infraccionEncontrada.cat
                };
            }

            return { aprobado: true, nivel_riesgo: "bajo", motivo: "", categoria_infraccion: "Ninguna" };
        } catch (err) {
            console.error("Error en moderación:", err);
            return { aprobado: true }; // En caso de error de la IA, dejamos pasar por ahora
        }
    };

    const notificarAdminInfraccion = async (vendedor, analisis) => {
        try {
            // 1. Buscar el perfil del admin
            const { data: admins } = await supabase
                .from('usuarios')
                .select('id_usuario')
                .eq('rol', 'admin');
            
            if (!admins || admins.length === 0) return;

            // 2. Crear notificación para los admins
            for (const admin of admins) {
                // Necesitamos el perfil_id del admin para la tabla notificaciones
                const { data: perfilAdmin } = await supabase
                    .from('perfiles')
                    .select('perfil_id')
                    .eq('id_usuario', admin.id_usuario)
                    .single();

                if (perfilAdmin) {
                    await supabase.from('notificaciones').insert([{
                        usuario_id: perfilAdmin.perfil_id,
                        titulo: "⚠️ Alerta de Seguridad: Vendedor Reincidente",
                        mensaje: `El usuario ${user.email} ha intentado publicar un producto prohibido (${analisis.categoria_infraccion}) tras varias advertencias.`,
                        leido: false
                    }]);
                }
            }
        } catch (err) {
            console.error("Error notificando al admin:", err);
        }
    };

    // --- FUNCIÓN DE ANÁLISIS DE CALIDAD GRATUITA (BRILLO) ---
    const analizarCalidadImagen = (archivo) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(archivo);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 100;
                    canvas.height = 100;
                    ctx.drawImage(img, 0, 0, 100, 100);
                    
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    const data = imageData.data;
                    let brilloTotal = 0;
                    let pixelesOscuros = 0;

                    for (let i = 0; i < data.length; i += 4) {
                        const brilloPixel = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        brilloTotal += brilloPixel;
                        if (brilloPixel < 60) pixelesOscuros++;
                    }
                    
                    const promedio = brilloTotal / (data.length / 4);
                    const porcentajeOscuro = (pixelesOscuros / (data.length / 4)) * 100;
                    
                    // Umbral más estricto: promedio bajo O demasiados píxeles oscuros (contraluz)
                    resolve({
                        esOscura: promedio < 65 || porcentajeOscuro > 60,
                        brillo: promedio,
                        porcentajeOscuro
                    });
                };
            };
        });
    };

    const procesarPixelesYFinalizar = (ctx, canvas, width, height, nombreArchivo, resolve) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 25;
        const brightness = 10;
        const factor = (259 * (128 + contrast)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128 + brightness;
            data[i+1] = factor * (data[i+1] - 128) + 128 + brightness;
            data[i+2] = factor * (data[i+2] - 128) + 128 + brightness;
        }
        ctx.putImageData(imageData, 0, 0);

        // Cambiamos a PNG para mantener la transparencia si es necesario, 
        // o JPEG con calidad máxima para imágenes de Google
        const extension = nombreArchivo.split('.').pop().toLowerCase();
        const mimeType = (extension === 'png') ? 'image/png' : 'image/jpeg';

        canvas.toBlob((blob) => {
            // Aseguramos que el nombre de archivo termine en .jpg si lo convertimos para máxima compatibilidad
            const nombreFinal = mimeType === 'image/jpeg' ? nombreArchivo.replace(/\.[^/.]+$/, "") + ".jpg" : nombreArchivo;
            resolve(new File([blob], nombreFinal, { type: mimeType, lastModified: Date.now() }));
        }, mimeType, 1.0);
    };

    

    // Ya no usamos Base64, subiremos directamente el archivo a Supabase Storage
    const subirImagenASupabase = async (archivo, bucketName) => {
        try {
            let archivoAProcesar = archivo;

            // --- INTEGRACIÓN REMOVE.BG (OPCIONAL) ---
            const REMOVE_BG_API_KEY = 'A5oKmc4xcBmtcjtBzAvx7XeN';
            if (REMOVE_BG_API_KEY && REMOVE_BG_API_KEY !== 'TU_API_KEY_AQUI') {
                setProcesandoIA(true);
                try {
                    const formData = new FormData();
                    formData.append('image_file', archivo);
                    formData.append('size', 'auto');

                    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                        method: 'POST',
                        headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
                        body: formData
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        archivoAProcesar = new File([blob], archivo.name, { type: 'image/png' });
                    } else {
                        console.error("Error Remove.bg:", await response.text());
                    }
                } catch (err) {
                    console.error("Error procesando IA:", err);
                } finally {
                    setProcesandoIA(false);
                }
            }

            // --- INTEGRACIÓN DEEPAI (MEJORA DE CALIDAD / SUPER RESOLUTION) ---
            const DEEPAI_API_KEY = 'TU_API_KEY_AQUI';
            if (DEEPAI_API_KEY && DEEPAI_API_KEY !== 'TU_API_KEY_AQUI') {
                setProcesandoIA(true);
                try {
                    const formDataIA = new FormData();
                    formDataIA.append('image', archivoAProcesar);

                    const responseIA = await fetch('https://api.deepai.org/api/torch-srgan', {
                        method: 'POST',
                        headers: { 'api-key': DEEPAI_API_KEY },
                        body: formDataIA
                    });

                    if (responseIA.ok) {
                        const dataIA = await responseIA.json();
                        if (dataIA.output_url) {
                            const imgRes = await fetch(dataIA.output_url);
                            const blob = await imgRes.blob();
                            archivoAProcesar = new File([blob], archivo.name, { type: 'image/jpeg' });
                        }
                    } else {
                        console.error("Error DeepAI:", await responseIA.text());
                    }
                } catch (err) {
                    console.error("Error mejorando calidad:", err);
                } finally {
                    setProcesandoIA(false);
                }
            }

            const fileExt = archivoAProcesar.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, archivoAProcesar);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error("Error subiendo imagen:", error);
            throw new Error("No se pudo subir la imagen al servidor.");
        }
    };

    const manejoCambioArchivo = async (e) => {
        const archivos = Array.from(e.target.files || []);
        if (archivos.length === 0) return;

        // Validaciones de calidad y compatibilidad
        const archivosValidos = [];
        for (const archivo of archivos) {
            // 1. Validar tamaño (Mínimo 1KB para permitir cualquier imagen de la web, Máximo 10MB)
            if (archivo.size < 1024) {
                setToast({ mostrar: true, mensaje: `La imagen "${archivo.name}" es demasiado pequeña o está corrupta.`, tipo: "advertencia" });
                continue;
            }
            if (archivo.size > 10 * 1024 * 1024) {
                setToast({ mostrar: true, mensaje: `La imagen "${archivo.name}" supera el límite de 10MB.`, tipo: "advertencia" });
                continue;
            }
            // 2. Validar tipo (Aceptamos formatos comunes)
            const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
            const extension = archivo.name.split('.').pop().toLowerCase();
            const extensionesValidas = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'jfif', 'pjpeg', 'pjp'];

            if (!tiposPermitidos.includes(archivo.type) && !extensionesValidas.includes(extension)) {
                setToast({ mostrar: true, mensaje: `El archivo "${archivo.name}" no es una imagen compatible.`, tipo: "advertencia" });
                continue;
            }

            // 3. Validar Brillo/Luz (BLOQUEO ESTRICTO)
            const calidad = await analizarCalidadImagen(archivo);
            if (calidad.esOscura) {
                setToast({ 
                    mostrar: true, 
                    mensaje: `La imagen "${archivo.name}" es demasiado oscura o tiene mal contraste. Por favor, usa una foto con mejor iluminación.`, 
                    tipo: "error" 
                });
                continue; // SALTAR ESTA IMAGEN (BLOQUEO)
            }

            archivosValidos.push(archivo);
        }

        if (archivosValidos.length > 0) {
            setNuevoProducto((prev) => ({ ...prev, archivos_imagen: archivosValidos }));
        }
    };

    const manejoCambioArchivoActualizar = async (e) => {
        const archivos = Array.from(e.target.files || []);
        if (archivos.length === 0) return;

        const archivosValidos = [];
        for (const archivo of archivos) {
            if (archivo.size < 1024) continue;
            if (archivo.size > 10 * 1024 * 1024) continue;
            
            const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
            const extension = archivo.name.split('.').pop().toLowerCase();
            const extensionesValidas = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'jfif', 'pjpeg', 'pjp'];
            
            if (tiposPermitidos.includes(archivo.type) || extensionesValidas.includes(extension)) {
                // Validar Brillo también al actualizar (BLOQUEO ESTRICTO)
                const calidad = await analizarCalidadImagen(archivo);
                if (calidad.esOscura) {
                    setToast({ 
                        mostrar: true, 
                        mensaje: `La nueva imagen es demasiado oscura. Por favor, selecciona una foto más clara.`, 
                        tipo: "error" 
                    });
                    continue; // SALTAR ESTA IMAGEN (BLOQUEO)
                }
                archivosValidos.push(archivo);
            }
        }

        if (archivosValidos.length > 0) {
            setProductoEditar((prev) => ({ ...prev, archivos_imagen: archivosValidos }));
        }
    };

    const abrirModalEdicion = (producto) => {
        setProductoEditar({
            ...producto,
            url_imagenes: Array.isArray(producto.imagen_url) ? producto.imagen_url : (producto.imagen_url ? [producto.imagen_url] : []),
            archivos_imagen: null,
            id_estado: producto.id_estado?.toString() || '2'
        });
        setMostrarModalEdicion(true);
    };

    const abrirModalEliminacion = (producto) => {
        setProductoAEliminar(producto);
        setMostrarModalEliminacion(true);
    };

    const abrirModalDescuento = (producto) => {
        setProductoSeleccionadoDescuento(producto);
        setMostrarModalDescuento(true);
    };

    const aplicarDescuento = async (producto, nuevoPrecio) => {
        try {
            const precioActual = Number(producto.precio_venta || 0);
            const precioCompra = Number(producto.precio_compra || 0);

            if (nuevoPrecio >= precioActual) {
                setToast({
                    mostrar: true,
                    mensaje: "El nuevo precio debe ser menor al precio actual.",
                    tipo: "advertencia"
                });
                return false;
            }

            if (nuevoPrecio < precioCompra) {
                setToast({
                    mostrar: true,
                    mensaje: `El precio con descuento no puede ser menor al precio de compra ($${precioCompra.toFixed(2)}).`,
                    tipo: "advertencia"
                });
                return false;
            }

            const precioFinal = Math.round(nuevoPrecio * 100) / 100;
            const precioOriginalExistente = Number(producto.precio_original || 0);
            const precioParaGuardar = precioOriginalExistente > 0 ? precioOriginalExistente : precioActual;

            // 1. Enviar el cambio a Supabase
            const { error } = await supabase
                .from("productos")
                .update({ 
                    precio_venta: precioFinal, 
                    precio_original: precioParaGuardar
                })
                .eq("id_producto", producto.id_producto);

            if (error) {
                console.error("Error al aplicar descuento en BD:", error);
                throw error;
            }

            // 2. Actualizar el estado local
            setProductos((prev) =>
                prev.map((item) =>
                    item.id_producto === producto.id_producto
                        ? {
                            ...item,
                            precio_venta: precioFinal,
                            precio_original: precioParaGuardar
                        }
                        : item
                )
            );

            setToast({
                mostrar: true,
                mensaje: `Descuento aplicado con éxito. Nuevo precio: $${precioFinal.toFixed(2)}`,
                tipo: "exito"
            });
            return true;
        } catch (err) {
            console.error("Error al aplicar descuento:", err.message);
            setToast({ mostrar: true, mensaje: "Error al aplicar descuento.", tipo: "error" });
            return false;
        }
    };

    const agregarProducto = async () => {
        try {
            if (
                !nuevoProducto.nombre_producto.trim() ||
                !nuevoProducto.categoria_id ||
                !nuevoProducto.precio_compra ||
                !nuevoProducto.precio_venta
            ) {
                setToast({ mostrar: true, mensaje: "Debe llenar todos los campos obligatorios.", tipo: "advertencia" });
                return;
            }

            // --- MODERACIÓN DE CONTENIDO (IA) ---
            const analisis = await analizarSeguridadProducto(nuevoProducto);
            if (!analisis.aprobado) {
                // 1. Obtener infracciones actuales del perfil
                const { data: perfil } = await supabase
                    .from('perfiles')
                    .select('infracciones')
                    .eq('id_usuario', user.id)
                    .single();
                
                const nuevasInfracciones = (perfil?.infracciones || 0) + 1;

                // 2. Actualizar infracciones en DB
                await supabase
                    .from('perfiles')
                    .update({ infracciones: nuevasInfracciones })
                    .eq('id_usuario', user.id);

                // 3. Notificar al admin si es reincidente (ej: 2 o más intentos)
                if (nuevasInfracciones >= 2) {
                    await notificarAdminInfraccion(user, analisis);
                }

                setToast({ 
                    mostrar: true, 
                    mensaje: `🚫 Bloqueado por Seguridad: ${analisis.motivo}`, 
                    tipo: "error" 
                });
                return; // Detener la publicación
            }

            const precioCompra = parsearNumero(nuevoProducto.precio_compra);
            const precioVenta = parsearNumero(nuevoProducto.precio_venta);
            const categoriaId = Number.parseInt(nuevoProducto.categoria_id, 10);
            const idEstado = Number.parseInt(nuevoProducto.id_estado || "2", 10);

            if (!Number.isFinite(precioCompra) || !Number.isFinite(precioVenta) || !Number.isInteger(categoriaId)) {
                setToast({ mostrar: true, mensaje: "Precio o categoría inválidos. Verifica los datos.", tipo: "advertencia" });
                return;
            }

            setCargando(true);

            let urlsPublicas = [];
            if (nuevoProducto.archivos_imagen && nuevoProducto.archivos_imagen.length > 0) {
                // Subir cada archivo secuencialmente (o en paralelo con Promise.all)
                for (const archivo of nuevoProducto.archivos_imagen) {
                    const url = await subirImagenASupabase(archivo, 'productos');
                    urlsPublicas.push(url);
                }
            }

            const payload = {
                nombre_producto: nuevoProducto.nombre_producto.trim(),
                descripcion: nuevoProducto.descripcion?.trim() || "",
                precio_venta: precioVenta,
                precio_compra: precioCompra,
                categoria_id: categoriaId,
                id_estado: Number.isInteger(idEstado) ? idEstado : 2,
                imagen_url: urlsPublicas.length > 0 ? urlsPublicas : null,
                id_tienda: idTienda,
                stock: nuevoProducto.stock !== '' ? parseInt(nuevoProducto.stock, 10) : null,
                tallas: nuevoProducto.tallas && nuevoProducto.tallas.length > 0 ? nuevoProducto.tallas : null,
                colores: nuevoProducto.colores && nuevoProducto.colores.length > 0 ? nuevoProducto.colores : null
            };

            const { error } = await supabase.from("productos").insert([payload]);
            if (error) throw error;

            await cargarProductos();
            setMostrarModalRegistro(false);
            setNuevoProducto({
                nombre_producto: "",
                descripcion: "",
                precio_venta: "",
                precio_compra: "",
                categoria_id: "",
                url_imagenes: "",
                archivo_imagen: null,
                id_estado: "2",
                stock: '',
                tallas: [],
                colores: []
            });
            setToast({ mostrar: true, mensaje: "Producto registrado exitosamente.", tipo: "exito" });
        } catch (err) {
            console.error("Error al registrar producto:", err.message);
            setToast({ mostrar: true, mensaje: `Error al registrar producto: ${err.message}`, tipo: "error" });
        } finally {
            setCargando(false);
        }
    };

    const actualizarProducto = async () => {
        if (!productoEditar) return;
        try {
            if (
                !productoEditar.nombre_producto?.trim() ||
                !productoEditar.categoria_id ||
                !productoEditar.precio_compra ||
                !productoEditar.precio_venta
            ) {
                setToast({ mostrar: true, mensaje: "Debe llenar todos los campos obligatorios.", tipo: "advertencia" });
                return;
            }

            // --- MODERACIÓN DE CONTENIDO (IA) ---
            const analisis = await analizarSeguridadProducto(productoEditar);
            if (!analisis.aprobado) {
                const { data: perfil } = await supabase.from('perfiles').select('infracciones').eq('id_usuario', user.id).single();
                const nuevasInfracciones = (perfil?.infracciones || 0) + 1;
                await supabase.from('perfiles').update({ infracciones: nuevasInfracciones }).eq('id_usuario', user.id);
                if (nuevasInfracciones >= 2) await notificarAdminInfraccion(user, analisis);
                
                setToast({ mostrar: true, mensaje: `🚫 Edición Bloqueada: ${analisis.motivo}`, tipo: "error" });
                return;
            }

            setCargando(true);

            let urlsPublicas = productoEditar.url_imagenes || []; 
            if (productoEditar.archivos_imagen && productoEditar.archivos_imagen.length > 0) {
                urlsPublicas = []; // Opción A: Reemplazar por completo
                for (const archivo of productoEditar.archivos_imagen) {
                    const url = await subirImagenASupabase(archivo, 'productos');
                    urlsPublicas.push(url);
                }
            }

            const payload = {
                nombre_producto: productoEditar.nombre_producto.trim(),
                descripcion: productoEditar.descripcion?.trim() || "",
                precio_venta: Number(productoEditar.precio_venta),
                precio_compra: Number(productoEditar.precio_compra),
                categoria_id: Number(productoEditar.categoria_id),
                id_estado: Number(productoEditar.id_estado || 2),
                imagen_url: urlsPublicas.length > 0 ? urlsPublicas : null,
                stock: productoEditar.stock !== '' && productoEditar.stock !== undefined ? parseInt(productoEditar.stock, 10) : null,
                tallas: productoEditar.tallas && productoEditar.tallas.length > 0 ? productoEditar.tallas : null,
                colores: productoEditar.colores && productoEditar.colores.length > 0 ? productoEditar.colores : null
            };

            const { error } = await supabase
                .from("productos")
                .update(payload)
                .eq("id_producto", productoEditar.id_producto);

            if (error) throw error;

            await cargarProductos();
            setMostrarModalEdicion(false);
            setToast({ mostrar: true, mensaje: "Producto actualizado exitosamente.", tipo: "exito" });
        } catch (err) {
            console.error("Error al actualizar producto:", err.message);
            setToast({ mostrar: true, mensaje: "Error al actualizar producto.", tipo: "error" });
        } finally {
            setCargando(false);
        }
    };

    const eliminarProducto = async () => {
        if (!productoAEliminar) return;
        try {
            const { error } = await supabase
                .from("productos")
                .delete()
                .eq("id_producto", productoAEliminar.id_producto);

            if (error) throw error;

            await cargarProductos();
            setMostrarModalEliminacion(false);
            setToast({ mostrar: true, mensaje: "Producto eliminado exitosamente.", tipo: "exito" });
        } catch (err) {
            console.error("Error al eliminar producto:", err.message);
            setToast({ mostrar: true, mensaje: "Error al eliminar producto.", tipo: "error" });
        }
    };

    useEffect(() => {
        cargarProductos();
        cargarCategorias();
    }, []);

    return (
        <Container>

            <Row className="align-items-center mb-3">
                <Col xs={9}>
                    <h3><i className="bi bi-box-seam me-2"></i> Productos</h3>
                </Col>
                <Col xs={3} className="text-end">
                    <Button 
                        onClick={() => setMostrarModalRegistro(true)}
                        disabled={!idTienda}
                        title={!idTienda ? "Debes crear una tienda primero" : ""}
                    >
                        <i className="bi bi-plus-lg"></i> <span className="d-none d-sm-inline">Nuevo</span>
                    </Button>
                </Col>
            </Row>
            <hr />

            {!idTienda && (
                <Alert variant="danger" className="text-center mt-4">
                    <h5><i className="bi bi-exclamation-triangle-fill me-2"></i> ¡Atención!</h5>
                    <p className="mb-0">
                        Para poder agregar productos, primero debes registrar o tener vinculada una <strong>Tienda</strong>. 
                        Ve a la sección "Mis Tiendas" para crear una.
                    </p>
                </Alert>
            )}

            <CuadroBusquedas 
                textoBusqueda={textoBusqueda} 
                manejarCambioBusqueda={manejarCambioBusqueda} 
            />

            {textoBusqueda.trim() !== '' && productosFiltrados.length === 0 && (
                <Alert variant="warning" className="mt-3">
                    No se encontraron productos que coincidan con la búsqueda.
                </Alert>
            )}

           <br/> 

            {/* MODALES */}
            <ModalRegistroProducto
                mostrarModal={mostrarModalRegistro}
                setMostrarModal={setMostrarModalRegistro}
                nuevoProducto={nuevoProducto}
                manejoCambioInput={manejoCambioInput}
                manejoCambioArchivo={manejoCambioArchivo}
                agregarProducto={agregarProducto}
                categorias={categorias}
            />

            <ModalEdicionProducto
                mostrarModalEdicion={mostrarModalEdicion}
                setMostrarModalEdicion={setMostrarModalEdicion}
                productoEditar={productoEditar}
                manejoCambioInputEdicion={manejoCambioInputEdicion}
                manejoCambioArchivoActualizar={manejoCambioArchivoActualizar}
                actualizarProducto={actualizarProducto}
                categorias={categorias}
            />

            <ModalEliminacionProducto
                mostrarModal={mostrarModalEliminacion}
                setMostrarModal={setMostrarModalEliminacion}
                productoAEliminar={productoAEliminar}
                eliminarProducto={eliminarProducto}
            />

            <ModalDescuentoProducto
                mostrarModal={mostrarModalDescuento}
                setMostrarModal={setMostrarModalDescuento}
                productoSeleccionado={productoSeleccionadoDescuento}
                aplicarDescuento={aplicarDescuento}
            />

            <NotificacionOperacion
                mostrar={toast.mostrar}
                mensaje={toast.mensaje}
                tipo={toast.tipo}
                onCerrar={() => setToast({ ...toast, mostrar: false })}
            />

            {procesandoIA && (
                <Alert variant="info" className="text-center mb-3 border-0 shadow-sm rounded-pill py-2">
                    <Spinner animation="grow" size="sm" variant="info" className="me-2" />
                    <span className="small fw-bold">Optimizando imagen con IA (Borrando fondo y mejorando nitidez)...</span>
                </Alert>
            )}

            {cargando ? (
                <div className="text-center my-5">
                    <Spinner animation="border" variant="success" />
                </div>
            ) : (
                <>
                    {/* VISTA RESPONSIVE: LOGICA DE CATEGORIAS */}
                    
                    {/* Vista Móvil (Tarjetas): Se oculta en pantallas grandes (lg) */}
                    <div className="d-lg-none">
                        <TarjetasProductos
                            productos={productosPaginados}
                            abrirModalEdicion={abrirModalEdicion}
                            abrirModalEliminacion={abrirModalEliminacion}
                            abrirModalDescuento={abrirModalDescuento}
                        />
                    </div>

                    {/* Vista Escritorio (Tabla): Solo se muestra en pantallas grandes (lg) */}
                    <div className="d-none d-lg-block">
                        <TablaProductos
                            productos={productosPaginados}
                            abrirModalEdicion={abrirModalEdicion}
                            abrirModalEliminacion={abrirModalEliminacion}
                            abrirModalDescuento={abrirModalDescuento}
                        />
                    </div>

                    {productos.length === 0 && <p className="text-center">No hay productos registrados.</p>}
                </>
            )}

            <Paginacion
                registrosPorPagina={registrosPorPagina}
                totalRegistros={productosFiltrados.length}
                paginaActual={paginaActual}
                establecerPaginaActual={establecerPaginaActual}
                establecerRegistrosPorPagina={establecerRegistrosPorPagina}
            />
        </Container>
    );
};

export default Productos;