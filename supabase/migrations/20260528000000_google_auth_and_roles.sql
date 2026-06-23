-- Migración para soporte de Google OAuth 2.0 y mapeo de roles oficiales
-- Modificación del rol 'Logistica' a 'Bodeguero' y alta de usuario administrador de pruebas

-- 1. Actualizar el nombre del rol en la tabla de roles
UPDATE roles 
SET nombre = 'Bodeguero', 
    updated_at = CURRENT_TIMESTAMP 
WHERE nombre = 'Logistica';

-- 2. Redefinir get_current_user_role para mantener compatibilidad con las políticas RLS existentes
-- que hacen referencia al rol 'Logistica'
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    v_rol VARCHAR;
BEGIN
    SELECT r.nombre INTO v_rol
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.email = auth.jwt() ->> 'email'
      AND u.deleted_at IS NULL;
      
    -- Mapeo para mantener la seguridad transaccional intacta sin reescribir docenas de políticas RLS
    IF v_rol = 'Bodeguero' THEN
        RETURN 'Logistica';
    END IF;
    
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Insertar o actualizar el usuario administrador de pruebas en la tabla local de usuarios
INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash)
VALUES (
    (SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1),
    'Administrador General',
    'admin@onproduction.com',
    '$2a$10$MockHashForAuthCompatibilityOnly'
)
ON CONFLICT (email) DO UPDATE 
SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1),
    nombre_completo = 'Administrador General',
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP;
