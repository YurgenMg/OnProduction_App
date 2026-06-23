# Feature Specification: Sistema de Gestión de Eventos, Inventario y Finanzas

**Feature Branch**: `001-gestion-eventos-inventario`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Sistema de gestión de eventos musicales con control de inventario, clientes, alquileres, flujo de caja por evento y generación de PDFs (cotizaciones y cuentas de cobro)"

## Clarificaciones

### Session 2026-06-23
- Q: ¿El sistema debe bloquear estrictamente la reserva coincidente o solo mostrar una advertencia visual de conflicto de stock? → A: Bloqueo estricto (Opción A). El sistema impide el sobrealquiler de un ítem mostrando un error.
- Q: ¿Se requiere soporte para múltiples abonos parciales por evento o se maneja solo un pago único/registro de pago total? → A: Múltiples abonos (Opción A). El sistema permite registrar múltiples pagos y abonos parciales por evento, recalculando y actualizando dinámicamente el saldo restante.
- Q: ¿El PDF de la cuenta de cobro requiere la inserción de una firma digital/firma manuscrita digitalizada del usuario o es meramente informativa sin firma? → A: Firma digitalizada (Opción A). Se estampa automáticamente una imagen escaneada de la firma del usuario (configurable desde su perfil).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control de Inventario y Disponibilidad en Eventos (Priority: P1)

El usuario quiere poder registrar sus equipos (sonidos, luces, instrumentos) en el inventario, definir su estado operativo y agregarlos a un evento verificando que estén disponibles en las fechas del evento para evitar conflictos de reserva.

**Why this priority**: Es la necesidad operativa central. Evita el sobrealquiler de equipos costosos y garantiza la viabilidad técnica del evento.

**Independent Test**: Registrar un equipo de sonido en el inventario y agregarlo a un evento. Intentar agregar el mismo equipo a otro evento en las mismas fechas y verificar el resultado.

**Acceptance Scenarios**:

1. **Given** que un equipo está registrado como "Disponible" y sin reservas, **When** se asocia a un evento en una fecha específica, **Then** el equipo queda reservado para ese evento.
2. **Given** que un equipo ya está reservado para un evento en un rango de fechas, **When** se intenta agregar a otro evento en las mismas fechas, **Then** el sistema impide registrar la asociación y muestra un error de conflicto de stock bloqueando la operación.

---

### User Story 2 - Registro de Evento y Flujo de Estados (Priority: P1)

El usuario quiere registrar alquileres para cada evento asociándoles un cliente y pasando el evento por diferentes estados (Cotización, Evento en Proceso, Evento Finalizado).

**Why this priority**: Permite al usuario mapear el ciclo de vida comercial y operativo de sus servicios de conciertos o serenatas de principio a fin.

**Independent Test**: Crear un evento en estado "Cotización", registrar el cliente, y transicionar el estado a "En Proceso" y luego a "Finalizado", verificando la consistencia de los datos.

**Acceptance Scenarios**:

1. **Given** un nuevo evento registrado como "Cotización", **When** se aprueba el presupuesto, **Then** pasa a estado "En Proceso" liberando/confirmando los equipos asociados.
2. **Given** un evento "En Proceso", **When** se concluye la fecha del servicio y se reciben los equipos de vuelta, **Then** el usuario cambia el estado a "Finalizado" y los equipos vuelven a estar disponibles.

---

### User Story 3 - Flujo de Caja y Control de Pagos por Evento (Priority: P2)

El usuario quiere llevar el control de los ingresos por cada evento, detallando la forma de pago, si se completó el pago o si hay saldos pendientes.

**Why this priority**: Garantiza la salud financiera y el cobro oportuno de los servicios musicales prestados.

**Independent Test**: Registrar un pago asociado a un evento, verificar cómo se actualiza el saldo pendiente del evento y el total del flujo de caja.

**Acceptance Scenarios**:

1. **Given** un evento con costo total determinado, **When** el cliente realiza uno o más abonos, **Then** el sistema registra cada pago con su método correspondiente (efectivo, transferencia, etc.) y calcula dinámicamente el saldo pendiente restante del evento.

---

### User Story 4 - Generación de Documentos PDF Profesionales (Priority: P2)

El usuario requiere generar de forma automática archivos .pdf de cotizaciones y cuentas de cobro profesionales para enviárselos a sus clientes.

**Why this priority**: Ahorra tiempo administrativo y proyecta una imagen profesional y corporativa hacia los clientes.

**Independent Test**: Generar el PDF de una cotización para un evento específico y verificar que contenga los datos del cliente, la lista de equipos y los montos correspondientes.

**Acceptance Scenarios**:

1. **Given** un evento en estado "Cotización", **When** el usuario solicita exportar, **Then** el sistema genera un archivo PDF descargable con formato limpio, datos de la empresa y desglose de precios. Para las cuentas de cobro, si el usuario cargó su firma manuscrita escaneada en su perfil, esta se estampa automáticamente en el PDF generado.

---

### Edge Cases

- **Equipo Dañado**: Si un equipo en un evento se reporta como "Dañado", el sistema debe actualizar su estado operativo y alertar si tiene reservas futuras para otros eventos.
- **Cancelación de Evento**: Al cancelar un evento, todos los equipos reservados para el mismo deben quedar disponibles inmediatamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir el registro de clientes con datos básicos (nombre, identificación, teléfono, correo).
- **FR-002**: El sistema DEBE permitir registrar ítems de inventario con nombre, categoría, SKU y estado operativo (Excelente, Regular, Mantenimiento, Dado de Baja).
- **FR-003**: El sistema DEBE permitir la creación de eventos con fecha de inicio, fecha de fin, cliente, lista de ítems de inventario y estado (Cotización, En Proceso, Finalizado).
- **FR-004**: El sistema DEBE calcular automáticamente el costo total del evento basado en los precios de alquiler de los ítems y servicios adicionales.
- **FR-005**: El sistema DEBE registrar los ingresos financieros asociados a cada evento (monto, fecha, método de pago).

### Key Entities

- **Cliente**: Representa al cliente contratante. Atributos: ID, nombre completo, documento, teléfono, email, dirección.
- **ItemInventario**: Representa los equipos de sonido, luces o instrumentos. Atributos: ID, nombre, SKU, categoría, estado_operativo, precio_alquiler_base.
- **Evento**: Representa el alquiler o servicio musical. Atributos: ID, cliente_id, fecha_inicio, fecha_fin, estado, costo_total.
- **PagoEvento**: Transacciones asociadas a un evento. Atributos: ID, evento_id, monto, fecha, metodo_pago.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede crear un evento y reservarle equipos en menos de 90 segundos desde el dashboard.
- **SC-002**: La generación y descarga del PDF de cotización toma menos de 3 segundos desde la solicitud del usuario.
- **SC-003**: El 100% de las transacciones de ingresos se asocian de manera inmutable al evento correspondiente, evitando descuadres en el flujo de caja.

## Assumptions

- Se asume que el usuario operará el sistema principalmente desde una computadora o tableta en el lugar de almacenamiento o durante la planeación del evento.
- La versión inicial se desplegará localmente o en un entorno de desarrollo web sin requerir integraciones con pasarelas de pago online externas (los pagos se registran manualmente).
- El sistema de autenticación de usuarios ya integrado (Google OAuth) se usará para definir el acceso de los administradores y bodegueros.
