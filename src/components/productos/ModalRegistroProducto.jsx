import React, { useState } from "react";
import { Modal, Form, Button, Row, Col, Badge } from "react-bootstrap";

const ModalRegistroProducto = ({
    mostrarModal,
    setMostrarModal,
    nuevoProducto,
    manejoCambioInput,
    manejoCambioArchivo,
    agregarProducto,
    categorias
}) => {
    const [deshabilitado, setDeshabilitado] = useState(false);

    const handleAgregar = async () => {
        if (deshabilitado) return;
        setDeshabilitado(true);
        await agregarProducto();
        setDeshabilitado(false);
    };

    const esCategoriaRopa = () => {
        const cat = categorias.find(c => c.id_categoria === parseInt(nuevoProducto.categoria_id));
        return cat && cat.nombre_categoria.toLowerCase().includes('ropa');
    };

    const TALLAS_COMUNES = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const COLORES_COMUNES = ['Blanco', 'Negro', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Gris', 'Beige', 'Rosa'];

    const toggleSeleccion = (campo, valor) => {
        const actual = Array.isArray(nuevoProducto[campo]) ? nuevoProducto[campo] : [];
        const nuevo = actual.includes(valor)
            ? actual.filter(v => v !== valor)
            : [...actual, valor];
        
        manejoCambioInput({ target: { name: campo, value: nuevo } });
    };

    const handleTallasChange = (e) => {
        const value = e.target.value;
        const tallasArray = value.split(',').map(s => s.trim()).filter(s => s !== '');
        manejoCambioInput({ target: { name: 'tallas', value: tallasArray } });
    };

    const handleColoresChange = (e) => {
        const value = e.target.value;
        const coloresArray = value.split(',').map(s => s.trim()).filter(s => s !== '');
        manejoCambioInput({ target: { name: 'colores', value: coloresArray } });
    };

    return (
        <Modal
            show={mostrarModal}
            onHide={() => setMostrarModal(false)}
            backdrop="static"
            keyboard={false}
            centered
            size="lg"
        >
            <Modal.Header
                closeButton
                className="border-0"
                style={{
                    background: 'linear-gradient(135deg, var(--color-primario) 0%, #1a7a8a 100%)',
                    padding: '0.65rem 1.25rem',
                }}
            >
                <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                    <i className="bi bi-plus-circle"></i>
                    Registrar Nuevo Producto
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre del Producto *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="nombre_producto"
                                    value={nuevoProducto.nombre_producto}
                                    onChange={manejoCambioInput}
                                    placeholder="Ingrese el nombre del producto"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Categoría *</Form.Label>
                                <Form.Select
                                    name="categoria_id"
                                    value={nuevoProducto.categoria_id}
                                    onChange={manejoCambioInput}
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categorias.map((categoria) => (
                                        <option key={categoria.id_categoria} value={categoria.id_categoria}>
                                            {categoria.nombre_categoria}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="descripcion"
                            value={nuevoProducto.descripcion}
                            onChange={manejoCambioInput}
                            placeholder="Descripción del producto"
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Precio de Compra *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    name="precio_compra"
                                    value={nuevoProducto.precio_compra}
                                    onChange={manejoCambioInput}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Precio de Venta *</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    name="precio_venta"
                                    value={nuevoProducto.precio_venta}
                                    onChange={manejoCambioInput}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Stock Inicial *</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    name="stock"
                                    value={nuevoProducto.stock ?? ''}
                                    onChange={manejoCambioInput}
                                    placeholder="Ej: 50"
                                />
                                <Form.Text className="text-muted small">Unidades disponibles para venta.</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Seleccionar Imágenes (varias)</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={manejoCambioArchivo}
                                />
                                <Form.Text className="text-muted small">
                                    Puedes seleccionar varias imágenes a la vez.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {esCategoriaRopa() && (
                        <div className="bg-light p-3 rounded-4 mb-3 border border-secondary border-opacity-10">
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-tag text-primary"></i>
                                Variantes de Ropa
                            </h6>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-muted">Tallas Disponibles</Form.Label>
                                        <div className="d-flex flex-wrap gap-1 mb-2">
                                            {TALLAS_COMUNES.map(talla => (
                                                <Button
                                                    key={talla}
                                                    variant={Array.isArray(nuevoProducto.tallas) && nuevoProducto.tallas.includes(talla) ? "primary" : "outline-secondary"}
                                                    size="sm"
                                                    className="rounded-pill px-3 py-1"
                                                    style={{ fontSize: '0.75rem' }}
                                                    onClick={() => toggleSeleccion('tallas', talla)}
                                                >
                                                    {talla}
                                                </Button>
                                            ))}
                                        </div>
                                        <Form.Control
                                            type="text"
                                            size="sm"
                                            placeholder="Otras tallas (ej: 32, 34, 36)"
                                            onChange={handleTallasChange}
                                            value={Array.isArray(nuevoProducto.tallas) ? nuevoProducto.tallas.filter(t => !TALLAS_COMUNES.includes(t)).join(', ') : ''}
                                            className="rounded-3"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-muted">Colores Disponibles</Form.Label>
                                        <div className="d-flex flex-wrap gap-1 mb-2">
                                            {COLORES_COMUNES.map(color => (
                                                <Button
                                                    key={color}
                                                    variant={Array.isArray(nuevoProducto.colores) && nuevoProducto.colores.includes(color) ? "primary" : "outline-secondary"}
                                                    size="sm"
                                                    className="rounded-pill px-3 py-1"
                                                    style={{ fontSize: '0.75rem' }}
                                                    onClick={() => toggleSeleccion('colores', color)}
                                                >
                                                    {color}
                                                </Button>
                                            ))}
                                        </div>
                                        <Form.Control
                                            type="text"
                                            size="sm"
                                            placeholder="Otros colores (ej: Turquesa, Oro)"
                                            onChange={handleColoresChange}
                                            value={Array.isArray(nuevoProducto.colores) ? nuevoProducto.colores.filter(c => !COLORES_COMUNES.includes(c)).join(', ') : ''}
                                            className="rounded-3"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {nuevoProducto.archivos_imagen && nuevoProducto.archivos_imagen.length > 0 && (
                        <div className="mb-3">
                            <Form.Label className="small text-muted">Vista previa de imágenes seleccionadas:</Form.Label>
                            <div className="d-flex flex-wrap gap-2 justify-content-center p-2 border rounded bg-light">
                                {Array.from(nuevoProducto.archivos_imagen).map((file, idx) => (
                                    <div key={idx} className="position-relative">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Vista previa ${idx + 1}`}
                                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                            onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                        />
                                        <Badge 
                                            bg="dark" 
                                            className="position-absolute top-0 end-0 m-1 opacity-75" 
                                            style={{ fontSize: '0.6rem' }}
                                        >
                                            {idx + 1}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={() => setMostrarModal(false)}>
                    Cancelar
                </Button>
                <Button
                    variant="primary"
                    onClick={handleAgregar}
                    disabled={deshabilitado}
                >
                    {deshabilitado ? "Guardando..." : "Guardar Producto"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalRegistroProducto;