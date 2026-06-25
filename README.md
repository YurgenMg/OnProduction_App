# OnProduction — Sistema de Gestión de Eventos y Alquiler de Equipos

Sistema ERP para empresas de producción y logística de eventos. Gestiona el ciclo de vida completo: **cotización → reserva → ejecución → cobro**, con control de inventario serializado, caja e integración financiera en tiempo real.

---

## Módulos disponibles

| Módulo | Ruta | Descripción |
|---|---|---|
| 📅 Eventos & Cotizaciones | `/dashboard/eventos` | Wizard de creación, gestión de estados y detalles |
| 👥 Clientes | `/dashboard/clientes` | Directorio, saldo de cartera e historial de eventos |
| 📦 Inventario | `/dashboard/inventario` | Catálogo serializado, compras por lote y bajas |
| 💰 Caja & Cartera | `/dashboard/caja` | Libro mayor inmutable con KPIs de flujo de caja |
| 🛡️ Garantías & Daños | `/dashboard/garantias` | Registro de daños y garantías por equipo |
| 👤 Usuarios & Roles | `/dashboard/usuarios` | Administración de usuarios (solo Administrador) |
| 🏢 Mi Empresa | `/dashboard/configuracion` | Datos de empresa y logo corporativo |

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 + TypeScript 5 (App Router) |
| Base de Datos | Supabase — PostgreSQL 15 + PostgREST |
| Auth | Supabase Auth (GoTrue) + RLS por roles |
| Edge Functions | Deno + TypeScript (Supabase Functions) |
| Estilos | Vanilla CSS con design system propio (glassmorphism) |

---

## Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — requerido por Supabase CLI
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado globalmente
- [Node.js](https://nodejs.org/) v18+
- [Deno](https://deno.com/) (opcional, para Edge Functions)

---

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone <repo-url> OnProduction
cd OnProduction

# 2. Instalar dependencias del frontend
cd frontend && npm install && cd ..

# 3. Copiar variables de entorno
cp .env.example frontend/.env.local

# 4. Levantar Supabase local (aplica migraciones automáticamente)
supabase start

# 5. Iniciar el servidor de desarrollo
cd frontend && npm run dev
```

El frontend queda disponible en **http://localhost:3000**.
El Studio de Supabase en **http://localhost:54323**.

---

## Variables de entorno

Copiar `frontend/.env.local.example` y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role key de supabase start>
```

> Los valores de `anon key` y `service role key` se muestran en la salida de `supabase start`.

---

## Estructura del Proyecto

```
OnProduction/
├── frontend/                          # Aplicación Next.js
│   └── src/
│       ├── app/
│       │   ├── dashboard/             # Módulos del ERP
│       │   │   ├── eventos/crear/     # Wizard multi-paso de eventos
│       │   │   ├── clientes/          # Gestión de clientes
│       │   │   ├── inventario/        # Inventario serializado
│       │   │   ├── caja/              # Caja y flujo de caja
│       │   │   ├── garantias/         # Garantías y daños
│       │   │   ├── usuarios/          # Administración de usuarios
│       │   │   └── configuracion/     # Configuración de empresa
│       │   └── api/                   # API Routes (Next.js)
│       │       ├── empresa/
│       │       ├── usuarios/
│       │       ├── clientes/
│       │       ├── eventos/ [id]/
│       │       ├── inventario/
│       │       │   ├── items/
│       │       │   ├── categorias/
│       │       │   └── disponibilidad/
│       │       ├── caja/
│       │       │   ├── transacciones/
│       │       │   └── metodos-pago/
│       │       └── operarios/
│       └── services/
│           └── supabase-client.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/                    # Migraciones SQL (inmutables)
│   │   ├── 20260519000000_schema_and_rls.sql
│   │   ├── 20260519000001_backend_business_logic.sql
│   │   ├── 20260528000001_configuracion_empresa.sql
│   │   ├── 20260612000000_sincronizacion_auth_y_administrador.sql
│   │   ├── 20260623000000_categorias_inventario.sql
│   │   ├── 20260623000001_caja_y_carteras.sql
│   │   └── 20260623000002_operarios_y_disponibilidad_rpc.sql
│   └── functions/
│       └── generar-contrato/
├── shared/
│   ├── types.ts                       # Tipos TypeScript v2.0 completos
│   └── transaction-helper.ts
├── specs/                             # Especificaciones y checklists
│   └── 002-modulos-especializados-sistema/
│       ├── spec.md
│       ├── plan.md
│       └── checklists/
│           ├── architecture.md        # ✅ 17/19 aprobado
│           └── implementation.md     # ✅ 27/28 aprobado
├── GEMINI.md                          # Contrato del agente IA
└── README.md
```

---

## Comandos principales

```bash
# Supabase
supabase start                          # Levantar local con migraciones
supabase stop                           # Detener contenedores
supabase db reset                       # Resetear BD y reaplicar todas las migraciones
supabase migration new <nombre>         # Crear nueva migración
supabase functions serve                # Edge Functions localmente
supabase functions deploy generar-contrato

# Frontend
npm run dev                             # Servidor de desarrollo (port 3000)
npm run build                           # Build de producción
npx tsc --noEmit                        # Verificar tipos sin compilar
```

---

## Arquitectura de Datos — Invariantes Críticas

| Regla | Descripción |
|---|---|
| **Soft Deletes** | Todas las tablas transaccionales usan `deleted_at TIMESTAMP NULL` |
| **Transacciones inmutables** | `transacciones_caja` solo permite INSERT. Las correcciones son contra-asientos |
| **Anti-overbooking** | Trigger `verificar_disponibilidad_instancia` bloquea la confirmación si hay conflicto |
| **RLS estricto** | Cada tabla tiene políticas RLS por rol (`Administrador`, `Vendedor`, `Logistica`) |
| **SECURITY DEFINER** | Funciones de trigger usan `SECURITY DEFINER` para evitar recursión RLS |

---

## Flujo de un Evento

```
COTIZACION
    ↓  (sin bloqueo físico de inventario)
CONFIRMADO_RESERVADO
    ↓  (trigger verifica disponibilidad → puede lanzar P0001)
EN_TRANSITO
    ↓
FINALIZADO
    ↓
PAGADO_CERRADO
```

Las transiciones inválidas son rechazadas por la API con HTTP 422.
Los errores de overbooking retornan HTTP 409 con `tipo: 'CONFLICTO_OVERBOOKING'`.

---

## Contribuir

Seguir las convenciones de [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

No realizar `DROP TABLE` ni `ALTER COLUMN ... DROP` sin estrategia de migración documentada.
Ver `GEMINI.md` para el contrato completo del agente IA.
