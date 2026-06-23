-- Migración para renombrar la columna de notes_condicion a notas_condicion para consistencia en español y solucionar error en frontend
ALTER TABLE inventario_instancias 
RENAME COLUMN notes_condicion TO notas_condicion;
