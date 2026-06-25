# Quickstart: Validación de Módulos Especializados (OnProduction)

Esta guía provee escenarios para verificar el correcto funcionamiento del modelo de datos y flujos de negocio sin implementar la interfaz gráfica de usuario.

## Preparación y Semilla

Ejecutar las migraciones e insertar datos básicos en la base de datos local de Supabase:
```bash
# Iniciar Supabase
supabase start

# Ejecutar las migraciones
supabase db reset
```

## Escenarios de Validación

### 1. Validación de Bloqueo de Stock Coincidente
Verifica que el trigger de base de datos impida reservar el mismo ítem para dos eventos en el mismo rango de fechas.

```sql
-- 1. Insertar categorías, ítem y cliente
INSERT INTO public.categorias (nombre) VALUES ('Sonido');
INSERT INTO public.items_inventario (categoria_id, nombre, sku, estado_operativo, precio_alquiler_base)
VALUES (1, 'Consola Behringer X32', 'CON-BHR-X32-01', 'EXCELENTE', 150000.00);

INSERT INTO public.clientes (nombre_razon_social, nit_identificacion, email)
VALUES ('Eventos S.A.', '900123456-1', 'contacto@eventossa.com');

-- 2. Crear Evento A (2026-07-01 al 2026-07-05)
INSERT INTO public.eventos (cliente_id, nombre_evento, fecha_inicio, fecha_fin, estado)
VALUES (1, 'Concierto Rock', '2026-07-01 08:00:00', '2026-07-05 18:00:00', 'COTIZACION');

-- Asignar el ítem al Evento A (Debe tener éxito)
INSERT INTO public.evento_items (evento_id, item_id, precio_alquiler)
VALUES (1, 1, 150000.00);

-- 3. Crear Evento B en fechas coincidentes (2026-07-03 al 2026-07-07)
INSERT INTO public.eventos (cliente_id, nombre_evento, fecha_inicio, fecha_fin, estado)
VALUES (1, 'Serenata Familiar', '2026-07-03 14:00:00', '2026-07-07 22:00:00', 'COTIZACION');

-- Intentar asignar el mismo ítem al Evento B (DEBE FALLAR con código P0001)
INSERT INTO public.evento_items (evento_id, item_id, precio_alquiler)
VALUES (2, 1, 150000.00);
-- Esperado: ERROR: Conflicto de stock: El item 1 ya está reservado en las fechas seleccionadas.
```

### 2. Validación de Inmutabilidad en Caja
Verifica que las transacciones de caja sean de solo inserción.

```sql
-- Insertar método de pago y transacción de abono
INSERT INTO public.metodos_pago (nombre) VALUES ('Transferencia Bancaria');
INSERT INTO public.transacciones_caja (evento_id, metodo_pago_id, tipo, monto, descripcion)
VALUES (1, 1, 'INGRESO', 150000.00, 'Anticipo Concierto Rock');

-- Intentar actualizar la transacción (Debe estar restringido mediante trigger de inmutabilidad o RLS)
UPDATE public.transacciones_caja SET monto = 200000.00 WHERE id = 1;
-- Esperado: Bloqueo o rechazo en base de datos.
```
