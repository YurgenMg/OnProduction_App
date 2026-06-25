'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Search, Plus, Phone, Mail, MapPin,
  ChevronRight, X, DollarSign, CalendarRange,
  AlertCircle, CheckCircle2, Building2, User, RefreshCw
} from 'lucide-react';
import type { Cliente, ClienteConCartera, TipoCliente } from '@/../../shared/types';

// ─── helpers ───────────────────────────────────────────────────────────────

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const tipoLabel: Record<TipoCliente, string> = { B2B: 'Empresa', B2C: 'Persona Natural' };

// ─── tipos locales ──────────────────────────────────────────────────────────

interface ClienteConHistorial extends ClienteConCartera {
  eventos?: Array<{
    id: number;
    estado: string;
    fecha_inicio_evento: string;
    fecha_fin_evento: string;
    direccion_evento: string;
    gran_total: number;
  }>;
}

interface NuevoClienteForm {
  tipo_cliente: TipoCliente;
  documento_identidad: string;
  nombre_razon_social: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  email: string;
  telefono: string;
  direccion: string;
}

const FORM_VACIO: NuevoClienteForm = {
  tipo_cliente: 'B2B',
  documento_identidad: '',
  nombre_razon_social: '',
  nombres_contacto: '',
  apellidos_contacto: '',
  email: '',
  telefono: '',
  direccion: '',
};

const ESTADO_COLOR: Record<string, string> = {
  COTIZACION:           'badge-info',
  CONFIRMADO_RESERVADO: 'badge-warning',
  EN_TRANSITO:          'badge-warning',
  FINALIZADO:           'badge-success',
  PAGADO_CERRADO:       'badge-success',
};

const ESTADO_LABEL: Record<string, string> = {
  COTIZACION:           'Cotización',
  CONFIRMADO_RESERVADO: 'Confirmado',
  EN_TRANSITO:          'En Tránsito',
  FINALIZADO:           'Finalizado',
  PAGADO_CERRADO:       'Pagado',
};

// ─── componente principal ──────────────────────────────────────────────────

