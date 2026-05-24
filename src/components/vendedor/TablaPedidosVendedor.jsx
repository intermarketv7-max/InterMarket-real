import React from "react";
import { Table, Badge, Button, Row, Col, Card, Spinner } from "react-bootstrap";

const TablaPedidosVendedor = ({ pedidos, cargando, cambiarEstadoPedido }) => {
  const badgeColor = (id_estado) => {
    switch(id_estado) {
      case 1: return 'warning';
      case 2: return 'success';
      case 3: return 'danger';
      case 4: return 'info';
      default: return 'secondary';
    }
  };
  
  const getEstadoTexto = (id_estado) => {
    switch(id_estado) {
      case 1: return 'Pendiente';
      case 2: return 'Pagado';
      case 3: return 'Cancelado';
      case 4: return 'Entregado';
      default: return 'Desconocido';
    }
  };

  if (cargando) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando pedidos...</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center p-5 bg-light rounded">
        <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
        <p className="mt-3 text-muted">Aún no tienes pedidos asociados a tu tienda.</p>
      </div>
    );
  }

  return (
    <>
      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="d-lg-none">
        <Row xs={1} md={2} className="g-3">
          {pedidos.map((pedido) => (
            <Col key={pedido.id_pedido}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">ID: {pedido.id_pedido.split('-')[0]}</small>
                    <Badge bg={badgeColor(pedido.id_estado)} className="px-2 py-1 text-uppercase">
                      {getEstadoTexto(pedido.id_estado)}
                    </Badge>
                  </div>
                  <Card.Title className="h5 mb-1">{pedido.productos?.nombre_producto}</Card.Title>
                  {(pedido.talla_seleccionada || pedido.color_seleccionado) && (
                    <div className="mb-2">
                      {pedido.talla_seleccionada && <Badge bg="light" text="dark" className="border me-1 fw-normal">Talla: {pedido.talla_seleccionada}</Badge>}
                      {pedido.color_seleccionado && <Badge bg="light" text="dark" className="border fw-normal">Color: {pedido.color_seleccionado}</Badge>}
                    </div>
                  )}
                  <Card.Subtitle className="mb-2 text-muted">
                    <i className="bi bi-person me-1"></i> {pedido.perfiles?.usuarios?.username || 'Usuario'}
                  </Card.Subtitle>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between mb-2">
                    <span>Fecha:</span>
                    <strong>{new Date(pedido.creado_en).toLocaleDateString()}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Monto:</span>
                    <strong className="text-success">${Number(pedido.precio_unitario).toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    {pedido.id_estado === 1 && (
                      <>
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          onClick={() => cambiarEstadoPedido(pedido.id_pedido, 2)}
                        >
                          <i className="bi bi-check-circle me-1"></i> Aceptar
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => cambiarEstadoPedido(pedido.id_pedido, 3)}
                        >
                          <i className="bi bi-x-circle me-1"></i> Rechazar
                        </Button>
                      </>
                    )}
                    {pedido.id_estado === 2 && (
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        onClick={() => cambiarEstadoPedido(pedido.id_pedido, 4)}
                      >
                        <i className="bi bi-box-seam me-1"></i> Entregar
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="d-none d-lg-block">
        <Table responsive hover className="align-middle">
          <thead className="table-light">
            <tr>
              <th>ID Pedido</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Comprador</th>
              <th>Monto</th>
              <th>Estado</th>
              
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id_pedido}>
                <td><small className="text-muted">{pedido.id_pedido.split('-')[0]}</small></td>
                <td>{new Date(pedido.creado_en).toLocaleDateString()}</td>
                <td>
                  <div className="fw-bold">{pedido.productos?.nombre_producto}</div>
                  {(pedido.talla_seleccionada || pedido.color_seleccionado) && (
                    <div className="small text-muted">
                      {pedido.talla_seleccionada && <span className="me-2">Talla: {pedido.talla_seleccionada}</span>}
                      {pedido.color_seleccionado && <span>Color: {pedido.color_seleccionado}</span>}
                    </div>
                  )}
                </td>
                <td>{pedido.perfiles?.usuarios?.username || 'Usuario'}</td>
                <td className="fw-bold text-success">${Number(pedido.precio_unitario).toFixed(2)}</td>
                <td>
                  <Badge bg={badgeColor(pedido.id_estado)} className="px-3 py-2 text-uppercase">
                    {getEstadoTexto(pedido.id_estado)}
                  </Badge>
                </td>
                <td className="text-center">
                  
                  {pedido.id_estado === 2 && (
                    <Button 
                      variant="info" 
                      size="sm" 
                      className="rounded-pill px-3 text-white"
                      onClick={() => cambiarEstadoPedido(pedido.id_pedido, 4)}
                    >
                      <i className="bi bi-box-seam me-1"></i> Marcar Entregado
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default TablaPedidosVendedor;
