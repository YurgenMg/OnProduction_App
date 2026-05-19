# GEMINI.md — Contrato del Agente para OnProduction

Este documento define el stack, convenciones, arquitectura y restricciones que el agente de IA (Antigravity) debe seguir en este repositorio.

## Stack Tecnológico
- **Base de Datos y API**: Supabase (PostgreSQL 15+) con PostgREST.
- **Autenticación y Seguridad**: Supabase Auth (GoTrue) + Row Level Security (RLS) estricto.
- **Backend / Edge Functions**: Supabase Edge Functions (Deno + TypeScript).
- **Frontend / Cliente**: TypeScript 5.x + `@supabase/supabase-js`.

## Convenciones del Proyecto
- **Arquitectura de Base de Datos**:
  - Tablas transaccionales utilizan Soft Deletes mediante `deleted_at TIMESTAMP NULL`.
  - Todas las queries deben filtrar por `deleted_at IS NULL` a menos que sea una auditoría administrativa.
- **Nombres de Carpetas y Archivos**:
  - Base de datos: `snake_case` para tablas, columnas, funciones y triggers.
  - TypeScript (cliente): `camelCase` para variables/funciones, `PascalCase` para tipos/interfaces/clases.
  - Carpetas: `kebab-case` para directorios de configuración y Edge Functions.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## Arquitectura
- **Base de Datos**: Lógica transaccional pesada delegada a triggers e inmutabilidad financiera congelada.
- **Seguridad en DB**: RLS estricto implementado con funciones `SECURITY DEFINER` para aislar el contexto del usuario y evitar recursión.
- **Edge Functions**: Cada función en `supabase/functions/<nombre-funcion>` es autónoma y ejecuta una tarea específica (ej: `generar-contrato`).
- **Helpers de Cliente**: Lógica para capturar errores de triggers (`P0001` de PostgreSQL) desacoplada en `/shared/transaction-helper.ts`.

## Comandos Frecuentes
- Iniciar Supabase localmente: `supabase start`
- Crear una nueva migración: `supabase migration new <nombre>`
- Desplegar Edge Functions localmente: `supabase functions serve`
- Desplegar a producción: `supabase db push` y `supabase functions deploy <nombre>`

## Restricciones del Agente
- ❌ No realizar alteraciones destructivas en el DDL de base de datos sin una estrategia de migración clara.
- ❌ No realizar bypass de RLS en Edge Functions a menos que sea estrictamente necesario (ej. subida de contratos finalizados con `service_role`).
- ✅ Filtrar siempre `deleted_at IS NULL` en cualquier política RLS y función que interactúe con el catálogo o eventos.
- ✅ Mantener una cobertura de tipado estricto en TypeScript (`noImplicitAny = true`).
