import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Componentes
import StatsVendedor from "../components/vendedor/StatsVendedor";
import TablaPedidosVendedor from "../components/vendedor/TablaPedidosVendedor";
import ModalSuscripcionVendedor from "../components/vendedor/ModalSuscripcionVendedor";

const Vendedor = () => {
  const { user, changeRole } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [miPerfilId, setMiPerfilId] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para la suscripción
  const [suscripcion, setSuscripcion] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const cargarDatos = async () => {
    if (!user) return;
    try {
      setCargando(true);
      
      // 1. Obtener la tienda del vendedor, su perfil_id y su suscripción
      const [perfilRes, subRes] = await Promise.all([
        supabase
          .from('perfiles')
          .select('perfil_id, id_tienda')
          .eq('id_usuario', user.id)
          .maybeSingle(),
        supabase
          .from('suscripciones')
          .select('*')
          .eq('id_usuario', user.id)
          .eq('estado', 'activo')
          .maybeSingle()
      ]);

      const perfil = perfilRes.data;
      setSuscripcion(subRes.data);
        
      if (!perfil?.id_tienda) {
        setPedidos([]);
        setCargando(false);
        return;
      }
      setMiPerfilId(perfil.perfil_id);
      
      // 2. Obtener los pedidos asociados a los productos de su tienda
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id_pedido,
          creado_en,
          precio_unitario,
          id_estado,
          id_producto,
          cantidad,
          talla_seleccionada,
          color_seleccionado,
          productos!inner (nombre_producto, id_tienda),
          perfiles ( usuarios ( username ) )
        `)
        .eq("productos.id_tienda", perfil.id_tienda)
        .order("creado_en", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      console.error("Error al cargar datos:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    
    if (user) {
      // Suscripción a cambios en la tabla pedidos
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pedidos'
          },
          (payload) => {
            cargarDatos();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      }
    }
  }, [user]);

  const terminarSuscripcion = async () => {
    if (!suscripcion) return;
    setCancelando(true);
    try {
      // 1. Marcar suscripción como cancelada
      const { error: subError } = await supabase
        .from('suscripciones')
        .update({ estado: 'cancelado' })
        .eq('id_suscripcion', suscripcion.id_suscripcion);

      if (subError) throw subError;

      // 2. Cambiar el rol del usuario a 'comprador'
      const { error: roleError } = await supabase
        .from('usuarios')
        .update({ rol: 'comprador' })
        .eq('id_usuario', user.id);

      if (roleError) throw roleError;

      // 3. Actualizar contexto y redirigir
      changeRole('comprador');
      navigate('/seleccion-rol');
    } catch (err) {
      console.error("Error al cancelar suscripción:", err);
      alert("No se pudo cancelar la suscripción. Intenta de nuevo.");
    } finally {
      setCancelando(false);
      setShowSubModal(false);
    }
  };

  const cambiarEstadoPedido = async (id_pedido, nuevoEstadoId) => {
    try {
      // 1. Obtener datos del pedido antes de actualizar para saber qué producto es
      const pedido = pedidos.find(p => p.id_pedido === id_pedido);
      
      // 2. Si el estado pasa a 2 (Aceptado/Pagado) y antes era 1 (Pendiente), reducimos stock
      if (nuevoEstadoId === 2 && pedido && pedido.id_estado === 1) {
          // Buscamos el stock actual del producto
          const { data: producto } = await supabase
              .from('productos')
              .select('stock, nombre_producto')
              .eq('id_producto', pedido.id_producto)
              .single();

          if (producto && producto.stock !== null) {
              const cantidad = Number(pedido.cantidad || 1);
              const nuevoStock = Math.max(0, Number(producto.stock) - cantidad);
              
              // Actualizar el stock en Supabase
              await supabase
                  .from('productos')
                  .update({ stock: nuevoStock })
                  .eq('id_producto', pedido.id_producto);
              
              // --- NUEVO: Alerta de Stock Bajo para el vendedor ---
              if (nuevoStock <= 5 && miPerfilId) {
                  await supabase.from('notificaciones').insert([{
                      usuario_id: miPerfilId, // Usar perfil_id en lugar de user.id
                      titulo: '⚠️ ¡Stock Bajo!',
                      mensaje: `El producto "${producto.nombre_producto}" tiene solo ${nuevoStock} unidades disponibles.`
                  }]);
              }
              
              console.log(`Stock de ${producto.nombre_producto} reducido a ${nuevoStock}`);
          }
      }

      // 3. Actualizar el estado del pedido
      const { error } = await supabase
        .from("pedidos")
        .update({ id_estado: nuevoEstadoId })
        .eq("id_pedido", id_pedido);
        
      if (error) throw error;
      cargarPedidos();
    } catch (error) {
      console.error("Error en cambiarEstadoPedido:", error);
      alert("Error al actualizar pedido");
    }
  };

  const badgeColor = (id_estado) => {
    switch(id_estado) {
      case 1: return 'warning'; // Pendiente
      case 2: return 'success'; // Pagado / Aceptado
      case 3: return 'danger'; // Cancelado / Rechazado
      case 4: return 'info'; // Entregado / Completado
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

  return (
    <Container>
      
      <Row className="mb-4 align-items-center">
        <Col xs={8} md={9}>
          <h2 className="text-primary mb-0"><i className="bi bi-speedometer2 me-2"></i>Dashboard Vendedor</h2>
        </Col>
        <Col xs={4} md={3} className="text-end">
          {suscripcion && (
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="rounded-pill px-3 shadow-sm"
              onClick={() => setShowSubModal(true)}
            >
              <i className="bi bi-gem me-1"></i>
              <span>Mi Plan</span>
            </Button>
          )}
        </Col>
      </Row>

      <StatsVendedor pedidos={pedidos} />

      <Card className="shadow-sm border-0 mb-5">
        <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
          <h4 className="m-0"><i className="bi bi-list-check me-2"></i>Gestión de Pedidos</h4>
        </Card.Header>
        <Card.Body>
          <TablaPedidosVendedor 
            pedidos={pedidos} 
            cargando={cargando} 
            cambiarEstadoPedido={cambiarEstadoPedido} 
          />
        </Card.Body>
      </Card>

      <ModalSuscripcionVendedor 
        show={showSubModal} 
        onHide={() => setShowSubModal(false)} 
        suscripcion={suscripcion} 
        cancelando={cancelando} 
        onTerminar={terminarSuscripcion} 
      />
    </Container>
  );
};

export default Vendedor;