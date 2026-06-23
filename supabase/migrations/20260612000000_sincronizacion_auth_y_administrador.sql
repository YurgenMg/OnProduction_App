-- Migración para sincronizar automáticamente usuarios de Supabase Auth con la tabla pública 'usuarios'
-- Y otorgarles el rol de Administrador por defecto para facilitar pruebas en desarrollo local

-- 1. Modificar columna password_hash para que admita valores nulos (para soporte de OAuth de Google)
ALTER TABLE public.usuarios ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Crear función para sincronizar automáticamente el perfil de usuario al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_role_id INT;
BEGIN
    -- Obtener el ID del rol de Administrador
    SELECT id INTO v_admin_role_id FROM public.roles WHERE nombre = 'Administrador' LIMIT 1;
    
    -- Si no existe el rol de Administrador por alguna razón, usar el primero disponible
    IF v_admin_role_id IS NULL THEN
        SELECT id INTO v_admin_role_id FROM public.roles LIMIT 1;
    END IF;

    -- Insertar en la tabla pública de usuarios si no existe previamente
    INSERT INTO public.usuarios (rol_id, nombre_completo, email, password_hash)
    VALUES (
        v_admin_role_id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario de Pruebas'),
        new.email,
        NULL
    )
    ON CONFLICT (email) DO UPDATE 
    SET rol_id = v_admin_role_id,
        nombre_completo = COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', public.usuarios.nombre_completo),
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Crear el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
