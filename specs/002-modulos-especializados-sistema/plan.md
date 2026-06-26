# Implementation Plan: Módulos Especializados del Sistema (OnProduction)

**Branch**: `002-modulos-especializados-sistema` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-modulos-especializados-sistema/spec.md`

## Summary
El objetivo es implementar la estructura técnica de soporte para los 5 módulos especializados del sistema: Administrativo, Caja/Flujo de Caja, Inventario, Clientes y Gestión de Eventos. Esto abarca las tablas relacionales en Supabase PostgreSQL, triggers PL/pgSQL de validación transaccional y los endpoints de API en Next.js.

**Actualización 2026-06-26**: Se incorpora **Ruflo** como meta-harness de agentes IA (inicializado con `npx ruflo init`) y **Graphify** como sistema de knowledge graph del codebase (`graphify-out/`). Esta capa de orquestación potencia el proceso de implementación guiado por agentes inteligentes.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+, Deno (Edge Functions)

**Primary Dependencies**: Next.js 15+, `@supabase/supabase-js`, PostgREST

**Storage**: Supabase PostgreSQL 15+, Supabase Storage (Buckets para logotipo)

**Testing**: Jest, Playwright (QA de flujos)

**Target Platform**: Servidor Deno Edge, Navegadores Web (Next.js client)

**Project Type**: Web Application

**Performance Goals**: <100ms para actualizaciones de saldo de caja, 0% de sobrealquiler físico en base de datos.

**Constraints**: Políticas de RLS habilitadas en todas las tablas, filtro obligatorio de `deleted_at IS NULL`.

**Scale/Scope**: 5 módulos principales, ~10 tablas de base de datos relacionales.

**Agent Tooling**:
- **Ruflo**: Meta-harness inicializado en la raíz. Provee 98+ agentes especializados, memoria persistente (`ruflo-rag-memory`), swarms coordinados, y hooks automáticos para el entorno Claude Code.
- **Graphify**: Knowledge graph en `graphify-out/`. Todos los agentes de Ruflo deben consultar `graphify query "<pregunta>"` antes de hacer investigación exhaustiva sobre el codebase.
- **Speckit**: Ciclo SDD activo — este `plan.md` es el artefacto central de la feature y se mantiene sincronizado mediante el script `update-agent-context.ps1`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **DB-Centric Transactional Logic**: ✅ Aprobado. Las validaciones de reservas de inventario se delegan a triggers Postgres.
- **Strict Soft Deletes**: ✅ Aprobado. Columnas `deleted_at` implementadas en todas las tablas transaccionales.
- **Isolated Row Level Security (RLS)**: ✅ Aprobado. RLS configurado por tabla.
- **Autonomous Edge Functions**: ✅ Aprobado. Funciones desacopladas en Deno.
- **Strict TypeScript Typing**: ✅ Aprobado. Interfaces auto-generadas desde el esquema físico de BD.
- **Agent Orchestration Layer**: ✅ Aprobado. Ruflo como harness externo; no modifica lógica de negocio.

## Agent Tooling Rules (Ruflo + Graphify)

> **OBLIGATORIO para todos los agentes de Ruflo que trabajen en este proyecto:**

### 1. Graphify-First para Preguntas de Codebase
Antes de explorar archivos de forma manual, siempre consulta el knowledge graph:
```bash
# Para preguntas de arquitectura o relaciones
graphify query "¿cómo funciona el trigger de disponibilidad?"

# Para trazar relaciones entre módulos
graphify path "evento_items" "fn_verificar_disponibilidad_item"

# Para entender un concepto específico
graphify explain "transacciones_caja"
```
Si existe `graphify-out/wiki/index.md`, navegar ese índice en lugar de leer archivos directos.

### 2. Mantener el Grafo Actualizado
Después de modificar archivos de código fuente en cualquier sesión de trabajo:
```bash
graphify update .
```
Esto mantiene `graphify-out/graph.json` vigente con cambios AST (sin costo de API).

### 3. Speckit como Fuente de Verdad del Plan
El plan activo está siempre en `specs/002-modulos-especializados-sistema/plan.md`.  
Para actualizar el contexto del agente después de avanzar en tareas:
```powershell
.specify/extensions/agent-context/scripts/powershell/update-agent-context.ps1
```

### 4. Plugins de Ruflo Recomendados para esta Feature
| Plugin | Uso en este proyecto |
|--------|---------------------|
| `ruflo-sparc` | Metodología de 5 fases para implementar cada módulo con quality gates |
| `ruflo-migrations` | Gestión segura de las migraciones de Supabase |
| `ruflo-testgen` | Generación automática de tests para triggers y API routes |
| `ruflo-security-audit` | Validación de políticas RLS y OWASP antes de desplegar |
| `ruflo-observability` | Logs estructurados y trazabilidad de transacciones de caja |
| `ruflo-docs` | Mantenimiento automático de documentación en `specs/` |

## Project Structure

### Documentation (this feature)

```text
specs/002-modulos-especializados-sistema/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API endpoints contract
├── tasks.md             # Phase 2 output (/speckit.tasks)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code Layout

```text
supabase/
├── migrations/
│   └── 20260623000000_modulos_especializados.sql  # Database migrations
└── config.toml

frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── empresa/
│   │   │   ├── caja/
│   │   │   └── inventario/
│   │   └── dashboard/
│   │       ├── configuracion/
│   │       ├── inventario/
│   │       └── usuarios/
│   └── services/

graphify-out/             # Knowledge graph del codebase (NO editar manualmente)
├── graph.json
├── GRAPH_REPORT.md
└── wiki/

.claude/                  # Configuración de Ruflo (generado por npx ruflo init)
.claude-flow/             # Estado de agentes y memoria de Ruflo
CLAUDE.md                 # Contexto de Ruflo para Claude Code
```

**Structure Decision**: El proyecto sigue una estructura desacoplada con el backend de datos en `supabase/` y la lógica de cliente/API en `frontend/`. Ruflo opera como capa transversal de orquestación sin modificar esta estructura.

## Progress Tracker

| Fase | Estado | Notas |
|------|--------|-------|
| Phase 1 — Setup | 🔄 En progreso | Estructura base existe |
| Phase 2 — Foundational DB | 🔄 En progreso | Migraciones parcialmente aplicadas |
| Phase 3 — Módulo Administrativo (US1) | 🔄 En progreso | Dashboard de config y usuarios en construcción |
| Phase 4 — Caja y Carteras (US2) | ⏳ Pendiente | |
| Phase 5 — Inventario (US3) | ⏳ Pendiente | |
| Phase 6 — Clientes (US4) | 🔄 En progreso | `clientes/page.tsx` abierto |
| Phase 7 — Eventos (US5) | 🔄 En progreso | Calendar y page.tsx en construcción |
| Phase 8 — Polish | ⏳ Pendiente | |
| **Ruflo Init** | 🔄 En ejecución | `npx ruflo init` corriendo |
| **Graphify Integration** | ✅ Activo | `graphify-out/` presente |

## Complexity Tracking

*No hay violaciones constitucionales que justificar.*

| Adición | Justificación | Alternativa Rechazada |
|---------|---------------|----------------------|
| Ruflo (meta-harness) | Necesario para orquestar múltiples agentes en el ciclo de implementación de 5 módulos complejos | Claude Code sin harness no tiene memoria persistente entre sesiones |
| Graphify (knowledge graph) | Permite a los agentes navegar el codebase en O(1) en lugar de exploración exhaustiva de archivos | `grep` manual no captura relaciones semánticas entre triggers, tablas y componentes |
