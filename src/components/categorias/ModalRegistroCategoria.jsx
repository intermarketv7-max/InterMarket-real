import React, {useState} from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const ModalRegistroCategoria =({
    mostrarModal,
    setMostrarModal,
    nuevaCategoria,
    manejoCambioInput,
    agregarCategoria
}) => {
    const [desabilitado, setDesabilitado] = useState(false);

    const handleRegistrar = async () => {
        if (desabilitado) return;
        setDesabilitado(true);
        await agregarCategoria();
        setDesabilitado(false);
    };

    return (
    <Modal
        show={mostrarModal}
        onHide={() => setMostrarModal(false)}
        backdrop="static"
        keyboard={false}
        centered
    >
        <Modal.Header closeButton>
            <Modal.Title>Agregar Categoría</Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
            <Form>
                <Form.Group className="mb-3">
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control
                        type="text"
                        name="nombre_categoria"
                        value={nuevaCategoria.nombre_categoria}
                        onChange={manejoCambioInput}
                        placeholder="Ingresa el nombre"
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        name="descripcion"
                        value={nuevaCategoria.descripcion}
                        onChange={manejoCambioInput}
                        placeholder="Ingresa la descripción"
                    />
                </Form.Group>
            </Form>
        </Modal.Body>

        <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModal(false)}>
                Cancelar
            </Button>
            <Button
                variant="primary"
                onClick={handleRegistrar}
                disabled={
                    nuevaCategoria.nombre_categoria.trim() === "" ||
                    nuevaCategoria.descripcion.trim() === "" ||
                    desabilitado
                }
            >
                Guardar
            </Button>
        </Modal.Footer>
    </Modal>
);

};

export default ModalRegistroCategoria;