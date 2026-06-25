-- =====================================================================================
-- MIGRACIÓN: 20260623000000_categorias_inventario.sql
-- DESCRIPCIÓN: Agrega estructura jerárquica de 2 niveles para categorías de inventario.
--              Modifica catalogo_equipos para referenciar la nueva tabla.
-- =====================================================================================

-- 1. Crear tabla de categorías con soporte para subcategorías (2 niveles máximo)
CREATE TABLE IF NOT EXISTS categorias_inventario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    parent_id INT NULL REFERENCES categorias_inventario(id),  -- NULL = categoría raíz
    nivel INT NOT NULL DEFAULT 1 CHECK (nivel IN (1, 2)),     -- 1=Categoría, 2=Subcategoría
    prefijo_sku CHAR(3) NOT NULL,                              -- Ej: 'SON', 'LUC', 'VID'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT uq_categoria_nombre_parent UNIQUE (nombre, parent_id),
    CONSTRAINT chk_nivel_raiz CHECK (
        (nivel = 1 AND parent_id IS NULL) OR
        (nivel = 2 AND parent_id IS NOT NULL)
    )
);

-- 2. Agregar FK de categoría en catalogo_equipos (mantenemos columna categoria como legacy)
ALTER TABLE catalogo_equipos
    ADD COLUMN IF NOT EXISTS categoria_id INT NULL REFERENCES categorias_inventario(id);

-- 3. Habilitar RLS
ALTER TABLE categorias_inventario ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados
CREATE POLICY select_categorias ON categorias_inventario
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

-- Gestión exclusiva para Administrador
CREATE POLICY admin_manage_categorias ON categorias_inventario
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- 4. Datos de semilla — Categorías raíz (nivel 1)
INSERT INTO categorias_inventario (nombre, descripcion, parent_id, nivel, prefijo_sku)
VALUES
    ('Sonido',    'Equipos de audio y amplificación',        NULL, 1, 'SON'),
    ('Luces',     'Iluminación escénica y efectos',          NULL, 1, 'LUC'),
    ('Video',     'Proyección y pantallas',                  NULL, 1, 'VID'),
    ('Estructura','Truss, tarimas y estructuras metálicas',  NULL, 1, 'EST'),
    ('Transporte','Vehiculos y logística de carga',          NULL, 1, 'TRS')
ON CONFLICT DO NOTHING;

-- 5. Datos de semilla — Subcategorías (nivel 2)
INSERT INTO categorias_inventario (nombre, descripcion, parent_id, nivel, prefijo_sku)
VALUES
    ('Consolas',          'Consolas de mezcla análogas y digitales',
        (SELECT id FROM categorias_inventario WHERE nombre='Sonido' AND nivel=1), 2, 'CON'),
    ('Line Array',        'Sistemas de audio de alta potencia',
        (SELECT id FROM categorias_inventario WHERE nombre='Sonido' AND nivel=1), 2, 'LIN'),
    ('Micrófonos',        'Micrófonos alámbricos e inalámbricos',
        (SELECT id FROM categorias_inventario WHERE nombre='Sonido' AND nivel=1), 2, 'MIC'),
    ('Cabezas Móviles',   'Luces robóticas y de efectos',
        (SELECT id FROM categorias_inventario WHERE nombre='Luces' AND nivel=1), 2, 'CAB'),
    ('PAR LED',           'Luminarias PAR de LED',
        (SELECT id FROM categorias_inventario WHERE nombre='Luces' AND nivel=1), 2, 'PAR'),
    ('Proyectores',       'Proyectores de video y datos',
        (SELECT id FROM categorias_inventario WHERE nombre='Video' AND nivel=1), 2, 'PRY'),
    ('Pantallas LED',     'Paneles y pantallas LED de video',
        (SELECT id FROM categorias_inventario WHERE nombre='Video' AND nivel=1), 2, 'PNT')
ON CONFLICT DO NOTHING;

-- 6. Actualizar los ítems existentes para referenciar la nueva categoría
UPDATE catalogo_equipos
SET categoria_id = (SELECT id FROM categorias_inventario WHERE nombre = 'Line Array' AND nivel = 2)
WHERE sku LIKE 'SND-LINE%' AND categoria_id IS NULL;

UPDATE catalogo_equipos
SET categoria_id = (SELECT id FROM categorias_inventario WHERE nombre = 'Micrófonos' AND nivel = 2)
WHERE sku LIKE 'SND-MIC%' AND categoria_id IS NULL;

UPDATE catalogo_equipos
SET categoria_id = (SELECT id FROM categorias_inventario WHERE nombre = 'Cabezas Móviles' AND nivel = 2)
WHERE sku LIKE 'LUC-MOV%' AND categoria_id IS NULL;
