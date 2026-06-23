# Listado y Modelado de Flujos de Secuencia Críticos

Este documento consolida y describe los flujos de secuencia y de control transaccional del sistema **OnProduction**, estructurados mediante Swimlanes funcionales y diagramas de secuencia avanzados.

---

## Índice de Flujos Modelados

1. [FS-01: Proceso de Cotización, Validación y Reserva de Inventario](#fs-01-proceso-de-cotización-validación-y-reserva-de-inventario)
2. [FS-02: Flujo Logístico de Despacho, Alquiler y Operación en Campo](#fs-02-flujo-logístico-de-despacho-alquiler-y-operación-en-campo)
3. [FS-03: Proceso de Retorno de Equipos, Reporte de Daños y Liquidación de Garantías](#fs-03-proceso-de-retorno-de-equipos-reporte-de-daños-y-liquidación-de-garantías)
4. [FS-04: Gestión Administrativa de Compras de Lote e Ingreso Seguro de Seriales](#fs-04-gestión-administrativa-de-compras-de-lote-e-ingreso-seguro-de-seriales)

---

## FS-01: Proceso de Cotización, Validación y Reserva de Inventario

Este flujo describe cómo un Vendedor registra la solicitud de un cliente, asigna los equipos verificando disponibilidad en vivo y realiza la transición a Confirmado, donde el motor de base de datos valida preventivamente el overbooking.

```mermaid
graph TB
    subgraph Cliente ["Cliente / Productora"]
        C1[Solicitar Cotización de Evento] --> C2{¿Acepta Tarifas y Condiciones?}
        C2 -- Sí --> C3[Realizar Pago del Depósito de Garantía]
        C2 -- No --> C4([Rechazar y Terminar])
    end

    subgraph Ventas ["Área de Ventas (Vendedor)"]
        C1 --> V1[Registrar Cliente en DB]
        V1 --> V2[Crear Evento en Estado COTIZACION]
        V2 --> V3[Asignar Equipos y Tarifas Específicas]
        V3 --> C2
        C3 --> V4[Cambiar Estado a CONFIRMADO_RESERVADO]
    end

    subgraph BaseDatos ["Motor de Base de Datos (PostgreSQL)"]
        V3 --> DB1[Verificar Estado DISPONIBLE de Instancia]
        DB1 -- Sí --> DB2[Calcular Subtotales y Totales de Evento]
        V4 --> DB3{¿Traslape en Fechas de Reserva? trg_verificar_overbooking_evento}
        DB3 -- Sí (Colisión) --> DB4[Lanzar Excepción y Revertir Transacción]
        DB3 -- No (Libre) --> DB5[Confirmar Reserva y Congelar Tarifas]
    end

    style Cliente fill:#0b132b,stroke:#06b6d4,stroke-width:2px,color:#fff
    style Ventas fill:#1c2541,stroke:#3b82f6,stroke-width:2px,color:#fff
    style BaseDatos fill:#0b132b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef process fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#fff;
    classDef decision fill:#334155,stroke:#06b6d4,stroke-width:2px,color:#fff;
    class C2,DB3 decision;
    class C1,C3,C4,V1,V2,V3,V4,DB1,DB2,DB4,DB5 process;
```

---

## FS-02: Flujo Logístico de Despacho, Alquiler y Operación en Campo

Describe el ciclo físico y de estados de los equipos de sonido, luces y montaje en tránsito desde la bodega hasta el lugar del evento.

```mermaid
graph TB
    subgraph Logistica Bodega ["Logística (Operador en Bodega)"]
        L1[Recibir Notificación de Evento Confirmado] --> L2[Generar Hoja de Ruta y Alistamiento]
        L2 --> L3[Despachar Carga en Vehículos]
        L3 --> L4[Cambiar Estado del Evento a EN_TRANSITO]
    end

    subgraph BaseDatos ["Motor de Base de Datos (PostgreSQL)"]
        L4 --> DB1[Trigger: Cambiar Estado Operativo de Equipos a ALQUILADO]
        DB1 --> DB2[Restringir Modificaciones Financieras: Regla de Inmutabilidad]
    end

    subgraph Operacion Evento ["Equipo Operativo (Montaje en Sitio)"]
        L4 --> O1[Montar Sonido e Iluminación]
        O1 --> O2[Prueba de Sonido con Artistas]
        O2 --> O3[Ejecución del Concierto / Evento]
    end

    style Logistica Bodega fill:#0b132b,stroke:#f59e0b,stroke-width:2px,color:#fff
    style BaseDatos fill:#1c2541,stroke:#10b981,stroke-width:2px,color:#fff
    style Operacion Evento fill:#0b132b,stroke:#06b6d4,stroke-width:2px,color:#fff
    classDef process fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#fff;
    class L1,L2,L3,L4,DB1,DB2,O1,O2,O3 process;
```

---

## FS-03: Proceso de Retorno de Equipos, Reporte de Daños y Liquidación de Garantías

Este es el flujo crítico de auditoría técnica y financiera donde los equipos regresan y se evalúan daños.

```mermaid
graph TB
    subgraph Cliente ["Cliente / Productora"]
        C1[Entregar Equipos en Bodega] --> C2{¿Se Reportaron Daños?}
        C2 -- Sí --> C3[Firmar Acta de Incidente y Cobro Diferido]
        C2 -- No --> C4[Recibir Devolución Total del Depósito]
    end

    subgraph Logistica Bodega ["Logística / Inspectores de Calidad"]
        C1 --> L1[Realizar Check-in de Seriales]
        L1 --> L2{¿Algún Equipo Presenta Daño?}
        L2 -- Sí --> L3[Registrar Reporte de Daño en el Sistema]
        L2 -- No --> L4[Marcar Evento como FINALIZADO]
    end

    subgraph BaseDatos ["Motor de Base de Datos (PostgreSQL)"]
        L3 --> DB1[Trigger trg_gestionar_danos_garantia: Cambiar Estado Operativo de Instancia a EN_MANTENIMIENTO]
        DB1 --> DB2[Descontar Costo del Depósito de Garantía: Actualizar monto_retenido]
        DB2 --> DB3[Actualizar Estado de Garantía: RETENIDO_PARCIAL o RETENIDO_TOTAL]
        L4 --> DB4[Actualizar Estado de Equipos Sanos a DISPONIBLE]
    end

    style Cliente fill:#0b132b,stroke:#06b6d4,stroke-width:2px,color:#fff
    style Logistica Bodega fill:#1c2541,stroke:#f59e0b,stroke-width:2px,color:#fff
    style BaseDatos fill:#0b132b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef process fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#fff;
    classDef decision fill:#334155,stroke:#06b6d4,stroke-width:2px,color:#fff;
    class C2,L2 decision;
    class C1,C3,C4,L1,L3,L4,DB1,DB2,DB3,DB4 process;
```

---

## FS-04: Gestión Administrativa de Compras de Lote e Ingreso Seguro de Seriales

Representa el proceso donde se adquieren nuevos equipos y se insertan concurrentemente en la base de datos controlando duplicados de seriales tag correlativos.

```mermaid
graph TB
    subgraph Administrador ["Administrador / Gerente"]
        A1[Registrar Compra de Lote en Panel de Inventario] --> A2[Ingresar SKU de Catálogo, Cantidad y Costo]
        A2 --> A3[Enviar Petición RPC a Base de Datos]
        A3 --> A4[Recibir Confirmación y Lista de Seriales Autogenerados]
    end

    subgraph BaseDatos ["Transacción Segura de Base de Datos (registrar_compra_lote)"]
        A3 --> DB1[Bloquear Fila de Catálogo: SELECT FOR UPDATE]
        DB1 --> DB2[Buscar Sufijo Numérico más Alto del SKU en Instancias]
        DB2 --> DB3[Insertar Compra de Inventario para Auditoría Financiera]
        DB3 --> DB4[Bucle Loop: Generar Seriales Seguros con Relleno de Ceros a la Izquierda]
        DB4 --> DB5[Insertar Nuevas Instancias en Estado DISPONIBLE]
        DB5 --> DB6[Liberar Bloqueo y Retornar JSONB]
    end

    style Administrador fill:#0b132b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style BaseDatos fill:#1c2541,stroke:#10b981,stroke-width:2px,color:#fff
    classDef process fill:#1e293b,stroke:#e2e8f0,stroke-width:1px,color:#fff;
    class A1,A2,A3,A4,DB1,DB2,DB3,DB4,DB5,DB6 process;
```
