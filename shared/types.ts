/**
 * Tipos y enumeraciones de base de datos para OnProduction
 * Refleja de forma exacta el esquema DDL y los enums de PostgreSQL
 * Versión: 2.0.0 — Módulos especializados completos
 */

// ─────────────────────────────────────────────────────────────
// Enumeraciones — deben coincidir 1:1 con los enums de Postgres
// ─────────────────────────────────────────────────────────────

export type TipoCliente = 'B2C' | 'B2B';
export type EstadoEquipo = 'DISPONIBLE' | 'EN_MANTENIMIENTO' | 'DADO_DE_BAJA' | 'ALQUILADO';
export type EstadoEvento = 'COTIZACION' | 'CONFIRMADO_RESERVADO' | 'EN_TRANSITO' | 'FINALIZADO' | 'PAGADO_CERRADO';
export type TipoAdicional = 'TRANSPORTE' | 'PERSONAL' | 'OTRO';
export type EstadoDeposito = 'RECIBIDO' | 'RETENIDO_PARCIAL' | 'RETENIDO_TOTAL' | 'DEVUELTO';
export type TipoTransaccion = 'ABONO_CLIENTE' | 'EGRESO_PROVEEDOR' | 'INGRESO_OTRO' | 'EGRESO_OTRO' | 'REVERSION';

// ─────────────────────────────────────────────────────────────
// Entidades base
// ─────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// Módulo Administrativo
// ─────────────────────────────────────────────────────────────

export interface Rol extends BaseEntity {
  nombre: string;
}

export interface Usuario extends BaseEntity {
  rol_id: number;
  nombre_completo: string;
  email: string;
  password_hash: string | null;
}

/** Vista enriquecida del usuario con datos del rol */
export interface UsuarioConRol extends Usuario {
  rol: Pick<Rol, 'id' | 'nombre'>;
}

