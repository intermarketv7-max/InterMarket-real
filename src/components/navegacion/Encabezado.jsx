import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Nav, Navbar, Offcanvas, Dropdown, Badge } from "react-bootstrap";
import logo from "../../assets/icono_intermAeview.png";
import { supabase } from "../../database/supabaseconfig";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

const Encabezado = () => {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [carritoCount, setCarritoCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [fotoUrl, setFotoUrl] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cargar datos del usuario (perfil y notificaciones) de forma optimizada
  useEffect(() => {
    if (!user) {
      setFotoUrl("");
      setNotificaciones([]);
      setNoLeidas(0);
      return;
    }

    const cargarDatosUsuario = async () => {
      try {
        // 1. Obtener perfil_id y foto_perfil en una sola consulta
        const { data: perfilData, error: perfilError } = await supabase
          .from('perfiles')
          .select('perfil_id, foto_perfil')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (perfilError) throw perfilError;
        
        if (perfilData) {
          setFotoUrl(perfilData.foto_perfil || "");
          
          // 2. Cargar notificaciones usando el perfil_id
          const { data: notisData, error: notisError } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', perfilData.perfil_id)
            .order('creado_en', { ascending: false })
            .limit(10);

          if (notisError) throw notisError;
          
          if (notisData) {
            setNotificaciones(notisData);
            setNoLeidas(notisData.filter(n => !n.leido).length);
          }
        }
      } catch (err) {
        console.error("Error cargando datos de usuario:", err);
      }
    };

    cargarDatosUsuario();

    // Suscripción a notificaciones en tiempo real
    const channel = supabase.channel(`notis_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notificaciones' 
      }, () => {
        cargarDatosUsuario();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const marcarComoLeidas = async () => {
    if (noLeidas === 0) return;
    setNoLeidas(0);
    const noLeidasIds = notificaciones.filter(n => !n.leido).map(n => n.id_notificacion);
    if (noLeidasIds.length === 0) return;
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
    await supabase.from('notificaciones').update({ leido: true }).in('id_notificacion', noLeidasIds);
  };

  const borrarNotificacion = async (id, e) => {
    e.stopPropagation(); // Evitar que el dropdown se cierre o marque como leído
    try {
      const { error } = await supabase.from('notificaciones').delete().eq('id_notificacion', id);
      if (error) throw error;
      setNotificaciones(prev => prev.filter(n => n.id_notificacion !== id));
      setNoLeidas(prev => notificaciones.find(n => n.id_notificacion === id)?.leido ? prev : Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error al borrar notificación:", err);
    }
  };

  const vaciarNotificaciones = async () => {
    if (notificaciones.length === 0) return;
    if (!window.confirm("¿Estás seguro de que deseas borrar todas las notificaciones?")) return;
    
    try {
      const ids = notificaciones.map(n => n.id_notificacion);
      const { error } = await supabase.from('notificaciones').delete().in('id_notificacion', ids);
      if (error) throw error;
      setNotificaciones([]);
      setNoLeidas(0);
    } catch (err) {
      console.error("Error al vaciar notificaciones:", err);
    }
  };

  const manejarToggle = () => setMostrarMenu(!mostrarMenu);

  const manejarNavegacion = (ruta) => {
    navigate(ruta);
    setMostrarMenu(false);
  };

  const actualizarCarritoCount = () => {
    const carritoGuardado = JSON.parse(localStorage.getItem("carrito") || "[]");
    setCarritoCount(carritoGuardado.reduce((total, item) => total + (item.cantidad || 0), 0));
  };

  useEffect(() => {
    actualizarCarritoCount();
    window.addEventListener("storage", actualizarCarritoCount);
    window.addEventListener("carritoActualizado", actualizarCarritoCount);
    return () => {
      window.removeEventListener("storage", actualizarCarritoCount);
      window.removeEventListener("carritoActualizado", actualizarCarritoCount);
    };
  }, []);

  const cerrarSesion = async () => {
    await signOut();
    setMostrarMenu(false);
    navigate("/login", { replace: true });
  };

  const esLogin = location.pathname === "/login";
  const esCatalogo = location.pathname === "/catalogo" && !user;

  const MobileNavLink = ({ ruta, icono, texto, color = "" }) => (
    <Nav.Link 
        onClick={() => manejarNavegacion(ruta)} 
        className={`mobile-nav-link ${location.pathname === ruta ? "active" : ""} ${color}`}
    >
        <i className={`bi bi-${icono}`}></i>
        <span>{texto}</span>
    </Nav.Link>
  );

  return (
    <Navbar className={`color-navbar ${scrolled ? 'scrolled shadow-sm' : ''}`} expand="md" fixed="top">
      <Container>
        <Navbar.Brand
          onClick={() => {
            if (role === 'comprador') manejarNavegacion("/catalogo");
            else if (esCatalogo) manejarNavegacion("/catalogo");
            else manejarNavegacion("/");
          }}
          className="d-flex align-items-center"
          style={{ cursor: "pointer" }}
        >
          <img alt="InterMarket" src={logo} width="40" height="40" className="me-2" />
          <h4 className="mb-0 fw-800" style={{ color: 'var(--color-primario)' }}>InterMarket</h4>
        </Navbar.Brand>

        <div className="d-flex align-items-center order-md-2">
          {user && !esLogin && (
            <Dropdown align="end" className="me-2" onToggle={(isOpen) => { if (isOpen) marcarComoLeidas(); }}>
              <Dropdown.Toggle variant="link" className="p-2 text-dark position-relative text-decoration-none border-0 shadow-none">
                <i className="bi bi-bell fs-5"></i>
                {noLeidas > 0 && (
                  <Badge bg="danger" className="position-absolute top-0 start-50 translate-middle rounded-pill" style={{ fontSize: '0.6rem', padding: '0.3em 0.5em' }}>
                    {noLeidas}
                  </Badge>
                )}
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow-lg border-0 rounded-lg mt-2 notification-dropdown" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                <div className="p-2 border-bottom d-flex justify-content-between align-items-center bg-light sticky-top">
                  <span className="mb-0 fw-bold small ms-2">Notificaciones</span>
                  {notificaciones.length > 0 && (
                    <button 
                      className="btn btn-link btn-sm text-danger text-decoration-none small"
                      onClick={vaciarNotificaciones}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
                {notificaciones.length === 0 ? (
                  <div className="p-4 text-center text-muted">No hay notificaciones</div>
                ) : (
                  notificaciones.map(noti => (
                    <Dropdown.Item key={noti.id_notificacion} className={`p-3 border-bottom text-wrap position-relative notification-item ${!noti.leido ? 'bg-light' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className={`fw-bold small pe-4 ${!noti.leido ? 'text-primary' : ''}`}>{noti.titulo}</span>
                        <button 
                          className="btn-close-small position-absolute top-0 end-0 m-2"
                          onClick={(e) => borrarNotificacion(noti.id_notificacion, e)}
                        >
                          <i className="bi bi-x text-muted"></i>
                        </button>
                      </div>
                      <p className="mb-0 small text-secondary" style={{ fontSize: '0.8rem' }}>{noti.mensaje}</p>
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {!esLogin && role === 'comprador' && (
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-pill px-3 me-2 d-flex align-items-center"
              onClick={() => {
                if (location.pathname === "/catalogo") window.dispatchEvent(new Event("abrirCarrito"));
                else { navigate("/catalogo"); setTimeout(() => window.dispatchEvent(new Event("abrirCarrito")), 300); }
              }}
            >
              <i className="bi bi-cart2 me-2"></i>
              <span className="d-none d-sm-inline">Carrito</span>
              {carritoCount > 0 && <Badge bg="white" text="dark" className="ms-2 rounded-pill">{carritoCount}</Badge>}
          </button>
        )}
        
        <Navbar.Toggle aria-controls="offcanvasNavbar-expand-md" onClick={manejarToggle} className="border-0 shadow-none custom-toggler d-md-none">
             <i className={`bi ${mostrarMenu ? 'bi-x-lg' : 'bi-list'}`}></i>
          </Navbar.Toggle>
        </div>

        <Navbar.Collapse className="d-none d-md-flex">
          <Nav className="ms-auto align-items-center">
             {!esLogin && !esCatalogo ? (
                <>
                  {role !== 'comprador' && (
                    <Nav.Link onClick={() => manejarNavegacion("/")} className={location.pathname === "/" ? "active fw-bold" : ""}>Inicio</Nav.Link>
                  )}
                  {role === 'vendedor' && (
                    <>
                      <Nav.Link onClick={() => manejarNavegacion("/productos")} className={location.pathname === "/productos" ? "active fw-bold" : ""}>Productos</Nav.Link>
                      <Nav.Link onClick={() => manejarNavegacion("/tiendas")} className={location.pathname === "/tiendas" ? "active fw-bold" : ""}>Tienda</Nav.Link>
                      <Nav.Link onClick={() => manejarNavegacion("/envios")} className={location.pathname === "/envios" ? "active fw-bold" : ""}>Envíos</Nav.Link>
                    </>
                  )}
                  {role === 'comprador' && (
                    <>
                      <Nav.Link onClick={() => manejarNavegacion("/catalogo")} 
                      className={location.pathname === "/catalogo" ? "active fw-bold" : ""}>Catálogo</Nav.Link>
                    
                    </>
                  )}
                  <Nav.Link onClick={() => manejarNavegacion("/mensajes")} className={location.pathname === "/mensajes" ? "active fw-bold" : ""}>Mensajes</Nav.Link>
                  
                  {user && (
                    <Dropdown align="end" className="ms-3">
                      <Dropdown.Toggle variant="link" className="p-0 border-0 shadow-none d-flex align-items-center text-decoration-none">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt="Foto de perfil"
                            className="rounded-circle me-2"
                            style={{ width: 36, height: 36, objectFit: 'cover', border: '2px solid #f8f9fa' }}
                          />
                        ) : (
                          <div className="user-avatar-circle me-2">
                            {(user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="d-none d-lg-block text-start">
                          <div className="fw-bold text-dark small leading-tight" style={{fontSize: '0.85rem'}}>{user.email?.split('@')[0]}</div>
                          <div className="text-muted extra-small" style={{fontSize: '0.7rem'}}>Rol: {role || '...'}</div>
                        </div>
                        <i className="bi bi-chevron-down ms-2 small text-muted"></i>
                      </Dropdown.Toggle>

                      <Dropdown.Menu className="shadow-lg border-0 rounded-lg mt-2">
                        <div className="px-3 py-2 border-bottom d-lg-none">
                          <div className="fw-bold text-dark small">{user.email}</div>
                          <div className="text-muted extra-small">Rol: {role}</div>
                        </div>
                        <Dropdown.Item onClick={() => manejarNavegacion("/seleccion-rol")} className="py-2">
                          <i className="bi bi-arrow-left-right me-2"></i> Cambiar de rol
                        </Dropdown.Item>
                        {role === 'comprador' && (
                          <Dropdown.Item onClick={() => manejarNavegacion("/perfil")} className="py-2">
                            <i className="bi bi-person me-2"></i> Mi Perfil
                          </Dropdown.Item>
                        )}
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={cerrarSesion} className="text-danger py-2">
                          <i className="bi bi-box-arrow-right me-2"></i> Cerrar sesión
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                </>
             ) : (
                <Nav.Link onClick={() => manejarNavegacion("/login")} className="fw-bold"><i className="bi bi-person-circle me-2"></i>Acceso</Nav.Link>
             )}
          </Nav>
        </Navbar.Collapse>

        <Navbar.Offcanvas
          id="offcanvasNavbar-expand-md"
          aria-labelledby="offcanvasNavbarLabel-expand-md"
          placement="end"
          show={mostrarMenu}
          onHide={() => setMostrarMenu(false)}
          className="modern-offcanvas d-md-none"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title id="offcanvasNavbarLabel-expand-md">InterMarket</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="d-flex flex-column p-0">
            {user ? (
                <>
                  <div className="offcanvas-user-section d-flex align-items-center gap-2">
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt="Foto de perfil"
                        className="rounded-circle"
                        style={{ width: 40, height: 40, objectFit: 'cover', border: '2px solid #f8f9fa' }}
                      />
                    ) : (
                      <div className="user-avatar-placeholder">{(user.email || "U").charAt(0).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="fw-bold text-dark small">{user.email || 'Usuario'}</div>
                      <div className="text-muted" style={{fontSize: '0.75rem'}}>Rol: {role || 'Cargando...'}</div>
                    </div>
                  </div>
                  <Nav className="flex-column">
                    <MobileNavLink ruta="/" icono="house" texto="Inicio" />
                    {role === 'vendedor' && (
                      <>
                        <MobileNavLink ruta="/productos" icono="box-seam" texto="Mis Productos" />
                        <MobileNavLink ruta="/tiendas" icono="shop" texto="Mi Tienda" />
                        <MobileNavLink ruta="/envios" icono="truck" texto="Envíos" />
                        <MobileNavLink ruta="/vendedor" icono="graph-up-arrow" texto="Panel de Ventas" />
                      </>
                    )}
                    {role === 'comprador' && (
                      <>
                        <MobileNavLink ruta="/catalogo" icono="search" texto="Explorar Productos" />
                        <MobileNavLink ruta="/perfil" icono="person-badge" texto="Mi Perfil" />
                      </>
                    )}
                    <MobileNavLink ruta="/mensajes" icono="chat-left-dots" texto="Mensajes" />
                    <MobileNavLink ruta="/seleccion-rol" icono="arrow-left-right" texto="Cambiar de rol" />
                    <div className="mt-4">
                        <Nav.Link onClick={cerrarSesion} className="mobile-nav-link mobile-logout">
                          <i className="bi bi-box-arrow-left"></i>
                          <span>Cerrar sesión</span>
                        </Nav.Link>
                    </div>
                  </Nav>
                </>
            ) : (
              <Nav className="flex-column">
                <MobileNavLink ruta="/login" icono="person-circle" texto="Iniciar sesión" />
                {location.pathname !== "/catalogo" && (
                  <MobileNavLink ruta="/catalogo" icono="grid" texto="Ver Catálogo" />
                )}
              </Nav>
            )}
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </Container>
    </Navbar>
  );
};

export default Encabezado;
