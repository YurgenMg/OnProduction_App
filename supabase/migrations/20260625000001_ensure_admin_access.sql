-- Migración para garantizar que admin@eventos.com tenga permisos de Administrador
-- (Super administrador en las políticas RLS)

UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL
WHERE email = 'admin@eventos.com';