export default function ClientesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clientes, setClientes] = useState<ClienteConHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [clienteActivo, setClienteActivo] = useState<ClienteConHistorial | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState<NuevoClienteForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('nuevo') === 'true') {
      setModalNuevo(true);
      // Limpiar query param para evitar reabrir si recarga
      router.replace('/dashboard/clientes');
    }
  }, [searchParams, router]);

  // ── cargar lista ────────────────────────────────────────────────────────
  const cargarClientes = useCallback(async (q?: string) => {
    setCargando(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/clientes${params}`);
      if (res.ok) setClientes(await res.json());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargarClientes(busqueda || undefined), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargarClientes]);

  // ── abrir detalle con historial de eventos ─────────────────────────────
  const abrirDetalle = async (cliente: ClienteConHistorial) => {
    setClienteActivo(cliente);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`/api/eventos?cliente_id=${cliente.id}`);
      if (res.ok) {
        const eventos = await res.json();
        setClienteActivo((prev) => prev ? { ...prev, eventos } : prev);
      }
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ── crear cliente ────────────────────────────────────────────────────────
  const crearCliente = async () => {
    setError(null);
    const required: (keyof NuevoClienteForm)[] = [
      'documento_identidad', 'nombre_razon_social', 'email', 'telefono',
    ];
    for (const f of required) {
      if (!form[f]) { setError(`Campo requerido: ${f.replace(/_/g, ' ')}`); return; }
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setExito('Cliente creado exitosamente.');
      setModalNuevo(false);
      setForm(FORM_VACIO);
      cargarClientes(busqueda || undefined);
      setTimeout(() => setExito(null), 4000);
    } finally {
      setGuardando(false);
    }
  };

  const clientesFiltrados = clientes; // el filtro ya viene del API

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Clientes
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => cargarClientes(busqueda || undefined)} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setModalNuevo(true); setError(null); }} className="btn btn-primary" id="btn-nuevo-cliente">
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Alerta de éxito */}
      {exito && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: 'var(--color-success)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
          <span>✓ {exito}</span>
          <button onClick={() => setExito(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }}>✕</button>
        </div>
      )}

      {/* Layout: lista + detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: clienteActivo ? '1fr 420px' : '1fr', gap: '20px', transition: 'all 0.3s' }}>

        {/* ── Lista de clientes ── */}
        <div>
          {/* Buscador */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre, NIT, correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ paddingLeft: '40px' }}
              id="buscar-cliente-input"
            />
          </div>

          {/* Tabla */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            {cargando ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <p>Cargando clientes...</p>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <Users size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p>{busqueda ? 'Sin resultados para tu búsqueda.' : 'Aún no hay clientes registrados.'}</p>
              </div>
            ) : (
              <table className="premium-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Documento</th>
                    <th>Contacto</th>
                    <th style={{ textAlign: 'right' }}>Saldo Cartera</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c) => {
                    const saldo = (c.cartera as any)?.saldo_pendiente ?? 0;
                    const isActive = clienteActivo?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => abrirDetalle(c)}
                        style={{ cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.06)' : undefined }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                              background: c.tipo_cliente === 'B2B' ? 'rgba(99,102,241,0.15)' : 'rgba(6,182,212,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {c.tipo_cliente === 'B2B' ? <Building2 size={16} color="var(--accent-primary)" /> : <User size={16} color="var(--accent-secondary)" />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.nombre_razon_social}</div>
                              <span className={`badge ${c.tipo_cliente === 'B2B' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                                {tipoLabel[c.tipo_cliente]}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.documento_identidad}</td>
                        <td>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <div>{c.telefono}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.email}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            fontWeight: 700, fontSize: '14px',
                            color: saldo > 0 ? 'var(--color-warning)' : saldo < 0 ? 'var(--color-success)' : 'var(--text-muted)',
                          }}>
                            {formatCOP(saldo)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Panel de detalle ── */}
        {clienteActivo && (
          <div style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              {/* Header del panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                    background: clienteActivo.tipo_cliente === 'B2B' ? 'rgba(99,102,241,0.15)' : 'rgba(6,182,212,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {clienteActivo.tipo_cliente === 'B2B'
                      ? <Building2 size={22} color="var(--accent-primary)" />
                      : <User size={22} color="var(--accent-secondary)" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{clienteActivo.nombre_razon_social}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{clienteActivo.documento_identidad}</div>
                  </div>
                </div>
                <button onClick={() => setClienteActivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Saldo cartera */}
              {(() => {
                const saldo = (clienteActivo.cartera as any)?.saldo_pendiente ?? 0;
                return (
                  <div style={{
                    padding: '16px', borderRadius: '10px', marginBottom: '20px',
                    background: saldo > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${saldo > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Saldo en Cartera</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: saldo > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {formatCOP(saldo)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {saldo > 0 ? '⚠️ Saldo pendiente de cobro' : saldo < 0 ? '✓ Saldo a favor del cliente' : '✓ Sin saldo pendiente'}
                    </div>
                  </div>
                );
              })()}

              {/* Info de contacto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {clienteActivo.telefono && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteActivo.telefono}</span>
                  </div>
                )}
                {clienteActivo.email && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                    <Mail size={14} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteActivo.email}</span>
                  </div>
                )}
                {clienteActivo.direccion && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteActivo.direccion}</span>
                  </div>
                )}
                {(clienteActivo.nombres_contacto || clienteActivo.apellidos_contacto) && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                    <User size={14} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {[clienteActivo.nombres_contacto, clienteActivo.apellidos_contacto].filter(Boolean).join(' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón crear evento */}
              <button
                onClick={() => router.push(`/dashboard/eventos/crear?cliente_id=${clienteActivo.id}`)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '20px' }}
                id="btn-crear-evento-cliente"
              >
                <CalendarRange size={16} /> Crear Evento para este Cliente
              </button>

              {/* Historial de eventos */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Historial de Eventos
                </h3>
                {cargandoDetalle ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <p>Cargando historial...</p>
                  </div>
                ) : !clienteActivo.eventos || clienteActivo.eventos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <CalendarRange size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
                    <p>Sin eventos registrados</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {clienteActivo.eventos.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => router.push(`/dashboard/eventos?id=${ev.id}`)}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border-muted)',
                          borderRadius: '8px', padding: '12px 14px', textAlign: 'left',
                          cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-glow)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span className={`badge ${ESTADO_COLOR[ev.estado] ?? 'badge-info'}`} style={{ fontSize: '10px', marginBottom: '4px' }}>
                              {ESTADO_LABEL[ev.estado] ?? ev.estado}
                            </span>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {new Date(ev.fecha_inicio_evento).toLocaleDateString('es-CO')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{ev.direccion_evento}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-secondary)', flexShrink: 0, marginLeft: '8px' }}>
                            {formatCOP(ev.gran_total)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo Cliente ── */}
      {modalNuevo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Nuevo Cliente</h2>
              <button onClick={() => setModalNuevo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#ef4444' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Tipo de cliente */}
            <div className="form-group">
              <label className="form-label">Tipo de Cliente *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['B2B', 'B2C'] as TipoCliente[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, tipo_cliente: t }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${form.tipo_cliente === t ? 'rgba(99,102,241,0.5)' : 'var(--border-muted)'}`,
                      background: form.tipo_cliente === t ? 'rgba(99,102,241,0.12)' : 'transparent',
                      cursor: 'pointer', color: form.tipo_cliente === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: form.tipo_cliente === t ? 600 : 400, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    {t === 'B2B' ? <Building2 size={16} /> : <User size={16} />}
                    {tipoLabel[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos del formulario */}
            {([
              { key: 'documento_identidad', label: 'NIT / Cédula *', placeholder: form.tipo_cliente === 'B2B' ? '900.123.456-1' : '1.234.567.890' },
              { key: 'nombre_razon_social', label: form.tipo_cliente === 'B2B' ? 'Razón Social *' : 'Nombre Completo *', placeholder: '' },
            ] as Array<{ key: keyof NuevoClienteForm; label: string; placeholder: string }>).map((campo) => (
              <div key={campo.key} className="form-group">
                <label className="form-label">{campo.label}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={campo.placeholder}
                  value={form[campo.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [campo.key]: e.target.value }))}
                  id={`campo-${campo.key}`}
                />
              </div>
            ))}

            {/* Contacto (visible en B2B) */}
            {form.tipo_cliente === 'B2B' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Contacto</label>
                  <input type="text" className="form-input" value={form.nombres_contacto}
                    onChange={(e) => setForm((f) => ({ ...f, nombres_contacto: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido Contacto</label>
                  <input type="text" className="form-input" value={form.apellidos_contacto}
                    onChange={(e) => setForm((f) => ({ ...f, apellidos_contacto: e.target.value }))} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Correo Electrónico *</label>
                <input type="email" className="form-input" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} id="campo-email" />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono *</label>
                <input type="tel" className="form-input" placeholder="300 123 4567" value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} id="campo-telefono" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input type="text" className="form-input" value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} />
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => setModalNuevo(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
              <button onClick={crearCliente} disabled={guardando} className="btn btn-primary" style={{ flex: 1 }} id="btn-confirmar-nuevo-cliente">
                {guardando ? '⟳ Guardando...' : '✓ Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
