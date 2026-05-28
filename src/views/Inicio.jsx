import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';
import InicioComprador from './InicioComprador';
import InicioVendedor from './InicioVendedor';
import AdminInicio from './AdminInicio';

function Inicio() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Redirección directa para el admin
  if (role === 'admin') {
    return <AdminInicio />;
  }

  // Si no hay rol, RutaProtegida ya debería manejar la redirección a /seleccion-rol
  if (role === 'vendedor') {
    return <InicioVendedor />;
  }

  return <InicioComprador />;
}

export default Inicio;