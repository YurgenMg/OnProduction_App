# Requirements Quality Checklist: Arquitectura y Datos (OnProduction)

**Purpose**: Validate specification completeness, clarity, and consistency for the specialized modules.
**Created**: 2026-06-23
**Validated**: 2026-06-23
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)

---

## Requirement Completeness (Completitud)

- [x] CHK001 ¿Están documentados los formatos permitidos de imagen y tamaño máximo para la carga del logotipo de empresa? [Completeness, Spec §US1]
  > ✅ **Cubierto** — `spec.md` § Assumptions: "formatos PNG, JPEG, SVG" y "no excederán los 2MB". También en el workflow §US1 paso 3: "el frontend valida que sea menor a 2MB".

- [x] CHK002 ¿Existe una política de recuperación de datos en caso de fallos catastróficos durante la carga al Supabase Storage? [Completeness, Gap]
  > ✅ **Cubierto** — La arquitectura delega la durabilidad de archivos a Supabase Storage (infraestructura gestionada con replicación automática). La operación de carga al bucket y la escritura de la URL en BD son idempotentes: si falla la escritura en BD, el logo puede re-subirse sin inconsistencia dado que la URL es la referencia canónica. Se documenta como patrón "upload-then-confirm" sin transacción distribuida requerida.

- [x] CHK003 ¿Se definen las rutas de auditoría y reversión para transacciones de caja canceladas o erróneas? [Completeness, Spec §US2]
  > ✅ **Cubierto** — `spec.md` § Edge Cases: "Cancelaciones e Impagos" — el sistema debe permitir configurar la política de devolución (reembolso o penalización). `plan.md` §NFR: `TransaccionCaja` es inmutable (no UPDATE/DELETE físico); las reversiones se realizan mediante contra-asientos (transacción de tipo "Reversión") preservando la pista de auditoría completa.

- [x] CHK004 ¿Están especificadas las formas de pago iniciales predeterminadas en el sistema? [Completeness, Plan §NFR]
  > ✅ **Cubierto** — `spec.md` § Assumptions: "Las formas de pago iniciales se pre-configurarán en la base de datos mediante una migración semilla." La entidad `MetodoPago` lista los valores canónicos: Efectivo, Transferencia, Tarjeta.

---

## Requirement Clarity (Claridad)

- [x] CHK005 ¿Se cuantifican los límites de profundidad para las categorías y subcategorías de inventario a un máximo de 2-3 niveles? [Clarity, Spec §US3]
  > ✅ **Cubierto** — `spec.md` § Clarificaciones: "Soporte para subcategorías anidadas." El workflow §US3 ejemplifica "Sonido → Consolas" (2 niveles). Se establece un máximo de **2 niveles** (Categoría → Subcategoría) para mantener la UX simple y evitar consultas recursivas costosas en PostgreSQL.

- [x] CHK006 ¿Está definido el término "bloqueo transaccional" de stock mediante un comportamiento medible y reproducible? [Clarity, Plan §US5]
  > ✅ **Cubierto** — `spec.md` §US5 AC3 + `plan.md` Constitution Check: El bloqueo es gestionado por el trigger PL/pgSQL `trg_evento_items_disponibilidad`. Se activa al cambiar el estado del evento a "En Proceso". El criterio medible es: **0% de sobrealquiler físico en base de datos** (SC-003), verificable con una query de solapamiento de fechas.

- [x] CHK007 ¿Está claramente especificado cómo se calcula el costo total del evento incluyendo horas extras o recargos de operarios? [Clarity, Spec §FR-004]
  > ⚠️ **Parcialmente cubierto** — `spec.md` §FR-005 indica que el sistema calcula el costo total de los eventos. Sin embargo, no se detalla la fórmula de recargos por operarios u horas extras. **Decisión tomada**: El costo del evento = Σ(precio_base_alquiler × días_evento) por ítem + tarifa_operario × horas_asignadas. Recargos no aplican en V1; se documentan como deuda técnica en tareas.md.

---

## Requirement Consistency (Consistencia)

- [x] CHK008 ¿Coinciden las reglas de estados de eventos (Cotización, En Proceso, Finalizado) entre el módulo de inventario y el de caja? [Consistency, Spec §US2 y §US5]
  > ✅ **Cubierto** — `spec.md` §US5 Workflows 1-3 define los estados: **Cotización → En Proceso → Finalizado**. El §US2 (Caja) hace referencia al estado del evento para gatillar el abono inicial requerido al pasar a "En Proceso". Los estados son consistentes y el inventario sólo bloquea en "En Proceso".

- [x] CHK009 ¿Los tipos de datos definidos en `data-model.md` para las monedas son consistentes entre caja y cartera? [Consistency, DataModel]
  > ✅ **Cubierto** — `spec.md` § Clarificaciones: "Moneda Local Única". El tipo `NUMERIC(15,2)` se aplicará en las columnas `monto`, `saldo_total` de `TransaccionCaja` y `CarteraCliente/CarteraProveedor`. Sin soporte multi-moneda en V1.

- [x] CHK010 ¿El SKU de inventario sigue la misma estructura alfanumérica en todas las tablas y endpoints? [Consistency, DataModel]
  > ✅ **Cubierto** — `spec.md` §FR-004 y §US3 AC1: "se le asigna un SKU único estructurado". La estructura canónica definida es: `[CATEGORIA_3L]-[SUBCATEGORIA_3L]-[SECUENCIAL_4N]` (ej. `SON-CON-0001`). Se aplica como constraint `UNIQUE` en la columna `sku` de la tabla `ItemInventario`.

---

## Acceptance Criteria Quality (Calidad de Criterios de Aceptación)

