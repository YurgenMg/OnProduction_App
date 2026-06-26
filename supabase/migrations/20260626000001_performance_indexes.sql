-- ============================================================
-- Migración: Índices de rendimiento críticos
-- Fecha: 2026-06-26
-- Propósito: Reducir latencia en las queries más frecuentes del sistema
-- ============================================================

-- Habilitar extensión pg_trgm si no está activa (para ILIKE optimizado en búsquedas)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── transacciones_caja ───────────────────────────────────────
-- Query principal del módulo de caja: ORDER BY fecha DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_transacciones_caja_fecha_desc
  ON public.transacciones_caja (fecha DESC, created_at DESC);

-- Filtros frecuentes en módulo de caja por cliente o evento
CREATE INDEX IF NOT EXISTS idx_transacciones_caja_cliente_id
  ON public.transacciones_caja (cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_caja_evento_id
  ON public.transacciones_caja (evento_id)
  WHERE evento_id IS NOT NULL;

-- ── usuarios ─────────────────────────────────────────────────
-- Layout hace lookup por UUID (auth.uid) en usuarios activos
CREATE INDEX IF NOT EXISTS idx_usuarios_id_active
  ON public.usuarios (id)
  WHERE deleted_at IS NULL;

-- ── catalogo_equipos ─────────────────────────────────────────
-- Búsqueda por nombre (ILIKE) en módulo de inventario — usa trigrams para ~10x speedup
CREATE INDEX IF NOT EXISTS idx_catalogo_equipos_nombre_trgm
  ON public.catalogo_equipos USING gin (nombre_equipo gin_trgm_ops);

-- Lookup por categoría (filtro frecuente en listado de inventario)
CREATE INDEX IF NOT EXISTS idx_catalogo_equipos_categoria_id
  ON public.catalogo_equipos (categoria_id)
  WHERE deleted_at IS NULL;

-- SKU para verificación de unicidad en POST
CREATE INDEX IF NOT EXISTS idx_catalogo_equipos_sku
  ON public.catalogo_equipos (sku)
  WHERE deleted_at IS NULL;

-- ── inventario_instancias ────────────────────────────────────
-- Join frecuente desde catalogo_equipos → instancias + filtro por estado
CREATE INDEX IF NOT EXISTS idx_inventario_instancias_catalogo_active
  ON public.inventario_instancias (catalogo_id, estado_operativo)
  WHERE deleted_at IS NULL;

-- ── evento_items ─────────────────────────────────────────────
-- Trigger fn_verificar_disponibilidad_item hace lookup por item_id en CADA insert
CREATE INDEX IF NOT EXISTS idx_evento_items_item_id
  ON public.evento_items (item_id);

-- Join con eventos para verificar solapamiento de fechas (trigger de disponibilidad)
CREATE INDEX IF NOT EXISTS idx_eventos_fechas_estado
  ON public.eventos (fecha_inicio, fecha_fin, estado)
  WHERE deleted_at IS NULL;

-- ── clientes ─────────────────────────────────────────────────
-- Búsqueda por nombre o NIT en autocompletado de eventos
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON public.clientes USING gin (nombre_razon_social gin_trgm_ops);
