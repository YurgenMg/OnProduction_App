-- =====================================================================================
-- MIGRACIÓN: 20260623000002_operarios_y_disponibilidad_rpc.sql
-- DESCRIPCIÓN: Tabla de operarios, asignación a eventos (alerta no-bloqueante V1),
--              y RPC para filtrar ítems disponibles por rango de fechas.
-- =====================================================================================

-- 1. TABLA: operarios (personal técnico)
CREATE TABLE IF NOT EXISTS operarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    especialidad VARCHAR(100),    -- Ej: 'Sonido', 'Luces', 'Transporte'
    tarifa_dia NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 2. TABLA: asignación de operarios a eventos
CREATE TABLE IF NOT EXISTS evento_operarios (
    id SERIAL PRIMARY KEY,
    evento_id INT NOT NULL REFERENCES eventos(id),
    operario_id INT NOT NULL REFERENCES operarios(id),
    horas_asignadas NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT uq_evento_operario UNIQUE (evento_id, operario_id)
);

-- 3. RLS
ALTER TABLE operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_operarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_operarios ON operarios
    FOR SELECT TO authenticated USING (deleted_at IS NULL AND activo = TRUE);
CREATE POLICY admin_manage_operarios ON operarios
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

CREATE POLICY select_evento_operarios ON evento_operarios
    FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY manage_evento_operarios ON evento_operarios
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica', 'Vendedor'))
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica', 'Vendedor'));

-- =====================================================================================
-- RPC: obtener_items_disponibles
-- Retorna los ítems del catálogo con sus instancias libres en un rango de fechas.
-- Usada en el Paso 2 del wizard de creación de eventos.
-- NOTA: excluye el evento actual (p_evento_id) para soportar edición de eventos
-- =====================================================================================
CREATE OR REPLACE FUNCTION obtener_items_disponibles(
    p_fecha_inicio TIMESTAMP,
    p_fecha_fin    TIMESTAMP,
    p_evento_id    INT DEFAULT NULL   -- NULL cuando es evento nuevo
)
RETURNS TABLE (
    instancia_id            INT,
    catalogo_id             INT,
    sku                     VARCHAR,
    nombre_equipo           VARCHAR,
    categoria_id            INT,
    nombre_categoria        VARCHAR,
    nombre_subcategoria     VARCHAR,
    tarifa_dia_base         NUMERIC,
    serial_tag              VARCHAR,
    estado_operativo        TEXT,
    disponible              BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ii.id                                       AS instancia_id,
        ce.id                                       AS catalogo_id,
        ce.sku                                      AS sku,
        ce.nombre_equipo                            AS nombre_equipo,
        ci.id                                       AS categoria_id,
        cp.nombre                                   AS nombre_categoria,
        ci.nombre                                   AS nombre_subcategoria,
        ce.tarifa_dia_base                          AS tarifa_dia_base,
        ii.serial_tag                               AS serial_tag,
        ii.estado_operativo::TEXT                   AS estado_operativo,
        NOT EXISTS (
            SELECT 1
            FROM evento_detalles_equipos ede
            JOIN eventos e ON ede.evento_id = e.id
            WHERE ede.inventario_id = ii.id
              AND ede.deleted_at IS NULL
              AND e.deleted_at IS NULL
              AND (p_evento_id IS NULL OR ede.evento_id <> p_evento_id)
              AND e.estado IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO', 'FINALIZADO', 'PAGADO_CERRADO')
              AND (p_fecha_inicio, p_fecha_fin) OVERLAPS (e.fecha_inicio_evento, e.fecha_fin_evento)
        )                                           AS disponible
    FROM inventario_instancias ii
    JOIN catalogo_equipos ce ON ii.catalogo_id = ce.id
    LEFT JOIN categorias_inventario ci ON ce.categoria_id = ci.id
    LEFT JOIN categorias_inventario cp ON ci.parent_id = cp.id
    WHERE ii.deleted_at IS NULL
      AND ce.deleted_at IS NULL
      AND ii.estado_operativo != 'DADO_DE_BAJA'
    ORDER BY cp.nombre NULLS LAST, ci.nombre NULLS LAST, ce.nombre_equipo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Conceder ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION obtener_items_disponibles(TIMESTAMP, TIMESTAMP, INT) TO authenticated;

-- =====================================================================================
-- RPC: verificar_conflicto_operario (alerta no-bloqueante V1)
-- Retorna si un operario tiene conflicto de horario con otro evento
-- =====================================================================================
CREATE OR REPLACE FUNCTION verificar_conflicto_operario(
    p_operario_id  INT,
    p_fecha_inicio TIMESTAMP,
    p_fecha_fin    TIMESTAMP,
    p_evento_id    INT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_conflicto BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM evento_operarios eo
        JOIN eventos e ON eo.evento_id = e.id
        WHERE eo.operario_id = p_operario_id
          AND eo.deleted_at IS NULL
          AND e.deleted_at IS NULL
          AND (p_evento_id IS NULL OR eo.evento_id <> p_evento_id)
          AND e.estado NOT IN ('PAGADO_CERRADO')
          AND (p_fecha_inicio, p_fecha_fin) OVERLAPS (e.fecha_inicio_evento, e.fecha_fin_evento)
    ) INTO v_tiene_conflicto;

    RETURN v_tiene_conflicto;  -- TRUE = hay conflicto (alerta, no bloqueo en V1)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION verificar_conflicto_operario(INT, TIMESTAMP, TIMESTAMP, INT) TO authenticated;

-- =====================================================================================
-- DATOS DE SEMILLA — Operarios de muestra
-- =====================================================================================
INSERT INTO operarios (nombre_completo, telefono, especialidad, tarifa_dia) VALUES
    ('Carlos Montaño',  '3101234567', 'Sonido',     120000.00),
    ('Luis Herrera',    '3209876543', 'Luces',      100000.00),
    ('Pedro Vargas',    '3154445566', 'Transporte',  80000.00)
ON CONFLICT DO NOTHING;
