# Implementation Quality Checklist: Módulos Especializados (OnProduction)

**Purpose**: Validate implementation completeness, correctness, security and consistency against spec.md and plan.md.
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [tasks.md](../tasks.md)
**Created**: 2026-06-23
**Phase**: Post-Implementation Validation

---

## Database Layer (Capa de Base de Datos)

- [x] IMP001 ¿Las 3 migraciones nuevas siguen la convención `snake_case` para tablas, columnas y funciones?
  > ✅ **Cubierto** — `categorias_inventario`, `transacciones_caja`, `carteras_cliente`, `operarios`, `evento_operarios`, `metodos_pago` todas en `snake_case` consistente.

- [x] IMP002 ¿Todas las tablas nuevas tienen `deleted_at TIMESTAMP NULL` (soft deletes) según el contrato del GEMINI.md?
  > ✅ **Cubierto** — `categorias_inventario`, `metodos_pago`, `carteras_cliente`, `carteras_proveedor`, `operarios`, `evento_operarios` incluyen `deleted_at NULL`. Excepción documentada: `transacciones_caja` no tiene `deleted_at` por diseño de inmutabilidad financiera.

- [x] IMP003 ¿Todas las tablas nuevas tienen RLS habilitado con políticas `SECURITY DEFINER` para evitar recursión?
  > ✅ **Cubierto** — Cada tabla tiene `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` y las funciones de trigger usan `SECURITY DEFINER SET search_path = public`.

- [x] IMP004 ¿Todas las queries y políticas RLS filtran `deleted_at IS NULL` obligatoriamente?
  > ✅ **Cubierto** — Políticas de `categorias_inventario`, `metodos_pago`, `carteras_*`, `operarios` todas incluyen `USING (deleted_at IS NULL)`.

- [x] IMP005 ¿La tabla `transacciones_caja` es verdaderamente inmutable (sin políticas UPDATE/DELETE)?
  > ✅ **Cubierto** — La migración `20260623000001` solo define políticas `SELECT` e `INSERT`. No existe política UPDATE ni DELETE. Comentario explícito en el código.

- [x] IMP006 ¿El trigger `trg_actualizar_cartera_cliente` recalcula el saldo de forma atómica tras cada INSERT en `transacciones_caja`?
  > ✅ **Cubierto** — Función `fn_trigger_actualizar_cartera_cliente` → `recalcular_cartera_cliente` usa `INSERT ... ON CONFLICT DO UPDATE` garantizando atomicidad.

- [x] IMP007 ¿El RPC `obtener_items_disponibles` usa correctamente el operador `OVERLAPS` para detectar solapamiento de fechas?
  > ✅ **Cubierto** — `(p_fecha_inicio, p_fecha_fin) OVERLAPS (e.fecha_inicio_evento, e.fecha_fin_evento)` con filtro de estados `IN ('CONFIRMADO_RESERVADO', 'EN_TRANSITO', 'FINALIZADO', 'PAGADO_CERRADO')`.

- [x] IMP008 ¿La migración de categorías establece el constraint `CHECK` que impide más de 2 niveles de anidamiento?
  > ✅ **Cubierto** — `CHECK (nivel IN (1, 2))` + `CHECK ((nivel = 1 AND parent_id IS NULL) OR (nivel = 2 AND parent_id IS NOT NULL))` impide el anidamiento de más de 2 niveles por diseño.

---

## API Layer (Capa de API)

- [x] IMP009 ¿Todas las API routes validan los campos requeridos y retornan HTTP 422 con mensaje descriptivo?
  > ✅ **Cubierto** — `/api/clientes`, `/api/caja/transacciones`, `/api/inventario/items`, `/api/eventos` retornan 422 con detalle del campo faltante.

- [x] IMP010 ¿Las routes de escritura obtienen el usuario autenticado del header `Authorization` antes de proceder?
  > ✅ **Cubierto** — `/api/caja/transacciones` y `/api/eventos` (POST) requieren `authorization` header, crean un `userClient` y validan el perfil del usuario antes de insertar.

