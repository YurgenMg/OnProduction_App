-- Migración para asegurar que los roles expuestos a la API (anon, authenticated)
-- tengan los privilegios nativos necesarios sobre las tablas del esquema public.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
