-- =====================================================================================
-- MIGRACIÓN: 20260623000001_caja_y_carteras.sql
-- DESCRIPCIÓN: Módulo de Caja, Flujo de Caja y Carteras de Clientes/Proveedores.
--              Implementa inmutabilidad financiera: TransaccionCaja solo admite INSERT.
--              Los recálculos de saldo son automáticos vía triggers SECURITY DEFINER.
-- =====================================================================================

-- 1. TABLA: métodos de pago (catálogo)
CREATE TABLE IF NOT EXISTS metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 2. TABLA: transacciones de caja (INMUTABLE — solo INSERT permitido por RLS)
CREATE TYPE tipo_transaccion_enum AS ENUM (
    'ABONO_CLIENTE',      -- Pago recibido de cliente
    'EGRESO_PROVEEDOR',   -- Pago a proveedor
    'INGRESO_OTRO',       -- Ingreso no asociado a cliente
    'EGRESO_OTRO',        -- Egreso general (gastos operativos)
    'REVERSION'           -- Contra-asiento para corrección
);

CREATE TABLE IF NOT EXISTS transacciones_caja (
    id SERIAL PRIMARY KEY,
    tipo tipo_transaccion_enum NOT NULL,
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo_pago_id INT NOT NULL REFERENCES metodos_pago(id),
    evento_id INT NULL REFERENCES eventos(id),          -- Opcional: vinculado a un evento
    cliente_id INT NULL REFERENCES clientes(id),        -- Opcional: vinculado a cliente
    descripcion TEXT NOT NULL,
    referencia_externa VARCHAR(150),                    -- Ej: número de transferencia
    reversion_de_id INT NULL REFERENCES transacciones_caja(id),  -- Si es contra-asiento
    usuario_registro_id INT NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- NO updated_at ni deleted_at — inmutabilidad total del registro
);

-- 3. TABLA: cartera de clientes (saldos pendientes de cobro)
CREATE TABLE IF NOT EXISTS carteras_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INT UNIQUE NOT NULL REFERENCES clientes(id),
    saldo_pendiente NUMERIC(15, 2) NOT NULL DEFAULT 0.00,   -- Positivo = debe dinero
    ultima_transaccion_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 4. TABLA: cartera de proveedores (cuentas por pagar)
CREATE TABLE IF NOT EXISTS carteras_proveedor (
    id SERIAL PRIMARY KEY,
    nombre_proveedor VARCHAR(150) NOT NULL,
    rut_nit VARCHAR(50) UNIQUE NOT NULL,
    email_contacto VARCHAR(100),
    saldo_pendiente NUMERIC(15, 2) NOT NULL DEFAULT 0.00,   -- Positivo = debemos dinero
    ultima_transaccion_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- =====================================================================================
-- RLS
-- =====================================================================================

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE carteras_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE carteras_proveedor ENABLE ROW LEVEL SECURITY;

-- metodos_pago: lectura general, gestión solo Admin
CREATE POLICY select_metodos ON metodos_pago
    FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY admin_manage_metodos ON metodos_pago
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- transacciones_caja: SELECT para Admin/Cajero; INSERT para Admin/Cajero; NO UPDATE/DELETE
CREATE POLICY select_transacciones ON transacciones_caja
    FOR SELECT TO authenticated
    USING (get_current_user_role() IN ('Administrador', 'Vendedor', 'Logistica'));

CREATE POLICY insert_transacciones ON transacciones_caja
    FOR INSERT TO authenticated
    WITH CHECK (get_current_user_role() IN ('Administrador', 'Vendedor'));
-- CRÍTICO: Sin políticas UPDATE ni DELETE → transacciones inmutables por diseño

-- carteras_cliente
CREATE POLICY select_carteras_cliente ON carteras_cliente
    FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY admin_manage_carteras_cliente ON carteras_cliente
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Vendedor'))
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() IN ('Administrador', 'Vendedor'));

-- carteras_proveedor
CREATE POLICY select_carteras_proveedor ON carteras_proveedor
    FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY admin_manage_carteras_proveedor ON carteras_proveedor
    FOR ALL TO authenticated
    USING (deleted_at IS NULL AND get_current_user_role() = 'Administrador')
    WITH CHECK (deleted_at IS NULL AND get_current_user_role() = 'Administrador');

-- =====================================================================================
-- TRIGGERS FINANCIEROS — Recálculo automático de saldos de cartera
-- =====================================================================================

-- Función principal: recalcula el saldo de cartera de un cliente desde cero
CREATE OR REPLACE FUNCTION recalcular_cartera_cliente(p_cliente_id INT)
RETURNS VOID AS $$
DECLARE
    v_saldo NUMERIC(15, 2);
BEGIN
    -- Saldo = total de eventos confirmados - total de abonos recibidos
    SELECT COALESCE(SUM(
        CASE
            WHEN tipo = 'ABONO_CLIENTE' THEN -monto  -- abono reduce la deuda
            WHEN tipo = 'REVERSION'     THEN  monto  -- reversión de abono suma deuda
            ELSE 0
        END
    ), 0.00)
    INTO v_saldo
    FROM transacciones_caja
    WHERE cliente_id = p_cliente_id;

    INSERT INTO carteras_cliente (cliente_id, saldo_pendiente, ultima_transaccion_at)
    VALUES (p_cliente_id, v_saldo, CURRENT_TIMESTAMP)
    ON CONFLICT (cliente_id) DO UPDATE
    SET saldo_pendiente = v_saldo,
        ultima_transaccion_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: se dispara AFTER INSERT en transacciones_caja
CREATE OR REPLACE FUNCTION fn_trigger_actualizar_cartera_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo recalcular si la transacción está vinculada a un cliente
    IF NEW.cliente_id IS NOT NULL AND NEW.tipo IN ('ABONO_CLIENTE', 'REVERSION') THEN
        PERFORM recalcular_cartera_cliente(NEW.cliente_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_actualizar_cartera_cliente
AFTER INSERT ON transacciones_caja
FOR EACH ROW EXECUTE FUNCTION fn_trigger_actualizar_cartera_cliente();

-- =====================================================================================
-- DATOS DE SEMILLA
-- =====================================================================================

INSERT INTO metodos_pago (nombre, descripcion) VALUES
    ('Efectivo',           'Pago en efectivo'),
    ('Transferencia',      'Transferencia bancaria o PSE'),
    ('Tarjeta Débito',     'Pago con tarjeta débito en datáfono'),
    ('Tarjeta Crédito',    'Pago con tarjeta crédito en datáfono'),
    ('Nequi / Daviplata',  'Pago por billetera digital')
ON CONFLICT (nombre) DO NOTHING;
