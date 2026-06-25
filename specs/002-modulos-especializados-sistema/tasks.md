# Tasks: Módulos Especializados del Sistema (OnProduction)

**Input**: Design documents from `/specs/002-modulos-especializados-sistema/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure.

- [ ] T001 Create project structure for specialized modules in frontend/src/ and supabase/
- [ ] T002 Configure local Supabase development environment in supabase/config.toml
- [ ] T003 [P] Configure next.config.ts and eslint.config.mjs for the new API routes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema and migrations that must be complete before user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create database migration file for roles and public users in supabase/migrations/
- [ ] T005 Create database migration file for enterprise config and categories in supabase/migrations/
- [ ] T006 Create database migration file for clients and items in supabase/migrations/
- [ ] T007 Create database migration file for events and caixa transacciones in supabase/migrations/
- [ ] T008 [P] Implement postgres trigger and function for inventory availability in supabase/migrations/
- [ ] T009 [P] Setup global transaction helper in shared/transaction-helper.ts

**Checkpoint**: Foundation ready - database tables and availability triggers configured.

---

## Phase 3: User Story 1 - Módulo Administrativo (Priority: P1) 🎯 MVP

**Goal**: Configurar la información empresarial, subir logotipo a Supabase Storage y gestionar usuarios/roles.

**Independent Test**: Configurar los datos de la empresa en la base de datos, subir un logo y verificar que se guarde en Storage. Crear un usuario con rol Bodeguero y confirmar sus restricciones.

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create roles table and insert seeds in supabase/migrations/20260623000000_administrative.sql
- [ ] T011 [P] [US1] Create EmpresaConfig model mapping in shared/types.ts
- [ ] T012 [US1] Create public bucket for logo uploads in supabase/migrations/20260623000000_storage.sql
- [ ] T013 [US1] Implement enterprise configuration API route in frontend/src/app/api/empresa/route.ts
- [ ] T014 [US1] Implement user role synchronization trigger handle_new_user in supabase/migrations/20260612000000_sincronizacion.sql
- [ ] T015 [US1] Create administrative config dashboard page in frontend/src/app/dashboard/configuracion/page.tsx
- [ ] T016 [US1] Create users management UI table in frontend/src/app/dashboard/usuarios/page.tsx

**Checkpoint**: Módulo Administrativo completamente funcional.

---

## Phase 4: User Story 2 - Caja, Flujo de Caja y Carteras (Priority: P1)

**Goal**: Registrar ingresos, abonos y egresos, y calcular los saldos de carteras de clientes y proveedores.

**Independent Test**: Registrar abonos de clientes y egresos de proveedores y verificar que el balance de caja y carteras se recalculen de forma atómica en base de datos.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create metodos_pago and transacciones_caja tables in supabase/migrations/20260623000001_caixa.sql
- [ ] T018 [P] [US2] Create Carteras model mapping in shared/types.ts
- [ ] T019 [US2] Implement payment registration API route in frontend/src/app/api/caja/transaccion/route.ts
- [ ] T020 [US2] Implement automatic balance calculations trigger for client/provider wallets in supabase/migrations/20260623000001_caixa_triggers.sql
- [ ] T021 [US2] Create financial transactions ledger UI component in frontend/src/app/dashboard/caja/page.tsx

**Checkpoint**: Módulo de Caja y Carteras completamente funcional.

---

## Phase 5: User Story 3 - Inventario de Ítems (Priority: P1)

**Goal**: Registrar y clasificar los equipos en el inventario con SKU únicos bajo una estructura de categorías jerárquica.

**Independent Test**: Registrar un equipo asociándolo a una subcategoría de tercer nivel, verificar el SKU único y que esté disponible.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Create items_inventario and categorias tables in supabase/migrations/20260623000002_inventory.sql
- [ ] T023 [P] [US3] Create Inventario model mapping in shared/types.ts
- [ ] T024 [US3] Implement inventory API route for items creation and listing in frontend/src/app/api/inventario/items/route.ts
- [ ] T025 [US3] Implement hierarchical categories listing API route in frontend/src/app/api/inventario/categorias/route.ts
- [ ] T026 [US3] Create inventory management panel UI in frontend/src/app/dashboard/inventario/page.tsx

**Checkpoint**: Módulo de Inventario con categorías jerárquicas funcional.

---

## Phase 6: User Story 4 - Gestión de Clientes (Priority: P2)

**Goal**: Base de datos unificada de clientes con su historial de eventos y saldos de cartera activos.

**Independent Test**: Consultar un cliente y verificar que cargue de forma integrada sus datos, saldo de cartera e histórico.

### Implementation for User Story 4

- [ ] T027 [P] [US4] Create clientes table in supabase/migrations/20260623000003_clients.sql
- [ ] T028 [P] [US4] Create Clientes model mapping in shared/types.ts
- [ ] T029 [US4] Implement client creation and query API route in frontend/src/app/api/clientes/route.ts
- [ ] T030 [US4] Create client directory list UI dashboard page in frontend/src/app/dashboard/clientes/page.tsx

**Checkpoint**: Directorio y gestión de clientes unificada funcional.

---

## Phase 7: User Story 5 - Registro de Eventos (Priority: P1)

**Goal**: Crear eventos validando la disponibilidad física de inventario sin conflictos de reserva en las fechas seleccionadas.

**Independent Test**: Intentar reservar un ítem en un evento en fechas coincidentes con otro evento activo y verificar que el trigger bloquee la inserción y el frontend muestre el error de stock.

### Implementation for User Story 5

- [ ] T031 [P] [US5] Create eventos and evento_items tables in supabase/migrations/20260623000004_events.sql
- [ ] T032 [P] [US5] Create Evento model mapping in shared/types.ts
- [ ] T033 [US5] Implement events creation and items assignment API route in frontend/src/app/api/eventos/route.ts
- [ ] T034 [US5] Implement dynamic items availability filter API route in frontend/src/app/api/inventario/disponibilidad/route.ts
- [ ] T035 [US5] Implement event registration multi-step form UI in frontend/src/app/dashboard/eventos/crear/page.tsx supporting bidirectional step navigation, client-state preservation (dates/items), and hot client switching.

**Checkpoint**: Registro de eventos con bloqueo transaccional de stock activo y funcional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales y validación del flujo completo.

- [ ] T036 Update documentation in README.md and documentation folder
- [ ] T037 Validate all scenarios in specs/002-modulos-especializados-sistema/quickstart.md using local database
- [ ] T038 Conduct final UI polish for Next.js dashboards

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks all subsequent User Story phases.
- **User Stories (Phases 3-7)**: Depend on Foundational phase completion. Can be worked on in parallel or sequentially.
- **Polish (Phase 8)**: Depends on completion of all user story tasks.

---

## Parallel Opportunities

- **Setup**: Tasks T002 and T003 can run in parallel.
- **Foundational**: Migrations T004-T007 and trigger T008 can be written in parallel.
- **Across Stories**: Once Phase 2 is complete, different developers can implement User Story 1 (Admin), User Story 2 (Caixa), and User Story 3 (Inventory) in parallel since they touch separate files.
