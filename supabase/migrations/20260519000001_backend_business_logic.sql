-- =====================================================================================
-- MIGRACIÓN: 20260519000001_backend_business_logic.sql
-- DESCRIPCIÓN: Implementación de RLS Completo, Triggers Financieros,
--              Prevención de Overbooking y Automatización Logística.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS RESTANTES
-- -------------------------------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_instancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE depositos_garantia ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_danos_auditoria ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: ROLES
-- -------------------------------------------------------------------------------------
CREATE POLICY select_roles ON roles
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY admin_manage_roles ON roles
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: USUARIOS
-- -------------------------------------------------------------------------------------
CREATE POLICY select_usuarios ON usuarios
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY admin_manage_usuarios ON usuarios
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: CLIENTES
-- -------------------------------------------------------------------------------------
CREATE POLICY select_clientes ON clientes
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY insert_clientes ON clientes
    FOR INSERT TO authenticated
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Vendedor'));

CREATE POLICY update_clientes ON clientes
    FOR UPDATE TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Vendedor'))
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Vendedor'));

CREATE POLICY delete_clientes ON clientes
    FOR DELETE TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: CATÁLOGO DE EQUIPOS
-- -------------------------------------------------------------------------------------
CREATE POLICY select_catalogo ON catalogo_equipos
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY admin_manage_catalogo ON catalogo_equipos
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: INVENTARIO INSTANCIAS (EQUIPOS FÍSICOS)
-- -------------------------------------------------------------------------------------
CREATE POLICY select_inventario ON inventario_instancias
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY admin_insert_inventario ON inventario_instancias
    FOR INSERT TO authenticated
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

CREATE POLICY admin_delete_inventario ON inventario_instancias
    FOR DELETE TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

CREATE POLICY manage_inventario ON inventario_instancias
    FOR UPDATE TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica'))
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica'));

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: EVENTO ADICIONALES (SERVICIOS)
-- -------------------------------------------------------------------------------------
CREATE POLICY select_adicionales ON evento_adicionales
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = evento_adicionales.evento_id
        )
    );

CREATE POLICY insert_adicionales ON evento_adicionales
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = evento_adicionales.evento_id
              AND (
                  get_current_user_role() IN ('Administrador', 'Logistica')
                  OR (
                      get_current_user_role() = 'Vendedor' 
                      AND eventos.usuario_id = get_current_user_id()
                      AND eventos.estado = 'COTIZACION'
                  )
              )
        )
    );

CREATE POLICY update_adicionales ON evento_adicionales
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = evento_adicionales.evento_id
              AND (
                  get_current_user_role() IN ('Administrador', 'Logistica')
                  OR (
                      get_current_user_role() = 'Vendedor' 
                      AND eventos.usuario_id = get_current_user_id()
                      AND eventos.estado = 'COTIZACION'
                  )
              )
        )
    )
    WITH CHECK (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = evento_adicionales.evento_id
              AND (
                  get_current_user_role() IN ('Administrador', 'Logistica')
                  OR (
                      get_current_user_role() = 'Vendedor' 
                      AND eventos.usuario_id = get_current_user_id()
                      AND eventos.estado = 'COTIZACION'
                  )
              )
        )
    );

CREATE POLICY delete_adicionales ON evento_adicionales
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = evento_adicionales.evento_id
              AND (
                  get_current_user_role() = 'Administrador'
                  OR (
                      get_current_user_role() = 'Vendedor' 
                      AND eventos.usuario_id = get_current_user_id()
                      AND eventos.estado = 'COTIZACION'
                  )
              )
        )
    );

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: DEPÓSITOS DE GARANTÍA
-- -------------------------------------------------------------------------------------
CREATE POLICY select_depositos ON depositos_garantia
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = depositos_garantia.evento_id
        )
    );

CREATE POLICY manage_depositos ON depositos_garantia
    FOR ALL TO authenticated
    USING (
        deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica')
    )
    WITH CHECK (
        deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica')
    );

-- -------------------------------------------------------------------------------------
-- POLÍTICAS RLS: REGISTRO DE DAÑOS Y AUDITORÍA
-- -------------------------------------------------------------------------------------
CREATE POLICY select_danos ON registro_danos_auditoria
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM eventos 
            WHERE eventos.id = registro_danos_auditoria.evento_id
        )
    );

CREATE POLICY manage_danos ON registro_danos_auditoria
    FOR ALL TO authenticated
    USING (
        deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica')
    )
    WITH CHECK (
        deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Logistica')
    );


-- -------------------------------------------------------------------------------------
-- 2. TRIGGERS: RECALCULAR TOTALES DE EVENTOS (CONSISTENCIA FINANCIERA)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalcular_totales_evento(p_evento_id INT)
RETURNS VOID AS $$
DECLARE
    v_total_equipos NUMERIC(12, 2) := 0.00;
    v_total_adicionales NUMERIC(12, 2) := 0.00;
