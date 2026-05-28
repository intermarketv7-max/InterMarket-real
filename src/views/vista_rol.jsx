import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../database/supabaseconfig";
import { Row, Col, Container, Spinner } from "react-bootstrap";
import "../App.css";

const VistaRol = () => {
  const navigate = useNavigate();
  const { user, role, changeRole, signOut } = useAuth();
  const [verificando, setVerificando] = useState(false);

  // Redirigir automáticamente solo al admin, compradores y vendedores eligen manualmente
  React.useEffect(() => {
    if (role === 'admin') {
      navigate("/admin-inicio", { replace: true });
    }
    // Eliminamos la redirección automática para vendedor y comprador
  }, [role, navigate]);

  const handleRoleSelection = async (rol) => {
    if (rol === "vendedor") {
      setVerificando(true);
      try {
        // Verificar si ya tiene el rol de vendedor en la BD
        const { data, error } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id_usuario", user.id)
          .single();

        if (error) throw error;

        if (data.rol === "vendedor") {
          // Si ya es vendedor, simplemente cambiamos el rol activo y navegamos
          changeRole("vendedor");
          navigate("/vendedor");
        } else {
          // Si no es vendedor, enviarlo a suscribirse
          navigate("/suscripcion");
        }
      } catch (err) {
        console.error("Error al verificar rol:", err);
        // Por defecto, si hay error, enviamos a suscripción para estar seguros
        navigate("/suscripcion");
      } finally {
        setVerificando(false);
      }
    } else {
      changeRole(rol);
      navigate("/catalogo");
    }
  };

  const cerrarSesion = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      navigate("/login", { replace: true });
    }
  };

  return (
    <section className="rol-page-modern-bg">
      <Container className="rol-container-wow">
        <div className="mb-5">
            <h1 className="fw-900 mb-3" style={{ color: 'var(--color-primario)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '-2px' }}>
                Tu siguiente paso
            </h1>
            <p className="text-muted fs-5">Elige cómo quieres interactuar con InterMarket hoy.</p>
        </div>

        <Row className="justify-content-center g-4">
          <Col md={6} lg={5}>
            <div
              className={`rol-card-wow h-100 ${verificando ? 'pe-none opacity-50' : ''}`}
              onClick={() => !verificando && handleRoleSelection("comprador")}
            >
              <div className="rol-icon-wow">
                <i className="bi bi-cart-check" />
              </div>
              <h2 className="rol-title-card">Comprador</h2>
              <p className="rol-desc-card">
                Explora productos únicos, descubre ofertas exclusivas y gestiona tus pedidos con facilidad.
              </p>
            </div>
          </Col>

          <Col md={6} lg={5}>
            <div
              className={`rol-card-wow h-100 ${verificando ? 'pe-none opacity-50' : ''}`}
              onClick={() => !verificando && handleRoleSelection("vendedor")}
            >
              <div className="rol-icon-wow">
                {verificando ? (
                  <Spinner animation="border" variant="primary" />
                ) : (
                  <i className="bi bi-graph-up-arrow" />
                )}
              </div>
              <h2 className="rol-title-card">Vendedor</h2>
              <p className="rol-desc-card">
                Haz crecer tu negocio, publica nuevos productos y lleva el control total de tus ventas.
              </p>
            </div>
          </Col>
        </Row>

        <button type="button" className="rol-btn-logout-wow shadow-sm" onClick={cerrarSesion}>
          <i className="bi bi-power me-2"></i>
          Cerrar sesión segura
        </button>
      </Container>
    </section>
  );
};

export default VistaRol;