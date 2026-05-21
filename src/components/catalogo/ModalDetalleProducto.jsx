import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Badge, Form, Spinner, Card, Carousel } from 'react-bootstrap';
import { supabase } from '../../database/supabaseconfig';
import { useAuth } from '../../context/AuthContext';
import ModalTienda from './ModalTienda';

const ModalDetalleProducto = ({ mostrar, setMostrar, producto, agregarAlCarrito }) => {
    const { user } = useAuth();
    const [tienda, setTienda] = useState(null);
    const [vendedor, setVendedor] = useState(null);
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [mostrarModalTienda, setMostrarModalTienda] = useState(false);
    const [esMiProducto, setEsMiProducto] = useState(false);

    const [resenas, setResenas] = useState([]);
    const [calificacionesTienda, setCalificacionesTienda] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [comprado, setComprado] = useState(false);

    const [nuevaResena, setNuevaResena] = useState({ calificacion: 5, comentario: '' });
    const [nuevaCalificacionTienda, setNuevaCalificacionTienda] = useState({ puntuacion: 5, comentario: '' });

    useEffect(() => {
        if (mostrar && producto) {
            cargarDetalles();
        }
    }, [mostrar, producto]);

    const cargarDetalles = async () => {
        setCargando(true);
        try {
            if (producto.id_tienda) {
                const { data: tiendaData } = await supabase
                    .from('tiendas')
                    .select('*')
                    .eq('id_tienda', producto.id_tienda)
                    .single();
                setTienda(tiendaData);

                const { data: perfilData } = await supabase
                    .from('perfiles')
                    .select('*, usuarios(username)')
                    .eq('id_tienda', producto.id_tienda)
                    .single();
                setVendedor(perfilData);

                const { data: califTienda } = await supabase
                    .from('calificaciones_tiendas')
                    .select('*, perfiles(usuarios(username))')
                    .eq('tienda_id', producto.id_tienda)
                    .order('creado_en', { ascending: false });
                setCalificacionesTienda(califTienda || []);
            }

            const { data: resenasData } = await supabase
                .from('reseñas_productos')
                .select('*, perfiles(usuarios(username))')
                .eq('producto_id', producto.id_producto)
                .order('creado_en', { ascending: false });
            setResenas(resenasData || []);

            if (user) {
                const { data: miPerfil } = await supabase
                    .from('perfiles')
                    .select('perfil_id, id_tienda')
                    .eq('id_usuario', user.id)
                    .single();
                setPerfilUsuario(miPerfil);

                setEsMiProducto(!!(miPerfil && miPerfil.id_tienda === producto.id_tienda));

                if (miPerfil) {
                    const { data: pedidos } = await supabase
                        .from('pedidos')
                        .select('id_pedido')
                        .eq('perfil_id', miPerfil.perfil_id)
                        .eq('id_producto', producto.id_producto)
                        .gte('id_estado', 2);
                    setComprado(pedidos && pedidos.length > 0);
                }
            }
        } catch (error) {
            console.error('Error al cargar detalles:', error);
        } finally {
            setCargando(false);
        }
    };

    const enviarResenaProducto = async (e) => {
        e.preventDefault();
        if (!nuevaResena.comentario.trim()) return;
        
        if (!perfilUsuario?.perfil_id) {
            alert('No se pudo identificar tu perfil de usuario. Intenta recargar la página.');
            return;
        }

        try {
            const { error } = await supabase.from('reseñas_productos').insert([{
                producto_id: producto.id_producto,
                comprador_id: perfilUsuario.perfil_id,
                calificacion: nuevaResena.calificacion,
                comentario: nuevaResena.comentario
            }]);
            
            if (error) {
                if (error.code === '23505') {
                    alert('Ya has dejado una reseña para este producto.');
                } else {
                    throw error;
                }
                return;
            }

            setNuevaResena({ calificacion: 5, comentario: '' });
            cargarDetalles();
        } catch (error) {
            console.error('Error al enviar reseña:', error);
            alert('Error al enviar la reseña: ' + (error.message || 'Error desconocido'));
        }
    };

    const enviarCalificacionTienda = async (e) => {
        e.preventDefault();
        if (!nuevaCalificacionTienda.comentario.trim()) return;
        try {
            const { error } = await supabase.from('calificaciones_tiendas').insert([{
                tienda_id: producto.id_tienda,
                comprador_id: perfilUsuario.perfil_id,
                puntuacion: nuevaCalificacionTienda.puntuacion,
                comentario: nuevaCalificacionTienda.comentario
            }]);
            if (error) throw error;
            setNuevaCalificacionTienda({ puntuacion: 5, comentario: '' });
            cargarDetalles();
        } catch (error) {
            console.error('Error al enviar calificación:', error);
            alert('No se pudo calificar. Solo puedes calificar a la tienda una vez.');
        }
    };

    const Estrellas = ({ valor }) => (
        <span className="text-warning">
            {[1, 2, 3, 4, 5].map((s) => (
                <i key={s} className={`bi bi-star${s <= valor ? '-fill' : ''}`}></i>
            ))}
        </span>
    );

    const EstrellasInteractivas = ({ valor, setValor }) => {
        const [hover, setHover] = useState(0);
        return (
            <div className="mb-2" style={{ cursor: 'pointer', fontSize: '1.5rem' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <i
                        key={s}
                        className={`bi bi-star${s <= (hover || valor) ? '-fill' : ''} text-warning me-1`}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setValor(s)}
                    ></i>
                ))}
            </div>
        );
    };

    const PromedioEstrellas = ({ datos, campo }) => {
        if (!datos || datos.length === 0) return <span className="text-muted small">Sin calificaciones</span>;
        const promedio = Math.round(datos.reduce((a, c) => a + c[campo], 0) / datos.length);
        return <Estrellas valor={promedio} />;
    };

    if (!producto) return null;

    return (
        <>
            <Modal show={mostrar} onHide={() => setMostrar(false)} size="lg" centered>
                <Modal.Header
                    closeButton
                    className="border-0"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-primario) 0%, #1a7a8a 100%)',
                        padding: '0.65rem 1.25rem',
                    }}
                >
                    <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                        <i className="bi bi-bag-heart"></i>
                        Detalles del Producto
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    {cargando ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Row>
                            {/* COLUMNA IZQUIERDA */}
                            <Col md={5}>
                                {/* Imagen del producto */}
                                <div
                                    className="mb-4 text-center rounded overflow-hidden shadow-sm"
                                    style={{ height: '250px', backgroundColor: '#f8f9fa' }}
                                >
                                    {producto.imagen_url && producto.imagen_url.length > 1 ? (
                                        <Carousel 
                                            variant="dark" 
                                            style={{ height: '100%' }}
                                            interval={3000}
                                            pause="hover"
                                        >
                                            {producto.imagen_url.map((url, idx) => (
                                                <Carousel.Item key={idx} style={{ height: '250px' }}>
                                                    <img
                                                        src={url}
                                                        alt={`${producto.nombre_producto} ${idx + 1}`}
                                                        className="d-block w-100 h-100"
                                                        style={{ objectFit: 'contain' }}
                                                    />
                                                </Carousel.Item>
                                            ))}
                                        </Carousel>
                                    ) : producto.imagen_url && producto.imagen_url.length === 1 ? (
                                        <img
                                            src={producto.imagen_url[0]}
                                            alt={producto.nombre_producto}
                                            className="img-fluid h-100"
                                            style={{ objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <i
                                            className="bi bi-image text-muted d-flex justify-content-center align-items-center h-100"
                                            style={{ fontSize: '4rem' }}
                                        ></i>
                                    )}
                                </div>

                                {/* Info de la Tienda — Clickeable */}
                                {tienda && (
                                    <Card className="border-0 shadow-sm mb-4">
                                        <Card.Body>
                                            <h6 className="fw-bold text-uppercase text-muted mb-2 small">Vendido por:</h6>
                                            <div
                                                className="d-flex align-items-center mb-2 p-2 rounded-3 store-link-hover"
                                                style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                                onClick={() => setMostrarModalTienda(true)}
                                                title="Ver tienda completa"
                                            >
                                                {tienda.imagen_url ? (
                                                    <img
                                                        src={tienda.imagen_url}
                                                        alt="Logo"
                                                        className="rounded-circle me-2 shadow-sm"
                                                        style={{ width: '44px', height: '44px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-2 shadow-sm"
                                                        style={{ width: '44px', height: '44px' }}
                                                    >
                                                        <i className="bi bi-shop"></i>
                                                    </div>
                                                )}
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-0 fw-bold text-primary d-flex align-items-center gap-1">
                                                        {tienda.nombre_tienda}
                                                        <i className="bi bi-chevron-right text-muted" style={{ fontSize: '0.75rem' }}></i>
                                                    </h6>
                                                    <small className="text-muted">{vendedor?.usuarios?.username || 'Vendedor'}</small>
                                                </div>
                                                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                                                    Ver tienda
                                                </span>
                                            </div>

                                            <div className="mb-2">
                                                <small className="me-2">Reputación:</small>
                                                <PromedioEstrellas datos={calificacionesTienda} campo="puntuacion" />
                                            </div>

                                            {/* Calificar Tienda */}
                                            {user && !esMiProducto && (
                                                <div className="mt-3 pt-3 border-top">
                                                    <h6 className="small fw-bold">Calificar Tienda</h6>
                                                    <Form onSubmit={enviarCalificacionTienda}>
                                                        <EstrellasInteractivas
                                                            valor={nuevaCalificacionTienda.puntuacion}
                                                            setValor={(val) => setNuevaCalificacionTienda({ ...nuevaCalificacionTienda, puntuacion: val })}
                                                        />
                                                        <Form.Control
                                                            size="sm"
                                                            as="textarea"
                                                            placeholder="Opinión sobre la tienda..."
                                                            className="mb-2"
                                                            value={nuevaCalificacionTienda.comentario}
                                                            onChange={(e) => setNuevaCalificacionTienda({ ...nuevaCalificacionTienda, comentario: e.target.value })}
                                                        />
                                                        <Button type="submit" variant="outline-primary" size="sm" className="w-100">
                                                            Enviar calificación
                                                        </Button>
                                                    </Form>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                )}
                            </Col>

                            {/* COLUMNA DERECHA */}
                            <Col md={7}>
                                <h3 className="fw-bold mb-2">{producto.nombre_producto}</h3>
                                <Badge bg="info" className="mb-3">
                                    {producto.categorias?.nombre_categoria || 'Categoría'}
                                </Badge>

                                <div className="mb-4">
                                    {producto.precio_original > producto.precio_venta && (
                                        <span className="text-decoration-line-through text-muted me-2 fs-5">
                                            C${parseFloat(producto.precio_original).toFixed(2)}
                                        </span>
                                    )}
                                    <span className="fs-2 fw-bold text-success">
                                        C${parseFloat(producto.precio_venta).toFixed(2)}
                                    </span>

                                    {/* Badge de Stock */}
                                    {producto.stock !== undefined && producto.stock !== null && (
                                        <div className="mt-2">
                                            {producto.stock === 0 ? (
                                                <span className="badge bg-danger rounded-pill px-3 py-2">
                                                    <i className="bi bi-x-circle me-1"></i>Sin stock
                                                </span>
                                            ) : producto.stock <= 5 ? (
                                                <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
                                                    <i className="bi bi-exclamation-triangle me-1"></i>¡Quedan solo {producto.stock}!
                                                </span>
                                            ) : (
                                                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2">
                                                    <i className="bi bi-check-circle me-1"></i>{producto.stock} en stock
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <p className="text-secondary mb-4">{producto.descripcion || 'Sin descripción detallada.'}</p>

                                {/* Botón Añadir / Aviso Propietario */}
                                {esMiProducto ? (
                                    <div className="alert alert-warning border-0 shadow-sm rounded-4 d-flex align-items-center mb-4">
                                        <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                                        <div>
                                            <strong className="d-block">¡Aviso de Propietario!</strong>
                                            Este producto pertenece a tu tienda. No puedes comprar tus propios productos.
                                        </div>
                                    </div>
                                ) : producto.stock === 0 ? (
                                    <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-center mb-4">
                                        <i className="bi bi-x-circle-fill fs-4 me-3"></i>
                                        <div>
                                            <strong className="d-block">Producto Agotado</strong>
                                            Este producto no tiene unidades disponibles en este momento.
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-100 rounded-pill fw-bold shadow-sm mb-4"
                                        style={{ backgroundColor: 'var(--color-primario)', borderColor: 'var(--color-primario)' }}
                                        onClick={() => {
                                            agregarAlCarrito(producto);
                                            setMostrar(false);
                                        }}
                                    >
                                        <i className="bi bi-cart-plus me-2"></i> Añadir al Carrito
                                    </Button>
                                )}

                                <hr />

                                {/* Reseñas del Producto */}
                                <h5 className="fw-bold mb-3">
                                    Reseñas del Producto <PromedioEstrellas datos={resenas} campo="calificacion" />
                                </h5>

                                {user && !esMiProducto ? (
                                    <Form onSubmit={enviarResenaProducto} className="mb-4 bg-light p-3 rounded">
                                        <h6 className="fw-bold mb-2">Dejar una reseña</h6>
                                        <EstrellasInteractivas
                                            valor={nuevaResena.calificacion}
                                            setValor={(val) => setNuevaResena({ ...nuevaResena, calificacion: val })}
                                        />
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            placeholder="¿Qué te pareció este producto?"
                                            className="mb-2"
                                            value={nuevaResena.comentario}
                                            onChange={(e) => setNuevaResena({ ...nuevaResena, comentario: e.target.value })}
                                        />
                                        <div className="text-end">
                                            <Button type="submit" variant="primary" size="sm">Comentar</Button>
                                        </div>
                                    </Form>
                                ) : !user ? (
                                    <div className="alert alert-secondary small py-2">
                                        <i className="bi bi-info-circle me-2"></i>Inicia sesión para dejar una reseña.
                                    </div>
                                ) : null}
                             
                                <div className="list-group list-group-flush" style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden' }}>
                                    {resenas.length > 0 ? (
                                        resenas.map((resena) => (
                                            <div key={resena.id_resena} className="list-group-item px-0 py-3">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <h6 className="fw-bold mb-0">
                                                        <i className="bi bi-person-circle me-2 text-muted"></i>
                                                        {resena.perfiles?.usuarios?.username || 'Usuario Anónimo'}
                                                    </h6>
                                                    <Estrellas valor={resena.calificacion} />
                                                </div>
                                                <p className="text-muted mb-0 small">{resena.comentario}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted text-center py-3">Aún no hay reseñas para este producto.</p>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
            </Modal>

            {/* Modal Tienda Completa */}
            {tienda && (
                <ModalTienda
                    mostrar={mostrarModalTienda}
                    onCerrar={() => setMostrarModalTienda(false)}
                    tiendaId={tienda.id_tienda}
                    onVerProducto={() => setMostrarModalTienda(false)}
                />
            )}
        </>
    );
};

export default ModalDetalleProducto;
