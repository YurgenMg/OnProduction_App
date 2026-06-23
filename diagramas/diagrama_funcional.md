# Diagrama Funcional del Proceso de Alquiler y Logística

Este diagrama representa el flujo funcional completo del negocio utilizando carriles (Swimlanes) por área de responsabilidad.

```mermaid
graph TB
    %% Definición de Swimlanes mediante subgrafos
    subgraph Cliente ["Cliente / Productora"]
        C1([Inicio: Solicitar Alquiler]) --> C2[Revisar y Firmar Cotización]
        C2 --> C3[Pagar Depósito de Garantía]
        C4[Retornar Equipos]
        C5([Fin del Evento])
    end

    subgraph Ventas ["Área de Ventas (Vendedor)"]
        V1[Registrar Cliente en Base de Datos] --> V2[Crear Nueva Cotización]
        V2 --> V3[Agregar Equipos y Adicionales]
        V3 --> C2
        C2 -- Acepta Cotización --> V4[Cambiar Estado a CONFIRMADO_RESERVADO]
        C2 -- Rechaza Cotización --> V5([Fin: Cotización Cancelada])
    end

    subgraph Logistica ["Área de Logística (Logística / Operaciones)"]
        V4 --> L1[Verificar Disponibilidad y Bloquear Stock]
        L1 --> L2[Preparar Despacho]
        L2 --> L3[Despachar Equipos: Estado EN_TRANSITO]
        L3 --> L4[Montaje y Operación del Evento]
        L4 --> C4
        C4 --> L5[Recepción e Inspección de Equipos en Bodega]
        L5 -- ¿Hay Daños? -- Yes --> L6[Registrar Incidente y Descontar Daño de Garantía]
        L5 -- ¿Hay Daños? -- No --> L7[Liberar y Devolver Depósito de Garantía]
        L6 --> L8[Cambiar Estado del Evento a FINALIZADO]
        L7 --> L8
        L8 --> F1
    end

    subgraph Administracion ["Área Administrativa y Finanzas"]
        C3 --> A1[Verificar Pago de Garantía]
        A1 --> L2
        L8 --> F1[Generar Cuentas de Cobro / Factura PDF]
        F1 --> F2[Recibir Pago Final]
        F2 --> F3[Cambiar Estado a PAGADO_CERRADO]
        F3 --> C5
    end

    %% Estilos Visuales Premium (OnProduction Theme)
    style Cliente fill:#0b132b,stroke:#06b6d4,stroke-width:2px,color:#fff
    style Ventas fill:#1c2541,stroke:#3b82f6,stroke-width:2px,color:#fff
    style Logistica fill:#0b132b,stroke:#f59e0b,stroke-width:2px,color:#fff
    style Administracion fill:#1c2541,stroke:#10b981,stroke-width:2px,color:#fff

    classDef process fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#fff;
    classDef decision fill:#334155,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef endPoint fill:#0f172a,stroke:#ef4444,stroke-width:2px,color:#fff;
    
    class C1,C5,V5 endPoint;
    class L5 decision;
    class C2,C3,C4,V1,V2,V3,V4,L1,L2,L3,L4,L6,L7,L8,A1,F1,F2,F3 process;
```

---

## Detalle del Flujo de Decisiones y Procesos Alternativos

### 1. Actores Involucrados
*   **Cliente / Productora**: Inicia la solicitud, acepta o rechaza la propuesta comercial, realiza el depósito de garantía y recibe la devolución del mismo (si aplica).
*   **Vendedor (Ventas)**: Gestiona clientes, crea y edita cotizaciones antes de ser confirmadas.
*   **Logística (Operador de Bodega)**: Prepara, despacha, realiza montaje, recibe e inspecciona los equipos a su retorno.
*   **Administrador / Finanzas**: Administra la configuración de la empresa, supervisa depósitos, valida facturas y cierra eventos comercialmente.

### 2. Decisiones Clave en el Proceso
*   **Aceptación de la Cotización**: Si el cliente aprueba la cotización, se bloquea el inventario físicamente mediante la reserva de seriales en fechas exclusivas. Si es rechazada, se aborta el flujo sin colisiones de stock.
*   **Control de Overbooking (Traslape de fechas)**: La base de datos valida automáticamente si un serial tag coincide en fechas operativas para otro evento activo. Si hay traslape, el motor de base de datos (`OVERLAPS`) bloquea la transición del estado a confirmado.
*   **Inspección de Equipos (Control de Daños)**: Al retorno del material:
    *   *Si no hay daños*: Se libera el depósito de garantía en el dashboard marcando el registro de garantía como `DEVUELTO`.
    *   *Si hay daños*: Se registra un incidente de daños detallando el costo. La base de datos ejecuta un trigger que actualiza el estado operativo del equipo a `EN_MANTENIMIENTO` y descuenta automáticamente el valor del depósito de garantía (`monto_retenido` y estado de garantía a `RETENIDO_PARCIAL` o `RETENIDO_TOTAL`).

### 3. Interacciones entre Áreas
*   **Ventas a Logística**: La confirmación de una cotización (`CONFIRMADO_RESERVADO`) emite una orden de alistamiento visible en el panel del área logística.
*   **Logística a Finanzas**: Al retorno de los equipos, el reporte de daños afecta directamente los saldos en custodia de las garantías financieras.
*   **Logística a Administración**: Al finalizar el evento (`FINALIZADO`), Finanzas emite la cuenta de cobro / factura digital en base a los totales consolidados.
