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
      priceId: "price_1TcbUNF9vHC8qRJniq5xcaj0", // ID de precio de Stripe
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
      priceId: "price_1TcbW0F9vHC8qRJn1pV3bMnt", // ID de precio de Stripe
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
      priceId: "price_1TcbWZF9vHC8qRJn4GKK4ebQ", // ID de precio de Stripe
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
      const stripe = await stripePromise;
      if (!stripe) throw new Error("No se pudo cargar Stripe");

      console.log("Redirigiendo a Stripe Checkout para el plan:", plan.nombre);

      // Usar redirectToCheckout con Client-only integration
      const { error: stripeError } = await stripe.redirectToCheckout({
        lineItems: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/suscripcion`,
      });

      if (stripeError) {
        throw stripeError;
      }
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
