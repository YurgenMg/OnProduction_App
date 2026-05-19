# OnProduction — Sistema Logístico y Transaccional de Alquiler

Sistema transaccional y logístico de nivel empresarial para el control estricto del ciclo de vida de eventos e inventario físico serializado en el alquiler de equipos de sonido y luces.

## Prerrequisitos

Para ejecutar este proyecto de forma local necesitarás:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (requerido para Supabase CLI local).
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado globalmente.
- [Node.js](https://nodejs.org/) (v18 o superior).
- [Deno](https://deno.com/) (opcional, para soporte IDE de Edge Functions).

## Instalación y Configuración

1. **Clonar y acceder al directorio**:
   ```bash
   git clone <repo-url> OnProduction
   cd OnProduction
   ```

2. **Instalar dependencias locales de desarrollo**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```

4. **Inicializar Supabase local**:
   ```bash
   supabase init
   ```

5. **Iniciar contenedores locales de Supabase**:
   ```bash
   supabase start
   ```
   *Esto aplicará automáticamente las migraciones en `/supabase/migrations`.*

## Estructura del Proyecto

```
OnProduction/
├── supabase/
│   ├── config.toml            # Configuración de servicios locales de Supabase
│   ├── migrations/            # Scripts DDL, Triggers y Políticas RLS (inmutables)
│   └── functions/             # Supabase Edge Functions (Deno + TypeScript)
│       └── generar-contrato/  # Generación de contratos y carga a Storage
├── shared/                    # Lógica compartida en TypeScript para el frontend/cliente
│   ├── transaction-helper.ts  # Manejo robusto de excepciones de base de datos
│   └── types.ts               # Definiciones de tipo para el esquema
├── .env.example
├── tsconfig.json
├── package.json
└── GEMINI.md                  # Contrato del agente inteligente
```

## Comandos Principales

- **Levantar Supabase local**: `supabase start`
- **Detener Supabase local**: `supabase stop`
- **Ver logs de base de datos**: `supabase db log`
- **Correr Edge Functions localmente**: `supabase functions serve`
- **Desplegar Edge Functions**: `supabase functions deploy generar-contrato`
- **Crear nueva migración**: `supabase migration new <nombre_migracion>`

## Contribuir
Por favor, asegúrate de seguir las convenciones deConventional Commits y no alterar el DDL original sin coordinar con el Arquitecto de Base de Datos. Todos los cambios deben pasar por revisión de RLS.
