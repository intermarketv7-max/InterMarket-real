import React from 'react';
import { Card, Badge, Button, OverlayTrigger, Tooltip, Carousel } from 'react-bootstrap';

const TarjetaCatalogo = ({ 
    producto, 
    abrirModalDetalles, 
    abrirModalContacto,
    agregarAlCarrito, 
    miTiendaId 
}) => {
    const esOferta = producto.precio_original > producto.precio_venta;
    const porcentajeDescuento = esOferta 
        ? Math.round((1 - producto.precio_venta / producto.precio_original) * 100) 
        : 0;

    const tieneMultiplesImagenes = Array.isArray(producto.imagen_url) && producto.imagen_url.length > 1;

    return (
        <Card className="h-100 border-0 shadow-sm modern-product-card bg-white overflow-hidden">
            {/* Contenedor de Imagen con Efectos */}
            <div className="modern-card-img-wrapper position-relative">
                <div 
                    className="modern-card-img-container"
                    onClick={() => abrirModalDetalles(producto)}
                >
                    {tieneMultiplesImagenes ? (
                        <Carousel 
                            fade 
                            indicators={false} 
                            controls={false} 
                            interval={4000} 
                            pause={false}
                            className="modern-card-carousel"
                        >
                            {producto.imagen_url.map((url, idx) => (
                                <Carousel.Item key={idx}>
                                    <img
                                        src={url}
                                        alt={`${producto.nombre_producto} ${idx + 1}`}
                                        className="modern-card-img"
                                        loading="lazy"
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=Error'}
                                    />
                                </Carousel.Item>
                            ))}
                        </Carousel>
                    ) : (
                        <Card.Img
                            variant="top"
                            src={producto.imagen_url?.[0] || 'https://via.placeholder.com/400?text=Sin+Imagen'}
                            alt={producto.nombre_producto}
                            className="modern-card-img"
                            loading="lazy"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=Error'}
                        />
                    )}
                    
                    {/* Overlay al hacer hover (opcional, para oscurecer un poco) */}
                    <div className="modern-card-overlay"></div>
                </div>

                {/* Badges Flotantes Modernos */}
                <div className="modern-card-badges">
                    {esOferta && (
                        <Badge bg="danger" className="modern-badge badge-discount pulse-soft">
                            <i className="bi bi-lightning-fill me-1"></i>-{porcentajeDescuento}%
                        </Badge>
                    )}
                    {producto.stock === 0 && (
                        <Badge bg="dark" className="modern-badge badge-soldout">
                            Agotado
                        </Badge>
                    )}
                </div>

                {/* Botones de Acción Rápida sobre la imagen */}
                <div className="modern-card-actions">
                    <OverlayTrigger placement="top" overlay={<Tooltip>Ver detalles</Tooltip>}>
                        <Button 
                            variant="white" 
                            className="action-btn shadow-sm"
                            onClick={() => abrirModalDetalles(producto)}
                        >
                            <i className="bi bi-eye"></i>
                        </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>Contactar vendedor</Tooltip>}>
                        <Button 
                            variant="white" 
                            className="action-btn shadow-sm"
                            onClick={() => abrirModalContacto(producto)}
                        >
                            <i className="bi bi-chat-dots"></i>
                        </Button>
                    </OverlayTrigger>
                </div>
            </div>

            <Card.Body className="d-flex flex-column p-3 pt-4">
                {/* Categoría y Tienda */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="modern-category-tag">
                        {producto.categorias?.nombre_categoria || 'General'}
                    </span>
                    <span className="modern-store-name text-truncate">
                        <i className="bi bi-shop me-1"></i>
                        {producto.tiendas?.perfiles?.[0]?.usuarios?.username || 'Tienda Local'}
                    </span>
                </div>

                {/* Título */}
                <Card.Title
                    className="modern-product-title mb-3"
                    onClick={() => abrirModalDetalles(producto)}
                >
                    {producto.nombre_producto}
                </Card.Title>

                {/* Precio y Stock */}
                <div className="mt-auto">
                    <div className="d-flex align-items-baseline gap-2 mb-3">
                        <span className="modern-price">
                            <small className="me-1">C$</small>
                            {parseFloat(producto.precio_venta || 0).toFixed(2)}
                        </span>
                        {esOferta && (
                            <span className="modern-old-price">
                                C${parseFloat(producto.precio_original).toFixed(2)}
                            </span>
                        )}
                    </div>
                    
                    {/* Indicador de Stock Bajo */}
                    {producto.stock !== null && producto.stock !== undefined && producto.stock <= 5 && producto.stock > 0 && (
                        <div className="modern-stock-alert mb-3">
                            <div className="progress" style={{ height: '4px' }}>
                                <div 
                                    className="progress-bar bg-warning" 
                                    style={{ width: `${(producto.stock / 10) * 100}%` }}
                                ></div>
                            </div>
                            <small className="text-warning fw-bold mt-1 d-block">
                                <i className="bi bi-fire me-1"></i>¡Solo quedan {producto.stock}!
                            </small>
                        </div>
                    )}

                    {/* Botón Principal */}
                    <Button
                        variant={producto.id_tienda === miTiendaId ? "outline-secondary" : producto.stock === 0 ? "secondary" : "primary"}
                        className={`w-100 modern-main-btn ${producto.stock > 0 && producto.id_tienda !== miTiendaId ? 'shadow-sm' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (producto.id_tienda === miTiendaId) {
                                alert('No puedes comprar tus propios productos.');
                            } else if (producto.stock === 0) {
                                alert('Este producto está agotado.');
                            } else if ((Array.isArray(producto.tallas) && producto.tallas.length > 0 || Array.isArray(producto.colores) && producto.colores.length > 0)) {
                                // Si tiene variantes, obligamos a ir al detalle para seleccionar
                                abrirModalDetalles(producto);
                            } else {
                                agregarAlCarrito(producto);
                            }
                        }}
                        disabled={producto.id_tienda === miTiendaId || producto.stock === 0}
                    >
                        <i className={`bi bi-${producto.id_tienda === miTiendaId ? 'shop' : producto.stock === 0 ? 'x-circle' : 'cart-plus'} me-2`}></i>
                        {producto.id_tienda === miTiendaId 
                            ? 'Mi producto' 
                            : producto.stock === 0 
                                ? 'Agotado' 
                                : (Array.isArray(producto.tallas) && producto.tallas.length > 0 || Array.isArray(producto.colores) && producto.colores.length > 0)
                                    ? 'Seleccionar Opciones'
                                    : 'Añadir al carrito'}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default TarjetaCatalogo;