export interface ConfiguracionEmpresa {
  id: 1;  // Siempre = 1 (registro único)
  nombre_empresa: string;
  eslogan: string | null;
  nit: string;
  telefono: string;
  email: string;
  direccion: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Módulo Inventario
// ─────────────────────────────────────────────────────────────

export interface CategoriaInventario extends BaseEntity {
  nombre: string;
  descripcion: string | null;
  parent_id: number | null;
  nivel: 1 | 2;
  prefijo_sku: string;
}

/** Vista enriquecida con subcategorías anidadas */
export interface CategoriaConSubcategorias extends CategoriaInventario {
  subcategorias: CategoriaInventario[];
}

export interface CatalogoEquipo extends BaseEntity {
  sku: string;
  nombre_equipo: string;
  categoria: string;             // Legacy — mantener para retrocompatibilidad
  categoria_id: number | null;   // FK a categorias_inventario (nivel 2)
  tarifa_dia_base: number;
}

export interface InventarioInstancia extends BaseEntity {
  catalogo_id: number;
  serial_tag: string;
  estado_operativo: EstadoEquipo;
  notas_condicion: string | null;
}

/** Vista enriquecida para el wizard de eventos */
export interface ItemDisponible {
  instancia_id: number;
  catalogo_id: number;
  sku: string;
  nombre_equipo: string;
  categoria_id: number | null;
  nombre_categoria: string | null;
  nombre_subcategoria: string | null;
  tarifa_dia_base: number;
  serial_tag: string;
  estado_operativo: EstadoEquipo;
  disponible: boolean;
}

// ─────────────────────────────────────────────────────────────
// Módulo Clientes
// ─────────────────────────────────────────────────────────────

export interface Cliente extends BaseEntity {
  tipo_cliente: TipoCliente;
  documento_identidad: string;
  nombre_razon_social: string;
  nombres_contacto: string | null;
  apellidos_contacto: string | null;
  email: string;
  telefono: string;
  direccion: string | null;
}

export interface CarteraCliente extends BaseEntity {
  cliente_id: number;
  saldo_pendiente: number;
  ultima_transaccion_at: string | null;
}

/** Vista de cliente con saldo de cartera integrado */
export interface ClienteConCartera extends Cliente {
  cartera: Pick<CarteraCliente, 'saldo_pendiente' | 'ultima_transaccion_at'> | null;
}

// ─────────────────────────────────────────────────────────────
// Módulo Caja y Finanzas
// ─────────────────────────────────────────────────────────────

export interface MetodoPago extends BaseEntity {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

/** Transacción financiera — INMUTABLE: no admite UPDATE/DELETE */
export interface TransaccionCaja {
  id: number;
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  metodo_pago_id: number;
  evento_id: number | null;
  cliente_id: number | null;
  descripcion: string;
  referencia_externa: string | null;
  reversion_de_id: number | null;
  usuario_registro_id: number;
  created_at: string;
}

export interface CarteraProveedor extends BaseEntity {
  nombre_proveedor: string;
  rut_nit: string;
  email_contacto: string | null;
  saldo_pendiente: number;
  ultima_transaccion_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// Módulo Operarios
// ─────────────────────────────────────────────────────────────

export interface Operario extends BaseEntity {
  nombre_completo: string;
  telefono: string | null;
  especialidad: string | null;
  tarifa_dia: number;
  activo: boolean;
}

export interface EventoOperario extends BaseEntity {
  evento_id: number;
  operario_id: number;
  horas_asignadas: number;
  subtotal: number;
  notas: string | null;
}

// ─────────────────────────────────────────────────────────────
// Módulo Eventos
// ─────────────────────────────────────────────────────────────

export interface Evento extends BaseEntity {
  cliente_id: number;
  usuario_id: number;
  estado: EstadoEvento;
  fecha_inicio_evento: string;
  fecha_fin_evento: string;
  direccion_evento: string;
  total_equipos: number;
  total_adicionales: number;
  gran_total: number;
}

export interface EventoDetalleEquipo extends BaseEntity {
  evento_id: number;
  inventario_id: number;
  tarifa_dia_congelada: number;
  dias_cobrados: number;
  subtotal: number;
}

export interface EventoAdicional extends BaseEntity {
  evento_id: number;
  tipo_adicional: TipoAdicional;
  descripcion: string;
  costo_facturado: number;
}

export interface DepositoGarantia extends BaseEntity {
  evento_id: number;
  monto_recibido: number;
  estado: EstadoDeposito;
  monto_retenido: number;
  motivo_retencion: string | null;
}

export interface RegistroDanoAuditoria extends BaseEntity {
  evento_id: number;
  inventario_id: number;
  descripcion_dano: string;
  costo_reparacion: number;
  descontado_de_deposito: boolean;
}

/** Vista completa del evento para el dashboard */
export interface EventoCompleto extends Evento {
  cliente: Pick<Cliente, 'id' | 'nombre_razon_social' | 'documento_identidad' | 'email' | 'telefono'>;
  detalles_equipos: EventoDetalleEquipo[];
  adicionales: EventoAdicional[];
  operarios: Array<EventoOperario & { operario: Pick<Operario, 'nombre_completo' | 'especialidad'> }>;
}

// ─────────────────────────────────────────────────────────────
// DTOs — Payloads de API routes
// ─────────────────────────────────────────────────────────────

export interface CreateTransaccionDto {
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  metodo_pago_id: number;
  evento_id?: number;
  cliente_id?: number;
  descripcion: string;
  referencia_externa?: string;
  reversion_de_id?: number;
}

export interface CreateEventoDto {
  cliente_id: number;
  fecha_inicio_evento: string;
  fecha_fin_evento: string;
  direccion_evento: string;
  items: Array<{
    inventario_id: number;
    tarifa_dia_congelada: number;
    dias_cobrados: number;
    subtotal: number;
  }>;
  adicionales?: Array<{
    tipo_adicional: TipoAdicional;
    descripcion: string;
    costo_facturado: number;
  }>;
  operarios?: Array<{
    operario_id: number;
    horas_asignadas: number;
    subtotal: number;
  }>;
}

export interface UpdateEventoEstadoDto {
  estado: EstadoEvento;
}
