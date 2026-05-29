import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Button, Nav, Form, Table, Badge, Alert } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Componentes de Perfil
import HeaderPerfil from "../components/perfil/HeaderPerfil";
import SidebarPerfil from "../components/perfil/SidebarPerfil";
import HistorialPedidos from "../components/perfil/HistorialPedidos";
import DireccionesPerfil from "../components/perfil/DireccionesPerfil";
import MetodosPagoPerfil from "../components/perfil/MetodosPagoPerfil";
import ModalEnvioPerfil from "../components/perfil/ModalEnvioPerfil";
import ModalTarjetaPerfil from "../components/perfil/ModalTarjetaPerfil";
import ModalDireccionPerfil from "../components/perfil/ModalDireccionPerfil";

const Perfil = () => {
  const { user, session } = useAuth();
  const navegar = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoTarjetaId, setEliminandoTarjetaId] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [archivoNuevo, setArchivoNuevo] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  
  // Estado para la pestaña activa (Diseño moderno)
  const [activeTab, setActiveTab] = useState('perfil');
  
  // Detalle de envío
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  
  // Estados para añadir tarjeta
  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevaTarjeta, setNuevaTarjeta] = useState({ tipo: "Visa", ultimo4: "" });
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);

  // Estados para direcciones
  const [direcciones, setDirecciones] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState({
    nombre: "", apellido: "", nombre_calle: "", descripcion: "", codigo_postal: "", numero_telefono: ""
  });
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // 1. Paralelizar perfil, métodos de pago y direcciones para mejorar el tiempo de respuesta
        const [perfilRes, metodosRes, direccionesRes] = await Promise.all([
          supabase
            .from("perfiles")
            .select("*, usuarios(email, username)")
            .eq("id_usuario", user.id)
            .maybeSingle(),
          supabase
            .from("metodos_pago")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", { ascending: false }),
          supabase
            .from("direcciones")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", { ascending: false })
        ]);

        let perfilData = perfilRes.data;
        
        if (!perfilData) {
          // Fallback: Si por alguna razón el trigger de Supabase falló al registrarse (ej. con Google), 
          // creamos el registro del usuario y perfil manualmente aquí.
          try {
            const email = user.email || '';
            const username = email ? email.split('@')[0] : 'usuario';
            
            await supabase.from('usuarios').upsert({
              id_usuario: user.id,
              username: username,
              email: email,
              rol: 'comprador'
            });
            
            await supabase.from('perfiles').upsert({
              id_usuario: user.id,
            });

            const { data: retryData } = await supabase
              .from("perfiles")
              .select("*, usuarios(email, username)")
              .eq("id_usuario", user.id)
              .maybeSingle();
              
            perfilData = retryData;
          } catch (err) {
            console.error("Error intentando crear el perfil de respaldo:", err);
          }
        }
          
        if (perfilData) {
          setPerfil(perfilData);
          setFotoUrl(perfilData.foto_perfil || "");
          setMetodosPago(metodosRes.data || []);
          setDirecciones(direccionesRes.data || []);
          
          // 2. Obtener historial de pedidos (depende del perfil_id obtenido arriba)
          const { data: pedidosData } = await supabase
            .from("pedidos")
            .select(`
              id_pedido, 
              creado_en, 
              precio_unitario, 
              id_estado, 
              productos(nombre_producto, imagen_url),
              ventas(id_direccion, direcciones(*))
            `)
            .eq("perfil_id", perfilData.perfil_id)
            .order("creado_en", { ascending: false });
            
          setPedidos(pedidosData || []);
        }
      } catch (err) {
        console.error("Error al cargar datos de perfil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, [user]);

  const manejarArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoNuevo(e.target.files[0]);
    }
  };

  const guardarPerfil = async () => {
    if (!perfil) return;
    setGuardando(true);
    setMensaje({ texto: "", tipo: "" });
    try {
      let urlFinal = fotoUrl;

      // Si hay un archivo nuevo, lo subimos
      if (archivoNuevo) {
        const fileExt = archivoNuevo.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatares/${fileName}`; // Usaremos una carpeta dentro del bucket por orden

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, archivoNuevo);

        if (uploadError) throw uploadError;

        // Obtener la URL pública
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        urlFinal = publicUrlData.publicUrl;
        setFotoUrl(urlFinal);
      }

      const { error } = await supabase
        .from("perfiles")
        .update({ foto_perfil: urlFinal })
        .eq("perfil_id", perfil.perfil_id);
        
      if (error) throw error;
      setMensaje({ texto: "Perfil actualizado correctamente.", tipo: "success" });
      setArchivoNuevo(null); // Limpiamos el archivo subido
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al actualizar perfil. ¿Ya ejecutaste el código SQL?", tipo: "danger" });
    } finally {
      setGuardando(false);
    }
  };

  const getBadgeColor = (id_estado) => {
    switch(id_estado) {
      case 1: return 'warning'; // Pendiente
      case 2: return 'success'; // Pagado / Aceptado
      case 3: return 'danger'; // Cancelado / Rechazado
      case 4: return 'info'; // Entregado / Completado
      default: return 'secondary';
    }
  };

  const eliminarTarjeta = async (id_metodo_pago) => {
    const confirmar = window.confirm("¿Eliminar esta tarjeta? Esta acción no se puede deshacer.");
    if (!confirmar) return;
    if (!session?.access_token) {
      setMensaje({ texto: "No se pudo autenticar la sesión. Vuelve a iniciar sesión.", tipo: "danger" });
      return;
    }

    setEliminandoTarjetaId(id_metodo_pago);
    setMensaje({ texto: "", tipo: "" });

    try {
      const response = await fetch('/.netlify/functions/delete-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id_metodo_pago }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar tarjeta');
      }

      setMetodosPago((prev) => prev.filter((m) => m.id_metodo_pago !== id_metodo_pago));
      setMensaje({ texto: "Tarjeta eliminada correctamente.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: err.message || "No se pudo eliminar la tarjeta. Intenta de nuevo más tarde.", tipo: "danger" });
    } finally {
      setEliminandoTarjetaId(null);
    }
  };

  const getEstadoTexto = (id_estado) => {
    switch(id_estado) {
      case 1: return 'En proceso (Pendiente)';
      case 2: return 'Aceptado por vendedor';
      case 3: return 'Rechazado/Cancelado';
      case 4: return 'Enviado/Entregado';
      default: return 'Desconocido';
    }
  };

  const agregarNuevaTarjeta = async () => {
    if (!nuevaTarjeta.ultimo4 || nuevaTarjeta.ultimo4.length !== 4) {
      alert("Por favor, ingresa los últimos 4 dígitos.");
      return;
    }
    setGuardandoTarjeta(true);
    try {
      const { data, error } = await supabase.from("metodos_pago").insert({
        id_usuario: user.id,
        id_stripe_customer: 'cus_manual',
        id_stripe_payment_method: 'pm_manual_' + Date.now(),
        ultimo4: nuevaTarjeta.ultimo4,
        tipo_metodo: nuevaTarjeta.tipo,
      }).select().single();

      if (error) throw error;

      setMetodosPago([data, ...metodosPago]);
      setShowAddModal(false);
      setNuevaTarjeta({ tipo: "Visa", ultimo4: "" });
      setMensaje({ texto: "Tarjeta añadida correctamente.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al añadir la tarjeta.", tipo: "danger" });
    } finally {
      setGuardandoTarjeta(false);
    }
  };

  const agregarDireccion = async () => {
    if (!nuevaDireccion.nombre_calle || !nuevaDireccion.numero_telefono) {
      alert("Calle y teléfono son requeridos.");
      return;
    }
    setGuardandoDireccion(true);
    try {
      const { data, error } = await supabase.from("direcciones").insert({
        ...nuevaDireccion,
        id_usuario: user.id
      }).select().single();

      if (error) throw error;

      setDirecciones([data, ...direcciones]);
      setShowAddressModal(false);
      setNuevaDireccion({
        nombre: "", apellido: "", nombre_calle: "", descripcion: "", codigo_postal: "", numero_telefono: ""
      });
      setMensaje({ texto: "Dirección añadida con éxito.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al guardar dirección.", tipo: "danger" });
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const eliminarDireccion = async (id) => {
    if (!window.confirm("¿Eliminar esta dirección?")) return;
    try {
      const { error } = await supabase.from("direcciones").delete().eq("id_direccion", id);
      if (error) throw error;
      setDirecciones(direcciones.filter(d => d.id_direccion !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar la dirección.");
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <div>Cargando panel...</div>
      </Container>
    );
  }

  if (!perfil) {
    return (
      <Container className="mt-5 text-center">
        <Card className="p-4 mx-auto" style={{ maxWidth: 400 }}>
          <Card.Body>
            <Card.Title>Perfil no encontrado</Card.Title>
            <Card.Text>No se encontró información de perfil para este usuario.</Card.Text>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <div className="perfil-modern-page pb-5">
      {/* Header con Portada */}
      <div className="perfil-header-banner position-relative">
       
        <Container>
          <div className="perfil-header-content d-flex flex-column flex-md-row align-items-center align-items-md-end gap-5">
            <div className="position-relative">
              <img
                src={fotoUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(perfil.foto_perfil?.username || user.user_metadata?.full_name || "Usuario")}
                alt="Foto de perfil"
                className="rounded-circle profile-avatar shadow-lg border border-4 border-white"
                style={{ width: 160, height: 160, objectFit: "cover" }}
              />
              <label htmlFor="upload-photo" className="btn btn-primary rounded-circle position-absolute bottom-0 end-0 shadow-sm p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, cursor: 'pointer' }}>
                <i className="bi bi-camera-fill"></i>
                <input type="file" id="upload-photo" className="d-none" accept="image/*" onChange={manejarArchivo} />
              </label>
            </div>
            
            <div className="perfil-info-text text-center text-md-start pb-2">
              <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
                <h1 className="fw-900 mb-0 text-white">{perfil.usuarios?.username || user.user_metadata?.full_name || "Usuario"}</h1>
                <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 text-uppercase ls-1 small fw-bold shadow-sm">
                  {perfil.rol || "Comprador"}
                </Badge>
              </div>
              <p className="text-white-50 mb-3 fs-5">{perfil.usuarios?.email || user.email}</p>
              
              <div className="d-flex gap-2 justify-content-center justify-content-md-start">
                
                {archivoNuevo && (
                  <Button variant="success" size="sm" onClick={guardarPerfil} disabled={guardando} className="rounded-pill px-4 shadow-sm fw-bold border-0 pulse-soft">
                    {guardando ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-check2-circle me-2"></i>Guardar Foto</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="mt-5">
        {mensaje.texto && (
          <Alert variant={mensaje.tipo} className="rounded-4 shadow-sm border-0 d-flex align-items-center mb-4">
            <i className={`bi bi-${mensaje.tipo === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-3 fs-4`}></i>
            {mensaje.texto}
          </Alert>
        )}

        <Row className="g-4">
          <Col lg={3}>
            <div className="perfil-nav-sidebar sticky-top" style={{ top: '100px', zIndex: 10 }}>
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Nav variant="pills" className="flex-column p-2 custom-perfil-pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                  <Nav.Item>
                    <Nav.Link eventKey="perfil" className="rounded-3 d-flex align-items-center gap-3 py-3 px-4">
                      <i className="bi bi-person-badge fs-5"></i> Mi Cuenta
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="pedidos" className="rounded-3 d-flex align-items-center gap-3 py-3 px-4">
                      <i className="bi bi-box-seam fs-5"></i> Mis Pedidos
                      {pedidos.length > 0 && <Badge bg="primary" pill className="ms-auto">{pedidos.length}</Badge>}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="direcciones" className="rounded-3 d-flex align-items-center gap-3 py-3 px-4">
                      <i className="bi bi-geo-alt fs-5"></i> Direcciones
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="metodos" className="rounded-3 d-flex align-items-center gap-3 py-3 px-4">
                      <i className="bi bi-credit-card fs-5"></i> Pagos
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card>
            </div>
          </Col>

          <Col lg={9}>
            <div className="perfil-content-area">
              {activeTab === 'perfil' && (
                <Card className="border-0 shadow-sm rounded-4 p-4">
                  <h4 className="fw-bold mb-4 d-flex align-items-center">
                    <i className="bi bi-shield-check text-primary me-3 fs-3"></i>
                    Información Personal
                  </h4>
                  <Row className="g-4">
                    <Col md={6}>
                      <div className="info-box p-4 bg-light rounded-4 border-0">
                        <small className="text-muted d-block mb-1 text-uppercase fw-bold ls-1">Nombre de Usuario</small>
                        <div className="fs-5 fw-bold">{perfil.usuarios?.username || 'No definido'}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-box p-4 bg-light rounded-4 border-0">
                        <small className="text-muted d-block mb-1 text-uppercase fw-bold ls-1">Correo Electrónico</small>
                        <div className="fs-5 fw-bold">{perfil.usuarios?.email || 'No definido'}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-box p-4 bg-light rounded-4 border-0">
                        <small className="text-muted d-block mb-1 text-uppercase fw-bold ls-1">Rol de Cuenta</small>
                        <div className="fs-5 fw-bold text-primary">{perfil.rol || 'Comprador'}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-box p-4 bg-light rounded-4 border-0">
                        <small className="text-muted d-block mb-1 text-uppercase fw-bold ls-1">Miembro desde</small>
                        <div className="fs-5 fw-bold">{new Date(perfil.creado_en).toLocaleDateString()}</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              )}

              {activeTab === 'pedidos' && (
                <Card className="border-0 shadow-sm rounded-4 p-4">
                  <h4 className="fw-bold mb-4 d-flex align-items-center">
                    <i className="bi bi-receipt text-primary me-3 fs-3"></i>
                    Historial de Compras
                  </h4>
                  {pedidos.length === 0 ? (
                    <div className="text-center py-5 bg-light rounded-4 border-dashed">
                      <i className="bi bi-cart-x text-muted mb-3 d-block" style={{ fontSize: '4rem' }}></i>
                      <h5 className="text-muted fw-bold">No has realizado pedidos todavía</h5>
                      <Button variant="primary" className="rounded-pill mt-3 px-4 fw-bold shadow-sm" onClick={() => navegar("/catalogo")}>Ir al Catálogo</Button>
                    </div>
                  ) : (
                    <div className="pedidos-list">
                      {pedidos.map(pedido => (
                        <Card key={pedido.id_pedido} className="border-0 shadow-sm rounded-4 mb-3 hover-shadow-lg transition-all overflow-hidden border-start border-4" style={{ borderLeftColor: `var(--bs-${getBadgeColor(pedido.id_estado)})` }}>
                          <Card.Body className="p-3">
                            <Row className="align-items-center">
                              <Col xs={12} md={5} className="mb-3 mb-md-0">
                                <div className="d-flex align-items-center">
                                  <div className="bg-light p-1 rounded-3 me-3">
                                    {pedido.productos?.imagen_url?.[0] ? (
                                      <img src={pedido.productos.imagen_url[0]} alt="" style={{ width: 60, height: 60, objectFit: 'cover' }} className="rounded-2 shadow-sm" />
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-center bg-white rounded-2" style={{ width: 60, height: 60 }}>
                                        <i className="bi bi-image text-muted fs-4"></i>
                                      </div>
                                    )}
                                  </div>
                                  <div className="overflow-hidden">
                                    <h6 className="fw-bold mb-0 text-truncate">{pedido.productos?.nombre_producto}</h6>
                                    <small className="text-muted">ID: #{pedido.id_pedido.split('-')[0]}</small>
                                  </div>
                                </div>
                              </Col>
                              <Col xs={6} md={2} className="text-center">
                                <small className="text-muted d-block">Fecha</small>
                                <span className="fw-bold">{new Date(pedido.creado_en).toLocaleDateString()}</span>
                              </Col>
                              <Col xs={6} md={2} className="text-center">
                                <small className="text-muted d-block">Total</small>
                                <span className="text-success fw-bold">C${Number(pedido.precio_unitario).toFixed(2)}</span>
                              </Col>
                              <Col xs={12} md={3} className="text-end mt-3 mt-md-0">
                                <Badge bg={getBadgeColor(pedido.id_estado)} className="rounded-pill px-3 py-2 text-uppercase ls-1 mb-2 d-inline-block w-100 mb-2 shadow-sm">
                                  {getEstadoTexto(pedido.id_estado)}
                                </Badge>
                                <Button variant="outline-primary" size="sm" className="rounded-pill w-100 fw-bold border-2" onClick={() => { setPedidoDetalle(pedido); setShowShipmentModal(true); }}>
                                  <i className="bi bi-truck me-2"></i>Seguir Pedido
                                </Button>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {activeTab === 'direcciones' && (
                <Card className="border-0 shadow-sm rounded-4 p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold mb-0 d-flex align-items-center">
                      <i className="bi bi-geo-alt-fill text-primary me-3 fs-3"></i>
                      Mis Direcciones
                    </h4>
                    <Button variant="primary" size="sm" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowAddressModal(true)}>
                      <i className="bi bi-plus-lg me-2"></i>Nueva
                    </Button>
                  </div>
                  {direcciones.length === 0 ? (
                    <div className="text-center py-5 bg-light rounded-4 border-dashed">
                      <i className="bi bi-geo text-muted mb-3 d-block" style={{ fontSize: '4rem' }}></i>
                      <h5 className="text-muted fw-bold">No tienes direcciones guardadas</h5>
                    </div>
                  ) : (
                    <Row className="g-3">
                      {direcciones.map(dir => (
                        <Col key={dir.id_direccion} md={6}>
                          <Card className="h-100 border shadow-sm rounded-4 hover-shadow transition-all bg-light border-0">
                            <Card.Body className="p-4">
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="bg-white p-2 rounded-circle shadow-sm">
                                  <i className="bi bi-house-door-fill text-primary"></i>
                                </div>
                                <Button variant="link" className="text-danger p-0" onClick={() => eliminarDireccion(dir.id_direccion)}>
                                  <i className="bi bi-trash fs-5"></i>
                                </Button>
                              </div>
                              <h6 className="fw-bold mb-1 fs-5">{dir.nombre} {dir.apellido}</h6>
                              <p className="text-secondary mb-3 small lh-sm">{dir.nombre_calle}</p>
                              {dir.descripcion && <div className="small mb-3 font-italic text-muted px-3 border-start border-3">"{dir.descripcion}"</div>}
                              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-10">
                                <Badge bg="white" text="dark" className="border shadow-sm px-3 py-2 rounded-pill fw-bold">CP: {dir.codigo_postal || 'N/A'}</Badge>
                                <span className="small fw-bold text-primary"><i className="bi bi-telephone-fill me-2"></i>{dir.numero_telefono}</span>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Card>
              )}

              {activeTab === 'metodos' && (
                <Card className="border-0 shadow-sm rounded-4 p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold mb-0 d-flex align-items-center">
                      <i className="bi bi-credit-card-2-front-fill text-primary me-3 fs-3"></i>
                      Métodos de Pago
                    </h4>
                    <Button variant="primary" size="sm" className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowAddModal(true)}>
                      <i className="bi bi-plus-lg me-2"></i>Añadir Tarjeta
                    </Button>
                  </div>
                  {metodosPago.length === 0 ? (
                    <div className="text-center py-5 bg-light rounded-4 border-dashed">
                      <i className="bi bi-credit-card text-muted mb-3 d-block" style={{ fontSize: '4rem' }}></i>
                      <h5 className="text-muted fw-bold">No hay métodos de pago guardados</h5>
                    </div>
                  ) : (
                    <Row className="g-4">
                      {metodosPago.map((metodo) => (
                        <Col key={metodo.id_metodo_pago} md={6}>
                          <div className="modern-card-container position-relative overflow-hidden rounded-4 shadow-sm p-4 text-white" style={{ background: metodo.tipo_metodo === 'Visa' ? 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}>
                            <div className="d-flex justify-content-between align-items-start mb-4">
                              <i className={`bi bi-${metodo.tipo_metodo === 'Visa' ? 'credit-card-2-front' : 'credit-card'} fs-2`}></i>
                              <Button variant="link" className="text-white p-0 opacity-75 hover-opacity-100" onClick={() => eliminarTarjeta(metodo.id_metodo_pago)} disabled={eliminandoTarjetaId === metodo.id_metodo_pago}>
                                {eliminandoTarjetaId === metodo.id_metodo_pago ? <Spinner animation="border" size="sm" /> : <i className="bi bi-trash fs-5"></i>}
                              </Button>
                            </div>
                            <div className="fs-4 mb-4 ls-2 fw-bold">**** **** **** {metodo.ultimo4}</div>
                            <div className="d-flex justify-content-between align-items-end">
                              <div>
                                <small className="text-white-50 d-block text-uppercase ls-1" style={{ fontSize: '0.65rem' }}>Tipo de Tarjeta</small>
                                <span className="fw-bold">{metodo.tipo_metodo || 'Tarjeta'}</span>
                              </div>
                              <div className="text-end">
                                <small className="text-white-50 d-block text-uppercase ls-1" style={{ fontSize: '0.65rem' }}>Guardada</small>
                                <span className="fw-bold small">{new Date(metodo.creado_en).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="card-shine"></div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </Container>

      {/* MODAL DETALLE DE ENVÍO PARA COMPRADOR */}
      {showShipmentModal && pedidoDetalle && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 bg-primary text-white p-4">
                <h5 className="modal-title fw-bold">
                    <i className="bi bi-truck me-2"></i>
                    Detalle del Envío #{pedidoDetalle.id_pedido.slice(0,8)}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowShipmentModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <Row className="g-4">
                  <Col md={6}>
                    <div className="mb-4">
                      <h6 className="text-muted fw-bold text-uppercase small mb-3">Producto</h6>
                      <div className="d-flex align-items-center p-3 bg-light rounded-4">
                        {pedidoDetalle.productos?.imagen_url?.[0] && (
                          <img 
                            src={pedidoDetalle.productos.imagen_url[0]} 
                            alt="" 
                            style={{width: '70px', height: '70px', objectFit: 'cover'}} 
                            className="rounded-3 shadow-sm me-3"
                          />
                        )}
                        <div>
                          <div className="fw-bold">{pedidoDetalle.productos?.nombre_producto}</div>
                          <div className="text-success fw-bold">C${Number(pedidoDetalle.precio_unitario).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h6 className="text-muted fw-bold text-uppercase small mb-3">Estado del Envío</h6>
                      <div className={`p-3 rounded-4 bg-${getBadgeColor(pedidoDetalle.id_estado)} bg-opacity-10 text-${getBadgeColor(pedidoDetalle.id_estado)} border border-${getBadgeColor(pedidoDetalle.id_estado)} border-opacity-25`}>
                         <div className="d-flex align-items-center">
                           <i className={`bi bi-${pedidoDetalle.id_estado === 4 ? 'check-circle' : 'clock'} fs-4 me-3`}></i>
                           <div>
                             <div className="fw-bold">{getEstadoTexto(pedidoDetalle.id_estado)}</div>
                             <small className="opacity-75">Actualizado el {new Date().toLocaleDateString()}</small>
                           </div>
                         </div>
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <h6 className="text-muted fw-bold text-uppercase small mb-3">Dirección de Entrega</h6>
                    {pedidoDetalle.ventas?.direcciones ? (
                      <div className="p-4 border rounded-4 shadow-sm bg-white h-100">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                            <i className="bi bi-geo-alt text-primary"></i>
                          </div>
                          <div>
                            <div className="fw-bold">{pedidoDetalle.ventas.direcciones.nombre} {pedidoDetalle.ventas.direcciones.apellido}</div>
                            <div className="text-muted small">{pedidoDetalle.ventas.direcciones.numero_telefono}</div>
                          </div>
                        </div>
                        
                        <div className="ps-5">
                          <p className="mb-2 text-dark">{pedidoDetalle.ventas.direcciones.nombre_calle}</p>
                          {pedidoDetalle.ventas.direcciones.codigo_postal && (
                             <p className="mb-2"><Badge bg="light" text="dark" className="border">CP: {pedidoDetalle.ventas.direcciones.codigo_postal}</Badge></p>
                          )}
                          {pedidoDetalle.ventas.direcciones.descripcion && (
                            <div className="mt-3 pt-3 border-top">
                              <small className="text-muted d-block mb-1 italic">Referencias:</small>
                              <div className="small text-secondary px-2 border-start border-3">
                                {pedidoDetalle.ventas.direcciones.descripcion}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Alert variant="warning">
                        No se encontró información de dirección para este pedido.
                      </Alert>
                    )}
                  </Col>
                </Row>
              </div>
              <div className="modal-footer border-0 p-4">
                <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowShipmentModal(false)}>Cerrar</Button>
                <Button variant="primary" className="rounded-pill px-4" onClick={() => window.print()}>
                  <i className="bi bi-printer me-2"></i>Imprimir Recibo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PARA AÑADIR TARJETA */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title"><i className="bi bi-credit-card-2-front me-2"></i>Añadir Nueva Tarjeta</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Tipo de Tarjeta</Form.Label>
                  <Form.Select 
                    value={nuevaTarjeta.tipo}
                    onChange={(e) => setNuevaTarjeta({...nuevaTarjeta, tipo: e.target.value})}
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="American Express">American Express</option>
                    <option value="Débito">Tarjeta de Débito</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Últimos 4 Dígitos</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength="4"
                    placeholder="Eje: 4242"
                    value={nuevaTarjeta.ultimo4}
                    onChange={(e) => setNuevaTarjeta({...nuevaTarjeta, ultimo4: e.target.value.replace(/\D/g, '')})}
                  />
                  <Form.Text className="text-muted">
                    Por seguridad, solo guardamos los últimos 4 números.
                  </Form.Text>
                </Form.Group>

                <Alert variant="info" className="small d-flex align-items-center">
                  <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                  Esta tarjeta se añadirá como un método de pago simulado para tus compras.
                </Alert>
              </div>
              <div className="modal-footer border-0">
                <Button variant="light" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                <Button variant="dark" onClick={agregarNuevaTarjeta} disabled={guardandoTarjeta}>
                  {guardandoTarjeta ? 'Guardando...' : 'Añadir Tarjeta'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA AÑADIR DIRECCIÓN */}
      {showAddressModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-geo-alt me-2"></i>Nueva Dirección</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddressModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Nombre</Form.Label>
                      <Form.Control 
                        size="sm" 
                        value={nuevaDireccion.nombre}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, nombre: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Apellido</Form.Label>
                      <Form.Control 
                        size="sm" 
                        value={nuevaDireccion.apellido}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, apellido: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Calle y Número</Form.Label>
                      <Form.Control 
                        size="sm" 
                        placeholder="Ej: Av. Reforma 123"
                        value={nuevaDireccion.nombre_calle}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, nombre_calle: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Referencias / Descripción</Form.Label>
                      <Form.Control 
                        size="sm" 
                        as="textarea" rows={2} 
                        placeholder="Ej: Portón verde, frente al parque..."
                        value={nuevaDireccion.descripcion}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, descripcion: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Código Postal</Form.Label>
                      <Form.Control 
                        size="sm" 
                        value={nuevaDireccion.codigo_postal}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, codigo_postal: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Teléfono</Form.Label>
                      <Form.Control 
                        size="sm" 
                        type="tel"
                        value={nuevaDireccion.numero_telefono}
                        onChange={(e) => setNuevaDireccion({...nuevaDireccion, numero_telefono: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
              <div className="modal-footer border-0">
                <Button variant="light" onClick={() => setShowAddressModal(false)}>Cancelar</Button>
                <Button variant="primary" onClick={agregarDireccion} disabled={guardandoDireccion}>
                  {guardandoDireccion ? 'Guardando...' : 'Guardar Dirección'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;
