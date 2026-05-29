import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import TablaCategorias from "../components/categorias/TablaCategorias";
import { supabase } from "../database/supabaseconfig";
import NotificacionOperacion from '../components/NotificacionOperacion';
import ModalRegistroCategoria from '../components/categorias/ModalRegistroCategoria';
import TarjetaCategoria from "../components/categorias/TarjetaCategoria";
import ModalEdicionCategoria from "../components/categorias/ModalEdicionCategoria";
import ModalEliminarCategoria from "../components/categorias/ModalEliminacionCategoria";
import CuadroBusquedas from "../components/busquedas/CuadroBusquedas";
import Paginacion from "../components/ordenamiento/Paginacion";

const Categorias = () => {
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
    const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
    const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
    const [toast, setToast] = useState({ mostrar: false, mensaje: '', tipo: '' });
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
    const [registrosPorPagina, establecerRegistrosPorPagina] = useState(5);
const [paginaActual, establecerPaginaActual] = useState(1);

    const [categoriaEditar, setCategoriaEditar] = useState({
        id_categoria: "",
        nombre_categoria: "",
        descripcion: "",
    });

    const [nuevaCategoria, setNuevaCategoria] = useState({
        nombre_categoria: '',
        descripcion: ''
    });

    const manejoCambioInput = (e) => {
        const { name, value } = e.target;
        setNuevaCategoria(prev => ({ ...prev, [name]: value }));
    };

    const manejarBusqueda = (e) => {
  setTextoBusqueda(e.target.value);
};

    const manejoCambioInputEdicion = (e) => {
        const { name, value } = e.target;
        setCategoriaEditar(prev => ({ ...prev, [name]: value }));
    };

    // --- FUNCIÓN ACTUALIZAR (Corregida) ---
   const actualizarCategoria = async () => {
  try {
    if (
      !categoriaEditar.nombre_categoria.trim() ||
      !categoriaEditar.descripcion.trim()
    ) {
      setToast({
        mostrar: true,
        mensaje: "Debe llenar todos los campos.",
        tipo: "advertencia",
      });
      return;
    }

    setMostrarModalEdicion(false);

    const { error } = await supabase
      .from("categorias")
      .update({
        nombre_categoria: categoriaEditar.nombre_categoria,
        descripcion: categoriaEditar.descripcion,
      })
      .eq("id_categoria", categoriaEditar.id_categoria);

    if (error) {
      console.error("Error al actualizar categoría:", error.message);
      setToast({
        mostrar: true,
        mensaje: `Error al actualizar la categoría ${categoriaEditar.nombre_categoria}.`,
        tipo: "error",
      });
      return;
    }

    await cargarCategorias();

    setToast({
      mostrar: true,
      mensaje: `Categoría ${categoriaEditar.nombre_categoria} actualizada exitosamente.`,
      tipo: "exito",
    });

  } catch (err) {
    setToast({
      mostrar: true,
      mensaje: "Error inesperado al actualizar categoría.",
      tipo: "error",
    });
    console.error("Excepción al actualizar categoría:", err.message);
  }
};

const categoriasPaginadas = categoriasFiltradas.slice(
  (paginaActual - 1) * registrosPorPagina,
  paginaActual * registrosPorPagina
);



const eliminarCategoria = async () => {
    if (!categoriaAEliminar) return;
    try {
        setMostrarModalEliminacion(false);
        const { error } = await supabase
            .from("categorias")
            .delete()
            .eq("id_categoria", categoriaAEliminar.id_categoria);

        if (error) {
            console.error("Error al eliminar categoría:", error.message);
            setToast({
                 mostrar: true, 
                 mensaje: "Error al eliminar la categoría.", 
                 tipo: "error" 
        });
            return; 
        }

        await cargarCategorias();

        setToast({ mostrar: true, 
            mensaje: `Categoría ${categoriaAEliminar.nombre_categoria} eliminada exitosamente.`, 
            tipo: "exito" 
        });
    } catch (err) {
        setToast({ mostrar: true, 
            mensaje: "Error al eliminar la categoría.", 
            tipo: "error" });
    }
};
   

    const agregarCategoria = async () => {
        try {
            if (!nuevaCategoria.nombre_categoria.trim() || !nuevaCategoria.descripcion.trim()) {
                setToast({ mostrar: true, mensaje: "Debe llenar todos los campos.", tipo: "advertencia" });
                return;
            }

            const { error } = await supabase.from("categorias").insert([
                {
                    nombre_categoria: nuevaCategoria.nombre_categoria,
                    descripcion: nuevaCategoria.descripcion,
                },
            ]);

            if (error) throw error;

            setToast({ mostrar: true, mensaje: `Categoría registrada exitosamente.`, tipo: "exito" });
            setNuevaCategoria({ nombre_categoria: "", descripcion: "" });
            setMostrarModal(false);
            cargarCategorias(); // Recargar lista
        } catch (err) {
            setToast({ mostrar: true, mensaje: "Error al registrar.", tipo: "error" });
        }
    };

    const cargarCategorias = async () => {
        try {
            setCargando(true);
            const { data, error } = await supabase
                .from("categorias")
                .select("*")
                .order("id_categoria", { ascending: true });

            if (error) throw error;
            setCategorias(data || []);
        } catch (err) {
            console.error("Error:", err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarCategorias();
    }, []);

    useEffect(() => {
        
  if (!textoBusqueda.trim()) {
    setCategoriasFiltradas(categorias);
  } else {
    const textoLower = textoBusqueda.toLowerCase().trim();
    const filtradas = categorias.filter(
      (cat) =>
        (cat.nombre_categoria?.toLowerCase() || '').includes(textoLower) ||
        (cat.descripcion?.toLowerCase() || '').includes(textoLower)
    );
    setCategoriasFiltradas(filtradas);
  }
}, [textoBusqueda, categorias]);

    useEffect(() => {
        establecerPaginaActual(1);
    }, [textoBusqueda]);

    const abrirModalEdicion = (categoria) => {
        setCategoriaEditar(categoria);
        setMostrarModalEdicion(true);
    };

    const abrirModalEliminacion = (categoria) => {
        setCategoriaAEliminar(categoria);
        setMostrarModalEliminacion(true);
    };

    return (
        <Container>
            <br />
            <Row className="align-items-center mb-3">
                <Col xs={9}>
                    <h3><i className="bi-bookmark-plus-fill me-2"></i> Categorías</h3>
                </Col>
                <Col xs={3} className="text-end">
                    <Button onClick={() => setMostrarModal(true)}>
                        <i className="bi-plus-lg"></i> <span className="d-none d-sm-inline">Nueva</span>
                    </Button>
                </Col>
            </Row>
            <hr />

            <CuadroBusquedas
                textoBusqueda={textoBusqueda}
                manejarCambioBusqueda={manejarBusqueda}
            />

            {textoBusqueda.trim() !== '' && categoriasFiltradas.length === 0 && (
                <Alert variant="warning" className="mt-3">
                    No se encontraron categorías que coincidan con la búsqueda.
                </Alert>
            )}

            <ModalRegistroCategoria
                mostrarModal={mostrarModal}
                setMostrarModal={setMostrarModal}
                nuevaCategoria={nuevaCategoria}
                manejoCambioInput={manejoCambioInput}
                agregarCategoria={agregarCategoria}
            />

          
            <ModalEdicionCategoria 
                mostrarModalEdicion={mostrarModalEdicion} 
                setMostrarModalEdicion={setMostrarModalEdicion}
                categoriaEditar={categoriaEditar}
                manejarCambioInputEdicion={manejoCambioInputEdicion}
                actualizarCategoria={actualizarCategoria}
            /> 

            <ModalEliminarCategoria
                mostrarModalEdicion={mostrarModalEliminacion}
                setMostrarModalEliminacion={setMostrarModalEliminacion}
                eliminarCategoria={eliminarCategoria}
                categoria={categoriaAEliminar}
            />

            <NotificacionOperacion
                mostrar={toast.mostrar}
                mensaje={toast.mensaje}
                tipo={toast.tipo}
                onCerrar={() => setToast({ ...toast, mostrar: false })}
            />

            {cargando ? (
                <div className="text-center my-5">
                    <Spinner animation="border" variant="success" />
                </div>
            ) : (
                <>
                    {/* Vista Móvil */}
                    <div className="d-lg-none">
                        <TarjetaCategoria
                            categorias={categoriasPaginadas}
                            abrirModalEdicion={abrirModalEdicion}
                            abrirModalEliminacion={abrirModalEliminacion}
                        />
                    </div>

                    {/* Vista Escritorio */}
                    <div className="d-none d-lg-block">
                        <TablaCategorias
                            categorias={categoriasPaginadas}
                            abrirModalEdicion={abrirModalEdicion}
                            abrirModalEliminacion={abrirModalEliminacion}
                        />
                    </div>

                    {categorias.length === 0 && <p className="text-center">No hay datos.</p>}
                </>
            )}

            <Paginacion
                registrosPorPagina={registrosPorPagina}
                totalRegistros={categoriasFiltradas.length}
                paginaActual={paginaActual}
                establecerPaginaActual={establecerPaginaActual}
                establecerRegistrosPorPagina={establecerRegistrosPorPagina}
            />
        </Container>
    );
};

export default Categorias;