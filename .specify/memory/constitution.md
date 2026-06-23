<!--
Sync Impact Report:
- Version change: N/A -> 1.0.0 (Initial ratification)
- Principles defined:
  - I. DB-Centric Transactional Logic
  - II. Strict Soft Deletes
  - III. Isolated Row Level Security (RLS)
  - IV. Autonomous Edge Functions
  - V. Strict TypeScript Typing
- Added sections: Technology Stack, Development & Migration Workflow
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
-->

# OnProduction Project Constitution

## Core Principles

### I. DB-Centric Transactional Logic
Toda la lógica transaccional pesada, validación operativa compleja y reglas de inmutabilidad financiera DEBEN delegarse directamente a triggers y funciones PL/pgSQL en la base de datos PostgreSQL de Supabase. El cliente o la API no deben realizar cálculos financieros críticos de forma autónoma.

### II. Strict Soft Deletes
Las tablas transaccionales DEBEN utilizar eliminaciones lógicas mediante una columna `deleted_at TIMESTAMP NULL`. Todas las políticas de RLS, triggers, funciones y consultas del cliente DEBEN filtrar explícitamente mediante `deleted_at IS NULL` para evitar procesar registros lógicamente borrados.

### III. Isolated Row Level Security (RLS)
Todas las tablas expuestas en Supabase DEBEN tener Row Level Security (RLS) habilitado. Para prevenir recursiones y optimizar rendimiento, las políticas DEBEN utilizar funciones auxiliares con la cláusula `SECURITY DEFINER` que aíslen el contexto de autenticación del usuario.

### IV. Autonomous Edge Functions
Cada Edge Function en `supabase/functions/<nombre-funcion>` DEBE ser autónoma, de responsabilidad única y escrita en TypeScript bajo el runtime de Deno. El bypass de RLS utilizando la clave `service_role` en Edge Functions está prohibido, a menos que sea estrictamente necesario para operaciones administrativas de sistema previamente documentadas.

### V. Strict TypeScript Typing
Tanto el cliente frontend en Next.js como los scripts de soporte DEBEN mantener tipado estricto en TypeScript 5.x (`noImplicitAny = true`). El uso del tipo genérico `any` está prohibido, priorizando interfaces explícitas auto-generadas desde el esquema de base de datos de Supabase.

## Technology Stack & Constraints

El proyecto se construye sobre la siguiente arquitectura y conjunto de herramientas:
- **Base de Datos**: Supabase PostgreSQL 15+ administrada con PostgREST.
- **Autenticación y Seguridad**: Supabase Auth (GoTrue) integrado con RLS.
- **Backend / Procesamiento**: Supabase Edge Functions con Deno y TypeScript.
- **Frontend / Cliente**: Next.js 15+ con App Router y CSS puro/Vanilla CSS.
- **Formato de Base de Datos**: Identificadores y nombres de bases de datos DEBEN escribirse en `snake_case`. Código de cliente y APIs en `camelCase`.

## Development & Migration Workflow

- **Gestión de Cambios de Base de Datos**: Cualquier cambio al DDL DEBE realizarse a través de archivos de migración gestionados con la CLI de Supabase (`supabase migration new <nombre>`). Están prohibidas las alteraciones destructivas directas en caliente.
- **Historial de Commits**: Se DEBE seguir estrictamente el estándar de Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **Manejo de Errores Transaccionales**: Los errores y excepciones levantados por triggers de base de datos (códigos Postgres `P0001`) DEBEN canalizarse y desacoplarse en el frontend usando el helper global de transacciones en `/shared/transaction-helper.ts`.

## Governance

La constitución de OnProduction define las directrices arquitectónicas que rigen el repositorio.
- **Proceso de Enmienda**: Cualquier cambio en los principios constitucionales requiere una actualización documental explícita, justificación técnica y el incremento de la versión del documento.
- **Versionamiento Semántico**:
  - **MAJOR**: Remoción o cambio destructivo en principios de seguridad (RLS) o persistencia (Soft Deletes).
  - **MINOR**: Adición de nuevas restricciones, stack tecnológico o guías de estilo.
  - **PATCH**: Correcciones de formato, typos y clarificaciones de redacción.

**Version**: 1.0.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-23
