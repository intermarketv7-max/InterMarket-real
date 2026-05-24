import React, { useState } from 'react';
import { Modal, Button, Row, Col, Badge, Spinner, Form } from 'react-bootstrap';
import { supabase } from '../../database/supabaseconfig';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { enviarNotificacionPorCorreo } from '../../services/emailService';

const CarritoModal = ({ mostrar, setMostrar, carrito, setCarrito, total, onCompraExitosa }) => {
    const { user, session } = useAuth();
    const navegar = useNavigate();
    const [procesando, setProcesando] = useState(false);
    const [direcciones, setDirecciones] = useState([]);
    const [idDireccionSel, setIdDireccionSel] = useState("");
    const [cargandoDirecciones, setCargandoDirecciones] = useState(false);

    React.useEffect(() => {
        if (mostrar && user) {
            cargarDirecciones();
        }
    }, [mostrar, user]);

    const cargarDirecciones = async () => {
        setCargandoDirecciones(true);
        try {
            const { data } = await supabase
                .from("direcciones")
                .select("*")
                .eq("id_usuario", user.id)
                .order("creado_en", { ascending: false });
            
            setDirecciones(data || []);
            if (data && data.length > 0) {
                setIdDireccionSel(data[0].id_direccion);
            }
        } catch (err) {
            console.error("Error cargando direcciones:", err);
        } finally {
            setCargandoDirecciones(false);
        }
    };

    const actualizarCantidad = (itemCarrito, nuevaCantidad, stockDisponible) => {
        if (nuevaCantidad < 1) return;
        if (stockDisponible !== undefined && nuevaCantidad > stockDisponible) {
            alert(`Solo hay ${stockDisponible} unidades disponibles.`);
            return;
        }
        const nuevoCarrito = carrito.map(item =>
            (item.id_producto === itemCarrito.id_producto && 
             item.talla_seleccionada === itemCarrito.talla_seleccionada && 
             item.color_seleccionado === itemCarrito.color_seleccionado)
                ? { ...item, cantidad: nuevaCantidad }
                : item
        );
        setCarrito(nuevoCarrito);
        localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
        window.dispatchEvent(new Event('carritoActualizado'));
    };

    const eliminarDelCarrito = (itemCarrito) => {
        const nuevoCarrito = carrito.filter(item => 
            !(item.id_producto === itemCarrito.id_producto && 
              item.talla_seleccionada === itemCarrito.talla_seleccionada && 
              item.color_seleccionado === itemCarrito.color_seleccionado)
        );
        setCarrito(nuevoCarrito);
        localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
        window.dispatchEvent(new Event('carritoActualizado'));
    };

    const vaciarCarrito = () => {
        setCarrito([]);
        localStorage.removeItem('carrito');
        window.dispatchEvent(new Event('carritoActualizado'));
    };

    const asegurarArray = (valor) => {
        if (!valor) return [];
        if (Array.isArray(valor)) return valor;
        if (typeof valor === 'string') {
            if (valor.startsWith('{') && valor.endsWith('}')) {
                return valor.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
            }
            return valor.split(',').map(s => s.trim()).filter(s => s !== '');
        }
        return [];
    };

    const cambiarVariante = (itemOriginal, campo, nuevoValor) => {
        const itemActualizado = { ...itemOriginal, [campo]: nuevoValor };
        
        // Buscar si ya existe otro item con las mismas características después del cambio
        const indiceDuplicado = carrito.findIndex(item => 
            item !== itemOriginal &&
            item.id_producto === itemActualizado.id_producto &&
            (campo === 'talla_seleccionada' ? nuevoValor : item.talla_seleccionada) === item.talla_seleccionada &&
            (campo === 'color_seleccionado' ? nuevoValor : item.color_seleccionado) === item.color_seleccionado
        );

        let nuevoCarrito;
        if (indiceDuplicado !== -1) {
            // Si hay duplicado, fusionar cantidades y eliminar el original
            nuevoCarrito = carrito.filter(item => item !== itemOriginal);
            nuevoCarrito[indiceDuplicado] = {
                ...nuevoCarrito[indiceDuplicado],
                cantidad: nuevoCarrito[indiceDuplicado].cantidad + itemOriginal.cantidad
            };
        } else {
            // Si no hay duplicado, solo actualizar el item
            nuevoCarrito = carrito.map(item => 
                item === itemOriginal ? itemActualizado : item
            );
        }

        setCarrito(nuevoCarrito);
        localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
        window.dispatchEvent(new Event('carritoActualizado'));
    };

    const validarVariantes = () => {
        for (const item of carrito) {
            const tieneTallas = Array.isArray(item.tallas) && item.tallas.length > 0;
            const tieneColores = Array.isArray(item.colores) && item.colores.length > 0;

            if (tieneTallas && !item.talla_seleccionada) {
                alert(`Por favor, selecciona una talla para ${item.nombre_producto}`);
                return false;
            }
            if (tieneColores && !item.color_seleccionado) {
                alert(`Por favor, selecciona un color para ${item.nombre_producto}`);
                return false;
            }
        }
        return true;
    };

    const realizarCompra = async () => {
        if (!user) {
            alert("Debes iniciar sesión como comprador para realizar una compra.");
            return;
        }

        if (!validarVariantes()) return;

        if (!idDireccionSel) {
            alert("Por favor, selecciona una dirección de entrega.");
            return;
        }
        
        try {
            setProcesando(true);
            
            // Llamar a la Netlify Function
            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
                },
                body: JSON.stringify({ 
                    carrito, 
                    id_direccion: idDireccionSel 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al procesar la compra');
            }

            const data = await response.json();
            
            if (data?.url) {
                // Save cart temporarily so we can process it after redirect
                localStorage.setItem('carritoPendiente', JSON.stringify(carrito));
                localStorage.setItem('totalPendiente', total.toString());
                localStorage.setItem('direccionPendiente', idDireccionSel);
                
                // Redirect to Stripe
                window.location.href = data.url;
            } else {
                throw new Error("No se obtuvo la URL de pago.");
            }
            
        } catch (err) {
            console.error("Error al procesar compra:", err);
            // Mostrar mensaje más descriptivo si es posible
            const mensajeError = err.message.includes('Invalid URL') 
                ? "Error de URL: Posiblemente una imagen de producto es demasiado grande o inválida para Stripe."
                : `Ocurrió un error al procesar tu compra: ${err.message}`;
            alert(mensajeError);
        } finally {
            setProcesando(false);
        }
    };

    const simularCompra = async () => {
        if (!user) {
            alert("Debes iniciar sesión para simular una compra.");
            return;
        }

        if (!validarVariantes()) return;

        if (!idDireccionSel) {
            alert("Por favor, selecciona una dirección de entrega.");
            return;
        }

        try {
            setProcesando(true);
            const idOperacion = Date.now().toString(); // ID único para esta operación
            const response = await fetch('/.netlify/functions/simular-pago', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
                },
                body: JSON.stringify({ 
                    carrito, 
                    total, 
                    id_operacion: idOperacion,
                    id_direccion: idDireccionSel
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en la simulación');
            }

            const data = await response.json();
            if (data.success) {
                alert('¡Pago Simulado Exitosamente! La venta ha sido registrada.');
                setCarrito([]);
                localStorage.removeItem('carrito');
                window.dispatchEvent(new Event('carritoActualizado'));
                setMostrar(false);
            }
        } catch (err) {
            console.error("Error en simulación:", err);
            alert("Error al simular el pago: " + err.message);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <Modal 
            show={mostrar} 
            onHide={() => setMostrar(false)} 
            size="lg" 
            centered 
            className="carrito-moderno"
            contentClassName="border-0 shadow-lg rounded-4"
        >
            <Modal.Header closeButton className="border-0 pb-0 pt-4 px-4">
                <Modal.Title className="fw-bold d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
                        <i className="bi bi-cart-fill text-primary"></i>
                    </div>
                    <span>Mi Carrito</span>
                    <Badge bg="primary" className="ms-3 rounded-pill small fw-normal" style={{ fontSize: '0.75rem' }}>
                        {carrito.length} {carrito.length === 1 ? 'producto' : 'productos'}
                    </Badge>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 pt-4 pb-0">
                {carrito.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '100px', height: '100px' }}>
                            <i className="bi bi-cart-x display-4 text-muted"></i>
                        </div>
                        <h4 className="fw-bold text-dark">Tu carrito está vacío</h4>
                        <p className="text-muted">¡Agrega algunos productos para comenzar!</p>
                        <Button variant="primary" className="rounded-pill px-4 mt-2" onClick={() => setMostrar(false)}>
                            Explorar catálogo
                        </Button>
                    </div>
                ) : (
                    <div className="carrito-items-container pe-2" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                        {carrito.map((item) => (
                            <div key={item.id_producto} className="carrito-item-card mb-3 p-3 bg-white border rounded-4 shadow-sm hover-shadow transition">
                                <Row className="align-items-center g-3">
                                    <Col xs={3} md={2}>
                                        <div className="position-relative">
                                            {item.imagen_url && item.imagen_url.length > 0 ? (
                                                <img 
                                                    src={item.imagen_url[0]} 
                                                    alt={item.nombre_producto}
                                                    className="rounded-3 shadow-sm img-fluid"
                                                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div className="bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '100%', aspectRatio: '1/1' }}>
                                                    <i className="bi bi-image text-muted fs-3"></i>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                    <Col xs={9} md={5}>
                                        <h6 className="fw-bold mb-1 text-truncate">{item.nombre_producto}</h6>
                                        
                                        {/* Selectores de Talla y Color en el Carrito */}
                                        <div className="d-flex flex-wrap gap-2 mb-2">
                                            {asegurarArray(item.tallas).length > 0 && (
                                                <div style={{ minWidth: '100px' }}>
                                                    <Form.Select 
                                                        size="sm" 
                                                        className="rounded-3 py-0 px-2 small bg-light border-0"
                                                        value={item.talla_seleccionada || ""}
                                                        onChange={(e) => cambiarVariante(item, 'talla_seleccionada', e.target.value)}
                                                        style={{ fontSize: '0.75rem', height: '26px' }}
                                                    >
                                                        <option value="" disabled>Talla...</option>
                                                        {asegurarArray(item.tallas).map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </Form.Select>
                                                </div>
                                            )}
                                            
                                            {asegurarArray(item.colores).length > 0 && (
                                                <div style={{ minWidth: '100px' }}>
                                                    <Form.Select 
                                                        size="sm" 
                                                        className="rounded-3 py-0 px-2 small bg-light border-0"
                                                        value={item.color_seleccionado || ""}
                                                        onChange={(e) => cambiarVariante(item, 'color_seleccionado', e.target.value)}
                                                        style={{ fontSize: '0.75rem', height: '26px' }}
                                                    >
                                                        <option value="" disabled>Color...</option>
                                                        {asegurarArray(item.colores).map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </Form.Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <span className="text-primary fw-bold">C${parseFloat(item.precio_venta).toFixed(2)}</span>
                                            {item.stock !== undefined && item.stock !== null && (
                                                <Badge bg={item.stock <= 3 ? 'danger' : 'success'} className="bg-opacity-10 text-dark border-0 rounded-pill small py-1" style={{ fontSize: '0.65rem' }}>
                                                    <i className={`bi bi-box-seam me-1 ${item.stock <= 3 ? 'text-danger' : 'text-success'}`}></i>
                                                    {item.stock === 0 ? 'Sin stock' : `${item.stock} disp.`}
                                                </Badge>
                                            )}
                                        </div>
                                    </Col>
                                    <Col xs={12} md={5} className="d-flex align-items-center justify-content-between justify-content-md-end gap-3 mt-2 mt-md-0">
                                        <div className="input-group input-group-sm bg-light rounded-pill p-1" style={{ width: 'fit-content' }}>
                                            <Button 
                                                variant="white" 
                                                className="border-0 rounded-circle d-flex align-items-center justify-content-center p-0"
                                                style={{ width: '28px', height: '28px' }}
                                                onClick={() => actualizarCantidad(item, item.cantidad - 1, item.stock)}
                                            >
                                                <i className="bi bi-dash"></i>
                                            </Button>
                                            <span className="px-3 d-flex align-items-center fw-bold" style={{ minWidth: '40px', justifyContent: 'center' }}>{item.cantidad}</span>
                                            <Button 
                                                variant="white" 
                                                className="border-0 rounded-circle d-flex align-items-center justify-content-center p-0"
                                                style={{ width: '28px', height: '28px' }}
                                                onClick={() => actualizarCantidad(item, item.cantidad + 1, item.stock)}
                                                disabled={item.stock !== undefined && item.stock !== null && item.cantidad >= item.stock}
                                            >
                                                <i className="bi bi-plus"></i>
                                            </Button>
                                        </div>
                                        
                                        <div className="text-end d-flex align-items-center gap-3">
                                            <div className="fw-bold text-dark">
                                                C${(parseFloat(item.precio_venta) * item.cantidad).toFixed(2)}
                                            </div>
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm"
                                                className="border-0 rounded-circle d-flex align-items-center justify-content-center"
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => eliminarDelCarrito(item)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>

            {carrito.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-light rounded-4 p-4 mt-3">
                        <Row className="mb-4">
                            <Col xs={12} lg={6}>
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                                    <h6 className="fw-bold mb-0">Dirección de Entrega</h6>
                                </div>
                                
                                {direcciones.length === 0 ? (
                                    <div className="alert alert-warning border-0 shadow-sm rounded-3 py-2 px-3 small d-flex justify-content-between align-items-center mb-0">
                                        <span className="me-2"><i className="bi bi-exclamation-circle me-1"></i>No tienes direcciones.</span>
                                        <Button size="sm" variant="warning" className="rounded-pill text-white fw-bold py-1" onClick={() => { setMostrar(false); navegar("/perfil"); }}>
                                            Configurar
                                        </Button>
                                    </div>
                                ) : (
                                    <Form.Select 
                                        className="rounded-3 border-0 shadow-sm py-2 px-3"
                                        value={idDireccionSel}
                                        onChange={(e) => setIdDireccionSel(e.target.value)}
                                        disabled={procesando}
                                    >
                                        {direcciones.map(dir => (
                                            <option key={dir.id_direccion} value={dir.id_direccion}>
                                                {dir.nombre_calle} ({dir.nombre})
                                            </option>
                                        ))}
                                    </Form.Select>
                                )}
                            </Col>
                            <Col xs={12} lg={6} className="mt-4 mt-lg-0 d-flex flex-column justify-content-center">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Subtotal:</span>
                                    <span className="fw-bold">C${total.toFixed(2)}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Envío:</span>
                                    <span className="text-success fw-bold small text-uppercase">Gratis</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary border-opacity-10">
                                    <span className="h5 fw-bold mb-0">Total:</span>
                                    <span className="h4 fw-bold text-primary mb-0">
                                        C${total.toFixed(2)}
                                    </span>
                                </div>
                            </Col>
                        </Row>

                        <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-lg-end">
                            <Button 
                                variant="outline-secondary" 
                                className="rounded-pill px-4 border-0" 
                                onClick={vaciarCarrito} 
                                disabled={procesando}
                            >
                                <i className="bi bi-trash me-2"></i>Vaciar
                            </Button>
                            
                            <Button 
                                variant="primary" 
                                className="rounded-pill px-5 py-2 fw-bold shadow-sm" 
                                onClick={realizarCompra} 
                                disabled={procesando}
                            >
                                {procesando ? (
                                    <><Spinner as="span" animation="border" size="sm" className="me-2" />Procesando...</>
                                ) : (
                                    <><i className="bi bi-credit-card-fill me-2"></i>Pagar Ahora</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="text-center pb-4 pt-2">
                <Button variant="link" className="text-muted text-decoration-none small" onClick={() => setMostrar(false)}>
                    Seguir explorando productos
                </Button>
            </div>
        </Modal>
    );
};

export default CarritoModal;