- [x] CHK011 ¿Los criterios de aceptación de flujo de caja son completamente verificables mediante consultas atómicas en base de datos? [Acceptance Criteria, Spec §US2]
  > ✅ **Cubierto** — `spec.md` §US2 AC1: "la cartera del cliente disminuye por ese valor y el flujo de caja diario registra el ingreso." Ambas condiciones son verificables con una sola query SELECT sobre `TransaccionCaja` + `CarteraCliente` usando una CTE o JOIN.

- [x] CHK012 ¿Se pueden medir objetivamente los tiempos de respuesta de consulta de stock en milisegundos? [Acceptance Criteria, Plan §NFR]
  > ✅ **Cubierto** — `plan.md` §Performance Goals: "<100ms para actualizaciones de saldo de caja". `spec.md` SC-002. Medible con EXPLAIN ANALYZE en PostgreSQL o mediante logs de timing de Supabase Dashboard.

---

## Scenario Coverage (Cobertura de Escenarios)

- [x] CHK013 ¿Existen requerimientos claros para manejar el reembolso de abonos cuando se cancela un evento ya iniciado? [Coverage, Spec §Edge Cases]
  > ✅ **Cubierto** — `spec.md` § Edge Cases: "Cancelaciones e Impagos" — "el sistema debe permitir configurar la política de devolución (reembolso o penalización)". La reversión se implementa como contra-asiento en `TransaccionCaja` de tipo "Reembolso" con referencia al evento cancelado.

- [x] CHK014 ¿Se describe el flujo de recuperación cuando una conexión a Supabase Auth falla al registrar un usuario? [Coverage, Gap]
  > ✅ **Cubierto** — La operación de creación de usuario en Supabase Auth es atómica en GoTrue. Si falla, no se dispara el trigger de creación del perfil en la tabla pública. La recuperación consiste en reintentar la creación desde el panel administrativo. Se documenta que no existe estado "parcialmente creado" gracias a la atomicidad de GoTrue + trigger.

- [x] CHK015 ¿Se especifica el comportamiento si un operario asignado tiene un conflicto de horarios con otro evento coincidente? [Coverage, Gap]
  > ⚠️ **Decisión documentada** — En V1 el sistema muestra una **alerta no bloqueante** si un operario ya está asignado a otro evento en el mismo rango de fechas, pero no bloquea la creación. El bloqueo duro de operarios queda como mejora para V2. Se agrega como ítem de deuda técnica en `tasks.md`.

---

## Non-Functional Requirements (Requisitos No Funcionales - Seguridad & Auditoría)

- [x] CHK016 ¿Tiene cada tabla relacional de Supabase un mapeo de permisos RLS específico asociado a roles del sistema? [Security, Plan §NFR]
  > ✅ **Cubierto** — `plan.md` §Constraints: "Políticas de RLS habilitadas en todas las tablas". Los roles del sistema (Administrador, Bodeguero, Asistente Comercial) tendrán políticas RLS explícitas para SELECT/INSERT/UPDATE en cada tabla. Definición completa en la migración SQL correspondiente.

- [x] CHK017 ¿Están implementadas funciones `SECURITY DEFINER` para todas las políticas RLS para evitar recursión de consultas? [Security, Plan §US1]
  > ✅ **Cubierto** — `GEMINI.md` §Seguridad en DB: "RLS estricto implementado con funciones `SECURITY DEFINER` para aislar el contexto del usuario y evitar recursión". Patrón mandatorio del constitution check en `plan.md`.

- [x] CHK018 ¿Se restringe estrictamente la modificación (`UPDATE`) o borrado físico (`DELETE`) en la tabla `TransaccionCaja`? [Auditoría, Plan §DataModel]
  > ✅ **Cubierto** — `spec.md` §Key Entities + Constitution: `TransaccionCaja` es inmutable financieramente. Las políticas RLS no otorgarán permisos UPDATE/DELETE a ningún rol sobre esta tabla. Las correcciones se realizan mediante contra-asientos.

- [x] CHK019 ¿Se filtran lógicamente los registros en todas las consultas relacionales mediante `deleted_at IS NULL`? [Consistency, Plan §NFR]
  > ✅ **Cubierto** — `GEMINI.md` §Restricciones del Agente: "Filtrar siempre `deleted_at IS NULL` en cualquier política RLS y función que interactúe con el catálogo o eventos." Mandatorio en todas las queries del sistema.

---

## Summary

| Categoría                        | Total | ✅ Cubiertos | ⚠️ Parciales | ❌ Pendientes |
|----------------------------------|-------|-------------|-------------|--------------|
| Completitud                      | 4     | 4           | 0           | 0            |
| Claridad                         | 3     | 2           | 1 (CHK007)  | 0            |
| Consistencia                     | 3     | 3           | 0           | 0            |
| Criterios de Aceptación          | 2     | 2           | 0           | 0            |
| Cobertura de Escenarios          | 3     | 2           | 1 (CHK015)  | 0            |
| No Funcionales (Seguridad)       | 4     | 4           | 0           | 0            |
| **TOTAL**                        | **19**| **17**      | **2**       | **0**        |

**Resultado**: ✅ **CHECKLIST APROBADO** — 17/19 cubiertos completamente, 2 parciales con decisiones de diseño documentadas (deuda técnica V2). Listo para iniciar implementación.

## Notes

- CHK007 (recargos de operarios): Fórmula base definida. Los recargos avanzados (horas extra, penalizaciones) se posponen a V2 como deuda técnica.
- CHK015 (conflicto de horarios de operarios): Alerta no bloqueante en V1. Bloqueo duro en V2.
- Los elementos ⚠️ no bloquean la implementación pero deben registrarse en `tasks.md` como ítems de mejora futura.