- [x] IMP011 ¿El endpoint de disponibilidad valida que `fecha_fin > fecha_inicio` antes de llamar al RPC?
  > ✅ **Cubierto** — `/api/inventario/disponibilidad` valida `fin <= inicio` y retorna HTTP 400 con mensaje.

- [x] IMP012 ¿La API de eventos captura el código de error `P0001` del trigger de overbooking y retorna HTTP 409?
  > ✅ **Cubierto** — `PATCH /api/eventos/[id]` detecta `error.code === 'P0001'` y retorna `{ tipo: 'CONFLICTO_OVERBOOKING', error: ... }` con status 409.

- [x] IMP013 ¿El soft-delete de eventos solo opera en estado `COTIZACION` y retorna error en otros estados?
  > ✅ **Cubierto** — `DELETE /api/eventos/[id]` verifica el estado antes de actualizar `deleted_at`. Retorna HTTP 409 si el estado no es `COTIZACION`.

- [x] IMP014 ¿La route de clientes verifica la no-duplicidad de `documento_identidad` antes de insertar?
  > ✅ **Cubierto** — `/api/clientes` (POST) ejecuta query de existencia con `.maybeSingle()` y retorna HTTP 409 si ya existe.

- [x] IMP015 ¿La route de ítems de inventario verifica la no-duplicidad de `sku` antes de insertar?
  > ✅ **Cubierto** — `/api/inventario/items` (POST) ejecuta query de existencia y retorna HTTP 409 con mensaje descriptivo.

- [x] IMP016 ¿La máquina de estados de eventos en la API valida transiciones inválidas antes de persistir?
  > ✅ **Cubierto** — `TRANSICIONES_VALIDAS` define el grafo de estados. La route retorna HTTP 422 con mensaje de transición inválida detallado.

---

## TypeScript Types (Tipado Estricto)

- [x] IMP017 ¿`shared/types.ts` está actualizado con todos los tipos nuevos sin usar `any`?
  > ✅ **Cubierto** — `CategoriaInventario`, `MetodoPago`, `TransaccionCaja`, `CarteraCliente`, `CarteraProveedor`, `Operario`, `EventoOperario`, `ItemDisponible`, `CreateTransaccionDto`, `CreateEventoDto`, `UpdateEventoEstadoDto` definidos estrictamente.

- [x] IMP018 ¿Los enums de TypeScript (`TipoTransaccion`, `EstadoEvento`, etc.) coinciden 1:1 con los enums de PostgreSQL?
  > ✅ **Cubierto** — `TipoTransaccion` lista los mismos 5 valores que `tipo_transaccion_enum` en SQL. `EstadoEvento` coincide con `estado_evento_enum`.

- [x] IMP019 ¿El type check de TypeScript (`tsc --noEmit`) pasa sin errores?
  > ✅ **Cubierto** — Ejecutado y confirmado: exit code 0, sin errores ni warnings.

---

## UI/UX — Wizard de Eventos (US5)

- [x] IMP020 ¿El wizard implementa navegación bidireccional libre entre los 3 pasos?
  > ✅ **Cubierto** — El stepper permite click en pasos anteriores siempre, y en el siguiente si el paso actual es válido. Los botones "Anterior/Siguiente" en la barra inferior replican esta lógica.

- [x] IMP021 ¿Al cambiar las fechas (paso 1) y avanzar al paso 2, se re-valida la disponibilidad de los ítems ya seleccionados sin deseleccionarlos?
  > ✅ **Cubierto** — `cargarItemsDisponibles()` llama al RPC y ejecuta `setItemsSeleccionados(prev => prev.map(...))` actualizando `conflicto: true/false` sin eliminar la selección. El campo `conflicto` se usa para alertas visuales.

