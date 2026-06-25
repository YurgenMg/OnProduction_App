'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Cliente,
  ItemDisponible,
  Operario,
  TipoAdicional,
  CreateEventoDto,
} from '@/../../shared/types';

// ─────────────────────────────────────────────────────────────
// Types locales del formulario
// ─────────────────────────────────────────────────────────────

interface DatosEvento {
  fecha_inicio: string;
  fecha_fin: string;
  direccion: string;
  cliente_id: number | null;
}

interface ItemSeleccionado {
  instancia_id: number;
  catalogo_id: number;
  sku: string;
  nombre_equipo: string;
  nombre_categoria: string | null;
  tarifa_dia_base: number;
  serial_tag: string;
  dias_cobrados: number;
  subtotal: number;
  conflicto: boolean; // true si las nuevas fechas lo hacen no disponible
}

interface Adicional {
  tipo_adicional: TipoAdicional;
  descripcion: string;
  costo_facturado: number;
}

interface OperarioAsignado {
  operario_id: number;
  nombre_completo: string;
  especialidad: string | null;
  horas_asignadas: number;
  subtotal: number;
  tiene_conflicto: boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const calcularDias = (inicio: string, fin: string): number => {
  if (!inicio || !fin) return 1;
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const PASOS = ['Fechas y Cliente', 'Selección de Ítems', 'Operarios y Resumen'];

// ─────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────

export default function CrearEventoPage() {
  const router = useRouter();

  // ── Estado del wizard ──────────────────────────────────────
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // ── Paso 1: Datos y cliente ────────────────────────────────
  const [datos, setDatos] = useState<DatosEvento>({
    fecha_inicio: '',
    fecha_fin: '',
    direccion: '',
    cliente_id: null,
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [queryCliente, setQueryCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // ── Paso 2: Ítems ─────────────────────────────────────────
  const [itemsDisponibles, setItemsDisponibles] = useState<ItemDisponible[]>([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [itemsSeleccionados, setItemsSeleccionados] = useState<ItemSeleccionado[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  // ── Paso 3: Operarios y adicionales ──────────────────────
  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [operariosAsignados, setOperariosAsignados] = useState<OperarioAsignado[]>([]);
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);
  const [nuevoAdicional, setNuevoAdicional] = useState<Adicional>({
    tipo_adicional: 'TRANSPORTE',
    descripcion: '',
    costo_facturado: 0,
  });

  // ── Cargar clientes al inicio ──────────────────────────────
  useEffect(() => {
    const buscarClientes = async () => {
      setBuscandoClientes(true);
      try {
        const params = queryCliente ? `?q=${encodeURIComponent(queryCliente)}` : '';
        const res = await fetch(`/api/clientes${params}`);
        if (res.ok) setClientes(await res.json());
      } finally {
        setBuscandoClientes(false);
      }
    };
    const debounce = setTimeout(buscarClientes, 300);
    return () => clearTimeout(debounce);
  }, [queryCliente]);

  // ── Cargar operarios disponibles ───────────────────────────
  useEffect(() => {
    const cargarOperarios = async () => {
      const res = await fetch('/api/operarios');
      if (res.ok) setOperarios(await res.json());
    };
    cargarOperarios();
  }, []);

  // ── Cargar/actualizar items disponibles cuando cambian las fechas ──
  const cargarItemsDisponibles = useCallback(async () => {
    if (!datos.fecha_inicio || !datos.fecha_fin) return;
    setCargandoItems(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
      });
      const res = await fetch(`/api/inventario/disponibilidad?${params}`);
      if (!res.ok) return;
      const nuevosItems: ItemDisponible[] = await res.json();
      setItemsDisponibles(nuevosItems);

      // ✨ PRESERVACIÓN DE ESTADO: actualizar conflictos en ítems ya seleccionados
      setItemsSeleccionados((prevSel) =>
        prevSel.map((sel) => {
          const itemActualizado = nuevosItems.find((ni) => ni.instancia_id === sel.instancia_id);
          const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);
          return {
            ...sel,
            conflicto: itemActualizado ? !itemActualizado.disponible : true,
            dias_cobrados: dias,
            subtotal: sel.tarifa_dia_base * dias,
          };
        })
      );
    } finally {
      setCargandoItems(false);
    }
  }, [datos.fecha_inicio, datos.fecha_fin]);

  // ── Totales calculados ─────────────────────────────────────
  const totalEquipos = itemsSeleccionados.reduce((s, i) => s + i.subtotal, 0);
  const totalAdicionales = adicionales.reduce((s, a) => s + a.costo_facturado, 0);
  const totalOperarios = operariosAsignados.reduce((s, o) => s + o.subtotal, 0);
  const granTotal = totalEquipos + totalAdicionales + totalOperarios;

  // ── Validar paso actual ────────────────────────────────────
  const pasoEsValido = (): boolean => {
    if (paso === 0) {
      return !!(datos.fecha_inicio && datos.fecha_fin && datos.direccion && datos.cliente_id &&
        new Date(datos.fecha_fin) > new Date(datos.fecha_inicio));
    }
    if (paso === 1) return itemsSeleccionados.length > 0;
    return true;
  };

  // ── Avanzar al siguiente paso ──────────────────────────────
  const avanzar = async () => {
    if (paso === 0) await cargarItemsDisponibles();
    if (paso < PASOS.length - 1) setPaso((p) => p + 1);
  };

  // ── Retroceder — preservando todo el estado ────────────────
  const retroceder = () => {
    if (paso > 0) setPaso((p) => p - 1);
  };

  // ── Toggle selección de ítem ───────────────────────────────
  const toggleItem = (item: ItemDisponible) => {
    setItemsSeleccionados((prev) => {
      const idx = prev.findIndex((s) => s.instancia_id === item.instancia_id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);
      return [
        ...prev,
        {
          instancia_id: item.instancia_id,
          catalogo_id: item.catalogo_id,
          sku: item.sku,
          nombre_equipo: item.nombre_equipo,
          nombre_categoria: item.nombre_subcategoria ?? item.nombre_categoria,
          tarifa_dia_base: item.tarifa_dia_base,
          serial_tag: item.serial_tag,
          dias_cobrados: dias,
          subtotal: item.tarifa_dia_base * dias,
          conflicto: false,
        },
      ];
    });
  };

  // ── Toggle operario ────────────────────────────────────────
  const toggleOperario = (op: Operario) => {
    setOperariosAsignados((prev) => {
      const idx = prev.findIndex((o) => o.operario_id === op.id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);
      return [
        ...prev,
        {
          operario_id: op.id,
          nombre_completo: op.nombre_completo,
          especialidad: op.especialidad,
          horas_asignadas: 8 * dias,
          subtotal: op.tarifa_dia * dias,
          tiene_conflicto: false,
        },
      ];
    });
  };

  // ── Guardar evento ─────────────────────────────────────────
  const guardarEvento = async () => {
    if (!datos.cliente_id) return;
    setGuardando(true);
    setErrorGlobal(null);

    const payload: CreateEventoDto = {
      cliente_id: datos.cliente_id,
      fecha_inicio_evento: datos.fecha_inicio,
      fecha_fin_evento: datos.fecha_fin,
      direccion_evento: datos.direccion,
      items: itemsSeleccionados.map((i) => ({
        inventario_id: i.instancia_id,
        tarifa_dia_congelada: i.tarifa_dia_base,
        dias_cobrados: i.dias_cobrados,
        subtotal: i.subtotal,
      })),
      adicionales: adicionales.map((a) => ({
        tipo_adicional: a.tipo_adicional,
        descripcion: a.descripcion,
        costo_facturado: a.costo_facturado,
      })),
      operarios: operariosAsignados.map((o) => ({
        operario_id: o.operario_id,
        horas_asignadas: o.horas_asignadas,
        subtotal: o.subtotal,
      })),
    };

    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorGlobal(err.error ?? 'Error al guardar el evento.');
        return;
      }

      const evento = await res.json();
      router.push(`/dashboard/eventos?nuevo=${evento.id}`);
    } catch (e) {
      setErrorGlobal('Error de red. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Items filtrados ────────────────────────────────────────
  const itemsFiltrados = itemsDisponibles.filter((i) => {
    const matchCategoria = !filtroCategoria ||
      i.nombre_subcategoria === filtroCategoria ||
      i.nombre_categoria === filtroCategoria;
    const matchBusqueda = !filtroBusqueda ||
      i.nombre_equipo.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      i.sku.toLowerCase().includes(filtroBusqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  const categoriasUnicas = [...new Set(
    itemsDisponibles.map((i) => i.nombre_subcategoria ?? i.nombre_categoria).filter(Boolean)
  )] as string[];

  const itemsConConflicto = itemsSeleccionados.filter((i) => i.conflicto);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px'
          }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Nuevo Evento
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Registra un evento en estado Cotización
        </p>
      </div>

      {/* ── Stepper ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '0' }}>
        {PASOS.map((nombre, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < PASOS.length - 1 ? 1 : 0 }}>
            <button
              onClick={() => {
                // Navegación libre: sólo retroceder siempre, avanzar sólo si el paso es válido
                if (idx < paso || (idx === paso + 1 && pasoEsValido())) {
                  if (idx === paso + 1 && paso === 0) { cargarItemsDisponibles(); }
                  setPaso(idx);
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                cursor: idx <= paso || (idx === paso + 1 && pasoEsValido()) ? 'pointer' : 'default',
                background: idx < paso
                  ? 'var(--color-success)'
                  : idx === paso
                  ? 'var(--accent-gradient)'
                  : 'rgba(255,255,255,0.08)',
                color: idx <= paso ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '15px', flexShrink: 0,
                transition: 'all 0.2s', boxShadow: idx === paso ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {idx < paso ? '✓' : idx + 1}
            </button>
            <span style={{
              marginLeft: '10px', fontSize: '13px', fontWeight: idx === paso ? 600 : 400,
              color: idx === paso ? 'var(--text-primary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap', flexShrink: 0
            }}>
              {nombre}
            </span>
            {idx < PASOS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 16px',
                background: idx < paso ? 'var(--color-success)' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Error global */}
      {errorGlobal && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '16px', marginBottom: '24px', color: '#ef4444', fontSize: '14px'
        }}>
          ⚠️ {errorGlobal}
          <button onClick={() => setErrorGlobal(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ══ PASO 1: Fechas y Cliente ══════════════════════════ */}
      {paso === 0 && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '28px', color: 'var(--text-primary)' }}>
            📅 Fechas del evento y cliente
          </h2>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label">Fecha y hora de inicio *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={datos.fecha_inicio}
                onChange={(e) => setDatos((d) => ({ ...d, fecha_inicio: e.target.value }))}
                id="fecha-inicio"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha y hora de finalización *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={datos.fecha_fin}
                min={datos.fecha_inicio}
                onChange={(e) => setDatos((d) => ({ ...d, fecha_fin: e.target.value }))}
                id="fecha-fin"
              />
            </div>
          </div>

          {datos.fecha_inicio && datos.fecha_fin && new Date(datos.fecha_fin) > new Date(datos.fecha_inicio) && (
            <div style={{
              background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '24px',
              fontSize: '14px', color: 'var(--accent-secondary)',
            }}>
              🗓️ Duración del evento: <strong>{calcularDias(datos.fecha_inicio, datos.fecha_fin)} días</strong>
            </div>
          )}

          {/* Dirección */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Dirección / Lugar del evento *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Salón Comunal Norte, Cl. 45 #12-30"
              value={datos.direccion}
              onChange={(e) => setDatos((d) => ({ ...d, direccion: e.target.value }))}
              id="direccion-evento"
            />
          </div>

          {/* Selector de cliente */}
          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre, NIT o correo..."
                value={clienteSeleccionado ? clienteSeleccionado.nombre_razon_social : queryCliente}
                onChange={(e) => {
                  setQueryCliente(e.target.value);
                  if (clienteSeleccionado) {
                    setClienteSeleccionado(null);
                    setDatos((d) => ({ ...d, cliente_id: null }));
                  }
                }}
                id="buscar-cliente"
              />
              {buscandoClientes && (
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Buscando...
                </span>
              )}
            </div>

            {/* Lista de resultados */}
            {!clienteSeleccionado && clientes.length > 0 && queryCliente && (
              <div style={{
                background: 'var(--bg-surface-solid)', border: '1px solid var(--border-muted)',
                borderRadius: '10px', overflow: 'hidden', marginTop: '4px',
                maxHeight: '220px', overflowY: 'auto',
              }}>
                {clientes.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setDatos((d) => ({ ...d, cliente_id: c.id }));
                      setQueryCliente('');
                    }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-muted)',
                      color: 'var(--text-primary)', fontSize: '14px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ fontWeight: 600 }}>{c.nombre_razon_social}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.documento_identidad} · {c.email}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Cliente seleccionado */}
            {clienteSeleccionado && (
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '10px', padding: '14px 16px', marginTop: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{clienteSeleccionado.nombre_razon_social}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {clienteSeleccionado.documento_identidad} · {clienteSeleccionado.telefono}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setDatos((d) => ({ ...d, cliente_id: null }));
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}
                  title="Cambiar cliente"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PASO 2: Selección de Ítems ══════════════════════════ */}
      {paso === 1 && (
        <div>
          {/* Alerta de conflictos */}
          {itemsConConflicto.length > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '14px', color: '#f59e0b'
            }}>
              ⚠️ <strong>{itemsConConflicto.length} ítem(s)</strong> ya seleccionados no están disponibles en las nuevas fechas:
              {' '}{itemsConConflicto.map((i) => i.nombre_equipo).join(', ')}. Se mantienen en tu selección pero debes reemplazarlos antes de confirmar.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
            {/* Panel lateral — filtros + seleccionados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Buscador */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Filtros
                </h3>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar ítem..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  style={{ marginBottom: '12px', fontSize: '13px', padding: '10px 12px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={() => setFiltroCategoria('')}
                    style={{
                      padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                      background: filtroCategoria === '' ? 'rgba(99,102,241,0.15)' : 'none',
                      color: filtroCategoria === '' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    Todos ({itemsDisponibles.length})
                  </button>
                  {categoriasUnicas.map((cat) => {
                    const count = itemsDisponibles.filter((i) => (i.nombre_subcategoria ?? i.nombre_categoria) === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFiltroCategoria(cat === filtroCategoria ? '' : cat)}
                        style={{
                          padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                          background: filtroCategoria === cat ? 'rgba(99,102,241,0.15)' : 'none',
                          color: filtroCategoria === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ítems seleccionados */}
              {itemsSeleccionados.length > 0 && (
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Seleccionados ({itemsSeleccionados.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {itemsSeleccionados.map((sel) => (
                      <div
                        key={sel.instancia_id}
                        style={{
                          background: sel.conflicto ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                          border: `1px solid ${sel.conflicto ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                          borderRadius: '8px', padding: '10px 12px', fontSize: '13px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: sel.conflicto ? '#ef4444' : 'var(--text-primary)' }}>
                          {sel.conflicto ? '⚠️ ' : '✓ '}{sel.nombre_equipo}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                          {formatCOP(sel.subtotal)} · {sel.dias_cobrados}d
                        </div>
                        <button
                          onClick={() => setItemsSeleccionados((p) => p.filter((i) => i.instancia_id !== sel.instancia_id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-muted)', fontWeight: 600, fontSize: '14px', color: 'var(--accent-secondary)' }}>
                    Total: {formatCOP(totalEquipos)}
                  </div>
                </div>
              )}
            </div>

            {/* Panel principal — lista de ítems */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              {cargandoItems ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                  <p>Consultando disponibilidad...</p>
                </div>
              ) : itemsFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                  <p>No hay ítems disponibles con los filtros actuales</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {itemsFiltrados.map((item) => {
                    const seleccionado = itemsSeleccionados.some((s) => s.instancia_id === item.instancia_id);
                    const selConflicto = itemsSeleccionados.find((s) => s.instancia_id === item.instancia_id)?.conflicto;
                    const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);
                    return (
                      <button
                        key={item.instancia_id}
                        onClick={() => item.disponible || seleccionado ? toggleItem(item) : undefined}
                        disabled={!item.disponible && !seleccionado}
                        style={{
                          background: seleccionado
                            ? (selConflicto ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)')
                            : !item.disponible
                            ? 'rgba(255,255,255,0.02)'
                            : 'var(--bg-card)',
                          border: `1px solid ${seleccionado
                            ? (selConflicto ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)')
                            : !item.disponible ? 'rgba(255,255,255,0.04)' : 'var(--border-muted)'}`,
                          borderRadius: '10px', padding: '14px', textAlign: 'left',
                          cursor: !item.disponible && !seleccionado ? 'not-allowed' : 'pointer',
                          opacity: !item.disponible && !seleccionado ? 0.4 : 1,
                          transition: 'all 0.2s', position: 'relative',
                        }}
                      >
                        {seleccionado && (
                          <span style={{
                            position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px',
                            borderRadius: '50%', background: selConflicto ? '#ef4444' : 'var(--color-success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff'
                          }}>
                            {selConflicto ? '!' : '✓'}
                          </span>
                        )}
                        <div style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                          {item.nombre_subcategoria ?? item.nombre_categoria ?? '—'} · {item.sku}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '8px' }}>
                          {item.nombre_equipo}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          {item.serial_tag}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                          {formatCOP(item.tarifa_dia_base)}/día
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {dias}d = {formatCOP(item.tarifa_dia_base * dias)}
                        </div>
                        {!item.disponible && !seleccionado && (
                          <span className="badge badge-danger" style={{ marginTop: '8px', fontSize: '10px' }}>No disponible</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ PASO 3: Operarios y Resumen ══════════════════════════ */}
      {paso === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          {/* Operarios y Adicionales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Operarios */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>👷 Operarios</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {operarios.map((op) => {
                  const asignado = operariosAsignados.some((o) => o.operario_id === op.id);
                  const conflicto = operariosAsignados.find((o) => o.operario_id === op.id)?.tiene_conflicto;
                  const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);
                  return (
                    <button
                      key={op.id}
                      onClick={() => toggleOperario(op)}
                      style={{
                        background: asignado ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                        border: `1px solid ${asignado ? 'rgba(99,102,241,0.4)' : 'var(--border-muted)'}`,
                        borderRadius: '10px', padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{op.nombre_completo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{op.especialidad}</div>
                      <div style={{ fontSize: '13px', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                        {formatCOP(op.tarifa_dia)}/día
                      </div>
                      {asignado && conflicto && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '6px' }}>
                          ⚠️ Posible conflicto de horario
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adicionales */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>➕ Servicios Adicionales</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select
                  className="form-select"
                  value={nuevoAdicional.tipo_adicional}
                  onChange={(e) => setNuevoAdicional((a) => ({ ...a, tipo_adicional: e.target.value as TipoAdicional }))}
                  style={{ flex: '0 0 140px' }}
                >
                  <option value="TRANSPORTE">Transporte</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="OTRO">Otro</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Descripción del servicio"
                  value={nuevoAdicional.descripcion}
                  onChange={(e) => setNuevoAdicional((a) => ({ ...a, descripcion: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Costo"
                  value={nuevoAdicional.costo_facturado || ''}
                  onChange={(e) => setNuevoAdicional((a) => ({ ...a, costo_facturado: Number(e.target.value) }))}
                  style={{ flex: '0 0 130px' }}
                  min="0"
                />
                <button
                  onClick={() => {
                    if (nuevoAdicional.descripcion && nuevoAdicional.costo_facturado > 0) {
                      setAdicionales((prev) => [...prev, nuevoAdicional]);
                      setNuevoAdicional({ tipo_adicional: 'TRANSPORTE', descripcion: '', costo_facturado: 0 });
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ flexShrink: 0 }}
                >
                  + Agregar
                </button>
              </div>
              {adicionales.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '8px'
                }}>
                  <div>
                    <span className="badge badge-info" style={{ marginRight: '8px', fontSize: '10px' }}>{a.tipo_adicional}</span>
                    <span style={{ fontSize: '14px' }}>{a.descripcion}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCOP(a.costo_facturado)}</span>
                    <button
                      onClick={() => setAdicionales((prev) => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel de resumen */}
          <div style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
                📋 Resumen de Cotización
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Cliente</div>
                  <div style={{ fontWeight: 600 }}>{clienteSeleccionado?.nombre_razon_social}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{clienteSeleccionado?.telefono}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Fechas</div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {datos.fecha_inicio ? new Date(datos.fecha_inicio).toLocaleDateString('es-CO') : '—'}
                    {' → '}
                    {datos.fecha_fin ? new Date(datos.fecha_fin).toLocaleDateString('es-CO') : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{calcularDias(datos.fecha_inicio, datos.fecha_fin)} días · {datos.direccion}</div>
                </div>
              </div>

              {/* Desglose de totales */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-muted)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Equipos ({itemsSeleccionados.length})</span>
                  <span>{formatCOP(totalEquipos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Operarios ({operariosAsignados.length})</span>
                  <span>{formatCOP(totalOperarios)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Adicionales ({adicionales.length})</span>
                  <span>{formatCOP(totalAdicionales)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Gran Total</span>
                <span style={{ fontSize: '22px', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {formatCOP(granTotal)}
                </span>
              </div>

              {itemsConConflicto.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                  ⚠️ Hay {itemsConConflicto.length} ítem(s) con conflicto de disponibilidad. Resuélvelos antes de confirmar.
                </div>
              )}

              <button
                onClick={guardarEvento}
                disabled={guardando || itemsConConflicto.length > 0}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '15px' }}
                id="btn-crear-cotizacion"
              >
                {guardando ? '⟳ Guardando...' : '✓ Crear Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de navegación inferior ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '32px', padding: '20px 0',
        borderTop: '1px solid var(--border-muted)',
      }}>
        <button
          onClick={retroceder}
          disabled={paso === 0}
          className="btn btn-secondary"
          style={{ opacity: paso === 0 ? 0.4 : 1 }}
        >
          ← Anterior
        </button>

        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Paso {paso + 1} de {PASOS.length}
        </span>

        {paso < PASOS.length - 1 ? (
          <button
            onClick={avanzar}
            disabled={!pasoEsValido()}
            className="btn btn-primary"
            style={{ opacity: !pasoEsValido() ? 0.5 : 1 }}
            id={`btn-siguiente-paso-${paso + 1}`}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={guardarEvento}
            disabled={guardando || itemsConConflicto.length > 0}
            className="btn btn-primary"
            id="btn-crear-cotizacion-footer"
          >
            {guardando ? '⟳ Guardando...' : '✓ Crear Cotización'}
          </button>
        )}
      </div>
    </div>
  );
}
