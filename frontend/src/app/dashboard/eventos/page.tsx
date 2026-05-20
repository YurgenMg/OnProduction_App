'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase-client';
import { runTransactionSafe } from '../../../shared/transaction-helper';
import { 
  Calendar, 
  MapPin, 
  User, 
  Plus, 
  ChevronRight, 
  Trash2, 
  Truck, 
  Wrench, 
  Info,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Package
} from 'lucide-react';

interface Cliente {
  id: number;
  nombre_razon_social: string;
}

interface EquipoDisponible {
  id: number;
  serial_tag: string;
  catalogo: {
    nombre_equipo: string;
    tarifa_dia_base: number;
  };
}

interface DetalleEquipo {
  id: number;
  inventario_id: number;
  tarifa_dia_congelada: number;
  dias_cobrados: number;
  subtotal: number;
  instancia: {
    serial_tag: string;
    catalogo: {
      nombre_equipo: string;
    };
  };
}

interface Adicional {
  id: number;
  tipo_adicional: string;
  descripcion: string;
  costo_facturado: number;
}

interface Evento {
  id: number;
  cliente_id: number;
  estado: string;
  fecha_inicio_evento: string;
  fecha_fin_evento: string;
  direccion_evento: string;
  total_equipos: number;
  total_adicionales: number;
  gran_total: number;
  cliente: {
    nombre_razon_social: string;
  };
  detalles?: DetalleEquipo[];
  adicionales?: Adicional[];
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipos, setEquipos] = useState<EquipoDisponible[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  
  // Estados para formularios
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Nueva Cotización Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClienteId, setNewClienteId] = useState('');
  const [newFechaInicio, setNewFechaInicio] = useState('');
  const [newFechaFin, setNewFechaFin] = useState('');
  const [newDireccion, setNewDireccion] = useState('');

  // Asignar Equipo Form
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [tarifaCongelada, setTarifaCongelada] = useState('');
  const [diasCobrados, setDiasCobrados] = useState('1');

  // Agregar Adicional Form
  const [tipoAdicional, setTipoAdicional] = useState('TRANSPORTE');
  const [descAdicional, setDescAdicional] = useState('');
  const [costoAdicional, setCostoAdicional] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener eventos
      const { data: evData, error: evErr } = await supabase
        .from('eventos')
        .select('id, cliente_id, estado, fecha_inicio_evento, fecha_fin_evento, direccion_evento, total_equipos, total_adicionales, gran_total, cliente:clientes(nombre_razon_social)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (evErr) throw evErr;
      setEventos(evData as unknown as Evento[]);

      // 2. Obtener clientes para dropdown
      const { data: cliData, error: cliErr } = await supabase
        .from('clientes')
        .select('id, nombre_razon_social')
        .is('deleted_at', null)
        .order('nombre_razon_social', { ascending: true });

      if (cliErr) throw cliErr;
      setClientes(cliData);

      // 3. Obtener equipos físicos disponibles para dropdown
      const { data: eqData, error: eqErr } = await supabase
        .from('inventario_instancias')
        .select(`
          id, 
          serial_tag,
          catalogo:catalogo_equipos(
            nombre_equipo,
            tarifa_dia_base
          )
        `)
        .eq('estado_operativo', 'DISPONIBLE')
        .is('deleted_at', null);

      if (eqErr) throw eqErr;
      setEquipos(eqData as unknown as EquipoDisponible[]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando datos del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventoDetalles = async (eventoId: number) => {
    try {
      setErrorMsg('');
      
      // Obtener detalles de equipos del evento
      const { data: detData, error: detErr } = await supabase
        .from('evento_detalles_equipos')
        .select(`
          id,
          inventario_id,
          tarifa_dia_congelada,
          dias_cobrados,
          subtotal,
          instancia:inventario_instancias(
            serial_tag,
            catalogo:catalogo_equipos(nombre_equipo)
          )
        `)
        .eq('evento_id', eventoId)
        .is('deleted_at', null);

      if (detErr) throw detErr;

      // Obtener adicionales del evento
      const { data: adData, error: adErr } = await supabase
        .from('evento_adicionales')
        .select('id, tipo_adicional, descripcion, costo_facturado')
        .eq('evento_id', eventoId)
        .is('deleted_at', null);

      if (adErr) throw adErr;

      // Obtener totales actualizados del evento
      const { data: evActualizado, error: evActErr } = await supabase
        .from('eventos')
        .select('id, cliente_id, estado, fecha_inicio_evento, fecha_fin_evento, direccion_evento, total_equipos, total_adicionales, gran_total, cliente:clientes(nombre_razon_social)')
        .eq('id', eventoId)
        .single();

      if (evActErr) throw evActErr;

      const evCompleto: Evento = {
        ...(evActualizado as unknown as Evento),
        detalles: detData as unknown as DetalleEquipo[],
        adicionales: adData as unknown as Adicional[]
      };

      setSelectedEvento(evCompleto);
      
      // Actualizar en la lista de eventos principal
      setEventos(prev => prev.map(e => e.id === eventoId ? evCompleto : e));

    } catch (err: any) {
      setErrorMsg('No se pudieron sincronizar los detalles del evento.');
    }
  };

  const handleCreateCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Validar variables
      if (!newClienteId || !newFechaInicio || !newFechaFin || !newDireccion) {
        throw new Error('Todos los campos son requeridos para la cotización.');
      }

      // 2. Insertar evento (inicia por defecto en COTIZACION)
      const { data, error } = await supabase
        .from('eventos')
        .insert({
          cliente_id: Number(newClienteId),
          usuario_id: 1, // Usuario logueado (simulado o el actual)
          estado: 'COTIZACION',
          fecha_inicio_evento: newFechaInicio,
          fecha_fin_evento: newFechaFin,
          direccion_evento: newDireccion,
          total_equipos: 0,
          total_adicionales: 0,
          gran_total: 0
        })
        .select()
        .single();

      if (error) throw error;

      setSuccessMsg('Cotización creada con éxito.');
      setShowCreateForm(false);
      
      // Limpiar formulario
      setNewClienteId('');
      setNewFechaInicio('');
      setNewFechaFin('');
      setNewDireccion('');

      // Recargar lista y seleccionar la nueva
      await fetchInitialData();
      if (data) {
        await fetchEventoDetalles(data.id);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la cotización.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvento) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const inventarioId = Number(selectedEquipoId);
      const tarifa = Number(tarifaCongelada);
      const dias = Number(diasCobrados);

      if (!inventarioId || !tarifa || !dias) {
        throw new Error('Completa todos los campos para agregar el equipo.');
      }

      // Validar sobre-reserva e insertar de forma transaccionalmente segura
      const query = supabase
        .from('evento_detalles_equipos')
        .insert({
          evento_id: selectedEvento.id,
          inventario_id: inventarioId,
          tarifa_dia_congelada: tarifa,
          dias_cobrados: dias,
          subtotal: tarifa * dias
        })
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Equipo agregado al detalle con éxito.');
      setSelectedEquipoId('');
      setTarifaCongelada('');
      setDiasCobrados('1');

      // Actualizar detalles y refrescar dropdown de equipos disponibles
      await fetchEventoDetalles(selectedEvento.id);
      await fetchInitialData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar el equipo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEquipo = async (detalleId: number) => {
    if (!selectedEvento) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const query = supabase
        .from('evento_detalles_equipos')
        .delete()
        .eq('id', detalleId)
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Equipo removido del evento.');
      await fetchEventoDetalles(selectedEvento.id);
      await fetchInitialData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al remover el equipo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdicional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvento) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const costo = Number(costoAdicional);
      if (!descAdicional || !costo) {
        throw new Error('Completa descripción y costo del servicio adicional.');
      }

      const query = supabase
        .from('evento_adicionales')
        .insert({
          evento_id: selectedEvento.id,
          tipo_adicional: tipoAdicional,
          descripcion: descAdicional,
          costo_facturado: costo
        })
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Servicio adicional agregado con éxito.');
      setDescAdicional('');
      setCostoAdicional('');

      await fetchEventoDetalles(selectedEvento.id);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar el servicio adicional.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdicional = async (adicionalId: number) => {
    if (!selectedEvento) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const query = supabase
        .from('evento_adicionales')
        .delete()
        .eq('id', adicionalId)
        .select();

      await runTransactionSafe(query);

      setSuccessMsg('Servicio adicional removido.');
      await fetchEventoDetalles(selectedEvento.id);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al remover el servicio adicional.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!selectedEvento) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Si pasa a Confirmado, el trigger validará overbooking de los equipos del detalle
      const query = supabase
        .from('eventos')
        .update({ estado: nuevoEstado })
        .eq('id', selectedEvento.id)
        .select();

      await runTransactionSafe(query);

      setSuccessMsg(`Estado cambiado con éxito a [${nuevoEstado}].`);
      await fetchEventoDetalles(selectedEvento.id);
      await fetchInitialData();

    } catch (err: any) {
      // Capturamos el bloqueo de overbooking o de seguridad
      setErrorMsg(err.message || 'Error al cambiar el estado del evento.');
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Eventos</h1>
          <p style={styles.subtitle}>Crea cotizaciones y controla la disponibilidad en vivo</p>
        </div>
        <button 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setSelectedEvento(null);
          }} 
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>{showCreateForm ? 'Ver Listado' : 'Nueva Cotización'}</span>
        </button>
      </div>

      {errorMsg && (
        <div style={styles.errorAlert} className="glass-panel">
          <AlertCircle size={20} color="var(--color-danger)" />
          <div style={styles.alertContent}>
            <span style={styles.errorTitle}>Error de Operación</span>
            <p style={styles.errorText}>{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={styles.successAlert} className="glass-panel">
          <Info size={20} color="var(--color-success)" />
          <p style={styles.successText}>{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Sincronizando cronograma logístico...</p>
        </div>
      ) : showCreateForm ? (
        /* Formulario de Nueva Cotización */
        <div className="glass-panel" style={styles.formPanel}>
          <h2 style={styles.panelTitle}>Nueva Cotización</h2>
          <form onSubmit={handleCreateCotizacion} style={styles.createForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="cliente">Productora / Cliente</label>
              <select 
                id="cliente"
                className="form-select"
                value={newClienteId}
                onChange={(e) => setNewClienteId(e.target.value)}
                required
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map(cli => (
                  <option key={cli.id} value={cli.id}>{cli.nombre_razon_social}</option>
                ))}
              </select>
            </div>

            <div style={styles.formRow} className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="fechaInicio">Fecha Inicio</label>
                <input 
                  id="fechaInicio"
                  type="datetime-local"
                  className="form-input"
                  value={newFechaInicio}
                  onChange={(e) => setNewFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="fechaFin">Fecha Fin</label>
                <input 
                  id="fechaFin"
                  type="datetime-local"
                  className="form-input"
                  value={newFechaFin}
                  onChange={(e) => setNewFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="direccion">Dirección del Evento</label>
              <input 
                id="direccion"
                type="text"
                className="form-input"
                placeholder="ej. Centro de Eventos Norte, Bogotá"
                value={newDireccion}
                onChange={(e) => setNewDireccion(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ marginTop: '10px' }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Creando...' : 'Crear Cotización'}
            </button>
          </form>
        </div>
      ) : (
        /* Panel Dividido: Lista y Detalles */
        <div style={styles.gridSplit} className="grid-split">
          {/* Listado de Eventos */}
          <div className="glass-panel" style={styles.listPanel}>
            <h2 style={styles.panelTitle}>Cronograma</h2>
            <div style={styles.eventList}>
              {eventos.length === 0 ? (
                <p style={styles.emptyText}>No hay eventos creados.</p>
              ) : (
                eventos.map((ev) => {
                  const isSelected = selectedEvento?.id === ev.id;
                  return (
                    <div 
                      key={ev.id}
                      onClick={() => fetchEventoDetalles(ev.id)}
                      style={{
                        ...styles.eventCard,
                        ...(isSelected ? styles.eventCardActive : {})
                      }}
                      className="glass-card"
                    >
                      <div style={styles.eventCardHeader}>
                        <span style={styles.eventClient}>
                          {ev.cliente?.nombre_razon_social}
                        </span>
                        {getBadgeEstado(ev.estado)}
                      </div>
                      
                      <div style={styles.eventCardMeta}>
                        <div style={styles.metaItem}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>
                            {new Date(ev.fecha_inicio_evento).toLocaleDateString()} - {new Date(ev.fecha_fin_evento).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={styles.metaItem}>
                          <MapPin size={13} color="var(--text-muted)" />
                          <span style={styles.metaText}>{ev.direccion_evento}</span>
                        </div>
                      </div>

                      <div style={styles.eventCardFooter}>
                        <span style={styles.eventBudgetTitle}>Presupuesto</span>
                        <span style={styles.eventBudget}>{formatCurrency(ev.gran_total)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detalles del Evento Seleccionado */}
          <div className="glass-panel" style={styles.detailsPanel}>
            {selectedEvento ? (
              <div style={styles.detailsContainer}>
                {/* Cabecera del Detalle */}
                <div style={styles.detailsHeader}>
                  <div>
                    <span style={styles.detailsClientLabel}>Evento #{selectedEvento.id}</span>
                    <h2 style={styles.detailsClient}>{selectedEvento.cliente?.nombre_razon_social}</h2>
                  </div>
                  {getBadgeEstado(selectedEvento.estado)}
                </div>

                {/* Acciones de Flujo de Trabajo */}
                <div style={styles.workflowPanel} className="glass-card">
                  <span style={styles.workflowLabel}>Control del Ciclo Logístico:</span>
                  <div style={styles.workflowButtons}>
                    {selectedEvento.estado === 'COTIZACION' && (
                      <button 
                        onClick={() => handleCambiarEstado('CONFIRMADO_RESERVADO')}
                        className="btn btn-primary"
                        disabled={actionLoading}
                        style={styles.workflowBtn}
                      >
                        Confirmar y Reservar Stock
                      </button>
                    )}
                    {selectedEvento.estado === 'CONFIRMADO_RESERVADO' && (
                      <button 
                        onClick={() => handleCambiarEstado('EN_TRANSITO')}
                        className="btn btn-secondary"
                        disabled={actionLoading}
                        style={{ ...styles.workflowBtn, color: 'var(--color-warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                      >
                        Despachar (En Tránsito)
                      </button>
                    )}
                    {selectedEvento.estado === 'EN_TRANSITO' && (
                      <button 
                        onClick={() => handleCambiarEstado('FINALIZADO')}
                        className="btn btn-secondary"
                        disabled={actionLoading}
                        style={{ ...styles.workflowBtn, color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      >
                        Retorno de Equipos (Finalizar)
                      </button>
                    )}
                    {selectedEvento.estado === 'FINALIZADO' && (
                      <button 
                        onClick={() => handleCambiarEstado('PAGADO_CERRADO')}
                        className="btn btn-secondary"
                        disabled={actionLoading}
                        style={{ ...styles.workflowBtn, color: 'var(--accent-primary)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                      >
                        Cerrar Evento (Facturar)
                      </button>
                    )}
                    {selectedEvento.estado === 'PAGADO_CERRADO' && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        🔒 El evento ha sido facturado y archivado. No se permiten más cambios.
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadatos Generales */}
                <div style={styles.detailsMetaGrid}>
                  <div style={styles.detailMetaCard} className="glass-card">
                    <Calendar size={18} color="var(--accent-secondary)" />
                    <div style={styles.metaCardInfo}>
                      <span style={styles.metaCardLabel}>Período de Alquiler</span>
                      <span style={styles.metaCardVal}>
                        {new Date(selectedEvento.fecha_inicio_evento).toLocaleString()} a {new Date(selectedEvento.fecha_fin_evento).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={styles.detailMetaCard} className="glass-card">
                    <MapPin size={18} color="var(--accent-secondary)" />
                    <div style={styles.metaCardInfo}>
                      <span style={styles.metaCardLabel}>Lugar de Entrega</span>
                      <span style={styles.metaCardVal}>{selectedEvento.direccion_evento}</span>
                    </div>
                  </div>
                </div>

                {/* Equipos Asignados */}
                <div style={styles.sectionDivider}>
                  <div style={styles.sectionHeader}>
                    <Package size={18} color="var(--accent-secondary)" />
                    <h3 style={styles.sectionTitle}>Equipos Asignados</h3>
                  </div>

                  {selectedEvento.estado === 'COTIZACION' && (
                    <form onSubmit={handleAddEquipo} style={styles.addEquipmentForm}>
                      <select 
                        className="form-select"
                        style={{ flex: 2 }}
                        value={selectedEquipoId}
                        onChange={(e) => {
                          setSelectedEquipoId(e.target.value);
                          const eq = equipos.find(eq => eq.id === Number(e.target.value));
                          setTarifaCongelada(eq ? eq.catalogo.tarifa_dia_base.toString() : '');
                        }}
                        required
                      >
                        <option value="">Selecciona equipo de bodega...</option>
                        {equipos.map(eq => (
                          <option key={eq.id} value={eq.id}>
                            {eq.catalogo.nombre_equipo} ({eq.serial_tag}) - Predet: {formatCurrency(eq.catalogo.tarifa_dia_base)}/día
                          </option>
                        ))}
                      </select>
                      <input 
                        type="number"
                        placeholder="Tarifa/Día"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={tarifaCongelada}
                        onChange={(e) => setTarifaCongelada(e.target.value)}
                        required
                      />
                      <input 
                        type="number"
                        placeholder="Días"
                        className="form-input"
                        style={{ width: '80px' }}
                        value={diasCobrados}
                        onChange={(e) => setDiasCobrados(e.target.value)}
                        min="1"
                        required
                      />
                      <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                        Agregar
                      </button>
                    </form>
                  )}

                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Equipo</th>
                          <th>Serial Tag</th>
                          <th>Tarifa/Día</th>
                          <th>Días</th>
                          <th>Subtotal</th>
                          {selectedEvento.estado === 'COTIZACION' && <th>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedEvento.detalles || selectedEvento.detalles.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                              No hay equipos asignados a esta cotización.
                            </td>
                          </tr>
                        ) : (
                          selectedEvento.detalles.map((det) => (
                            <tr key={det.id}>
                              <td style={{ fontWeight: 500 }}>{det.instancia?.catalogo?.nombre_equipo}</td>
                              <td><code style={styles.serialCode}>{det.instancia?.serial_tag}</code></td>
                              <td>{formatCurrency(det.tarifa_dia_congelada)}</td>
                              <td>{det.dias_cobrados}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(det.subtotal)}</td>
                              {selectedEvento.estado === 'COTIZACION' && (
                                <td>
                                  <button 
                                    onClick={() => handleRemoveEquipo(det.id)}
                                    style={styles.deleteBtn}
                                    title="Remover equipo"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Servicios Adicionales */}
                <div style={styles.sectionDivider}>
                  <div style={styles.sectionHeader}>
                    <Truck size={18} color="var(--accent-secondary)" />
                    <h3 style={styles.sectionTitle}>Servicios Adicionales (Transporte / Personal)</h3>
                  </div>

                  {selectedEvento.estado === 'COTIZACION' && (
                    <form onSubmit={handleAddAdicional} style={styles.addEquipmentForm}>
                      <select 
                        className="form-select"
                        style={{ width: '150px' }}
                        value={tipoAdicional}
                        onChange={(e) => setTipoAdicional(e.target.value)}
                      >
                        <option value="TRANSPORTE">Transporte</option>
                        <option value="PERSONAL">Personal</option>
                        <option value="OTRO">Otro</option>
                      </select>
                      <input 
                        type="text"
                        placeholder="Descripción del servicio (ej. Flete de retorno)"
                        className="form-input"
                        style={{ flex: 2 }}
                        value={descAdicional}
                        onChange={(e) => setDescAdicional(e.target.value)}
                        required
                      />
                      <input 
                        type="number"
                        placeholder="Costo"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={costoAdicional}
                        onChange={(e) => setCostoAdicional(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                        Agregar
                      </button>
                    </form>
                  )}

                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Descripción</th>
                          <th>Costo Facturado</th>
                          {selectedEvento.estado === 'COTIZACION' && <th>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedEvento.adicionales || selectedEvento.adicionales.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                              No hay servicios adicionales asignados.
                            </td>
                          </tr>
                        ) : (
                          selectedEvento.adicionales.map((ad) => (
                            <tr key={ad.id}>
                              <td><span className="badge badge-info">{ad.tipo_adicional}</span></td>
                              <td>{ad.descripcion}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(ad.costo_facturado)}</td>
                              {selectedEvento.estado === 'COTIZACION' && (
                                <td>
                                  <button 
                                    onClick={() => handleRemoveAdicional(ad.id)}
                                    style={styles.deleteBtn}
                                    title="Remover servicio"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Resumen Financiero Consolidador */}
                <div style={styles.summaryPanel} className="glass-card">
                  <h4 style={styles.summaryTitle}>Resumen Financiero</h4>
                  <div style={styles.summaryRow}>
                    <span>Subtotal Equipos</span>
                    <span>{formatCurrency(selectedEvento.total_equipos)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Subtotal Adicionales</span>
                    <span>{formatCurrency(selectedEvento.total_adicionales)}</span>
                  </div>
                  <div style={{ ...styles.summaryRow, ...styles.summaryTotalRow }}>
                    <span>Presupuesto Final</span>
                    <span>{formatCurrency(selectedEvento.gran_total)}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div style={styles.emptyDetails}>
                <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                <p style={styles.emptyDetailsText}>Selecciona un evento de la lista para ver su control logístico y detalles financieros.</p>
              </div>
            )}
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
    alignItems: 'start',
    gap: '14px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  alertContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  errorTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#ef4444',
  },
  errorText: {
    fontSize: '14px',
    color: '#f87171',
    lineHeight: '1.4',
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
  gridSplit: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '24px',
    alignItems: 'start',
    width: '100%',
  },
  listPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  eventCard: {
    padding: '18px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'var(--transition-smooth)',
  },
  eventCardActive: {
    borderColor: 'var(--accent-secondary)',
    boxShadow: 'var(--shadow-glow)',
    background: 'rgba(6, 182, 212, 0.04)',
  },
  eventCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: '10px',
  },
  eventClient: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
  },
  eventCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  metaText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '280px',
  },
  eventCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  eventBudgetTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  eventBudget: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--accent-secondary)',
  },
  detailsPanel: {
    padding: '30px',
    minHeight: '400px',
  },
  emptyDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '350px',
    textAlign: 'center',
  },
  emptyDetailsText: {
    color: 'var(--text-secondary)',
    fontSize: '15px',
    maxWidth: '400px',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-muted)',
    paddingBottom: '20px',
  },
  detailsClientLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  detailsClient: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  detailsMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  detailMetaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
  },
  metaCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaCardLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  metaCardVal: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  workflowPanel: {
    padding: '20px',
    background: 'rgba(99, 102, 241, 0.02)',
    borderColor: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  workflowLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  workflowButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  workflowBtn: {
    fontSize: '14px',
    padding: '10px 20px',
  },
  sectionDivider: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  addEquipmentForm: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed var(--border-muted)',
    borderRadius: '10px',
    padding: '14px',
    flexWrap: 'wrap',
  },
  serialCode: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
    color: 'var(--accent-secondary)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    transition: 'var(--transition-smooth)',
  },
  summaryPanel: {
    padding: '24px',
    background: 'rgba(6, 182, 212, 0.02)',
    borderColor: 'rgba(6, 182, 212, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: '380px',
    marginTop: '20px',
  },
  summaryTitle: {
    fontSize: '15px',
    fontWeight: 600,
    borderBottom: '1px solid var(--border-muted)',
    paddingBottom: '8px',
    marginBottom: '4px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  summaryTotalRow: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--accent-secondary)',
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '8px',
    marginTop: '4px',
  },
  formPanel: {
    padding: '30px',
    maxWidth: '700px',
    margin: '0 auto',
    width: '100%',
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
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: 600,
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
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
