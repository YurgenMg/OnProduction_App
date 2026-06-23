/**
 * Tipos y enumeraciones de base de datos para OnProduction
 * Refleja de forma exacta el esquema DDL y los enums de PostgreSQL
 */

export type TipoCliente = 'B2C' | 'B2B';
export type EstadoEquipo = 'DISPONIBLE' | 'EN_MANTENIMIENTO' | 'DADO_DE_BAJA' | 'ALQUILADO';
export type EstadoEvento = 'COTIZACION' | 'CONFIRMADO_RESERVADO' | 'EN_TRANSITO' | 'FINALIZADO' | 'PAGADO_CERRADO';
export type TipoAdicional = 'TRANSPORTE' | 'PERSONAL' | 'OTRO';
export type EstadoDeposito = 'RECIBIDO' | 'RETENIDO_PARCIAL' | 'RETENIDO_TOTAL' | 'DEVUELTO';

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Rol extends BaseEntity {
  nombre: string;
}

export interface Usuario extends BaseEntity {
  rol_id: number;
  nombre_completo: string;
  email: string;
  password_hash: string;
}

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

export interface CatalogoEquipo extends BaseEntity {
  sku: string;
  nombre_equipo: string;
  categoria: string;
  tarifa_dia_base: number;
}

export interface InventarioInstancia extends BaseEntity {
  catalogo_id: number;
  serial_tag: string;
  estado_operativo: EstadoEquipo;
  notas_condicion: string | null;
}

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