BEGIN
    -- Sumar detalles de equipos activos
    SELECT COALESCE(SUM(subtotal), 0.00)
    INTO v_total_equipos
    FROM evento_detalles_equipos
    WHERE evento_id = p_evento_id AND deleted_at IS NULL;

    -- Sumar adicionales activos
    SELECT COALESCE(SUM(costo_facturado), 0.00)
    INTO v_total_adicionales
    FROM evento_adicionales
    WHERE evento_id = p_evento_id AND deleted_at IS NULL;

    -- Actualizar el evento consolidado
    UPDATE eventos
    SET total_equipos = v_total_equipos,
        total_adicionales = v_total_adicionales,
        gran_total = v_total_equipos + v_total_adicionales,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_evento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para eventos detalles de equipos
CREATE OR REPLACE FUNCTION fn_trigger_totales_equipos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM recalcular_totales_evento(NEW.evento_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.evento_id <> OLD.evento_id THEN
            PERFORM recalcular_totales_evento(OLD.evento_id);
        END IF;
        PERFORM recalcular_totales_evento(NEW.evento_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM recalcular_totales_evento(OLD.evento_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_totales_equipos
AFTER INSERT OR UPDATE OR DELETE ON evento_detalles_equipos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_totales_equipos();

-- Trigger para adicionales de eventos
CREATE OR REPLACE FUNCTION fn_trigger_totales_adicionales()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM recalcular_totales_evento(NEW.evento_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.evento_id <> OLD.evento_id THEN
            PERFORM recalcular_totales_evento(OLD.evento_id);
        END IF;
        PERFORM recalcular_totales_evento(NEW.evento_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM recalcular_totales_evento(OLD.evento_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_totales_adicionales
AFTER INSERT OR UPDATE OR DELETE ON evento_adicionales
FOR EACH ROW EXECUTE FUNCTION fn_trigger_totales_adicionales();


-- -------------------------------------------------------------------------------------
-- 3. TRIGGERS: PREVENCIÓN DE OVERBOOKING (TRASLAPE DE FECHAS)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verificar_disponibilidad_instancia(
    p_inventario_id INT,
    p_evento_id INT,
    p_fecha_inicio TIMESTAMP,
    p_fecha_fin TIMESTAMP
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflicto BOOLEAN := FALSE;
BEGIN
    -- Comprobar si existe traslape con algún evento confirmado, activo o cerrado
    SELECT EXISTS (
        SELECT 1 
        FROM evento_detalles_equipos ede
        JOIN eventos e ON ede.evento_id = e.id
        WHERE ede.inventario_id = p_inventario_id
          AND ede.deleted_at IS NULL
          AND e.deleted_at IS NULL
          AND ede.evento_id <> p_evento_id
          AND e.estado IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO', 'FINALIZADO', 'PAGADO_CERRADO')
          AND (p_fecha_inicio, p_fecha_fin) OVERLAPS (e.fecha_inicio_evento, e.fecha_fin_evento)
    ) INTO v_conflicto;

    RETURN NOT v_conflicto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger BEFORE en detalles de equipos
CREATE OR REPLACE FUNCTION fn_trigger_verificar_overbooking_detalles()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_evento estado_evento_enum;
    v_fecha_ini TIMESTAMP;
    v_fecha_fin TIMESTAMP;
    v_disponible BOOLEAN;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Obtener la información del evento actual
    SELECT estado, fecha_inicio_evento, fecha_fin_evento
    INTO v_estado_evento, v_fecha_ini, v_fecha_fin
    FROM eventos
    WHERE id = NEW.evento_id AND deleted_at IS NULL;

    -- Solo validar disponibilidad si el evento está reservado/confirmado o en tránsito
    IF v_estado_evento IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO', 'FINALIZADO', 'PAGADO_CERRADO') THEN
        v_disponible := verificar_disponibilidad_instancia(
            NEW.inventario_id, 
            NEW.evento_id, 
            v_fecha_ini, 
            v_fecha_fin
        );
        
        IF NOT v_disponible THEN
            RAISE EXCEPTION 'Bloqueo de seguridad: El equipo (ID: %) ya está reservado en otro evento en las fechas programadas (% a %).', 
                NEW.inventario_id, v_fecha_ini, v_fecha_fin;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_verificar_overbooking_detalles
BEFORE INSERT OR UPDATE ON evento_detalles_equipos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_verificar_overbooking_detalles();

-- Trigger BEFORE en eventos (al confirmar o modificar fechas)
CREATE OR REPLACE FUNCTION fn_trigger_verificar_overbooking_evento()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle RECORD;
    v_disponible BOOLEAN;
BEGIN
    -- Si el evento pasa a estar confirmado, o si cambia de fecha de un evento ya confirmado
    IF (OLD.estado = 'COTIZACION' AND NEW.estado IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO'))
       OR (OLD.estado IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO') AND (NEW.fecha_inicio_evento <> OLD.fecha_inicio_evento OR NEW.fecha_fin_evento <> OLD.fecha_fin_evento)) THEN
        
        FOR v_detalle IN 
            SELECT inventario_id 
            FROM evento_detalles_equipos 
            WHERE evento_id = NEW.id AND deleted_at IS NULL
        LOOP
            v_disponible := verificar_disponibilidad_instancia(
                v_detalle.inventario_id, 
                NEW.id, 
                NEW.fecha_inicio_evento, 
                NEW.fecha_fin_evento
            );
            
            IF NOT v_disponible THEN
                RAISE EXCEPTION 'Bloqueo de seguridad al confirmar evento: El equipo (ID: %) colisiona con otra reserva activa en el rango de fechas (% a %).', 
                    v_detalle.inventario_id, NEW.fecha_inicio_evento, NEW.fecha_fin_evento;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_verificar_overbooking_evento
BEFORE UPDATE ON eventos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_verificar_overbooking_evento();


-- -------------------------------------------------------------------------------------
-- 4. TRIGGERS: FLUJO LOGÍSTICO AUTOMATIZADO DE INVENTARIO
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_flujo_logistico_inventario()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle RECORD;
    v_tiene_dano BOOLEAN;
BEGIN
    -- Si el evento pasa a EN_TRANSITO, todos sus equipos pasan a ALQUILADO
    IF NEW.estado = 'EN_TRANSITO' AND (OLD.estado IS NULL OR OLD.estado <> 'EN_TRANSITO') THEN
        UPDATE inventario_instancias
        SET estado_operativo = 'ALQUILADO',
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
            SELECT inventario_id 
            FROM evento_detalles_equipos 
            WHERE evento_id = NEW.id AND deleted_at IS NULL
        );
    END IF;

    -- Si el evento pasa a FINALIZADO o PAGADO_CERRADO
    IF NEW.estado IN ('FINALIZADO', 'PAGADO_CERRADO') AND (OLD.estado IS NULL OR OLD.estado NOT IN ('FINALIZADO', 'PAGADO_CERRADO')) THEN
        FOR v_detalle IN 
            SELECT inventario_id 
            FROM evento_detalles_equipos 
            WHERE evento_id = NEW.id AND deleted_at IS NULL
        LOOP
            -- Verificar si el equipo tiene daños registrados para este evento
            SELECT EXISTS (
                SELECT 1 
                FROM registro_danos_auditoria 
                WHERE evento_id = NEW.id 
                  AND inventario_id = v_detalle.inventario_id 
                  AND deleted_at IS NULL
            ) INTO v_tiene_dano;

            IF v_tiene_dano THEN
                UPDATE inventario_instancias
                SET estado_operativo = 'EN_MANTENIMIENTO',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_detalle.inventario_id;
            ELSE
                UPDATE inventario_instancias
                SET estado_operativo = 'DISPONIBLE',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_detalle.inventario_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_flujo_logistico_inventario
AFTER UPDATE OF estado ON eventos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_flujo_logistico_inventario();


-- -------------------------------------------------------------------------------------
-- 5. TRIGGERS: REGISTRO DE DAÑOS Y LIQUIDACIÓN DE GARANTÍA
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_gestionar_danos_garantia()
RETURNS TRIGGER AS $$
DECLARE
    v_deposito_id INT;
    v_monto_recibido NUMERIC(12, 2);
    v_nuevo_retenido NUMERIC(12, 2);
    v_nuevo_estado estado_deposito_enum;
BEGIN
    -- 1. Cambiar estado del equipo afectado a EN_MANTENIMIENTO
    UPDATE inventario_instancias
    SET estado_operativo = 'EN_MANTENIMIENTO',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.inventario_id;

    -- 2. Si el daño se descuenta del depósito de garantía
    IF NEW.descontado_de_deposito = TRUE THEN
        SELECT id, monto_recibido
        INTO v_deposito_id, v_monto_recibido
        FROM depositos_garantia
        WHERE evento_id = NEW.evento_id AND deleted_at IS NULL
        LIMIT 1;

        IF v_deposito_id IS NOT NULL THEN
            -- Calcular retención total acumulada por daños en el evento
            SELECT COALESCE(SUM(costo_reparacion), 0.00)
            INTO v_nuevo_retenido
            FROM registro_danos_auditoria
            WHERE evento_id = NEW.evento_id 
              AND descontado_de_deposito = TRUE 
              AND deleted_at IS NULL;

            IF v_nuevo_retenido >= v_monto_recibido THEN
                v_nuevo_estado := 'RETENIDO_TOTAL';
            ELSE
                v_nuevo_estado := 'RETENIDO_PARCIAL';
            END IF;

            -- Actualizar el depósito
            UPDATE depositos_garantia
            SET monto_retenido = LEAST(v_nuevo_retenido, v_monto_recibido),
                estado = v_nuevo_estado,
                motivo_retencion = COALESCE(
                    NULLIF(motivo_retencion || ' | ', ' | '), ''
                ) || NEW.descripcion_dano || ' ($' || NEW.costo_reparacion || ')',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_deposito_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_gestionar_danos_garantia
AFTER INSERT OR UPDATE ON registro_danos_auditoria
FOR EACH ROW EXECUTE FUNCTION fn_trigger_gestionar_danos_garantia();
