'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase-client';
import { runTransactionSafe } from '../../../shared/transaction-helper';
import { 
  Package, 
  Tag, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';

interface CatalogoItem {
  id: number;
  sku: string;
  nombre_equipo: string;
  categoria: string;
  tarifa_dia_base: number;
  _count_instancias?: number;
}

interface InstanciaItem {
  id: number;
  catalogo_id: number;
  serial_tag: string;
  estado_operativo: string;
  notas_condicion: string | null;
  catalogo: {
    nombre_equipo: string;
    sku: string;
    categoria: string;
  };
}

export default function InventarioPage() {
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [inventario, setInventario] = useState<InstanciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');

  // Agregar nuevo item al catálogo form
  const [showAddCatalogoForm, setShowAddCatalogoForm] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCategoria, setNewCategoria] = useState('');
  const [newTarifaBase, setNewTarifaBase] = useState('');

  // Agregar nueva instancia física form
  const [showAddInstanciaForm, setShowAddInstanciaForm] = useState(false);
  const [instanciaCatalogoId, setInstanciaCatalogoId] = useState('');
  const [instanciaSerial, setInstanciaSerial] = useState('');
  const [instanciaNotas, setInstanciaNotas] = useState('');

  useEffect(() => {
    fetchInventarioData();
  }, []);

  const fetchInventarioData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener catálogo
      const { data: catData, error: catErr } = await supabase
        .from('catalogo_equipos')
        .select('*')
        .is('deleted_at', null)
        .order('nombre_equipo', { ascending: true });

      if (catErr) throw catErr;

      // 2. Obtener instancias físicas de inventario
      const { data: invData, error: invErr } = await supabase
        .from('inventario_instancias')
        .select(`
          id,
          catalogo_id,
          serial_tag,
          estado_operativo,
          notas_condicion,
          catalogo:catalogo_equipos(
            nombre_equipo,
            sku,
            categoria
          )
        `)
        .is('deleted_at', null)
        .order('serial_tag', { ascending: true });

      if (invErr) throw invErr;

      const items = invData as unknown as InstanciaItem[];
      setInventario(items);

      // Calcular cantidad de instancias por cada catálogo para mostrar estadísticas
      const catalogoConConteo = catData.map((cat: any) => {
        const count = items.filter(i => i.catalogo_id === cat.id).length;
        return { ...cat, _count_instancias: count };
      });
      setCatalogo(catalogoConConteo);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando el catálogo e inventario.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const tarifa = Number(newTarifaBase);
      if (!newSku || !newNombre || !newCategoria || !tarifa) {
        throw new Error('Todos los campos son obligatorios para crear un equipo en catálogo.');
      }

      const { error } = await supabase
        .from('catalogo_equipos')
        .insert({
          sku: newSku.toUpperCase(),
          nombre_equipo: newNombre,
          categoria: newCategoria,
          tarifa_dia_base: tarifa
        });

      if (error) throw error;

      setSuccessMsg('Modelo agregado al catálogo con éxito.');
      setShowAddCatalogoForm(false);
      setNewSku('');
      setNewNombre('');
      setNewCategoria('');
      setNewTarifaBase('');

      await fetchInventarioData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar al catálogo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInstancia = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const catId = Number(instanciaCatalogoId);
      if (!catId || !instanciaSerial) {
        throw new Error('Debes seleccionar el modelo de catálogo y proveer un serial único.');
      }

      const { error } = await supabase
        .from('inventario_instancias')
        .insert({
          catalogo_id: catId,
          serial_tag: instanciaSerial.toUpperCase(),
          estado_operativo: 'DISPONIBLE',
          notas_condicion: instanciaNotas || null
        });

      if (error) throw error;

      setSuccessMsg('Instancia física agregada a bodega con éxito.');
      setShowAddInstanciaForm(false);
      setInstanciaCatalogoId('');
      setInstanciaSerial('');
      setInstanciaNotas('');

      await fetchInventarioData();

    } catch (err: any) {
      setErrorMsg(err.message === '23505' || err.code === '23505'
        ? 'El código Serial Tag ingresado ya existe en la base de datos.'
        : err.message || 'Error al agregar la instancia al inventario.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeEstadoOperativo = async (instanciaId: number, nuevoEstado: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const query = supabase
        .from('inventario_instancias')
        .update({ estado_operativo: nuevoEstado })
        .eq('id', instanciaId)
        .select();

      await runTransactionSafe(query);

      setSuccessMsg(`Estado operativo de la unidad cambiado a [${nuevoEstado}].`);
      await fetchInventarioData();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar el estado del equipo.');
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

  // Filtrado de instancias físicas
  const filteredInventario = inventario.filter(item => {
    const matchesSearch = item.serial_tag.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.catalogo.nombre_equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.catalogo.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter === 'TODAS' || item.catalogo.categoria === categoriaFilter;
    const matchesEstado = estadoFilter === 'TODOS' || item.estado_operativo === estadoFilter;
    
    return matchesSearch && matchesCategoria && matchesEstado;
  });

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE': return <span className="badge badge-success">Disponible</span>;
      case 'ALQUILADO': return <span className="badge badge-info">Alquilado</span>;
      case 'EN_MANTENIMIENTO': return <span className="badge badge-warning">En Soporte / Mantenimiento</span>;
      case 'DADO_DE_BAJA': return <span className="badge badge-danger">De Baja</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  const categorias = ['Luces', 'Sonido', 'Estructuras', 'Video', 'Otros'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inventario de Equipos</h1>
          <p style={styles.subtitle}>Catálogo de referencias y control de unidades en bodega</p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => {
              setShowAddCatalogoForm(!showAddCatalogoForm);
              setShowAddInstanciaForm(false);
            }} 
            className="btn btn-secondary"
          >
            <Plus size={16} />
            <span>Ref. Catálogo</span>
          </button>
          <button 
            onClick={() => {
              setShowAddInstanciaForm(!showAddInstanciaForm);
              setShowAddCatalogoForm(false);
            }} 
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Unidad Física</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={styles.errorAlert} className="glass-panel">
          <AlertCircle size={20} color="var(--color-danger)" />
          <p style={styles.errorText}>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div style={styles.successAlert} className="glass-panel">
          <CheckCircle2 size={20} color="var(--color-success)" />
          <p style={styles.successText}>{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Sincronizando stock de bodega...</p>
        </div>
      ) : (
        <>
          {/* Formularios Ocultos */}
          {showAddCatalogoForm && (
            <div className="glass-panel" style={styles.formPanel}>
              <h2 style={styles.panelTitle}>Agregar Referencia al Catálogo</h2>
              <form onSubmit={handleCreateCatalogo} style={styles.createForm}>
                <div style={styles.formRow} className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="sku">SKU (Código Único)</label>
                    <input 
                      id="sku"
                      type="text"
                      className="form-input"
                      placeholder="ej. DAS-AERO12"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label" htmlFor="nombre">Nombre del Equipo</label>
                    <input 
                      id="nombre"
                      type="text"
                      className="form-input"
                      placeholder="ej. Line Array DAS Aero 12A"
                      value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formRow} className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="categoria">Categoría</label>
                    <select 
                      id="categoria"
                      className="form-select"
                      value={newCategoria}
                      onChange={(e) => setNewCategoria(e.target.value)}
                      required
                    >
                      <option value="">Selecciona...</option>
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="tarifaBase">Tarifa Base por Día</label>
                    <input 
                      id="tarifaBase"
                      type="number"
                      className="form-input"
                      placeholder="ej. 150000"
                      value={newTarifaBase}
                      onChange={(e) => setNewTarifaBase(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  Guardar Referencia
                </button>
              </form>
            </div>
          )}

          {showAddInstanciaForm && (
            <div className="glass-panel" style={styles.formPanel}>
              <h2 style={styles.panelTitle}>Registrar Unidad Física (Ingreso de Stock)</h2>
              <form onSubmit={handleCreateInstancia} style={styles.createForm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="instanciaCat">Referencia de Catálogo</label>
                  <select 
                    id="instanciaCat"
                    className="form-select"
                    value={instanciaCatalogoId}
                    onChange={(e) => setInstanciaCatalogoId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona la referencia...</option>
                    {catalogo.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre_equipo} ({cat.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="serial">Serial / Tag Identificador</label>
                  <input 
                    id="serial"
                    type="text"
                    className="form-input"
                    placeholder="ej. DAS-AERO-015"
                    value={instanciaSerial}
                    onChange={(e) => setInstanciaSerial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="notas">Notas de Condición / Estado Físico</label>
                  <textarea 
                    id="notas"
                    className="form-textarea"
                    rows={3}
                    placeholder="ej. Unidad en excelentes condiciones. Mantenimiento realizado ayer."
                    value={instanciaNotas}
                    onChange={(e) => setInstanciaNotas(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  Ingresar a Bodega
                </button>
              </form>
            </div>
          )}

          {/* Sección de Catálogo Rápido */}
          <div style={styles.sectionDivider}>
            <div style={styles.sectionHeader}>
              <Package size={18} color="var(--accent-secondary)" />
              <h3 style={styles.sectionTitle}>Catálogo de Referencias</h3>
            </div>
            <div style={styles.catalogoGrid}>
              {catalogo.map((cat) => (
                <div key={cat.id} className="glass-card" style={styles.catCard}>
                  <div style={styles.catCardHeader}>
                    <span className="badge badge-info">{cat.categoria}</span>
                    <span style={styles.catSku}>{cat.sku}</span>
                  </div>
                  <h4 style={styles.catName}>{cat.nombre_equipo}</h4>
                  <div style={styles.catCardFooter}>
                    <span style={styles.catTarif}>{formatCurrency(cat.tarifa_dia_base)} <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>/ día</span></span>
                    <span style={styles.catCount}>Stock: {cat._count_instancias || 0} u.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sección de Inventario Detallado (Unidades) */}
          <div style={styles.sectionDivider}>
            <div style={styles.sectionHeader}>
              <Tag size={18} color="var(--accent-secondary)" />
              <h3 style={styles.sectionTitle}>Control de Unidades Físicas (Seriales)</h3>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div style={styles.filterBar} className="glass-card">
              <div style={styles.searchWrapper}>
                <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Buscar por serial, referencia o SKU..." 
                  className="form-input"
                  style={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="form-select" 
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="TODAS">Categoría: Todas</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                className="form-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="TODOS">Estado: Todos</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="ALQUILADO">Alquilado</option>
                <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                <option value="DADO_DE_BAJA">De Baja</option>
              </select>

              <button onClick={fetchInventarioData} style={styles.refreshBtn} className="btn btn-secondary" title="Sincronizar Bodega">
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Tabla de Stock */}
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Serial Tag</th>
                    <th>Modelo Referencia</th>
                    <th>Categoría</th>
                    <th>Estado Operativo</th>
                    <th>Historial / Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventario.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                        No se encontraron unidades con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredInventario.map((item) => (
                      <tr key={item.id}>
                        <td><code style={styles.serialCode}>{item.serial_tag}</code></td>
                        <td style={{ fontWeight: 600 }}>{item.catalogo.nombre_equipo}</td>
                        <td>{item.catalogo.categoria}</td>
                        <td>{getBadgeEstado(item.estado_operativo)}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {item.notas_condicion || <span style={{ color: 'var(--text-muted)' }}>Sin observaciones</span>}
                        </td>
                        <td>
                          <div style={styles.actionsCell}>
                            {item.estado_operativo === 'DISPONIBLE' && (
                              <button 
                                onClick={() => handleChangeEstadoOperativo(item.id, 'EN_MANTENIMIENTO')}
                                className="btn btn-secondary"
                                style={styles.actionBtnSmall}
                                title="Enviar a mantenimiento preventivo"
                                disabled={actionLoading}
                              >
                                <Wrench size={14} color="var(--color-warning)" />
                                <span>Mantener</span>
                              </button>
                            )}
                            {item.estado_operativo === 'EN_MANTENIMIENTO' && (
                              <button 
                                onClick={() => handleChangeEstadoOperativo(item.id, 'DISPONIBLE')}
                                className="btn btn-secondary"
                                style={styles.actionBtnSmall}
                                title="Retornar a stock disponible"
                                disabled={actionLoading}
                              >
                                <CheckCircle2 size={14} color="var(--color-success)" />
                                <span>Habilitar</span>
                              </button>
                            )}
                            {item.estado_operativo === 'ALQUILADO' && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                En Evento Activo
                              </span>
                            )}
                            {item.estado_operativo === 'DADO_DE_BAJA' && (
                              <span style={{ fontSize: '12px', color: '#ef4444' }}>
                                Fuera de Servicio
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
  headerActions: {
    display: 'flex',
    gap: '12px',
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
  sectionDivider: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  catalogoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    width: '100%',
  },
  catCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '18px',
  },
  catCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catSku: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  catName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  catCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  catTarif: {
    fontWeight: 600,
    color: 'var(--accent-secondary)',
    fontSize: '15px',
  },
  catCount: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  filterBar: {
    display: 'flex',
    gap: '14px',
    padding: '14px 20px',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 2,
    minWidth: '250px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
  },
  searchInput: {
    width: '100%',
    paddingLeft: '44px',
  },
  filterSelect: {
    flex: 1,
    minWidth: '150px',
  },
  refreshBtn: {
    padding: '12px',
  },
  serialCode: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    color: 'var(--accent-secondary)',
    fontWeight: 600,
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  actionBtnSmall: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    gap: '6px',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  formPanel: {
    padding: '24px',
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
    marginTop: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
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
