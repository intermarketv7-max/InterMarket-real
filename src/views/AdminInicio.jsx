import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Card, Spinner, Table, Form, Badge } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import NotificacionOperacion from '../components/NotificacionOperacion';
import TarjetasProductos from '../components/productos/TarjetasProductos';

const AdminInicio = () => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState({ mostrar: false, mensaje: '', tipo: '' });
  const [procesandoUsuario, setProcesandoUsuario] = useState(null);

  const fetchData = async () => {
    setCargando(true);
    const { data: ventasData } = await supabase.from("ventas").select("*");
    setVentas(ventasData || []);
    const { data: productosData } = await supabase.from("productos").select("*, tiendas(nombre_tienda)");
    setProductos(productosData || []);
    const { data: usuariosData } = await supabase
      .from("usuarios")
      .select("*")
      .order('creado_en', { ascending: false });
    setUsuarios(usuariosData || []);
    setCargando(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRestriccionUsuario = async (idUsuario, estadoActual) => {
    try {
      setProcesandoUsuario(idUsuario);
      const { error } = await supabase
        .from("usuarios")
        .update({ restringido: !estadoActual })
        .eq("id_usuario", idUsuario);

      if (error) throw error;

      setToast({
        mostrar: true,
        mensaje: `Usuario ${!estadoActual ? 'restringido' : 'habilitado'} correctamente.`,
        tipo: 'exito'
      });
      
      // Actualizar estado local
      setUsuarios(prev => prev.map(u => 
        u.id_usuario === idUsuario ? { ...u, restringido: !estadoActual } : u
      ));
    } catch (err) {
      console.error("Error al cambiar estado del usuario:", err);
      setToast({
        mostrar: true,
        mensaje: "No se pudo cambiar el estado del usuario.",
        tipo: 'error'
      });
    } finally {
      setProcesandoUsuario(null);
    }
  };

  return (
    <Container className="mt-3">
      <Row className="align-items-center mb-3">
        <Col>
          <h2><i className="bi bi-speedometer2 me-2"></i> Dashboard Administrador</h2>
        </Col>
      </Row>
      {cargando ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <div>Cargando datos...</div>
        </div>
      ) : (
        <>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="mb-3 shadow-sm">
                <Card.Body>
                  <Card.Title>Ventas</Card.Title>
                  <Card.Text className="display-6 fw-bold">{ventas.length}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="mb-3 shadow-sm">
                <Card.Body>
                  <Card.Title>Productos</Card.Title>
                  <Card.Text className="display-6 fw-bold">{productos.length}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="mb-3 shadow-sm">
                <Card.Body>
                  <Card.Title>Usuarios</Card.Title>
                  <Card.Text className="display-6 fw-bold">{usuarios.length}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Gestión de Usuarios */}
          <Row className="mb-5">
            <Col>
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Header className="bg-white border-0 pt-4 px-4">
                  <h4 className="fw-bold mb-0">
                    <i className="bi bi-people-fill text-primary me-2"></i>
                    Gestión de Usuarios
                  </h4>
                  <p className="text-muted small mb-0">Habilita o restringe el acceso a vendedores y compradores.</p>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="px-4 py-3">Usuario</th>
                        <th className="py-3">Email</th>
                        <th className="py-3 text-center">Rol</th>
                        <th className="py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-end">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id_usuario}>
                          <td className="px-4 fw-bold text-dark">{u.username}</td>
                          <td className="text-secondary">{u.email}</td>
                          <td className="text-center">
                            <Badge bg={u.rol === 'admin' ? 'dark' : u.rol === 'vendedor' ? 'primary' : 'info'} className="rounded-pill px-3">
                              {u.rol}
                            </Badge>
                          </td>
                          <td className="text-center">
                            {u.restringido ? (
                              <Badge bg="danger" className="bg-opacity-10 text-danger border-0">
                                <i className="bi bi-x-circle me-1"></i>Restringido
                              </Badge>
                            ) : (
                              <Badge bg="success" className="bg-opacity-10 text-success border-0">
                                <i className="bi bi-check-circle me-1"></i>Activo
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 text-end">
                            {u.rol !== 'admin' && (
                              <Form.Check 
                                type="switch"
                                id={`switch-${u.id_usuario}`}
                                checked={!u.restringido}
                                onChange={() => toggleRestriccionUsuario(u.id_usuario, u.restringido)}
                                disabled={procesandoUsuario === u.id_usuario}
                                className={`d-inline-block custom-switch ${u.restringido ? 'switch-danger' : ''}`}
                                label={u.restringido ? "Bloqueado" : "Activo"}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Opción para crear venta si no hay ventas */}
          {ventas.length === 0 && (
            <Row className="mb-4">
              <Col>
                <Button variant="success">Crear primera venta</Button>
              </Col>
            </Row>
          )}

          {/* Listado de productos */}
         
          {/* Mensajes recibidos (simulado) */}
          <Row className="mb-4">
            <Col>
              <h4>Mensajes de usuarios</h4>
              <div className="text-muted">(Aquí se mostrarían los mensajes recibidos de los usuarios)</div>
            </Col>
          </Row>
        </>
      )}
      <NotificacionOperacion
        mostrar={toast.mostrar}
        mensaje={toast.mensaje}
        tipo={toast.tipo}
        onClose={() => setToast({ mostrar: false, mensaje: '', tipo: '' })}
      />
    </Container>
  );
};

export default AdminInicio;
