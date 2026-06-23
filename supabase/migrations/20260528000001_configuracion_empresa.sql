-- Migración para crear la tabla de configuración y datos de la empresa emisor

-- 1. Crear la tabla de configuración de la empresa
CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Asegura que solo exista un registro de configuración
    nombre_empresa VARCHAR(150) NOT NULL,
    eslogan VARCHAR(150),
    nit VARCHAR(50) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    direccion TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de RLS
-- Lectura pública para cualquier usuario autenticado de la aplicación
CREATE POLICY select_configuracion ON configuracion_empresa
    FOR SELECT TO authenticated
    USING (true);

-- Administración exclusiva (modificar/insertar) para el rol Administrador
CREATE POLICY manage_configuracion ON configuracion_empresa
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'Administrador')
    WITH CHECK (get_current_user_role() = 'Administrador');

-- 4. Insertar datos de semilla iniciales (OnProduction S.A.S.)
INSERT INTO configuracion_empresa (id, nombre_empresa, eslogan, nit, telefono, email, direccion)
VALUES (
    1,
    'OnProduction S.A.S.',
    'LOGÍSTICA & ALQUILER DE EQUIPOS',
    '901.458.732-1',
    '+57 (300) 123-4567',
    'facturacion@onproduction.com',
    'Bogotá, Colombia'
)
ON CONFLICT (id) DO NOTHING;
