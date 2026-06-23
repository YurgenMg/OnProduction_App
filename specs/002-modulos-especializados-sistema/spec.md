# Feature Specification: Módulos Especializados del Sistema (OnProduction)

**Feature Branch**: `002-modulos-especializados-sistema`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Crear módulos especializados: 1. Administrativo (configuración empresarial, logotipo, NIT, razón social, correo, teléfono, creación/edición de usuarios y roles). 2. Caja y flujo de caja (pagos, abonos, cartera de proveedores y clientes, formas de pago). 3. Inventario de ítems. 4. Clientes. 5. Registro de eventos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Módulo Administrativo (Priority: P1)
Como Administrador, quiero configurar la información de la empresa (logo, NIT, razón social, etc.) y gestionar los usuarios del sistema junto con sus roles para garantizar un control de acceso estructurado.

**Why this priority**: Define las bases de identidad comercial (para los PDFs generados) y los permisos de acceso para todos los demás módulos del sistema.

**Independent Test**: Modificar los datos de la empresa, subir un logo y verificar que se reflejen en la base de datos. Crear un nuevo usuario y verificar que pueda iniciar sesión con el rol asignado.

**Acceptance Scenarios**:
1. **Given** que estoy autenticado como Administrador, **When** actualizo los datos empresariales y subo un logotipo, **Then** la información se guarda y el logo se almacena de forma persistente. [NEEDS CLARIFICATION: ¿El logotipo de la empresa se almacenará en Supabase Storage o como string Base64 directamente en la tabla de configuración?]
2. **Given** que estoy en el panel de usuarios, **When** creo un usuario con rol "Bodeguero", **Then** el usuario es guardado y se le restringe el acceso a módulos administrativos y de caja.

---

### User Story 2 - Caja, Flujo de Caja y Carteras (Priority: P1)
Como Administrador o Cajero, quiero registrar ingresos, abonos y egresos de caja, gestionar las carteras de clientes y proveedores, y definir los métodos de pago aceptados para controlar la liquidez del negocio.

**Why this priority**: Asegura el control de flujo de caja por evento y el seguimiento de cuentas por cobrar (cartera clientes) y cuentas por pagar (cartera proveedores).

**Independent Test**: Registrar un abono a la cartera de un cliente por un evento y un egreso a un proveedor por mantenimiento de equipos, verificando el saldo resultante del flujo de caja.

**Acceptance Scenarios**:
1. **Given** un evento con saldo pendiente, **When** el cliente realiza un abono parcial, **Then** la cartera del cliente disminuye por ese valor y el flujo de caja diario registra el ingreso.
2. **Given** un servicio de mantenimiento subcontratado, **When** registro la cuenta por pagar al proveedor, **Then** se incrementa la cartera de proveedores hasta que se registre el egreso correspondiente. [NEEDS CLARIFICATION: ¿El sistema operará únicamente en la divisa local o se requiere soporte multi-moneda para clientes internacionales?]

---

### User Story 3 - Inventario de Ítems (Priority: P1)
Como Bodeguero o Administrador, quiero registrar y clasificar los equipos musicales, de luces y sonido en el inventario con sus respectivos códigos SKU y estados de mantenimiento.

**Why this priority**: Evita la pérdida de control sobre los activos físicos de la empresa y permite comprobar la disponibilidad antes de rentarlos.

**Independent Test**: Registrar un amplificador, asignarle una categoría y un SKU único, y verificar que aparezca disponible para asignación en eventos.

**Acceptance Scenarios**:
1. **Given** un nuevo equipo físico de sonido, **When** lo registro en el inventario, **Then** se le asigna un SKU único estructurado y el estado inicial es "Excelente". [NEEDS CLARIFICATION: ¿Las categorías de inventario tendrán una estructura jerárquica de árbol (categorías y subcategorías) o será una lista plana simple?]

---

### User Story 4 - Gestión de Clientes (Priority: P2)
Como Administrador o Asistente Comercial, quiero llevar una base de datos unificada de clientes con su historial de eventos contratados y saldos de cartera activos.

