import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Button, Form, InputGroup } from 'react-bootstrap';
import { supabase } from '../database/supabaseconfig';
import TarjetaCatalogoMovile from '../components/catalogo/TarjetaCatalogoMovile';
import TarjetaCatalogo from '../components/catalogo/TarjetaCatalogo';
import CarritoModal from '../components/catalogo/CarritoModal';
import ModalMensaje from '../components/catalogo/ModalMensaje';
import ModalDetalleProducto from '../components/catalogo/ModalDetalleProducto';
import ModalPostCompra from '../components/catalogo/ModalPostCompra';
import { useAuth } from '../context/AuthContext';

function Catalogo() {
    const { user } = useAuth();
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [carrito, setCarrito] = useState([]);
    const [mostrarCarrito, setMostrarCarrito] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarSoloOfertas, setMostrarSoloOfertas] = useState(false);
    const [mostrarModalMensaje, setMostrarModalMensaje] = useState(false);
    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [mostrarModalPostCompra, setMostrarModalPostCompra] = useState(false);
    const [itemsCompradosRecientemente, setItemsCompradosRecientemente] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [miTiendaId, setMiTiendaId] = useState(null);
    const [esMovil, setEsMovil] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setEsMovil(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const abrirModalContacto = (producto) => {
        setProductoSeleccionado(producto);
        setMostrarModalMensaje(true);
    };

    const abrirModalDetalles = (producto) => {
        setProductoSeleccionado(producto);
        setMostrarModalDetalle(true);
    };

    const handleCompraExitosa = (itemsComprados) => {
        setItemsCompradosRecientemente(itemsComprados);
        setMostrarModalPostCompra(true);
    };

    useEffect(() => {
        const inicializarDatos = async () => {
            setCargando(true);
            try {
                const promesas = [cargarProductos()];
                
                if (user) {
                    promesas.push(
                        supabase
                            .from('perfiles')
                            .select('id_tienda')
                            .eq('id_usuario', user.id)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (data?.id_tienda) setMiTiendaId(data.id_tienda);
                            })
                    );
                }
                
                await Promise.all(promesas);
            } catch (error) {
                console.error("Error al inicializar catálogo:", error);
            } finally {
                setCargando(false);
            }
        };

        inicializarDatos();

        const carritoGuardado = JSON.parse(localStorage.getItem('carrito') || '[]');
        setCarrito(carritoGuardado);

        const handleAbrirCarrito = () => {
            setMostrarCarrito(true);
        };

        window.addEventListener("abrirCarrito", handleAbrirCarrito);

        return () => {
            window.removeEventListener("abrirCarrito", handleAbrirCarrito);
        };
    }, [user]);

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from("productos")
                .select(`
                    *,
                    categorias (nombre_categoria)
                `)
                .order("creado_en", { ascending: false });

            if (error) throw error;
            setProductos(data || []);
        } catch (err) {
            console.error("Error al cargar productos:", err);
            throw err;
        }
    };

    const agregarAlCarrito = (producto) => {
        // Buscar si ya existe el mismo producto con la misma talla y color
        const existe = carrito.find(item => 
            item.id_producto === producto.id_producto && 
            item.talla_seleccionada === producto.talla_seleccionada && 
            item.color_seleccionado === producto.color_seleccionado
        );

        let nuevoCarrito;
        if (existe) {
            nuevoCarrito = carrito.map(item =>
                (item.id_producto === producto.id_producto && 
                 item.talla_seleccionada === producto.talla_seleccionada && 
                 item.color_seleccionado === producto.color_seleccionado)
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item
            );
        } else {
            nuevoCarrito = [...carrito, { ...producto, cantidad: 1 }];
        }
        setCarrito(nuevoCarrito);
        localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));

        // Toast notification (premium style)
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3 p-md-4 custom-toast-container';
        toast.style.zIndex = '9999';
        toast.style.width = window.innerWidth < 576 ? '100%' : 'auto';
        
        const infoVariante = [producto.talla_seleccionada, producto.color_seleccionado].filter(Boolean).join(' / ');
        
        toast.innerHTML = `
            <div class="alert shadow-lg border-0 d-flex align-items-center mb-0" style="background: var(--color-primario); color: white; border-radius: 12px; min-width: ${window.innerWidth < 576 ? 'calc(100vw - 32px)' : '300px'};">
                <i class="bi bi-cart-check-fill fs-4 me-3"></i>
                <div style="overflow: hidden;">
                    <strong class="d-block text-truncate">Añadido al carrito</strong>
                    <small class="opacity-75 d-block text-truncate" style="max-width: 200px;">
                        ${producto.nombre_producto} ${infoVariante ? `(${infoVariante})` : ''}
                    </small>
                </div>
                <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const totalCarrito = carrito.reduce((total, item) => {
        return total + (parseFloat(item.precio_venta || 0) * (item.cantidad || 1));
    }, 0);

    return (
        <Container className="pb-5">
            <div className="pt-5 mt-4">
                <Row className="mb-5 align-items-center g-3">
                    <Col lg={4} md={12}>
                        <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3 d-none d-md-block">
                                <i className="bi bi-shop fs-3 text-primary"></i>
                            </div>
                            <div>
                                <h1 className="display-6 fw-800 mb-0" style={{ color: 'var(--color-primario)' }}>
                                    Descubre
                                </h1>
                                <p className="text-muted mb-0 small">Los mejores productos de nuestra comunidad.</p>
                            </div>
                        </div>
                    </Col>
                    <Col lg={5} md={8}>
                        <InputGroup className="unique-input-group shadow-sm border rounded-pill overflow-hidden bg-white">
                            <InputGroup.Text className="bg-transparent border-0 ps-4 pe-2">
                                <i className="bi bi-search text-primary"></i>
                            </InputGroup.Text>
                            <Form.Control
                                className="bg-transparent border-0 py-3 shadow-none"
                                placeholder="¿Qué estás buscando hoy?"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                            {busqueda && (
                                <Button 
                                    variant="link" 
                                    className="text-muted border-0 pe-4"
                                    onClick={() => setBusqueda('')}
                                >
                                    <i className="bi bi-x-circle-fill"></i>
                                </Button>
                            )}
                        </InputGroup>
                    </Col>
                    <Col lg={3} md={4}>
                        <Button
                            variant={carrito.length > 0 ? "primary" : "outline-secondary"}
                            className={`w-100 py-3 rounded-pill fw-bold border-2 transition-all d-flex align-items-center justify-content-center ${carrito.length > 0 ? 'shadow-md pulse-button' : ''}`}
                            onClick={() => setMostrarCarrito(true)}
                        >
                            <div className="position-relative me-2">
                                <i className="bi bi-cart3 fs-5"></i>
                                {carrito.length > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{ fontSize: '0.6rem' }}>
                                        {carrito.length}
                                    </span>
                                )}
                            </div>
                            {carrito.length > 0 ? 'Ver Mi Carrito' : 'Carrito Vacío'}
                        </Button>
                    </Col>
                </Row>

                {/* Promotional Banner */}
                <div
                    className="mb-5 rounded-4 p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-center shadow-lg position-relative overflow-hidden"
                    style={{ 
                        background: 'linear-gradient(135deg, #0f4c5c 0%, #1a7a8a 100%)',
                        border: 'none'
                    }}
                >
                    <div className="position-relative z-1 text-center text-md-start mb-4 mb-md-0">
                        <Badge bg="warning" className="mb-3 px-3 py-2 text-dark text-uppercase fw-bold shadow-sm" style={{ letterSpacing: '1px' }}>
                            <i className="bi bi-stars me-1"></i> Ofertas Especiales
                        </Badge>
                        <h2 className="text-white fw-900 mb-2 display-5">Temporada de Ahorro</h2>
                        <p className="text-white-50 mb-0 fs-5">Encuentra descuentos increíbles en tus categorías favoritas.</p>
                    </div>
                    <div className="position-relative z-1 w-100 w-md-auto">
                        <Button
                            variant={mostrarSoloOfertas ? "light" : "outline-light"}
                            className="rounded-pill px-5 py-3 fw-bold shadow-sm w-100 w-md-auto transition-all border-2"
                            onClick={() => setMostrarSoloOfertas(!mostrarSoloOfertas)}
                            style={{ minWidth: '200px' }}
                        >
                            {mostrarSoloOfertas ? (
                                <><i className="bi bi-grid-fill me-2"></i>Ver Todos</>
                            ) : (
                                <><i className="bi bi-percent me-2"></i>Filtrar Ofertas</>
                            )}
                        </Button>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="position-absolute d-none d-md-block" style={{ width: '250px', height: '250px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', top: '-50px', left: '-50px' }}></div>
                    <div className="position-absolute d-none d-md-block" style={{ width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', bottom: '-150px', right: '-100px' }}></div>
                </div>

                {cargando ? (
                    <div className="text-center py-5">
                        <Spinner animation="grow" variant="primary" />
                        <p className="mt-3 text-muted fw-500">Preparando el catálogo...</p>
                    </div>
                ) : productos.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-xl shadow-sm border">
                        <i className="bi bi-box-seam display-1 text-light mb-4 d-block"></i>
                        <h3 className="text-muted">No se encontraron productos</h3>
                        <p className="text-muted opacity-75">Vuelve más tarde para ver nuevas novedades.</p>
                    </div>
                ) : (
                    <Row className="g-2 g-md-4">
                        {productos
                            .filter(p => {
                                const b = (busqueda || '').toLowerCase();
                                return (p.nombre_producto?.toLowerCase() || '').includes(b) || 
                                       (p.categorias?.nombre_categoria?.toLowerCase() || '').includes(b);
                            })
                            .filter(p => !mostrarSoloOfertas || (p.precio_original && p.precio_original > p.precio_venta))
                            .map((producto) => (
                                <Col key={producto.id_producto} xs={6} sm={6} md={4} lg={3} xl={3}>
                                    {esMovil ? (
                                        <TarjetaCatalogoMovile 
                                            producto={producto}
                                            abrirModalDetalles={abrirModalDetalles}
                                            agregarAlCarrito={agregarAlCarrito}
                                            miTiendaId={miTiendaId}
                                        />
                                    ) : (
                                        <TarjetaCatalogo 
                                            producto={producto}
                                            abrirModalDetalles={abrirModalDetalles}
                                            abrirModalContacto={abrirModalContacto}
                                            agregarAlCarrito={agregarAlCarrito}
                                            miTiendaId={miTiendaId}
                                        />
                                    )}
                                </Col>
                            ))}
                    </Row>
                )}
            </div>

            {/* Modals remain the same but will inherit new styles */}
            <CarritoModal
                mostrar={mostrarCarrito}
                setMostrar={setMostrarCarrito}
                carrito={carrito}
                setCarrito={setCarrito}
                total={totalCarrito}
                onCompraExitosa={handleCompraExitosa}
            />
            <ModalMensaje
                mostrar={mostrarModalMensaje}
                setMostrar={setMostrarModalMensaje}
                producto={productoSeleccionado}
            />
            <ModalDetalleProducto
                mostrar={mostrarModalDetalle}
                setMostrar={setMostrarModalDetalle}
                producto={productoSeleccionado}
                agregarAlCarrito={agregarAlCarrito}
            />
            <ModalPostCompra
                mostrar={mostrarModalPostCompra}
                setMostrar={setMostrarModalPostCompra}
                items={itemsCompradosRecientemente}
                alCalificar={abrirModalDetalles}
            />
        </Container>
    );
}

export default Catalogo;