- [x] IMP022 ¿El cambio de cliente en cualquier paso no resetea las fechas ni la selección de equipos?
  > ✅ **Cubierto** — El selector de cliente actualiza únicamente `datos.cliente_id`. La función `setDatos(d => ({ ...d, cliente_id: null }))` solo modifica el campo `cliente_id`, dejando `fecha_inicio`, `fecha_fin` y `direccion` intactos.

- [x] IMP023 ¿Los ítems con conflicto de disponibilidad se marcan visualmente con alerta y bloquean la creación del evento?
  > ✅ **Cubierto** — Ítems en conflicto muestran badge rojo `!`. El botón "Crear Cotización" está `disabled` si `itemsConConflicto.length > 0`. Alerta de texto en el panel de resumen y en el paso 2.

- [x] IMP024 ¿El resumen de cotización (Paso 3) muestra totales actualizados en tiempo real?
  > ✅ **Cubierto** — `totalEquipos`, `totalAdicionales`, `totalOperarios`, `granTotal` son variables derivadas calculadas en cada render a partir del estado actual, sin necesidad de useEffect.

- [x] IMP025 ¿Los elementos interactivos tienen `id` únicos para testing (Playwright)?
  > ✅ **Cubierto** — `id="fecha-inicio"`, `id="fecha-fin"`, `id="direccion-evento"`, `id="buscar-cliente"`, `id="btn-siguiente-paso-1"`, `id="btn-crear-cotizacion"`, `id="btn-crear-cotizacion-footer"`.

---

## Security & Constitution Compliance

- [x] IMP026 ¿Ninguna Edge Function o route API hace bypass de RLS con `service_role` a menos que sea necesario?
  > ⚠️ **Nota documentada** — Las routes de escritura usan `SUPABASE_SERVICE_ROLE_KEY` para el cliente principal porque operan en el servidor (Next.js API routes, no Edge Functions). El acceso al perfil del usuario se hace via `ANON_KEY + Authorization header` del cliente. Patrón consistente con el project constitution.

- [x] IMP027 ¿Las migraciones no tienen operaciones destructivas (DROP TABLE, ALTER COLUMN ... DROP) sin respaldo?
  > ✅ **Cubierto** — Las 3 migraciones nuevas solo tienen `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE POLICY`, `INSERT ... ON CONFLICT DO NOTHING`. Sin operaciones destructivas.

- [x] IMP028 ¿El campo `usuario_registro_id` en `transacciones_caja` tiene trazabilidad completa del autor?
  > ✅ **Cubierto** — Se obtiene del perfil autenticado mediante el `authorization` header, y se guarda como FK a `usuarios.id`. La pista de auditoría es completa e inmutable.

---

## Summary

| Categoría                          | Total | ✅ OK | ⚠️ Notas | ❌ Fallas |
|------------------------------------|-------|-------|----------|----------|
| Base de Datos                      | 8     | 8     | 0        | 0        |
| API Layer                          | 8     | 8     | 0        | 0        |
| TypeScript Tipado                  | 3     | 3     | 0        | 0        |
| UI/UX Wizard Eventos               | 6     | 6     | 0        | 0        |
| Seguridad & Constitución           | 3     | 2     | 1 (IMP026)| 0       |
| **TOTAL**                          | **28**| **27**| **1**    | **0**    |

**Resultado**: ✅ **CHECKLIST DE IMPLEMENTACIÓN APROBADO**
- 27/28 ítems completamente validados
- 1 nota documentada (IMP026: uso de service_role en API routes de servidor — patrón aceptado)
- 0 fallas críticas
- TypeScript: sin errores (tsc --noEmit exit code 0)
- Pendientes no bloqueantes: UI de caja, inventario y clientes (T021, T026, T030)

## Deuda Técnica V2

- CHK007: Fórmula de recargos avanzados por horas extras de operarios
- CHK015: Bloqueo duro de operarios con conflicto de horario
- IMP026: Migración a Edge Functions Deno para operaciones críticas que requieran service_role con mayor aislamiento
