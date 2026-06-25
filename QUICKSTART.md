# Quickstart — OnProduction

Guía de inicio rápido para validar los flujos principales del sistema localmente.

---

## Prerequisitos

```bash
supabase start   # DB local corriendo con todas las migraciones aplicadas
npm run dev      # Frontend en http://localhost:3000
```

Verifica el estado de Supabase:
```bash
supabase status
```

---

## 1. Primer Login como Administrador

El administrador inicial se crea automáticamente con el trigger `handle_new_user`.

1. Ir a http://localhost:3000/login
2. Registrar la primera cuenta de correo en **Supabase Auth** desde el Studio (`http://localhost:54323 → Authentication → Users → Add User`)
3. La cuenta se sincroniza automáticamente con la tabla `usuarios` con rol `Administrador`
4. Iniciar sesión en el frontend

> Si el login redirige a `/login?error=unauthorized`, el usuario no tiene perfil en `usuarios`. Verificar el trigger `handle_new_user` en la migración `20260612000000_sincronizacion_auth_y_administrador.sql`.

---

## 2. Configurar la Empresa

1. Ir a **Mi Empresa** (`/dashboard/configuracion`)
2. Completar los campos: nombre, NIT, teléfono, email, dirección
3. Opcionalmente subir el logo (PNG/JPEG, máx 2MB)
4. Guardar — los datos se persisten en `configuracion_empresa`

---

## 3. Crear un Cliente

1. Ir a **Clientes** (`/dashboard/clientes`)
2. Clic en **Nuevo Cliente**
3. Seleccionar tipo: B2B (empresa) o B2C (persona natural)
4. Completar campos obligatorios: NIT/Cédula, Nombre, Email, Teléfono
5. Crear — verificar que aparece en la lista con saldo de cartera **$0**

### Validar unicidad de documento

Intentar crear otro cliente con el mismo NIT/Cédula → debe retornar error 409 "Ya existe un cliente con ese documento".

---

## 4. Agregar Inventario

### 4a. Crear categorías (si no existen semillas)

Las categorías se insertan con la migración `20260623000000_categorias_inventario.sql`. Si las semillas no se aplicaron:

```sql
-- Ejecutar en Supabase Studio (SQL Editor)
INSERT INTO categorias_inventario (nombre, nivel, parent_id, prefijo_sku)
VALUES 
  ('Sonido', 1, NULL, 'SON'),
  ('Luces', 1, NULL, 'LUZ'),
  ('Video', 1, NULL, 'VID');
```

### 4b. Agregar equipo al catálogo

1. Ir a **Inventario** (`/dashboard/inventario`)
2. Clic en **+ Nuevo Modelo**
3. Ingresar:
   - SKU: `SON-MIC-0001`
   - Nombre: `Micrófono Shure SM58`
   - Categoría: seleccionar del árbol (cargado desde BD)
   - Tarifa/día: `$45,000`
4. Crear — el modelo aparece en el catálogo

### 4c. Agregar instancia física

1. En la tabla del catálogo, buscar el modelo creado
2. Clic en **+ Unidad** → ingresar serial: `SHR-SM58-001`
3. La instancia queda en estado **DISPONIBLE**

---

## 5. Crear un Evento (Wizard)

1. Ir a **Eventos** (`/dashboard/eventos`) → **+ Nuevo Evento**
2. **Paso 1 — Fechas y Cliente**:
   - Seleccionar fecha inicio y fin (ej: mañana + 2 días)
   - Ingresar dirección del evento
   - Buscar y seleccionar el cliente creado en el paso 3
   - La duración en días se calcula automáticamente
   - Clic **Siguiente**
3. **Paso 2 — Selección de Ítems**:
   - Los ítems disponibles para el rango de fechas aparecen en cards
   - Seleccionar el micrófono del paso 4 → el subtotal se calcula
   - El panel lateral muestra los ítems seleccionados y el total parcial
   - Clic **Siguiente**
4. **Paso 3 — Operarios y Resumen**:
   - (Opcional) Asignar operarios y agregar servicios adicionales
   - Verificar el resumen: cliente, fechas, total de equipos
   - Clic **✓ Crear Cotización**
5. El sistema redirige a `/dashboard/eventos?nuevo=<id>` — el evento queda en estado `COTIZACION`

### Probar navegación bidireccional

- En el paso 2, volver al paso 1 y cambiar las fechas → al avanzar, los ítems ya seleccionados se re-validan:
  - Si siguen disponibles: se mantienen con precio actualizado
  - Si ya no están disponibles: se marcan con badge rojo ⚠️ pero **no se eliminan**
- El botón "Crear Cotización" queda bloqueado hasta resolver conflictos

---

## 6. Avanzar el Estado del Evento

Desde la lista de eventos o el detalle:

```
COTIZACION → CONFIRMADO_RESERVADO
```

La API valida la transición y el trigger verifica disponibilidad. Si hay overbooking, retorna HTTP 409.

---

## 7. Registrar un Pago en Caja

1. Ir a **Caja & Cartera** (`/dashboard/caja`)
2. Clic en **Nueva Transacción**
3. Seleccionar tipo: **Abono Cliente**
4. Ingresar:
   - Monto: `$500,000`
   - Fecha: hoy
   - Método de pago: Transferencia Bancaria
   - Descripción: `Abono evento Festival Norte`
5. Registrar — la transacción aparece en el libro mayor con saldo acumulado
6. La pantalla de **Clientes** del cliente correspondiente debe reflejar el saldo actualizado

### Validar inmutabilidad

No existe botón de eliminar ni editar transacciones. Para corregir un error: registrar una nueva transacción de tipo **Reversión** con monto igual.

---

## 8. Verificar KPIs

| Pantalla | Qué verificar |
|---|---|
| **Dashboard** | Contadores de eventos por estado |
| **Caja** | KPIs de Total Ingresos / Egresos / Saldo Neto |
| **Clientes** | Saldo de cartera del cliente con abono registrado |
| **Inventario** | Contadores de Disponibles / Alquilados por ítem |

---

## Comandos de diagnóstico

```bash
# Ver logs de la BD (errores de triggers, RLS, etc.)
supabase db logs

# Correr migraciones de nuevo (en caso de reset)
supabase db reset

# Ver estado de todos los servicios locales
supabase status

# Inspeccionar política RLS de una tabla
# (en Supabase Studio → Table Editor → [tabla] → RLS)
```

---

## Errores comunes

| Error | Causa probable | Solución |
|---|---|---|
| `/login?error=unauthorized` | Usuario no existe en tabla `usuarios` | Revisar trigger `handle_new_user` |
| `P0001` en confirmación | Overbooking de ítem | Cambiar fecha o seleccionar otro ítem |
| `409` en creación de cliente | NIT duplicado | Buscar el cliente existente |
| Categorías vacías en inventario | Migraciones de semillas no aplicadas | Ver §4a de este quickstart |
| Error al cargar disponibilidad | RPC `obtener_items_disponibles` no existe | Reaplicar migración 20260623000002 |
