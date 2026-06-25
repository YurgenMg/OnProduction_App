'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet, Plus, TrendingUp, TrendingDown, RefreshCw,
  X, Search, Filter, ArrowUpRight, ArrowDownLeft, RotateCcw,
  Receipt, Calendar, CreditCard, CheckCircle2, AlertCircle
} from 'lucide-react';
import type { TransaccionCaja, MetodoPago, TipoTransaccion, CreateTransaccionDto } from '@/../../shared/types';

// ─── helpers ───────────────────────────────────────────────────────────────

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── configuración por tipo de transacción ─────────────────────────────────

const TIPO_CONFIG: Record<TipoTransaccion, { label: string; signo: 1 | -1; color: string; Icon: React.ElementType }> = {
  ABONO_CLIENTE:    { label: 'Abono Cliente',     signo:  1, color: 'var(--color-success)', Icon: ArrowUpRight },
  INGRESO_OTRO:     { label: 'Ingreso Otro',       signo:  1, color: 'var(--color-success)', Icon: TrendingUp },
  EGRESO_PROVEEDOR: { label: 'Egreso Proveedor',   signo: -1, color: 'var(--color-danger)',  Icon: ArrowDownLeft },
  EGRESO_OTRO:      { label: 'Egreso General',     signo: -1, color: 'var(--color-danger)',  Icon: TrendingDown },
  REVERSION:        { label: 'Reversión',          signo: -1, color: 'var(--color-warning)', Icon: RotateCcw },
};

const TIPOS_INGRESO: TipoTransaccion[] = ['ABONO_CLIENTE', 'INGRESO_OTRO'];
const TIPOS_EGRESO: TipoTransaccion[]  = ['EGRESO_PROVEEDOR', 'EGRESO_OTRO', 'REVERSION'];

// ─── tipos locales ──────────────────────────────────────────────────────────

interface TransaccionEnriquecida extends TransaccionCaja {
  metodo_pago?: { nombre: string };
  cliente?: { id: number; nombre_razon_social: string; documento_identidad: string } | null;
  evento?: { id: number; direccion_evento: string; estado: string } | null;
}

interface FormNuevaTransaccion {
  tipo: TipoTransaccion;
  monto: string;
  fecha: string;
  metodo_pago_id: number | '';
  descripcion: string;
  referencia_externa: string;
}

const FORM_VACIO: FormNuevaTransaccion = {
  tipo: 'ABONO_CLIENTE',
  monto: '',
  fecha: new Date().toISOString().split('T')[0],
  metodo_pago_id: '',
  descripcion: '',
  referencia_externa: '',
};

// ─── componente principal ──────────────────────────────────────────────────

