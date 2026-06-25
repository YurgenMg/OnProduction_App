# Graph Report - OnProduction  (2026-06-25)

## Corpus Check
- 106 files · ~71,712 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 660 nodes · 790 edges · 82 communities (63 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7457895f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard and UI Layouts|Dashboard and UI Layouts]]
- [[_COMMUNITY_Service Worker Routing|Service Worker Routing]]
- [[_COMMUNITY_API Route Utilities|API Route Utilities]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_Cache and Request Handling|Cache and Request Handling]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Database Entity Types|Database Entity Types]]
- [[_COMMUNITY_System Documentation and Triggers|System Documentation and Triggers]]
- [[_COMMUNITY_Supabase Client Configuration|Supabase Client Configuration]]
- [[_COMMUNITY_Backend Logic Testing|Backend Logic Testing]]
- [[_COMMUNITY_Database Trigger Testing|Database Trigger Testing]]
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_Deno Runtime Configuration|Deno Runtime Configuration]]
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Root Layout Metadata|Root Layout Metadata]]
- [[_COMMUNITY_Database Transaction Helpers|Database Transaction Helpers]]
- [[_COMMUNITY_Test User Creation|Test User Creation]]
- [[_COMMUNITY_Database Transaction Helpers|Database Transaction Helpers]]
- [[_COMMUNITY_Next.js PWA Configuration|Next.js PWA Configuration]]
- [[_COMMUNITY_CORS and Server Entry|CORS and Server Entry]]
- [[_COMMUNITY_Global Error Handling|Global Error Handling]]
- [[_COMMUNITY_Migrations Documentation|Migrations Documentation]]
- [[_COMMUNITY_Database Initialization Script|Database Initialization Script]]
- [[_COMMUNITY_Inventory Instance Table|Inventory Instance Table]]
- [[_COMMUNITY_Functional Diagrams|Functional Diagrams]]
- [[_COMMUNITY_Requirements Documentation|Requirements Documentation]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 30 edges
2. `a` - 18 edges
3. `BaseEntity` - 17 edges
4. `compilerOptions` - 16 edges
5. `get()` - 15 edges
6. `v` - 14 edges
7. `z()` - 14 edges
8. `Tasks: [FEATURE NAME]` - 13 edges
9. `Tasks: Módulos Especializados del Sistema (OnProduction)` - 12 edges
10. `Esquema de Tablas` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Diagrama de Secuencia` --calls--> `Edge Function: generar-contrato`  [EXTRACTED]
  diagramas/diagrama_secuencia.md → supabase/functions/generar-contrato/index.ts
- `Requerimientos Leídos` --conceptually_related_to--> `Table: eventos`  [INFERRED]
  documento_requerimiento/requerimientos_leidos.txt → base_datos_onP.txt
- `Diagrama de Secuencia` --references--> `Table: eventos`  [EXTRACTED]
  diagramas/diagrama_secuencia.md → base_datos_onP.txt
- `Adicional` --references--> `TipoAdicional`  [EXTRACTED]
  frontend/src/app/dashboard/eventos/crear/page.tsx → shared/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rental Lifecycle Flow** — db_eventos, db_evento_detalles_equipos, db_evento_adicionales, db_depositos_garantia, db_registro_danos_auditoria [EXTRACTED 1.00]
- **Deployment Stack** — guia_despliegue_dominios_md, gemini_md, readme_md [INFERRED 0.90]

## Communities (82 total, 19 thin omitted)

### Community 0 - "Dashboard and UI Layouts"
Cohesion: 0.21
Nodes (5): styles, styles, UserProfile, styles, supabase

### Community 1 - "Service Worker Routing"
Cohesion: 0.11
Nodes (13): GET(), getClientForToken(), loadFonts(), j(), m(), q(), r, s (+5 more)

### Community 2 - "API Route Utilities"
Cohesion: 0.29
Nodes (3): adminClient, serviceKey, supabaseUrl

### Community 3 - "Project Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @ducanh2912/next-pwa, lucide-react, next, pdfkit, react, react-dom, @supabase/supabase-js (+17 more)

### Community 4 - "Cache and Request Handling"
Cohesion: 0.07
Nodes (15): $(), a, b(), constructor(), deleteCacheAndMetadata(), et, F, G (+7 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Database Entity Types"
Cohesion: 0.07
Nodes (26): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+18 more)

### Community 7 - "System Documentation and Triggers"
Cohesion: 0.16
Nodes (19): BaseEntity, CarteraCliente, CarteraProveedor, CatalogoEquipo, ConfiguracionEmpresa, DepositoGarantia, EstadoDeposito, EstadoEquipo (+11 more)

### Community 8 - "Supabase Client Configuration"
Cohesion: 0.16
Nodes (14): Trigger: bloquear_edicion_fuera_de_cotizacion, Table: catalogo_equipos, Table: clientes, Table: depositos_garantia, Table: evento_adicionales, Table: evento_detalles_equipos, Table: eventos, Table: inventario_instancias (+6 more)

### Community 9 - "Backend Logic Testing"
Cohesion: 0.09
Nodes (20): Assumptions, Clarificaciones, Edge Cases, Feature Specification: Sistema de Gestión de Eventos, Inventario y Finanzas, Functional Requirements, Key Entities, Measurable Outcomes, Requirements *(mandatory)* (+12 more)

### Community 10 - "Database Trigger Testing"
Cohesion: 0.25
Nodes (5): adminClient, anonClient, anonKey, serviceKey, supabaseUrl

### Community 11 - "Admin API Routes"
Cohesion: 0.62
Nodes (6): DELETE(), GET(), getAdminClient(), getClientForToken(), POST(), verificarAdministrador()

### Community 12 - "Admin API Routes"
Cohesion: 0.67
Nodes (5): GET(), getAdminClient(), getClientForToken(), POST(), verificarAdministrador()

### Community 13 - "Admin API Routes"
Cohesion: 0.67
Nodes (5): GET(), getAdminClient(), getClientForToken(), POST(), verificarAdministrador()

### Community 14 - "Deno Runtime Configuration"
Cohesion: 0.33
Nodes (5): imports, @supabase/supabase-js, tasks, format, typecheck

### Community 15 - "Admin API Routes"
Cohesion: 0.60
Nodes (5): GET(), getAdminClient(), getClientForToken(), POST(), verificarAdministrador()

### Community 16 - "ESLint Configuration"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 17 - "Root Layout Metadata"
Cohesion: 0.22
Nodes (10): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-Python3Command(), Get-RepoRoot(), Resolve-SpecifyInitDir() (+2 more)

### Community 20 - "Database Transaction Helpers"
Cohesion: 0.67
Nodes (3): getEnv(), main(), supabase

### Community 35 - "Requirements Documentation"
Cohesion: 0.15
Nodes (12): Assumptions, Edge Cases, Feature Specification: [FEATURE NAME], Functional Requirements, Key Entities *(include if feature involves data)*, Measurable Outcomes, Requirements *(mandatory)*, Success Criteria *(mandatory)* (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (13): Core Principles, Development & Migration Workflow, Governance, I. DB-Centric Transactional Logic, II. Strict Soft Deletes, III. Isolated Row Level Security (RLS), IV. Autonomous Edge Functions, OnProduction Project Constitution (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (10): Core Principles, Governance, [PRINCIPLE_1_NAME], [PRINCIPLE_2_NAME], [PRINCIPLE_3_NAME], [PRINCIPLE_4_NAME], [PRINCIPLE_5_NAME], [PROJECT_NAME] Constitution (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: [FEATURE], Project Structure, Source Code (repository root), Summary, Technical Context

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (7): Coding Agent Context Extension, Commands, Configuration, Disable, Requirements, Why an extension?, Guia Despliegue Dominios

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (6): Arquitectura, Comandos Frecuentes, Convenciones del Proyecto, GEMINI.md — Contrato del Agente para OnProduction, Restricciones del Agente, Stack Tecnológico

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (4): adminClient, query, serviceKey, supabaseUrl

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (4): [Category 1], [Category 2], [CHECKLIST TYPE] Checklist: [FEATURE NAME], Notes

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (3): Behavior, Execution, Update Coding Agent Context

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (22): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Módulos Especializados del Sistema (OnProduction), Project Structure, Source Code Layout, Summary, Technical Context (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (7): Componentes del Stack de Despliegue, Guía de Despliegue, Dominios Gratuitos y Seguridad (Costo 0), Paso 1: Configurar el Hosting del Frontend en Vercel, Paso 2: Registrar tu Subdominio Gratis (`.is-a.dev`), Paso 3: Configurar Cloudflare (DNS, SSL y DDoS), Paso 4: Vincular el Dominio en Vercel, Paso 5: Probar la Aplicación en el Celular (PWA)

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (6): FS-01: Proceso de Cotización, Validación y Reserva de Inventario, FS-02: Flujo Logístico de Despacho, Alquiler y Operación en Campo, FS-03: Proceso de Retorno de Equipos, Reporte de Daños y Liquidación de Garantías, FS-04: Gestión Administrativa de Compras de Lote e Ingreso Seguro de Seriales, Listado y Modelado de Flujos de Secuencia Críticos, Índice de Flujos Modelados

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (6): Comandos Principales, Contribuir, Estructura del Proyecto, Instalación y Configuración, OnProduction — Sistema Logístico y Transaccional de Alquiler, Prerrequisitos

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (5): 1. Actores Involucrados, 2. Decisiones Clave en el Proceso, 3. Interacciones entre Áreas, Detalle del Flujo de Decisiones y Procesos Alternativos, Diagrama Funcional del Proceso de Alquiler y Logística

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (14): 10. transacciones_caja, 1. roles, 2. usuarios, 3. empresa_config, 4. categorias, 5. items_inventario, 6. clientes, 7. eventos (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (6): Adicional, Cliente, DetalleEquipo, EquipoDisponible, Evento, styles

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (6): 1. Almacenamiento del Logotipo Empresarial, 2. Estructura de Categorías de Inventario (Jerárquica/Árbol), 3. Soporte de Caja y Divisa Local Única, 4. Seguridad de Acceso a Nivel de Fila (RLS), Decisiones Técnicas y Arquitectura, Research: Módulos Especializados del Sistema (OnProduction)

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (5): BajaItem, CatalogoItem, CompraItem, InstanciaItem, styles

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (5): 1. Validación de Bloqueo de Stock Coincidente, 2. Validación de Inmutabilidad en Caja, Escenarios de Validación, Preparación y Semilla, Quickstart: Validación de Módulos Especializados (OnProduction)

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): DanoReciente, EventoReciente, Stats, styles

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (4): DepositoGarantia, EventoActivoConEquipos, styles, Transaction Helper

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): 1. Módulo Administrativo: Configuración de Empresa, 2. Módulo de Caja: Registro de Transacciones, 3. Módulo de Inventario: Crear Ítem, API Endpoints Contract (Next.js Routes)

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (3): Role, styles, UserProfile

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (18): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation for User Story 4, Implementation for User Story 5, Parallel Opportunities (+10 more)

### Community 72 - "Community 72"
Cohesion: 0.12
Nodes (16): Assumptions, Clarificaciones, Edge Cases, Feature Specification: Módulos Especializados del Sistema (OnProduction), Functional Requirements, Key Entities, Measurable Outcomes, Requirements *(mandatory)* (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (11): Adicional, calcularDias(), CrearEventoPage(), DatosEvento, formatCOP(), ItemSeleccionado, OperarioAsignado, PASOS (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (4): supabase, Cliente, ClienteConCartera, CreateEventoDto

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (3): supabase, TRANSICIONES_VALIDAS, UpdateEventoEstadoDto

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (3): supabase, Evento, EventoCompleto

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (3): CreateTransaccionDto, TransaccionCaja, supabase

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (3): supabase, CategoriaConSubcategorias, CategoriaInventario

## Knowledge Gaps
- **292 isolated node(s):** `I. DB-Centric Transactional Logic`, `II. Strict Soft Deletes`, `III. Isolated Row Level Security (RLS)`, `IV. Autonomous Edge Functions`, `V. Strict TypeScript Typing` (+287 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `Cache and Request Handling` to `Service Worker Routing`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Transaction Helper` connect `Community 67` to `Community 64`, `Community 41`, `API Route Utilities`, `Community 62`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `I. DB-Centric Transactional Logic`, `II. Strict Soft Deletes`, `III. Isolated Row Level Security (RLS)` to the rest of the system?**
  _292 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service Worker Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.11153846153846154 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Cache and Request Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.06568832983927324 - nodes in this community are weakly interconnected._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._