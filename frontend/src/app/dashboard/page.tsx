'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase-client';
import { 
  Calendar, 
  Package, 
  Wrench, 
  DollarSign, 
  Plus, 
  TrendingUp, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  eventosActivos: number;
  cotizacionesPendientes: number;
  equiposMantenimiento: number;
  garantiasRetenidas: number;
}

interface EventoReciente {
  id: number;
  fecha_inicio_evento: string;
  estado: string;
  gran_total: number;
  cliente: {
    nombre_razon_social: string;
  };
}

interface DanoReciente {
  id: number;
  costo_reparacion: number;
  descripcion_dano: string;
  created_at: string;
  instancia: {
    serial_tag: string;
    catalogo: {
      nombre_equipo: string;
    };
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    eventosActivos: 0,
    cotizacionesPendientes: 0,
    equiposMantenimiento: 0,
    garantiasRetenidas: 0,
  });
  const [eventos, setEventos] = useState<EventoReciente[]>([]);
  const [danos, setDanos] = useState<DanoReciente[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Obtener estadísticas de eventos
        const { data: evData, error: evErr } = await supabase
          .from('eventos')
          .select('estado')
          .is('deleted_at', null);

        let activos = 0;
        let cotizaciones = 0;

        if (!evErr && evData) {
          evData.forEach(ev => {
            if (ev.estado === 'CONFIRMADO_RESERVADO' || ev.estado === 'EN_TRANSITO') {
              activos++;
            } else if (ev.estado === 'COTIZACION') {
              cotizaciones++;
            }
          });
        }

        // 2. Obtener estadísticas de mantenimiento de inventario
        const { count: mantCount, error: mantErr } = await supabase
          .from('inventario_instancias')
          .select('*', { count: 'exact', head: true })
          .eq('estado_operativo', 'EN_MANTENIMIENTO')
          .is('deleted_at', null);

        // 3. Obtener sumatoria de retenciones de garantías
        const { data: depData, error: depErr } = await supabase
          .from('depositos_garantia')
          .select('monto_retenido')
          .is('deleted_at', null);

        let totalRetenido = 0;
        if (!depErr && depData) {
          totalRetenido = depData.reduce((sum, dep) => sum + Number(dep.monto_retenido || 0), 0);
        }

        setStats({
          eventosActivos: activos,
          cotizacionesPendientes: cotizaciones,
          equiposMantenimiento: mantErr ? 0 : (mantCount || 0),
          garantiasRetenidas: totalRetenido
        });

        // 4. Obtener próximos eventos
        const { data: evRecientes, error: evRecErr } = await supabase
          .from('eventos')
          .select('id, fecha_inicio_evento, estado, gran_total, cliente:clientes(nombre_razon_social)')
          .is('deleted_at', null)
          .order('fecha_inicio_evento', { ascending: true })
          .limit(5);

        if (!evRecErr && evRecientes) {
          setEventos(evRecientes as unknown as EventoReciente[]);
        }

        // 5. Obtener daños recientes
        const { data: danRecientes, error: danRecErr } = await supabase
          .from('registro_danos_auditoria')
          .select(`
            id, 
            costo_reparacion, 
            descripcion_dano, 
            created_at,
            instancia:inventario_instancias(
              serial_tag,
              catalogo:catalogo_equipos(nombre_equipo)
            )
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!danRecErr && danRecientes) {
          setDanos(danRecientes as unknown as DanoReciente[]);
        }

      } catch (err) {
        console.error("Error cargando información de dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatFecha = (fechaStr: string) => {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'COTIZACION': return <span className="badge badge-info">Cotización</span>;
      case 'CONFIRMADO_RESERVADO': return <span className="badge badge-success">Confirmado</span>;
      case 'EN_TRANSITO': return <span className="badge badge-warning">En Tránsito</span>;
      case 'FINALIZADO': return <span className="badge badge-success">Finalizado</span>;
      case 'PAGADO_CERRADO': return <span className="badge badge-success" style={{borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)'}}>Cerrado</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Consolidando dashboard en vivo...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel General</h1>
          <p style={styles.subtitle}>Estado operativo de OnProduction en tiempo real</p>
        </div>
        <Link href="/dashboard/eventos" className="btn btn-primary">
          <Plus size={18} />
          <span>Nueva Cotización</span>
        </Link>
      </div>

      {/* Grid de Estadísticas */}
      <div style={styles.statsGrid}>
        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <Calendar size={22} color="#10b981" />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.eventosActivos}</span>
            <span style={styles.statLabel}>Eventos Activos</span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <Clock size={22} color="#3b82f6" />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.cotizacionesPendientes}</span>
            <span style={styles.statLabel}>Cotizaciones</span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <Wrench size={22} color="#f59e0b" />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.equiposMantenimiento}</span>
            <span style={styles.statLabel}>En Mantenimiento</span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statIconWrapper}>
            <DollarSign size={22} color="#8b5cf6" />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{formatCurrency(stats.garantiasRetenidas)}</span>
            <span style={styles.statLabel}>Garantías Retenidas</span>
          </div>
        </div>
      </div>

      {/* Contenido en dos columnas */}
      <div style={styles.panelsContainer} className="grid-split">
        {/* Próximos Eventos */}
        <div className="glass-panel" style={styles.mainPanel}>
          <div style={styles.panelHeader}>
            <TrendingUp size={20} color="var(--accent-secondary)" />
            <h2 style={styles.panelTitle}>Cronograma de Eventos Próximos</h2>
          </div>
          
          {eventos.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No hay eventos registrados en el cronograma.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Cliente / Productora</th>
                    <th>Inicio de Operación</th>
                    <th>Estado Logístico</th>
                    <th>Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 600 }}>{ev.cliente?.nombre_razon_social || 'Cliente sin Nombre'}</td>
                      <td>{formatFecha(ev.fecha_inicio_evento)}</td>
                      <td>{getBadgeEstado(ev.estado)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCurrency(ev.gran_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Auditoría / Daños Recientes */}
        <div className="glass-panel" style={styles.sidePanel}>
          <div style={styles.panelHeader}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <h2 style={styles.panelTitle}>Reportes de Daños Recientes</h2>
          </div>

          <div style={styles.danoList}>
            {danos.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>Excelente: No hay reportes de daños recientes.</p>
              </div>
            ) : (
              danos.map((dan) => (
                <div key={dan.id} style={styles.danoItem} className="glass-card">
                  <div style={styles.danoHeader}>
                    <span style={styles.danoEquip}>
                      {dan.instancia?.catalogo?.nombre_equipo} ({dan.instancia?.serial_tag})
                    </span>
                    <span style={styles.danoCost}>
                      {formatCurrency(dan.costo_reparacion)}
                    </span>
                  </div>
                  <p style={styles.danoDesc}>{dan.descripcion_dano}</p>
                  <span style={styles.danoDate}>Reportado: {formatFecha(dan.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    width: '100%',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
  },
  statIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  panelsContainer: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    width: '100%',
  },
  mainPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidePanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  danoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  danoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'rgba(239, 68, 68, 0.02)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  danoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: '10px',
  },
  danoEquip: {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  danoCost: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#ef4444',
  },
  danoDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  danoDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    border: '1px dashed var(--border-muted)',
    borderRadius: '12px',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    textAlign: 'center',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
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
