-- Migración para soporte de Compras de Inventario e Historial de Bajas

-- 1. Crear tabla de Compras
CREATE TABLE IF NOT EXISTS compras_inventario (
    id SERIAL PRIMARY KEY,
    catalogo_id INT NOT NULL REFERENCES catalogo_equipos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    costo_compra_total NUMERIC(12, 2) NOT NULL CHECK (costo_compra_total >= 0),
    proveedor VARCHAR(150) NOT NULL,
    fecha_compra TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 2. Crear tabla de Bajas de Inventario
CREATE TABLE IF NOT EXISTS bajas_inventario (
    id SERIAL PRIMARY KEY,
    inventario_id INT NOT NULL REFERENCES inventario_instancias(id) ON DELETE CASCADE,
    motivo_baja TEXT NOT NULL,
    fecha_baja TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 3. Habilitar RLS en ambas tablas
ALTER TABLE compras_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE bajas_inventario ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para Compras
CREATE POLICY select_compras ON compras_inventario
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY manage_compras ON compras_inventario
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- 5. Crear políticas RLS para Bajas
CREATE POLICY select_bajas ON bajas_inventario
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY manage_bajas ON bajas_inventario
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');
