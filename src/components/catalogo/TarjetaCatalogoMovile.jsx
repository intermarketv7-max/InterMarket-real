import React from 'react';
import { Badge, Button } from 'react-bootstrap';

const TarjetaCatalogoMovile = ({ 
    producto, 
    abrirModalDetalles, 
    agregarAlCarrito, 
    miTiendaId 
}) => {
    const esOferta = producto.precio_original > producto.precio_venta;
    const porcentajeDescuento = esOferta 
        ? Math.round((1 - producto.precio_venta / producto.precio_original) * 100) 
        : 0;

    return (
        <div className="modern-mobile-card mb-3" onClick={() => abrirModalDetalles(producto)}>
            {/* Imagen con Badges */}
            <div className="modern-mobile-img-wrapper">
                <img 
                    src={producto.imagen_url?.[0] || 'https://via.placeholder.com/400x533?text=Sin+Imagen'} 
                    alt={producto.nombre_producto} 
                    className="modern-mobile-img"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/400x533?text=Error'}
                />
                
                <div className="modern-mobile-badges">
                    {esOferta && (
                        <Badge bg="danger" className="modern-badge-mini">
                            -{porcentajeDescuento}%
                        </Badge>
                    )}
                    {producto.stock === 0 && (
                        <Badge bg="dark" className="modern-badge-mini">
                            Agotado
                        </Badge>
                    )}
                </div>
                
                {/* Botón rápido de carrito en móvil */}
                {producto.stock > 0 && producto.id_tienda !== miTiendaId && (
                    <button 
                        className="modern-mobile-quick-add"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (Array.isArray(producto.tallas) && producto.tallas.length > 0 || Array.isArray(producto.colores) && producto.colores.length > 0) {
                                abrirModalDetalles(producto);
                            } else {
                                agregarAlCarrito(producto);
                            }
                        }}
                    >
                        <i className={`bi bi-${(Array.isArray(producto.tallas) && producto.tallas.length > 0 || Array.isArray(producto.colores) && producto.colores.length > 0) ? 'list-ul' : 'plus-lg'}`}></i>
                    </button>
                )}
            </div>

            {/* Contenido */}
            <div className="modern-mobile-content">
                <div className="modern-mobile-meta">
                    <span className="modern-mobile-category">
                        {producto.categorias?.nombre_categoria || 'General'}
                    </span>
                </div>

                <h4 className="modern-mobile-title text-truncate-2">
                    {producto.nombre_producto}
                </h4>

                <div className="modern-mobile-price-row">
                    <span className="modern-mobile-price">
                        <small>C$</small>{parseFloat(producto.precio_venta || 0).toFixed(2)}
                    </span>
                    {esOferta && (
                        <span className="modern-mobile-old-price ms-2">
                            C${parseFloat(producto.precio_original).toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Info de stock bajo */}
                {producto.stock > 0 && producto.stock <= 5 && (
                    <div className="modern-mobile-stock text-warning">
                        <i className="bi bi-fire me-1"></i>Últimos {producto.stock}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TarjetaCatalogoMovile;
