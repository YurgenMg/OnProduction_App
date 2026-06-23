# Diagrama de Secuencia del Sistema (Interacción Tecnológica)

Este diagrama modela la interacción secuencial entre los usuarios del sistema, la aplicación web (Next.js), las APIs locales, los servicios de la base de datos de Supabase, Edge Functions y el almacenamiento persistente.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Operador / Vendedor / Logística
    participant App as Frontend (Next.js Client)
    participant API as API local (/api/eventos/pdf)
    participant Edge as Edge Function (generar-contrato)
    participant DB as Supabase PostgreSQL 15
    participant Storage as Supabase Storage (Buckets)

    %% Flujo 1: Crear Cotización y Validar Overbooking
    Note over Usuario, DB: Flujo 1: Creación de Cotización y Control de Disponibilidad
    Usuario->>App: Clic en "Nueva Cotización" y llenar formulario
    App->>DB: INSERT INTO eventos (estado = 'COTIZACION')
    DB-->>App: OK (Evento creado e ID retornado)
    Usuario->>App: Agregar equipo de inventario a la cotización
    App->>DB: INSERT INTO evento_detalles_equipos (evento_id, inventario_id, ...)
    Note over DB: Trigger fn_trigger_totales_equipos() recalcula totales automáticamente
    DB-->>App: OK (Detalle de equipos agregado y totales actualizados)

    %% Flujo 2: Confirmar Evento y Bloqueo de Concurrencia (Overbooking)
    Note over Usuario, DB: Flujo 2: Confirmación de Evento (Control de Overbooking)
    Usuario->>App: Clic en "Confirmar y Reservar Stock"
    App->>DB: UPDATE eventos SET estado = 'CONFIRMADO_RESERVADO' WHERE id = evento_id
    Note over DB: Trigger trg_verificar_overbooking_evento evalúa colisiones de fechas
    alt Hay colisión de fechas (Overbooking Detectado)
        DB-->>App: ERROR: "El equipo ya está reservado en otro evento en las fechas programadas" (Bloqueado)
        App-->>Usuario: Mostrar alerta de colisión en pantalla (Premium UI)
    else Disponibilidad de stock exitosa
        DB-->>App: OK (Estado del evento actualizado a CONFIRMADO_RESERVADO)
        App-->>Usuario: Mostrar confirmación y habilitar descarga de contrato
    end

    %% Flujo 3: Firma de Contrato mediante Edge Functions
    Note over Usuario, Storage: Flujo 3: Firma y Almacenamiento Digital del Contrato
    Usuario->>App: Clic en "Generar Contrato Firmado"
    App->>Edge: POST /functions/generar-contrato { evento_id } con cabecera Authorization (JWT)
    Edge->>DB: SELECT * FROM eventos (RLS heredado mediante el JWT del usuario)
    DB-->>Edge: Retorna datos consolidados del evento, cliente y equipos asignados
    Note over Edge: Valida que el estado del evento NO sea COTIZACION
    Note over Edge: Genera buffer PDF en tiempo real con datos dinámicos del contrato
    Edge->>Storage: upload(pdfBlob) a carpeta restringida usando Service Role Key
    Storage-->>Edge: OK (Storage Path guardado)
    Edge->>Storage: createSignedUrl(path, expires_in = 3600)
    Storage-->>Edge: URL firmada de descarga segura
    Edge-->>App: { success: true, url_descarga }
    App-->>Usuario: Abre pestaña para descarga directa del documento legal

    %% Flujo 4: Generación de Facturas PDF locales
    Note over Usuario, API: Flujo 4: Generación de Cuenta de Cobro / Factura PDF en Frontend
    Usuario->>App: Clic en "Ver Factura PDF"
    App->>API: GET /api/eventos/pdf?id={id}&token={JWT}
    API->>DB: SELECT * FROM configuracion_empresa WHERE id = 1 (Obtener logo corporativo e info de emisor)
    DB-->>API: Datos corporativos y logo_url
    API->>DB: SELECT * FROM eventos WHERE id = id (Valida RLS del token)
    DB-->>API: Datos dinámicos consolidados de montos y equipos
    Note over API: Carga fuentes Roboto Regular/Bold en memoria (prevención de Turbopack crash)
    Note over API: Construye el documento premium PDF con pdfkit
    API-->>App: Retorna Stream binario PDF con cabecera Content-Type: application/pdf
    App-->>Usuario: Renderiza visor interactivo PDF de la cuenta de cobro en el navegador
```

---

## Ficha Técnica de Integración Tecnológica

| Componente | Detalle / Configuración |
| :--- | :--- |
| **URL del Diagrama** | `diagramas/diagrama_secuencia.md` (Accesible localmente en el repositorio) |
| **Sistemas Involucrados** | • Cliente Web Next.js 15+ (React)<br>• Edge Functions de Supabase (Runtime Deno v1.168+)<br>• Base de datos Supabase PostgreSQL 15 |
| **APIs Involucradas** | • `/api/eventos/pdf` (Endpoint interno en Next.js App Router para facturación PDF)<br>• Supabase REST API (PostgREST para consultas directas desde el cliente)<br>• Deno Function Endpoint `https://[SUPABASE_PROJECT_ID].supabase.co/functions/v1/generar-contrato` |
| **Servicios Externos** | • Supabase Storage (Bucket restringido `contratos` para almacenamiento seguro de PDF firmados)<br>• CDN de Cloudflare/Cdnjs (para descarga resiliente de fuentes en runtime) |
| **Bases de Datos Impactadas** | **Supabase PostgreSQL**:<br>• Tabla `eventos`<br>• Tabla `evento_detalles_equipos`<br>• Tabla `evento_adicionales`<br>• Tabla `configuracion_empresa` |
