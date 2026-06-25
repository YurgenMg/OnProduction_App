<!--
Sync Impact Report:
- Version change: 1.2.0 -> 1.3.0 (Addition of User-Centric PDF Generation Principle)
- Principles defined:
  - I. DB-Centric Transactional Logic
  - II. Strict Soft Deletes
  - III. Isolated Row Level Security (RLS)
  - IV. Autonomous Edge Functions
  - V. Strict TypeScript Typing
  - VI. Graphify-First Code Navigation
  - VII. Data Engineering & Architecture Best Practices
  - VIII. User-Centric PDF Generation
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

### VI. Graphify-First Code Navigation
Para cualquier pregunta sobre arquitectura, base de código, dependencias o flujos de trabajo, el agente de IA DEBE utilizar en primer lugar el grafo de conocimiento de Graphify (`graphify-out/graph.json`) mediante consultas de grafo (`graphify query`, `query_graph`). Esto minimiza el consumo de tokens y garantiza respuestas rápidas, precisas y contextualizadas a la estructura real del proyecto.

### VII. Data Engineering & Architecture Best Practices
El diseño de datos del proyecto DEBE apegarse a los siguientes estándares de ingeniería y arquitectura:
- **Inmutabilidad Financiera**: Los registros en las tablas de caja (`TransaccionCaja`) son de solo inserción (insert-only). Queda prohibido modificar (`UPDATE`) o eliminar físicamente (`DELETE`) registros de caja o abonos ya ratificados. Cualquier corrección debe realizarse a través de una transacción de ajuste o reversión.
- **Normalización**: El esquema relacional DEBE seguir la Tercera Forma Normal (3NF) para evitar redundancias, garantizando llaves foráneas e integridad referencial en todo momento.
- **Indexación Selectiva**: Se DEBEN definir índices parciales explícitos (ej. `CREATE INDEX ... WHERE deleted_at IS NULL`) en columnas utilizadas frecuentemente en filtros de búsqueda o uniones (como `deleted_at`, `email`, `sku`) para optimizar el rendimiento de la base de datos.

### VIII. User-Centric PDF Generation
Todos los documentos PDF generados por la aplicación (como cotizaciones, cuentas de cobro y reportes de caja) DEBEN ser limpios, profesionales y fáciles de leer y entender por clientes finales y proveedores. Esto incluye:
- **Diseño Estructurado**: Alineación en cuadrícula, márgenes amplios y uso consistente de tipografías legibles (sans-serif).
- **Tablas Claras**: Desgloses detallados de ítems y precios con bordes sutiles y contraste de color óptimo.
- **Información Visual**: Secciones claramente delimitadas (encabezados, datos de emisor/receptor, totales y métodos de pago destacados).
- **Consistencia de Estilo**: El diseño gráfico debe alinearse con la identidad corporativa y logotipo cargados en la configuración.

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

**Version**: 1.3.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-23
