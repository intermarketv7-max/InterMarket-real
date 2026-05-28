import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import FormularioLogin from '../components/login/FormularioLogin';
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/icono_intermAeview.png";
import "../App.css";

function Login() {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navegar = useNavigate();
  const { user, loading, role } = useAuth();

  const iniciarSesion = async () => {
    try {
      setCargando(true);
      setError(null);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: usuario,
        password: contraseña,
      });

      if (authError) {
        setError("Credenciales incorrectas. Verifica tus datos.");
        return;
      }
      
      // Tras el login exitoso, no navegamos inmediatamente.
      // El useEffect de abajo detectará el cambio de 'user' y esperará al 'role'.
      localStorage.removeItem("rol-activo");
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesionConGoogle = async () => {
    try {
      setCargando(true);
      setError(null);
      localStorage.removeItem("rol-activo");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError("Error de conexión con Google.");
      setCargando(false);
    }
  };

  useEffect(() => { 
    if (user && !loading) {
      if (role === 'admin') {
        navegar("/admin-inicio", { replace: true });
      } else {
        // Todos los demás usuarios pasan por la selección de rol
        navegar("/seleccion-rol", { replace: true });
      }
    }
  }, [user, loading, role, navegar]);

  return (
    <div className="login-page-bg">
      <Container>
        <Row className="justify-content-center align-items-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={4}>
            <Card className="login-card-unique border-0">
              <Card.Body className="p-4 p-md-4"> {/* Reducido de p-5 a p-4 */}
                <div className="text-center mb-3"> {/* Reducido mb-4 a mb-3 */}
                  <img src={logo} alt="InterMarket" className="img-figma-style mb-3" />
                  <h1 className="login-header-title">InterMarket</h1>
                  <p className="text-muted small mb-0">Gestión de Inventario y Ventas</p>
                </div>
                
                <FormularioLogin
                  usuario={usuario}
                  contraseña={contraseña}
                  error={error}
                  setUsuario={setUsuario}
                  setContraseña={setContraseña}
                  iniciarSesion={iniciarSesion}
                  iniciarSesionConGoogle={iniciarSesionConGoogle}
                  cargando={cargando}
                />

                <div className="text-center mt-3"> {/* Reducido mt-4 a mt-3 */}
                  <small className="text-muted">
                    ¿No tienes una cuenta? <span className="text-primary fw-bold" style={{cursor: 'pointer'}} onClick={() => navegar("/registro")}>Regístrate aquí</span>
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;