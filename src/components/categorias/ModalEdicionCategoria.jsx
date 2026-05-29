import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { supabase } from '../../database/supabaseconfig';

const ModalEdicionCategoria = ({
    mostrarModalEdicion,
    setMostrarModalEdicion,
    categoriaEditar,
    manejarCambioInputEdicion,
    actualizarCategoria
}) => {
    const [deshabilitar, setDeshabilitar] = useState(false);

    const handleActualizar = async () => {
        if (deshabilitar) return;
        setDeshabilitar(true);
        try {
            await actualizarCategoria();
        } finally {
            // Se usa finally para asegurar que el botón se reactive 
            // incluso si la petición a Supabase falla.
            setDeshabilitar(false);
        }
    };

    return (
        <Modal
            show={mostrarModalEdicion}
            onHide={() => setMostrarModalEdicion(false)}
            backdrop="static"
            keyboard={false}
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>Editar Categoría</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3" controlId="formNombreCategoria">
                        <Form.Label>Nombre de la Categoría</Form.Label>
                        <Form.Control
                            type="text"
                            name="nombre_categoria" // Indispensable para el manejo de inputs
                            placeholder="Ingrese el nombre de la categoría"
                            value={categoriaEditar.nombre_categoria}          
                            onChange={manejarCambioInputEdicion}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formDescripcion">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea" // Opcional: permite ver mejor el texto largo
                            rows={3}
                            name="descripcion" // Indispensable
                            placeholder="Ingrese la descripción de la categoría"
                            value={categoriaEditar.descripcion}          
                            onChange={manejarCambioInputEdicion}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setMostrarModalEdicion(false)}>
                    Cancelar
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleActualizar} 
                    disabled={!categoriaEditar.nombre_categoria?.trim() || deshabilitar}
                >
                    {deshabilitar ? 'Guardando...' : 'Actualizar'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalEdicionCategoria;