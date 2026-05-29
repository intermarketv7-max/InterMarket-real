import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Card, Carousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseconfig';
import TarjetaCatalogo from '../components/catalogo/TarjetaCatalogo';

const InicioComprador = () => {
    const navigate = useNavigate();
    const [productosDestacados, setProductosDestacados] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            // Intentar cargar categorías desde el cache de sesión primero para rapidez visual
            const catCache = sessionStorage.getItem('cache-categorias-inicio');
            if (catCache) {
                setCategorias(JSON.parse(catCache));
            }

            try {
                // Cargar productos y categorías en paralelo
                const [prodResponse, catResponse] = await Promise.all([
                    supabase
                        .from('productos')
                        .select('*, categorias(nombre_categoria), tiendas(perfiles(usuarios(username)))')
                        .order('creado_en', { ascending: false })
                        .limit(4),
                    supabase
                        .from('categorias')
                        .select('*')
                        .limit(6)
                ]);

                if (prodResponse.data) setProductosDestacados(prodResponse.data);
                
                if (catResponse.data) {
                    setCategorias(catResponse.data);
                    sessionStorage.setItem('cache-categorias-inicio', JSON.stringify(catResponse.data));
                }
            } catch (error) {
                console.error("Error al cargar inicio:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    return (
        <div className="inicio-comprador">
            {/* Hero Section */}
            <section className="hero-section bg-light py-5 mb-5">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6}>
                            <h1 className="display-4 fw-bold mb-4" style={{ color: 'var(--color-primario)' }}>
                                Encuentra lo mejor en InterMarket
                            </h1>
                            <p className="lead mb-4 text-muted">
                                Explora miles de productos únicos de vendedores locales y recibe tus pedidos con seguridad y rapidez.
                            </p>
                            <div className="d-flex gap-3">
                                <Button variant="primary" size="lg" className="rounded-pill px-4" onClick={() => navigate('/catalogo')}>
                                    Explorar Catálogo
                                </Button>
                                <Button variant="outline-primary" size="lg" className="rounded-pill px-4" onClick={() => navigate('/mensajes')}>
                                    Mis Mensajes
                                </Button>
                            </div>
                        </Col>
                        <Col lg={6} className="d-none d-lg-block">
                            <img 
                                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600" 
                                alt="Shopping" 
                                className="img-fluid rounded-4 shadow-lg"
                                loading="lazy"
                            />
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Categorías Rápidas */}
            <Container className="mb-5">
                <h3 className="fw-bold mb-4">Explora por Categorías</h3>
                <Row className="g-4">
                    {categorias.map(cat => (
                        <Col key={cat.id_categoria} xs={6} md={4} lg={2}>
                            <Card 
                                className="border-0 shadow-sm text-center p-3 h-100 category-card-inicio"
                                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                onClick={() => navigate(`/catalogo?categoria=${cat.id_categoria}`)}
                            >
                                <div className="fs-2 mb-2 text-primary">
                                    <i className="bi bi-tag"></i>
                                </div>
                                <h6 className="mb-0 fw-bold">{cat.nombre_categoria}</h6>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>

            {/* Productos Destacados */}
            <Container className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold mb-0">Novedades para ti</h3>
                    <Button variant="link" className="text-decoration-none fw-bold" onClick={() => navigate('/catalogo')}>
                        Ver todo <i className="bi bi-arrow-right"></i>
                    </Button>
                </div>
                <Row className="g-4">
                    {productosDestacados.map(prod => (
                        <Col key={prod.id_producto} sm={6} lg={3}>
                            <TarjetaCatalogo 
                                producto={prod}
                                abrirModalDetalles={() => navigate(`/catalogo?prod=${prod.id_producto}`)}
                                abrirModalContacto={() => navigate('/mensajes')}
                                agregarAlCarrito={() => {}} // Esto se manejaría mejor en el catálogo o con un context
                            />
                        </Col>
                    ))}
                </Row>
            </Container>

            {/* Banner Informativo */}
            <section className="bg-primary text-white py-5">
                <Container>
                    <Row className="text-center g-4">
                        <Col md={4}>
                            <i className="bi bi-shield-check fs-1"></i>
                            <h5 className="mt-3 fw-bold">Compras Seguras</h5>
                            <p className="small mb-0">Tus transacciones están protegidas con la mejor tecnología.</p>
                        </Col>
                        <Col md={4}>
                            <i className="bi bi-truck fs-1"></i>
                            <h5 className="mt-3 fw-bold">Envíos Locales</h5>
                            <p className="small mb-0">Recibe tus productos directamente en tu puerta.</p>
                        </Col>
                        <Col md={4}>
                            <i className="bi bi-headset fs-1"></i>
                            <h5 className="mt-3 fw-bold">Soporte 24/7</h5>
                            <p className="small mb-0">Estamos aquí para ayudarte en cualquier momento.</p>
                        </Col>
                    </Row>
                </Container>
            </section>
        </div>
    );
};

export default InicioComprador;
