import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";

import Encabezado from "./components/navegacion/Encabezado";
import RutaProtegida from "./components/rutas/RutaProtegida";
import "./App.css"

// Lazy Loading de las Vistas
const Inicio = lazy(() => import("./views/Inicio"));
const Catalogo = lazy(() => import("./views/Catalogo"));
const Categorias = lazy(() => import("./views/Categorias"));
const Login = lazy(() => import("./views/Login"));
const Registro = lazy(() => import("./views/Registro"));
const Productos = lazy(() => import("./views/Productos"));
const Tiendas = lazy(() => import("./views/Tiendas"));
const Vendedor = lazy(() => import("./views/Vendedor"));
const Pagina404 = lazy(() => import("./views/Pagina404"));
const VistaRol = lazy(() => import("./views/vista_rol"));
const AdminInicio = lazy(() => import("./views/AdminInicio"));
const Perfil = lazy(() => import("./views/Perfil"));
const Mensajes = lazy(() => import("./views/Mensajes"));
const Suscripcion = lazy(() => import("./views/Suscripcion"));
const CheckoutSuccess = lazy(() => import("./views/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./views/CheckoutCancel"));
const GestionEnvios = lazy(() => import("./views/GestionEnvios"));

const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <Spinner animation="border" variant="primary" />
  </div>
);

const AppLayout = () => {
  const location = useLocation();
  
  // Normalizar path con protección extra
  const pathname = location?.pathname || "";
  const currentPath = (pathname || "").toLowerCase().replace(/\/$/, "");
  
  // No mostrar encabezado en estas rutas específicas
  const rutasSinNavbar = ["/login", "/registro", "/seleccion-rol"];
  const mostrarEncabezado = !rutasSinNavbar.includes(currentPath || "/");

  // Nota: Si currentPath es vacío (ruta raíz), se maneja por separado si es necesario.
  // Pero aquí, si currentPath es "", mostramos el navbar si no está en la lista.
  
  // Re-evaluación simplificada:
  const isAuthPage = currentPath === "/login" || currentPath === "/registro" || currentPath === "/seleccion-rol" || currentPath === "/suscripcion";
  const shouldShowNavbar = !isAuthPage;

  return (
    <>
      {shouldShowNavbar && <Encabezado />}

      <main className={shouldShowNavbar ? "margen-superior-main" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login/>} />
            <Route path="/registro" element={<Registro/>} />
            
            {/* Ruta Inicio redirige según el rol */}
            <Route path="/" element={<RutaProtegida><Inicio/></RutaProtegida>} />
            
            {/* Selección de vista/rol */}
            <Route path="/seleccion-rol" element={<RutaProtegida><VistaRol /></RutaProtegida>} />
            <Route path="/suscripcion" element={<RutaProtegida><Suscripcion /></RutaProtegida>} />
            
            {/* Rutas compartidas o públicas */}
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/perfil" element={<RutaProtegida><Perfil /></RutaProtegida>} />
            <Route path="/mensajes" element={<RutaProtegida><Mensajes /></RutaProtegida>} />
            
            {/* Rutas de Pago (Stripe) */}
            <Route path="/success" element={<RutaProtegida><CheckoutSuccess /></RutaProtegida>} />
            <Route path="/cancel" element={<RutaProtegida><CheckoutCancel /></RutaProtegida>} />
            
         {/* Rutas de Productos - Tanto Admin como Vendedor */}
<Route 
    path="/productos" 
    element={
        <RutaProtegida rolesPermitidos={['vendedor', 'admin']}>
            <Productos />
        </RutaProtegida>
    } 
/>

{/* Rutas exclusivas de Vendedor */}
<Route path="/tiendas" element={<RutaProtegida rolesPermitidos={['vendedor']}><Tiendas /></RutaProtegida>} />
<Route path="/vendedor" element={<RutaProtegida rolesPermitidos={['vendedor']}><Vendedor /></RutaProtegida>} />
<Route path="/envios" element={<RutaProtegida rolesPermitidos={['vendedor']}><GestionEnvios /></RutaProtegida>} />

{/* Rutas de Administrador */}
<Route path="/admin-inicio" element={<RutaProtegida><AdminInicio /></RutaProtegida>} />
<Route path="/categorias" element={<RutaProtegida><Categorias /></RutaProtegida>} />


            
            <Route path="*" element={<Pagina404 />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