**Why this priority**: Facilita la retención de clientes y agiliza el proceso de cotización y facturación al reutilizar sus datos de contacto.

**Independent Test**: Buscar un cliente por NIT o Nombre y verificar que muestre su información de contacto junto con el listado de sus eventos anteriores.

**Acceptance Scenarios**:
1. **Given** la creación de una cotización, **When** busco un cliente por su NIT o identificación, **Then** el sistema auto-completa los datos del cliente en el registro de evento.

---

### User Story 5 - Registro de Eventos (Priority: P1)
Como Coordinador de Eventos o Administrador, quiero crear eventos especificando fechas, cliente, equipos requeridos y operarios asignados, validando automáticamente la disponibilidad de los ítems en esas fechas.

**Why this priority**: Es la operación principal que integra el inventario, el cliente, los PDFs de cotización y los flujos financieros de caja.

**Independent Test**: Crear un evento en rango de fechas con 3 equipos de sonido y verificar el cálculo automático del costo y la reserva temporal de los ítems.

**Acceptance Scenarios**:
1. **Given** la creación de un nuevo evento, **When** selecciono las fechas de montaje y desmontaje, **Then** el sistema filtra los ítems de inventario mostrando únicamente aquellos sin conflictos de reserva en ese período.

---

### Edge Cases
- **Baja de Ítem en Evento Activo**: Si un ítem asignado a un evento en proceso es dado de baja por daño físico, el sistema debe permitir registrar el incidente y sugerir un reemplazo disponible en el inventario.
- **Cancelaciones e Impagos**: Si se cancela un evento que ya tenía abonos registrados en caja, el sistema debe permitir configurar la política de devolución (reembolso o penalización).

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001 (Administrativo)**: El sistema DEBE permitir configurar un único registro de información empresarial (nombre, NIT, dirección, teléfono, logo).
- **FR-002 (Usuarios/Roles)**: El sistema DEBE permitir la creación de usuarios con los roles: Administrador, Bodeguero, y Asistente Comercial, aplicando RLS para restringir accesos.
- **FR-003 (Caja y Cartera)**: El sistema DEBE permitir registrar egresos, abonos a clientes, y cuentas por pagar a proveedores.
- **FR-004 (Inventario)**: El sistema DEBE exigir un código SKU único y estado operativo para cada ítem de inventario.
- **FR-005 (Eventos)**: El sistema DEBE calcular el costo total de los eventos y validar de forma transaccional la disponibilidad de los ítems usando triggers en la base de datos.

### Key Entities
- **EmpresaConfig**: Registro de la configuración global de la empresa. Atributos: ID (constante = 1), razon_social, nit, telefono, email, logo_url.
- **Usuario**: Registro de usuarios del sistema. Atributos: ID, email, nombre, rol_id, estado_activo.
- **TransaccionCaja**: Registro de flujo de caja. Atributos: ID, evento_id (opcional), tipo (Ingreso/Egreso), monto, fecha, metodo_pago_id, descripcion.
- **CarteraCliente/CarteraProveedor**: Saldos pendientes de cobro o pago. Atributos: ID, entidad_id, saldo_total, actualizado_at.
- **MetodoPago**: Catálogo de métodos de pago. Atributos: ID, nombre (Efectivo, Transferencia, Tarjeta, etc.), descripcion.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Las modificaciones en la información de la empresa y roles de usuario se propagan a nivel de sesión en menos de 500ms.
- **SC-002**: Toda transacción de caja recalcula el saldo del flujo de caja diario de forma atómica en menos de 100ms.
- **SC-003**: El bloqueo transaccional por reserva de inventario duplicada garantiza un 0% de sobrealquiler físico en base de datos.

## Assumptions
- Se asume que el sistema utilizará el motor de base de datos Supabase ya configurado en el proyecto.
- Los logotipos de la empresa se procesarán en formatos de imagen web estándar (PNG, JPEG, SVG) y no excederán los 2MB de peso.
- Las formas de pago iniciales se pre-configurarán en la base de datos mediante una migración semilla.