export default function CajaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transacciones, setTransacciones] = useState<TransaccionEnriquecida[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm] = useState<FormNuevaTransaccion>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // ── filtros ─────────────────────────────────────────────────────────────
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingresos' | 'egresos'>('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // ── cargar datos ────────────────────────────────────────────────────────
  const cargarTransacciones = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroFechaDesde) params.set('fecha_desde', filtroFechaDesde);
      if (filtroFechaHasta) params.set('fecha_hasta', filtroFechaHasta);
      const qs = params.toString();
      const res = await fetch(`/api/caja/transacciones${qs ? '?' + qs : ''}`);
      if (res.ok) setTransacciones(await res.json());
    } finally {
      setCargando(false);
    }
  }, [filtroFechaDesde, filtroFechaHasta]);

  const cargarMetodosPago = useCallback(async () => {
    const res = await fetch('/api/caja/metodos-pago');
    if (res.ok) setMetodosPago(await res.json());
  }, []);

  useEffect(() => { cargarTransacciones(); }, [cargarTransacciones]);
  useEffect(() => { cargarMetodosPago(); }, [cargarMetodosPago]);

  useEffect(() => {
    if (searchParams?.get('nueva') === 'true') {
      setModalNueva(true);
      router.replace('/dashboard/caja');
    }
  }, [searchParams, router]);

  // ── filtrado local ────────────────────────────────────────────────────
  const transaccionesFiltradas = transacciones.filter((t) => {
    if (filtroTipo === 'ingresos' && !TIPOS_INGRESO.includes(t.tipo)) return false;
    if (filtroTipo === 'egresos' && !TIPOS_EGRESO.includes(t.tipo)) return false;
    if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      return (
        t.descripcion.toLowerCase().includes(q) ||
        (t.cliente?.nombre_razon_social?.toLowerCase().includes(q) ?? false) ||
        (t.referencia_externa?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // ── KPIs calculados ────────────────────────────────────────────────────
  const totalIngresos = transacciones
    .filter((t) => TIPOS_INGRESO.includes(t.tipo))
    .reduce((s, t) => s + Number(t.monto), 0);

  const totalEgresos = transacciones
    .filter((t) => TIPOS_EGRESO.includes(t.tipo))
    .reduce((s, t) => s + Number(t.monto), 0);

  const saldoNeto = totalIngresos - totalEgresos;

  // ── registrar transacción ──────────────────────────────────────────────
  const registrarTransaccion = async () => {
    setError(null);
    if (!form.tipo || !form.monto || !form.metodo_pago_id || !form.descripcion) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      const payload: CreateTransaccionDto = {
        tipo: form.tipo,
        monto,
        fecha: form.fecha,
        metodo_pago_id: Number(form.metodo_pago_id),
        descripcion: form.descripcion,
        referencia_externa: form.referencia_externa || undefined,
      };
      const res = await fetch('/api/caja/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setExito('Transacción registrada exitosamente.');
      setModalNueva(false);
      setForm(FORM_VACIO);
      cargarTransacciones();
      setTimeout(() => setExito(null), 4000);
    } finally {
      setGuardando(false);
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Caja & Cartera
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Libro mayor de ingresos y egresos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={cargarTransacciones} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setModalNueva(true); setError(null); }} className="btn btn-primary" id="btn-nueva-transaccion">
            <Plus size={16} /> Nueva Transacción
          </button>
        </div>
      </div>

      {/* Alerta de éxito */}
      {exito && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
          color: 'var(--color-success)', fontSize: '14px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>✓ {exito}</span>
          <button onClick={() => setExito(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }}>✕</button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          {
            label: 'Total Ingresos',
            valor: totalIngresos,
            color: 'var(--color-success)',
            bg: 'rgba(16,185,129,0.08)',
            border: 'rgba(16,185,129,0.2)',
            Icon: TrendingUp,
          },
          {
            label: 'Total Egresos',
            valor: totalEgresos,
            color: 'var(--color-danger)',
            bg: 'rgba(239,68,68,0.08)',
            border: 'rgba(239,68,68,0.2)',
            Icon: TrendingDown,
          },
          {
            label: 'Saldo Neto',
            valor: saldoNeto,
            color: saldoNeto >= 0 ? 'var(--accent-secondary)' : 'var(--color-warning)',
            bg: saldoNeto >= 0 ? 'rgba(6,182,212,0.08)' : 'rgba(245,158,11,0.08)',
            border: saldoNeto >= 0 ? 'rgba(6,182,212,0.2)' : 'rgba(245,158,11,0.2)',
            Icon: Wallet,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg, border: `1px solid ${kpi.border}`,
              borderRadius: '12px', padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</span>
              <kpi.Icon size={18} color={kpi.color} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: kpi.color }}>
              {formatCOP(kpi.valor)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {transacciones.length} movimiento{transacciones.length !== 1 ? 's' : ''}
              {(filtroFechaDesde || filtroFechaHasta) ? ' (filtrado)' : ' total'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Barra de filtros ── */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tabs ingreso/egreso/todos */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '4px' }}>
            {([['todos', 'Todos'], ['ingresos', 'Ingresos'], ['egresos', 'Egresos']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  background: filtroTipo === key ? 'var(--accent-primary)' : 'transparent',
                  color: filtroTipo === key ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar descripción, cliente..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              style={{ paddingLeft: '32px', padding: '9px 12px 9px 32px', fontSize: '13px' }}
            />
          </div>

          {/* Rango de fechas */}
          <input type="date" className="form-input" value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            style={{ padding: '9px 12px', fontSize: '13px', width: '150px' }} placeholder="Desde" />
          <input type="date" className="form-input" value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            style={{ padding: '9px 12px', fontSize: '13px', width: '150px' }} placeholder="Hasta" />

          {(filtroFechaDesde || filtroFechaHasta || filtroBusqueda) && (
            <button
              onClick={() => { setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroBusqueda(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Libro Mayor ── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p>Cargando movimientos...</p>
          </div>
        ) : transaccionesFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Receipt size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p>{filtroTipo !== 'todos' || filtroBusqueda ? 'Sin resultados con los filtros actuales.' : 'Aún no hay transacciones registradas.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Método</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>Saldo Acum.</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Calcular saldo acumulado cronológicamente
                  let acum = 0;
                  const conSaldo = [...transaccionesFiltradas].reverse().map((t) => {
                    const cfg = TIPO_CONFIG[t.tipo];
                    acum += cfg.signo * Number(t.monto);
                    return { t, acum };
                  });
                  return conSaldo.reverse().map(({ t, acum: saldoAcum }) => {
                    const cfg = TIPO_CONFIG[t.tipo];
                    const IconTipo = cfg.Icon;
                    return (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {formatFecha(t.fecha)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              background: cfg.signo > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            }}>
                              <IconTipo size={14} color={cfg.color} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{t.descripcion}</div>
                          {t.cliente && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              👤 {t.cliente.nombre_razon_social}
                            </div>
                          )}
                          {t.referencia_externa && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                              Ref: {t.referencia_externa}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <CreditCard size={12} />
                            {(t as any).metodo_pago?.nombre ?? '—'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: cfg.color, whiteSpace: 'nowrap' }}>
                          {cfg.signo > 0 ? '+' : '-'} {formatCOP(Number(t.monto))}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap',
                          color: saldoAcum >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
                          {formatCOP(saldoAcum)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pie: totales del período filtrado */}
      {transaccionesFiltradas.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '28px',
          padding: '16px 20px', marginTop: '8px',
          background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
          fontSize: '14px',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Ingresos período:</span>
            <span style={{ color: 'var(--color-success)', fontWeight: 700, marginLeft: '8px' }}>
              {formatCOP(transaccionesFiltradas.filter(t => TIPOS_INGRESO.includes(t.tipo)).reduce((s, t) => s + Number(t.monto), 0))}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Egresos período:</span>
            <span style={{ color: 'var(--color-danger)', fontWeight: 700, marginLeft: '8px' }}>
              {formatCOP(transaccionesFiltradas.filter(t => TIPOS_EGRESO.includes(t.tipo)).reduce((s, t) => s + Number(t.monto), 0))}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>{transaccionesFiltradas.length} movimientos</span>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Transacción ── */}
      {modalNueva && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Registrar Movimiento</h2>
              <button onClick={() => setModalNueva(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#ef4444' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Selector de tipo — visual */}
            <div className="form-group">
              <label className="form-label">Tipo de Movimiento *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(Object.entries(TIPO_CONFIG) as [TipoTransaccion, typeof TIPO_CONFIG[TipoTransaccion]][]).map(([tipo, cfg]) => {
                  const Icono = cfg.Icon;
                  const isSelected = form.tipo === tipo;
                  return (
                    <button
                      key={tipo}
                      onClick={() => setForm((f) => ({ ...f, tipo }))}
                      style={{
                        padding: '10px 8px', borderRadius: '8px', border: `1px solid ${isSelected ? cfg.color + '55' : 'var(--border-muted)'}`,
                        background: isSelected ? cfg.color + '18' : 'transparent',
                        cursor: 'pointer', color: isSelected ? cfg.color : 'var(--text-muted)',
                        fontSize: '11px', fontWeight: isSelected ? 600 : 400,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s',
                      }}
                    >
                      <Icono size={16} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monto + fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Monto (COP) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  min="1"
                  value={form.monto}
                  onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                  id="campo-monto-transaccion"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label className="form-label">Método de Pago *</label>
              <select
                className="form-select"
                value={form.metodo_pago_id}
                onChange={(e) => setForm((f) => ({ ...f, metodo_pago_id: Number(e.target.value) || '' }))}
                id="campo-metodo-pago"
              >
                <option value="">Seleccionar método...</option>
                {metodosPago.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label className="form-label">Descripción *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Abono factura evento Mega Festival"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                id="campo-descripcion-transaccion"
              />
            </div>

            {/* Referencia externa (opcional) */}
            <div className="form-group">
              <label className="form-label">Referencia / Comprobante <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: TRX-000123456"
                value={form.referencia_externa}
                onChange={(e) => setForm((f) => ({ ...f, referencia_externa: e.target.value }))}
              />
            </div>

            {/* Preview del movimiento */}
            {form.monto && Number(form.monto) > 0 && (
              <div style={{
                background: TIPO_CONFIG[form.tipo].signo > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${TIPO_CONFIG[form.tipo].signo > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {TIPO_CONFIG[form.tipo].label}
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: TIPO_CONFIG[form.tipo].color }}>
                  {TIPO_CONFIG[form.tipo].signo > 0 ? '+' : '-'} {formatCOP(Number(form.monto))}
                </span>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalNueva(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
              <button onClick={registrarTransaccion} disabled={guardando} className="btn btn-primary" style={{ flex: 1 }} id="btn-confirmar-transaccion">
                {guardando ? '⟳ Registrando...' : '✓ Registrar'}
              </button>
            </div>

            {/* Nota de inmutabilidad */}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
              🔒 Las transacciones son inmutables. Para corregir una entrada usa el tipo "Reversión".
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
