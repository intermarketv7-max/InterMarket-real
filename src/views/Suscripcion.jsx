import React, { useState } from "react";
import { Container, Row, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../database/supabaseconfig";
import TarjetaPlan from "../components/suscripcion/TarjetaPlan";
import { loadStripe } from "@stripe/stripe-js";

// Reemplaza con tu Clave Pública de Stripe
const stripePromise = loadStripe("pk_test_51TS0U8F9vHC8qRJnqsBAVYjlDmBQkC0nBONPR3S0riIf8zbvo8TH7bGXm8g5wlIpGdP0lh3n4COqc1yU1GxqJj8s00igaaAA43");

const Suscripcion = () => {
  const navigate = useNavigate();
  const { user, role, changeRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const planes = [
    {
      id: "plan_bronce",
      nombre: "Plan Bronce",
      precio: 9.99,
      priceId: "price_bronce_id", // ID de precio de Stripe
      duracion: "Mensual",
      caracteristicas: [
        "Hasta 50 productos",
        "Soporte por email",
        "Estadísticas básicas",
        "Panel de vendedor"
      ],
      color: "#cd7f32"
    },
    {
      id: "plan_plata",
      nombre: "Plan Plata",
      precio: 24.99,
      priceId: "price_plata_id", // ID de precio de Stripe
      duracion: "Trimestral",
      caracteristicas: [
        "Hasta 200 productos",
        "Soporte prioritario",
        "Estadísticas avanzadas",
        "Destacados en catálogo"
      ],
      color: "#c0c0c0",
      popular: true
    },
    {
      id: "plan_oro",
      nombre: "Plan Oro",
      precio: 79.99,
      priceId: "price_oro_id", // ID de precio de Stripe
      duracion: "Anual",
      caracteristicas: [
        "Productos ilimitados",
        "Soporte 24/7",
        "Asesoría de marketing",
        "Cero comisiones por venta"
      ],
      color: "#ffd700"
    }
  ];

  const handleSuscripcion = async (plan) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Crear sesión de Stripe Checkout (Simulado o vía API externa)
      // En una implementación real, aquí llamarías a una función de Supabase o API propia
      // que use la librería 'stripe' para crear la sesión y devolver el sessionId.
      
      console.log("Iniciando pago con Stripe para el plan:", plan.nombre);
      
      // Simulación de flujo de Stripe Checkout
      const stripe = await stripePromise;
      
      /* 
      // CÓDIGO REAL PARA PRODUCCIÓN (Requiere Backend/Edge Function):
      const { data, error: apiError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: plan.priceId, userId: user.id }
      });
      
      if (apiError) throw apiError;
      
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
      
      if (result.error) throw result.error;
      */

      // --- MODO DEMOSTRACIÓN (Actualización directa mientras configuras tu Backend) ---
      
      // Guardar la suscripción en Supabase
      const { error: subError } = await supabase
        .from("suscripciones")
        .insert([
          {
            id_usuario: user.id,
            plan: plan.nombre,
            monto: plan.precio,
            estado: "activo",
            fecha_inicio: new Date().toISOString(),
            fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]);

      if (subError) throw subError;

      // Actualizar el rol del usuario a 'vendedor'
      const { error: roleError } = await supabase
        .from("usuarios")
        .update({ rol: "vendedor" })
        .eq("id_usuario", user.id);

      if (roleError) throw roleError;

      changeRole("vendedor");
      navigate("/vendedor");
      
    } catch (err) {
      console.error("Error al procesar suscripción con Stripe:", err);
      setError(err.message || "Error al conectar con Stripe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="text-center mb-5">
        <h1 className="fw-bold display-4 mb-3" style={{ color: "#10454F" }}>Haz crecer tu negocio</h1>
        <p className="text-muted fs-5 mx-auto" style={{ maxWidth: "600px" }}>
          Elige el plan que mejor se adapte a tus necesidades. Pagos seguros procesados por <strong>Stripe</strong>.
        </p>
      </div>

      {error && <Alert variant="danger" className="mb-4 w-100" style={{ maxWidth: "900px" }}>{error}</Alert>}

      <Row className="justify-content-center g-4 w-100" style={{ maxWidth: "1100px" }}>
        {planes.map((plan) => (
          <TarjetaPlan 
            key={plan.id} 
            plan={plan} 
            loading={loading} 
            onSelect={handleSuscripcion} 
          />
        ))}
      </Row>

      <div className="text-center mt-5">
        <Button variant="link" className="text-muted text-decoration-none" onClick={() => navigate("/seleccion-rol")}>
          <i className="bi bi-arrow-left me-2"></i>
          Volver a selección de rol
        </Button>
      </div>
    </Container>
  );
};

export default Suscripcion;
