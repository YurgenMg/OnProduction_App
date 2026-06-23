# Graph Report - .  (2026-06-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 314 nodes · 438 edges · 36 communities (25 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28df0055`
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
- [[_COMMUNITY_Supabase Test Clients|Supabase Test Clients]]
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
- [[_COMMUNITY_User Creation Script|User Creation Script]]
- [[_COMMUNITY_Database Transaction Helpers|Database Transaction Helpers]]
- [[_COMMUNITY_Next.js PWA Configuration|Next.js PWA Configuration]]
- [[_COMMUNITY_CORS and Server Entry|CORS and Server Entry]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_Migration Documentation|Migration Documentation]]
- [[_COMMUNITY_Database SQL Script|Database SQL Script]]
- [[_COMMUNITY_Inventory Instance Table|Inventory Instance Table]]
- [[_COMMUNITY_Functional Diagrams|Functional Diagrams]]
- [[_COMMUNITY_Requirements Documentation|Requirements Documentation]]

## God Nodes (most connected - your core abstractions)
1. `a` - 18 edges
2. `compilerOptions` - 16 edges
3. `get()` - 15 edges
4. `v` - 14 edges
5. `z()` - 14 edges
6. `BaseEntity` - 11 edges
7. `supabase` - 10 edges
8. `T()` - 8 edges
9. `r` - 7 edges
10. `U()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Diagrama de Secuencia` --references--> `Table: eventos`  [EXTRACTED]
  diagramas/diagrama_secuencia.md → base_datos_onP.txt
- `Flujos de Secuencia Críticos` --references--> `Trigger: bloquear_edicion_fuera_de_cotizacion`  [EXTRACTED]
  diagramas/flujos_secuencia_criticos.md → base_datos_onP.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rental Lifecycle Flow** — db_eventos, db_inventario_instancias, db_bloquear_edicion_trigger, supabase_edge_functions [EXTRACTED 1.00]
- **Technology Stack & Deployment** — frontend_nextjs, supabase_edge_functions, guia_despliegue_dominios_md, gemini_md [EXTRACTED 0.95]

## Communities (36 total, 11 thin omitted)

### Community 0 - "Dashboard and UI Layouts"
Cohesion: 0.05
Nodes (29): styles, EmpresaConfig, styles, styles, UserProfile, DanoReciente, EventoReciente, Stats (+21 more)

### Community 1 - "Service Worker Routing"
Cohesion: 0.08
Nodes (14): b(), constructor(), deleteCacheAndMetadata(), et, F, G, get(), h() (+6 more)

### Community 2 - "API Route Utilities"
Cohesion: 0.16
Nodes (10): GET(), getClientForToken(), loadFonts(), m(), s, st(), T(), U() (+2 more)

### Community 3 - "Project Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @ducanh2912/next-pwa, lucide-react, next, pdfkit, react, react-dom, @supabase/supabase-js (+17 more)

### Community 4 - "Cache and Request Handling"
Cohesion: 0.12
Nodes (3): a, q(), r

### Community 5 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Database Entity Types"
Cohesion: 0.19
Nodes (16): BaseEntity, CatalogoEquipo, Cliente, DepositoGarantia, EstadoDeposito, EstadoEquipo, EstadoEvento, Evento (+8 more)

### Community 7 - "System Documentation and Triggers"
Cohesion: 0.25
Nodes (8): Trigger: bloquear_edicion_fuera_de_cotizacion, Table: clientes, Table: eventos, Diagrama de Secuencia, Flujos de Secuencia Críticos, Frontend Next.js, Guia de Despliegue, Dominios Gratuitos y Seguridad, Supabase Edge Functions

### Community 8 - "Supabase Test Clients"
Cohesion: 0.25
Nodes (5): adminClient, anonClient, anonKey, serviceKey, supabaseUrl

### Community 9 - "Backend Logic Testing"
Cohesion: 0.29
Nodes (3): adminClient, serviceKey, supabaseUrl

### Community 10 - "Database Trigger Testing"
Cohesion: 0.29
Nodes (4): adminClient, query, serviceKey, supabaseUrl

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

### Community 19 - "User Creation Script"
Cohesion: 0.67
Nodes (3): getEnv(), main(), supabase

## Knowledge Gaps
- **104 isolated node(s):** `@supabase/supabase-js`, `typecheck`, `format`, `__filename`, `__dirname` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Transaction Helper` connect `Dashboard and UI Layouts` to `Backend Logic Testing`, `Database Trigger Testing`, `System Documentation and Triggers`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `a` connect `Cache and Request Handling` to `Service Worker Routing`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `typecheck`, `format` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard and UI Layouts` be split into smaller, more focused modules?**
  _Cohesion score 0.051418439716312055 - nodes in this community are weakly interconnected._
- **Should `Service Worker Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.08232118758434548 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Cache and Request Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._