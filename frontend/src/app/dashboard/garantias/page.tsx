'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase-client';
import { runTransactionSafe } from '../../../shared/transaction-helper';
import { 
  ShieldCheck, 
  Wrench, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  RefreshCw,
  Info
} from 'lucide-react';

interface DepositoGarantia {
  id: number;
  evento_id: number;
  monto_recibido: number;
  monto_retenido: number;
  estado: string;
  motivo_retencion: string | null;
  evento: {
    direccion_evento: string;
    cliente: {
      nombre_razon_social: string;
    };
  };
}

interface EventoActivoConEquipos {
  id: number;
  cliente: {
    nombre_razon_social: string;
  };
  detalles: {
    id: number;
    inventario_id: number;
    instancia: {
      serial_tag: string;
      catalogo: {
        nombre_equipo: string;
      };
    };
  }[];
}

export default function GarantiasPage() {
  const [depositos, setDepositos] = useState<DepositoGarantia[]>([]);
  const [eventosConEquipos, setEventosConEquipos] = useState<EventoActivoConEquipos[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Registrar daño Form
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState('');
  const [selectedInventarioId, setSelectedInventarioId] = useState('');
  const [descripcionDano, setDescripcionDano] = useState('');
  const [costoReparacion, setCostoReparacion] = useState('');
  const [descontarGarantia, setDescontarGarantia] = useState(true);

  // Devolver garantía Form / Accion
  const [showDevolverForm, setShowDevolverForm] = useState(false);

  useEffect(() => {
    fetchGarantiasData();
  }, []);

  const fetchGarantiasData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener depósitos de garantía
      const { data: depData, error: depErr } = await supabase
        .from('depositos_garantia')
        .select(`
          id,
          evento_id,
          monto_recibido,
          monto_retenido,
          estado,
          motivo_retencion,
          evento:eventos(
            direccion_evento,
            cliente:clientes(nombre_razon_social)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (depErr) throw depErr;
      setDepositos(depData as unknown as DepositoGarantia[]);

      // 2. Obtener eventos que tienen equipos asignados (para reportar daños)
      // Aunque las queries RLS aplican, obtenemos eventos en estados CONFIRMADO_RESERVADO, EN_TRANSITO, o FINALIZADO
      const { data: evData, error: evErr } = await supabase
        .from('eventos')
        .select(`
          id,
          cliente:clientes(nombre_razon_social),
          detalles:evento_detalles_equipos(
            id,
            inventario_id,
            instancia:inventario_instancias(
              serial_tag,
              catalogo:catalogo_equipos(nombre_equipo)
            )
          )
        `)
        .in('estado', ['CONFIRMADO_RESERVADO', 'EN_TRANSITO', 'FINALIZADO'])
        .is('deleted_at', null);

      if (evErr) throw evErr;
      setEventosConEquipos(evData as unknown as EventoActivoConEquipos[]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando depósitos y auditorías de daños.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDano = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const eventoId = Number(selectedEventoId);
      const inventarioId = Number(selectedInventarioId);
      const costo = Number(costoReparacion);

      if (!eventoId || !inventarioId || !descripcionDano || !costo) {
        throw new Error('Todos los campos son obligatorios para reportar un daño.');
      }

      // Insertar reporte de daño de forma segura
      // Esto disparará en cascada en la DB:
      // - Cambio del equipo a EN_MANTENIMIENTO.
      // - Descuento del costo en la garantía del evento.
      const query = supabase
        .from('registro_danos_auditoria')
        .insert({
          evento_id: eventoId,
          inventario_id: inventarioId,
          descripcion_dano: descripcionDano,
          costo_reparacion: costo,
          descontado_de_deposito: descontarGarantia
        })
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Daño registrado. El equipo ha sido movido a Soporte y la garantía del evento fue penalizada automáticamente.');
      setShowDamageForm(false);
      
      // Limpiar formulario
      setSelectedEventoId('');
      setSelectedInventarioId('');
      setDescripcionDano('');
      setCostoReparacion('');
      setDescontarGarantia(true);

      // Recargar datos actualizados
      await fetchGarantiasData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el daño de equipo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLiberarGarantia = async (depositoId: number) => {
    if (!confirm('¿Estás seguro de liberar y devolver este depósito de garantía al cliente?')) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const query = supabase
        .from('depositos_garantia')
        .update({ estado: 'DEVUELTO' })
        .eq('id', depositoId)
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Garantía marcada como DEVUELTA con éxito.');
      await fetchGarantiasData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al devolver la garantía.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getBadgeEstadoGarantia = (estado: string) => {
    switch (estado) {
      case 'RECIBIDO': return <span className="badge badge-info">Recibido</span>;
      case 'RETENIDO_PARCIAL': return <span className="badge badge-warning">Retenido Parcial</span>;
      case 'RETENIDO_TOTAL': return <span className="badge badge-danger">Retenido Total</span>;
      case 'DEVUELTO': return <span className="badge badge-success">Devuelto</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  // Obtener equipos del evento seleccionado para el dropdown
  const equiposDelEventoSeleccionado = eventosConEquipos.find(
    e => e.id === Number(selectedEventoId)
  )?.detalles || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Garantías & Daños</h1>
          <p style={styles.subtitle}>Gestión de depósitos retenidos y auditorías de incidentes en eventos</p>
        </div>
        <button 
          onClick={() => {
            setShowDamageForm(!showDamageForm);
          }} 
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>{showDamageForm ? 'Ver Depósitos' : 'Reportar Incidente / Daño'}</span>
        </button>
      </div>

      {errorMsg && (
        <div style={styles.errorAlert} className="glass-panel">
          <AlertTriangle size={20} color="var(--color-danger)" />
          <p style={styles.errorText}>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div style={styles.successAlert} className="glass-panel">
          <CheckCircle size={20} color="var(--color-success)" />
          <p style={styles.successText}>{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Sincronizando auditorías y depósitos...</p>
        </div>
      ) : showDamageForm ? (
        /* Formulario de Reporte de Daños */
        <div className="glass-panel" style={styles.formPanel}>
          <h2 style={styles.panelTitle}>Registrar Daño de Equipo en Evento</h2>
          <form onSubmit={handleRegisterDano} style={styles.createForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="eventoDano">Seleccionar Evento</label>
              <select 
                id="eventoDano"
                className="form-select"
                value={selectedEventoId}
                onChange={(e) => {
                  setSelectedEventoId(e.target.value);
                  setSelectedInventarioId('');
                }}
                required
              >
                <option value="">Selecciona el evento donde ocurrió...</option>
                {eventosConEquipos.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    Evento #{ev.id} - {ev.cliente?.nombre_razon_social}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="equipoDano">Seleccionar Unidad Afectada</label>
              <select 
                id="equipoDano"
                className="form-select"
                value={selectedInventarioId}
                onChange={(e) => setSelectedInventarioId(e.target.value)}
                required
                disabled={!selectedEventoId}
              >
                <option value="">
                  {!selectedEventoId 
                    ? 'Primero selecciona un evento' 
                    : equiposDelEventoSeleccionado.length === 0 
                      ? 'No hay equipos asignados a este evento' 
                      : 'Selecciona la unidad dañada...'
                  }
                </option>
                {equiposDelEventoSeleccionado.map(det => (
                  <option key={det.id} value={det.inventario_id}>
                    {det.instancia?.catalogo?.nombre_equipo} ({det.instancia?.serial_tag})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="desc">Descripción Técnica del Daño</label>
              <textarea 
                id="desc"
                className="form-textarea"
                rows={3}
                placeholder="Describa el incidente, ej. Lente de difracción quebrado por golpe, cable cortado."
                value={descripcionDano}
                onChange={(e) => setDescripcionDano(e.target.value)}
                required
              />
            </div>

            <div style={styles.formRow} className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label" htmlFor="costo">Costo Estimado de Reparación</label>
                <div style={styles.costInputWrapper}>
                  <DollarSign size={16} style={styles.costIcon} />
                  <input 
                    id="costo"
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: '32px' }}
                    placeholder="ej. 120000"
                    value={costoReparacion}
                    onChange={(e) => setCostoReparacion(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div style={styles.checkboxGroup} className="glass-card">
                <input 
                  id="descontar"
                  type="checkbox"
                  checked={descontarGarantia}
                  onChange={(e) => setDescontarGarantia(e.target.checked)}
                  style={styles.checkbox}
                />
                <label htmlFor="descontar" style={styles.checkboxLabel}>
                  Descontar de la Garantía
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              Registrar Incidente & Aplicar Cobro
            </button>
          </form>
        </div>
      ) : (
        /* Listado de Depósitos de Garantía */
        <div className="glass-panel" style={styles.tablePanel}>
          <div style={styles.tableHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--accent-secondary)" />
              <h2 style={styles.panelTitle}>Depósitos de Garantía en Custodia</h2>
            </div>
            <button onClick={fetchGarantiasData} className="btn btn-secondary" style={styles.refreshBtn} title="Sincronizar">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Depósito ID</th>
                  <th>Evento ID</th>
                  <th>Cliente</th>
                  <th>Garantía Recibida</th>
                  <th>Retenido por Daños</th>
                  <th>Estado</th>
                  <th>Detalle / Motivos de Retención</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {depositos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      No se encuentran depósitos de garantías registrados.
                    </td>
                  </tr>
                ) : (
                  depositos.map((dep) => (
                    <tr key={dep.id}>
                      <td><code style={styles.depCode}>DEP-{dep.id}</code></td>
                      <td><code>EV-{dep.evento_id}</code></td>
                      <td style={{ fontWeight: 600 }}>{dep.evento?.cliente?.nombre_razon_social}</td>
                      <td>{formatCurrency(dep.monto_recibido)}</td>
                      <td style={{ 
                        fontWeight: 600, 
                        color: dep.monto_retenido > 0 ? '#ef4444' : 'var(--text-primary)' 
                      }}>
                        {formatCurrency(dep.monto_retenido)}
                      </td>
                      <td>{getBadgeEstadoGarantia(dep.estado)}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {dep.motivo_retencion || <span style={{ color: 'var(--text-muted)' }}>Sin cobros/retenciones</span>}
                      </td>
                      <td>
                        {dep.estado !== 'DEVUELTO' && dep.estado !== 'RETENIDO_TOTAL' && (
                          <button 
                            onClick={() => handleLiberarGarantia(dep.id)}
                            className="btn btn-secondary"
                            style={styles.actionBtnSmall}
                            disabled={actionLoading}
                          >
                            <span>Devolver</span>
                          </button>
                        )}
                        {(dep.estado === 'DEVUELTO' || dep.estado === 'RETENIDO_TOTAL') && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Liquidado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '12px 20px',
  },
  errorText: {
    fontSize: '14px',
    color: '#f87171',
    fontWeight: 500,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    padding: '12px 20px',
  },
  successText: {
    fontSize: '14px',
    color: 'var(--color-success)',
    fontWeight: 500,
  },
  formPanel: {
    padding: '30px',
    maxWidth: '650px',
    margin: '0 auto',
    width: '100%',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 600,
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  costInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  costIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    background: 'rgba(255, 255, 255, 0.01)',
    marginTop: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-muted)',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: 'var(--accent-secondary)',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  tablePanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: '8px',
  },
  depCode: {
    background: 'rgba(99, 102, 241, 0.06)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    color: 'var(--accent-primary)',
    fontWeight: 600,
  },
  actionBtnSmall: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    width: '100%',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(99, 102, 241, 0.1)',
    borderTopColor: 'var(--accent-secondary)',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
};
