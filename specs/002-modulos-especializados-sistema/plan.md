# Implementation Plan: Módulos Especializados del Sistema (OnProduction)

**Branch**: `002-modulos-especializados-sistema` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-modulos-especializados-sistema/spec.md`

## Summary
El objetivo es implementar la estructura técnica de soporte para los 5 módulos especializados del sistema: Administrativo, Caja/Flujo de Caja, Inventario, Clientes y Gestión de Eventos. Esto abarca las tablas relacionales en Supabase PostgreSQL, triggers PL/pgSQL de validación transaccional y los endpoints de API en Next.js.

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

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **DB-Centric Transactional Logic**: ✅ Aprobado. Las validaciones de reservas de inventario se delegan a triggers Postgres.
- **Strict Soft Deletes**: ✅ Aprobado. Columnas `deleted_at` implementadas en todas las tablas transaccionales.
- **Isolated Row Level Security (RLS)**: ✅ Aprobado. RLS configurado por tabla.
- **Autonomous Edge Functions**: ✅ Aprobado. Funciones desacopladas en Deno.
- **Strict TypeScript Typing**: ✅ Aprobado. Interfaces auto-generadas desde el esquema físico de BD.

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
```

**Structure Decision**: El proyecto sigue una estructura desacoplada con el backend de datos en `supabase/` y la lógica de cliente/API en `frontend/`.

## Complexity Tracking

*No hay violaciones constitucionales que justificar.*
