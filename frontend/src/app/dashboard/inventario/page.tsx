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
  RefreshCw,
  ShoppingBag,
  AlertTriangle,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  X,
  FileText,
  Building2
} from 'lucide-react';

interface CatalogoItem {
  id: number;
  sku: string;
  nombre_equipo: string;
  categoria: string;
  categoria_id?: number | null;
  tarifa_dia_base: number;
  _count_instancias?: number;
  _count_disponibles?: number;
  _count_alquilados?: number;
  _count_mantenimiento?: number;
}

interface CategoriaArbol {
  id: number;
  nombre: string;
  nivel: number;
  subcategorias: Array<{ id: number; nombre: string; nivel: number }>;
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

interface CompraItem {
  id: number;
  catalogo_id: number;
  cantidad: number;
  costo_compra_total: number;
  proveedor: string;
  fecha_compra: string;
  created_at: string;
  catalogo?: {
    nombre_equipo: string;
    sku: string;
    categoria: string;
  };
}

interface BajaItem {
  id: number;
  inventario_id: number;
  motivo_baja: string;
  fecha_baja: string;
  created_at: string;
  instancia?: {
    serial_tag: string;
    catalogo?: {
      nombre_equipo: string;
      sku: string;
      categoria: string;
    };
  };
}

export default function InventarioPage() {
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [inventario, setInventario] = useState<InstanciaItem[]>([]);
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [bajas, setBajas] = useState<BajaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Pestaña activa: 'bodega' | 'compras' | 'bajas'
  const [activeTab, setActiveTab] = useState<'bodega' | 'compras' | 'bajas'>('bodega');

  // Filtros y búsquedas (Stock y Bodega)
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');

  // Categorías desde el API
  const [categoriasArbol, setCategoriasArbol] = useState<CategoriaArbol[]>([]);

  // Agregar nuevo item al catálogo form
  const [showAddCatalogoForm, setShowAddCatalogoForm] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCategoriaId, setNewCategoriaId] = useState<number | ''>('');
  const [newTarifaBase, setNewTarifaBase] = useState('');

  // Agregar nueva instancia física form (manual)
  const [showAddInstanciaForm, setShowAddInstanciaForm] = useState(false);
  const [instanciaCatalogoId, setInstanciaCatalogoId] = useState('');
  const [instanciaSerial, setInstanciaSerial] = useState('');
  const [instanciaNotas, setInstanciaNotas] = useState('');

  // Formulario de Compras por lote
  const [compraCatalogoId, setCompraCatalogoId] = useState('');
  const [compraCantidad, setCompraCantidad] = useState('');
  const [compraCosto, setCompraCosto] = useState('');
  const [compraProveedor, setCompraProveedor] = useState('');
  const [compraFecha, setCompraFecha] = useState(new Date().toISOString().substring(0, 10));

  // Modal de Bajas
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [bajaInstanciaId, setBajaInstanciaId] = useState<number | null>(null);
  const [bajaSerialTag, setBajaSerialTag] = useState('');
  const [bajaMotivo, setBajaMotivo] = useState('');

  useEffect(() => {
    fetchAllData();
    // Cargar árbol de categorías desde el API
    fetch('/api/inventario/categorias')
      .then((r) => r.ok ? r.json() : [])
      .then((data: CategoriaArbol[]) => setCategoriasArbol(data))
      .catch(() => {});
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      await Promise.all([
        fetchInventarioData(),
        fetchComprasData(),
        fetchBajasData()
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar los datos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventarioData = async () => {
    // 1. Obtener catálogo
    const { data: catData, error: catErr } = await supabase
      .from('catalogo_equipos')
      .select('*')
      .is('deleted_at', null)
      .order('nombre_equipo', { ascending: true });

    if (catErr) throw catErr;

    // 2. Obtener instancias físicas de inventario (excluyendo soft-deleted, pero incluyendo bajas para histórico)
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

    // Calcular cantidad de instancias y desgloses por cada catálogo para mostrar estadísticas (excluyendo los dados de baja de los stocks activos)
    const catalogoConConteo = catData.map((cat: any) => {
      const instances = items.filter(i => i.catalogo_id === cat.id);
      const total = instances.filter(i => i.estado_operativo !== 'DADO_DE_BAJA').length;
      const disponibles = instances.filter(i => i.estado_operativo === 'DISPONIBLE').length;
      const alquilados = instances.filter(i => i.estado_operativo === 'ALQUILADO').length;
      const mantenimiento = instances.filter(i => i.estado_operativo === 'EN_MANTENIMIENTO').length;
      const bajasCount = instances.filter(i => i.estado_operativo === 'DADO_DE_BAJA').length;
      return { 
        ...cat, 
        _count_instancias: total,
        _count_disponibles: disponibles,
        _count_alquilados: alquilados,
        _count_mantenimiento: mantenimiento,
        _count_bajas: bajasCount
      };
    });
    setCatalogo(catalogoConConteo);
  };

  const fetchComprasData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/inventario/compras', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      setCompras(data);
    }
  };

  const fetchBajasData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/inventario/bajas', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      setBajas(data);
    }
  };

  const handleCreateCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const tarifa = Number(newTarifaBase);
      if (!newSku || !newNombre || !newCategoriaId || !tarifa) {
        throw new Error('Todos los campos son obligatorios para crear un equipo en catálogo.');
      }

      // Obtener nombre de categoría para el campo legacy
      const todasLasCat = categoriasArbol.flatMap((c) => [c, ...c.subcategorias]);
      const catSeleccionada = todasLasCat.find((c) => c.id === Number(newCategoriaId));

      const res = await fetch('/api/inventario/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newSku,
          nombre_equipo: newNombre,
          categoria_id: Number(newCategoriaId),
          tarifa_dia_base: tarifa,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al agregar al catálogo.');

      setSuccessMsg('Modelo agregado al catálogo con éxito.');
      setShowAddCatalogoForm(false);
      setNewSku('');
      setNewNombre('');
      setNewCategoriaId('');
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
    if (actionLoading) return;
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
          serial_tag: instanciaSerial.toUpperCase().trim(),
          estado_operativo: 'DISPONIBLE',
          notes_condicion: instanciaNotas.trim() || null
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
    if (actionLoading) return;
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

  const handleRegisterCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const catId = Number(compraCatalogoId);
      const cantidadVal = Number(compraCantidad);
      const costoVal = Number(compraCosto);

      if (!catId || !cantidadVal || costoVal === undefined || !compraProveedor.trim()) {
        throw new Error('Todos los campos son obligatorios para registrar la compra.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sesión no encontrada. Por favor inicia sesión de nuevo.');
      }

      const res = await fetch('/api/inventario/compras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          catalogo_id: catId,
          cantidad: cantidadVal,
          costo_compra_total: costoVal,
          proveedor: compraProveedor.trim(),
          fecha_compra: compraFecha ? new Date(compraFecha).toISOString() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la compra.');
      }

      setSuccessMsg(`Compra registrada con éxito. Se crearon ${data.unidades_creadas} unidades físicas. Seriales generados: ${data.serial_inicial} a ${data.serial_final}.`);
      setCompraCatalogoId('');
      setCompraCantidad('');
      setCompraCosto('');
      setCompraProveedor('');
      setCompraFecha(new Date().toISOString().substring(0, 10));

      await Promise.all([
        fetchInventarioData(),
        fetchComprasData()
      ]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la compra por lotes.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBajaModal = (id: number, serial: string) => {
    setBajaInstanciaId(id);
    setBajaSerialTag(serial);
    setBajaMotivo('');
    setShowBajaModal(true);
  };

  const handleRegisterBajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading || !bajaInstanciaId || !bajaMotivo.trim()) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sesión no encontrada. Por favor inicia sesión de nuevo.');
      }

      const res = await fetch('/api/inventario/bajas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          inventario_id: bajaInstanciaId,
          motivo_baja: bajaMotivo.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la baja de la unidad.');
      }

      setSuccessMsg(`Unidad física con serial ${bajaSerialTag} ha sido dada de baja exitosamente.`);
      setShowBajaModal(false);
      setBajaInstanciaId(null);
      setBajaSerialTag('');
      setBajaMotivo('');

      await Promise.all([
        fetchInventarioData(),
        fetchBajasData()
      ]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la baja.');
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

  const formatFecha = (fechaStr: string) => {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filtrado de instancias físicas en Bodega
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
      case 'EN_MANTENIMIENTO': return <span className="badge badge-warning">En Soporte</span>;
      case 'DADO_DE_BAJA': return <span className="badge badge-danger">De Baja Definitiva</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  // Todas las subcategorías planas para el filtro
  const todasSubcats = categoriasArbol.flatMap((c) => [
    { id: c.id, nombre: c.nombre },
    ...c.subcategorias.map((s) => ({ id: s.id, nombre: s.nombre })),
  ]);

  // Calcular KPIs del Inventario
  const totalUnidadesActivas = inventario.filter(i => i.estado_operativo !== 'DADO_DE_BAJA').length;
  const totalDisponibles = inventario.filter(i => i.estado_operativo === 'DISPONIBLE').length;
  const totalAlquilados = inventario.filter(i => i.estado_operativo === 'ALQUILADO').length;
  const totalMantenimiento = inventario.filter(i => i.estado_operativo === 'EN_MANTENIMIENTO').length;
  const totalDadosDeBaja = inventario.filter(i => i.estado_operativo === 'DADO_DE_BAJA').length;

  return (
    <div style={styles.container}>
      {/* Encabezado Principal */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Módulo de Inventario</h1>
          <p style={styles.subtitle}>Supervisión del stock físico, adquisición de lotes y control logístico</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchAllData} style={styles.refreshBtn} className="btn btn-secondary" title="Sincronizar Datos">
            <RefreshCw size={16} />
          </button>
          {activeTab === 'bodega' && (
            <>
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
                <span>Unidad Física (Manual)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas */}
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

      {/* Paneles de KPIs Globales */}
      <div style={styles.kpiGrid}>
        <div className="glass-card" style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>
            <Package size={22} color="var(--accent-secondary)" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Stock Activo en Bodega</span>
            <h3 style={styles.kpiValue}>{totalUnidadesActivas} <span style={{fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)'}}>unidades</span></h3>
          </div>
        </div>

        <div className="glass-card" style={{...styles.kpiCard, borderLeft: '3px solid var(--color-success)'}}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.08)'}}>
            <UserCheck size={22} color="var(--color-success)" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Unidades Disponibles</span>
            <h3 style={styles.kpiValue}>{totalDisponibles}</h3>
          </div>
        </div>

        <div className="glass-card" style={{...styles.kpiCard, borderLeft: '3px solid var(--color-info)'}}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.08)'}}>
            <TrendingUp size={22} color="var(--color-info)" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Unidades Alquiladas</span>
            <h3 style={styles.kpiValue}>{totalAlquilados}</h3>
          </div>
        </div>

        <div className="glass-card" style={{...styles.kpiCard, borderLeft: '3px solid var(--color-warning)'}}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.08)'}}>
            <Wrench size={22} color="var(--color-warning)" />
          </div>
          <div>
            <span style={styles.kpiLabel}>En Mantenimiento</span>
            <h3 style={styles.kpiValue}>{totalMantenimiento}</h3>
          </div>
        </div>

        <div className="glass-card" style={{...styles.kpiCard, borderLeft: '3px solid #ef4444'}}>
          <div style={{...styles.kpiIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.08)'}}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Retiradas / Dados de Baja</span>
            <h3 style={styles.kpiValue}>{totalDadosDeBaja}</h3>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div style={styles.tabsContainer} className="glass-panel">
        <button 
          onClick={() => setActiveTab('bodega')} 
          style={{
            ...styles.tabButton,
            ...(activeTab === 'bodega' ? styles.tabButtonActive : {})
          }}
        >
          <Package size={16} />
          <span>Stock & Bodega</span>
        </button>
        <button 
          onClick={() => setActiveTab('compras')} 
          style={{
            ...styles.tabButton,
            ...(activeTab === 'compras' ? styles.tabButtonActive : {})
          }}
        >
          <ShoppingBag size={16} />
          <span>Compras de Lotes</span>
        </button>
        <button 
          onClick={() => setActiveTab('bajas')} 
          style={{
            ...styles.tabButton,
            ...(activeTab === 'bajas' ? styles.tabButtonActive : {})
          }}
        >
          <AlertTriangle size={16} />
          <span>Historial de Bajas</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Sincronizando información de bodega y financiero...</p>
        </div>
      ) : (
        <>
          {/* ==================== PESTAÑA 1: BODEGA Y STOCK ==================== */}
          {activeTab === 'bodega' && (
            <div style={styles.tabContent}>
              {/* Formularios Ocultos */}
              {showAddCatalogoForm && (
                <div className="glass-panel" style={styles.formPanel}>
                  <h2 style={styles.panelTitle}>Agregar Referencia al Catálogo</h2>
                  <form onSubmit={handleCreateCatalogo} style={styles.createForm}>
                    <div style={styles.formRow} className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="sku">SKU (Código de Fábrica)</label>
                        <input 
                          id="sku"
                          type="text"
                          className="form-input"
                          placeholder="ej. BEAM-230"
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
                          placeholder="ej. Cabeza Móvil Beam 230W"
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
                          value={newCategoriaId}
                          onChange={(e) => setNewCategoriaId(Number(e.target.value) || '')}
                          required
                        >
                          <option value="">Selecciona categoría...</option>
                          {categoriasArbol.map((cat) => (
                            <optgroup key={cat.id} label={cat.nombre}>
                              {cat.subcategorias.length > 0
                                ? cat.subcategorias.map((sub) => (
                                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                  ))
                                : <option value={cat.id}>{cat.nombre}</option>
                              }
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="tarifaBase">Tarifa Base por Día (COP)</label>
                        <input 
                          id="tarifaBase"
                          type="number"
                          className="form-input"
                          placeholder="ej. 120000"
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
                  <h2 style={styles.panelTitle}>Registrar Unidad Física (Ingreso Individual)</h2>
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
                      <label className="form-label" htmlFor="serial">Serial / Código Identificador (Único)</label>
                      <input 
                        id="serial"
                        type="text"
                        className="form-input"
                        placeholder="ej. BEAM-230-001"
                        value={instanciaSerial}
                        onChange={(e) => setInstanciaSerial(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="notas">Notas de Estado / Observaciones</label>
                      <textarea 
                        id="notas"
                        className="form-textarea"
                        rows={3}
                        placeholder="ej. Unidad en caja original, probado y operando correctamente."
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

              {/* Catálogo de Referencias */}
              <div style={styles.sectionDivider}>
                <div style={styles.sectionHeader}>
                  <Package size={18} color="var(--accent-secondary)" />
                  <h3 style={styles.sectionTitle}>Modelos en Catálogo</h3>
                </div>
                <div style={styles.catalogoGrid}>
                  {catalogo.map((cat) => (
                    <div key={cat.id} className="glass-card" style={styles.catCard}>
                      <div style={styles.catCardHeader}>
                        <span className="badge badge-info">{cat.categoria}</span>
                        <span style={styles.catSku}>{cat.sku}</span>
                      </div>
                      <h4 style={styles.catName}>{cat.nombre_equipo}</h4>
                      
                      {/* Desglose visual */}
                      <div style={styles.stockStatusContainer}>
                        {cat._count_instancias && cat._count_instancias > 0 ? (
                          <>
                            <div style={styles.progressBarBackground}>
                              <div style={{
                                ...styles.progressBarFill,
                                backgroundColor: 'var(--color-success)',
                                width: `${((cat._count_disponibles || 0) / cat._count_instancias) * 100}%`
                              }} title={`${cat._count_disponibles || 0} Disponibles`} />
                              <div style={{
                                ...styles.progressBarFill,
                                backgroundColor: 'var(--color-info)',
                                width: `${((cat._count_alquilados || 0) / cat._count_instancias) * 100}%`
                              }} title={`${cat._count_alquilados || 0} Alquilados`} />
                              <div style={{
                                ...styles.progressBarFill,
                                backgroundColor: 'var(--color-warning)',
                                width: `${((cat._count_mantenimiento || 0) / cat._count_instancias) * 100}%`
                              }} title={`${cat._count_mantenimiento || 0} En Soporte`} />
                            </div>
                            <div style={styles.stockDetails}>
                              <span style={{color: 'var(--color-success)', fontWeight: 700}}>
                                {cat._count_disponibles || 0} disp.
                              </span>
                              {cat._count_alquilados && cat._count_alquilados > 0 ? (
                                <span style={{color: 'var(--color-info)', fontWeight: 600}}>
                                  {cat._count_alquilados} alq.
                                </span>
                              ) : null}
                              {cat._count_mantenimiento && cat._count_mantenimiento > 0 ? (
                                <span style={{color: 'var(--color-warning)', fontWeight: 600}}>
                                  {cat._count_mantenimiento} sop.
                                </span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <div style={styles.noStockPlaceholder}>
                            ⚠️ Sin unidades registradas
                          </div>
                        )}
                      </div>

                      <div style={styles.catCardFooter}>
                        <span style={styles.catTarif}>{formatCurrency(cat.tarifa_dia_base)} <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>/ día</span></span>
                        <span style={styles.catCount}>Activos: {cat._count_instancias || 0} u.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Control de Unidades Físicas */}
              <div style={styles.sectionDivider}>
                <div style={styles.sectionHeader}>
                  <Tag size={18} color="var(--accent-secondary)" />
                  <h3 style={styles.sectionTitle}>Control de Unidades Físicas (Seriales)</h3>
                </div>

                {/* Filtros */}
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
                    {todasSubcats.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
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
                        <th>Notas de Condición</th>
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
                          <tr key={item.id} style={item.estado_operativo === 'DADO_DE_BAJA' ? { opacity: 0.6 } : {}}>
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
                                    <Wrench size={13} color="var(--color-warning)" />
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
                                    <CheckCircle2 size={13} color="var(--color-success)" />
                                    <span>Habilitar</span>
                                  </button>
                                )}
                                {item.estado_operativo !== 'DADO_DE_BAJA' && item.estado_operativo !== 'ALQUILADO' && (
                                  <button 
                                    onClick={() => handleOpenBajaModal(item.id, item.serial_tag)}
                                    className="btn btn-secondary"
                                    style={{...styles.actionBtnSmall, color: '#ef4444'}}
                                    title="Dar de baja definitiva"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={13} />
                                    <span>Dar de Baja</span>
                                  </button>
                                )}
                                {item.estado_operativo === 'ALQUILADO' && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    Alquilado en Evento
                                  </span>
                                )}
                                {item.estado_operativo === 'DADO_DE_BAJA' && (
                                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
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
            </div>
          )}

          {/* ==================== PESTAÑA 2: COMPRAS E INGRESO POR LOTE ==================== */}
          {activeTab === 'compras' && (
            <div style={styles.tabContent}>
              <div style={styles.comprasGrid}>
                {/* Formulario de Compra Masiva */}
                <div className="glass-panel" style={styles.compraFormPanel}>
                  <div style={styles.panelHeader}>
                    <ShoppingBag size={20} color="var(--accent-secondary)" />
                    <h3 style={styles.panelTitle}>Registrar Compra / Ingreso Lote</h3>
                  </div>
                  
                  <form onSubmit={handleRegisterCompra} style={styles.createForm}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="compraCat">Modelo a Adquirir</label>
                      <select 
                        id="compraCat"
                        className="form-select"
                        value={compraCatalogoId}
                        onChange={(e) => setCompraCatalogoId(e.target.value)}
                        required
                      >
                        <option value="">Selecciona la referencia...</option>
                        {catalogo.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nombre_equipo} ({cat.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formRow} className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="compraCant">Cantidad a Ingresar</label>
                        <input 
                          id="compraCant"
                          type="number"
                          className="form-input"
                          min="1"
                          placeholder="Ej: 5"
                          value={compraCantidad}
                          onChange={(e) => setCompraCantidad(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label" htmlFor="compraCosto">Costo de Adquisición Total (COP)</label>
                        <input 
                          id="compraCosto"
                          type="number"
                          className="form-input"
                          min="0"
                          placeholder="Ej: 1500000"
                          value={compraCosto}
                          onChange={(e) => setCompraCosto(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="compraProv">Proveedor / Fabricante</label>
                      <input 
                        id="compraProv"
                        type="text"
                        className="form-input"
                        placeholder="Ej: MegaLight S.A.S."
                        value={compraProveedor}
                        onChange={(e) => setCompraProveedor(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="compraFecha">Fecha de Facturación</label>
                      <input 
                        id="compraFecha"
                        type="date"
                        className="form-input"
                        value={compraFecha}
                        onChange={(e) => setCompraFecha(e.target.value)}
                        required
                      />
                    </div>

                    <div style={styles.purchaseNotice} className="glass-panel">
                      <AlertCircle size={16} color="var(--accent-secondary)" style={{flexShrink: 0, marginTop: '2px'}} />
                      <p style={{fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4}}>
                        <strong>Generación Automática:</strong> El sistema creará de forma atómica la bitácora financiera de compra y generará secuencialmente los seriales incrementales (Opción A) basados en el SKU.
                      </p>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      {actionLoading ? 'Procesando Transacción...' : 'Registrar Compra y Generar Stock'}
                    </button>
                  </form>
                </div>

                {/* Historial de Compras */}
                <div className="glass-panel" style={styles.compraHistoryPanel}>
                  <div style={styles.panelHeader}>
                    <FileText size={20} color="var(--accent-secondary)" />
                    <h3 style={styles.panelTitle}>Bitácora Financiera de Compras</h3>
                  </div>

                  <div className="table-container" style={{marginTop: '16px'}}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>ID Lote</th>
                          <th>Referencia Equipo</th>
                          <th>Cant.</th>
                          <th>Costo Adquisición</th>
                          <th>Costo Unitario</th>
                          <th>Proveedor</th>
                          <th>Fecha Compra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compras.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                              No se han registrado compras financieras aún.
                            </td>
                          </tr>
                        ) : (
                          compras.map((c) => (
                            <tr key={c.id}>
                              <td><code>#LOTE-{c.id}</code></td>
                              <td style={{ fontWeight: 600 }}>
                                {c.catalogo ? `${c.catalogo.nombre_equipo} (${c.catalogo.sku})` : `ID Ref: ${c.catalogo_id}`}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.cantidad}</td>
                              <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                {formatCurrency(c.costo_compra_total)}
                              </td>
                              <td style={{ color: 'var(--accent-secondary)' }}>
                                {formatCurrency(c.costo_compra_total / c.cantidad)}
                              </td>
                              <td>{c.proveedor}</td>
                              <td style={{ fontSize: '12px' }}>{formatFecha(c.fecha_compra)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PESTAÑA 3: HISTORIAL DE BAJAS ==================== */}
          {activeTab === 'bajas' && (
            <div style={styles.tabContent}>
              <div className="glass-panel" style={{padding: '24px'}}>
                <div style={styles.panelHeader}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <h3 style={styles.panelTitle}>Historial de Unidades Fuera de Servicio (Bajas)</h3>
                </div>
                <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px'}}>
                  Bitácora de auditoría de retiro de activos del inventario por concepto de daño irreparable, pérdida o descarte logístico.
                </p>

                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>ID Baja</th>
                        <th>Serial Unit</th>
                        <th>Equipo / SKU</th>
                        <th>Categoría</th>
                        <th>Motivo del Descarte / Dictamen Técnico</th>
                        <th>Fecha de Baja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bajas.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                            No se registran bajas de inventario activas en el sistema.
                          </td>
                        </tr>
                      ) : (
                        bajas.map((b) => (
                          <tr key={b.id}>
                            <td><code>#BAJA-{b.id}</code></td>
                            <td><code style={styles.serialCode}>{b.instancia?.serial_tag || 'N/A'}</code></td>
                            <td style={{ fontWeight: 600 }}>
                              {b.instancia?.catalogo?.nombre_equipo || 'Modelo Eliminado'} 
                              {b.instancia?.catalogo?.sku && ` (${b.instancia.catalogo.sku})`}
                            </td>
                            <td>{b.instancia?.catalogo?.categoria || 'N/A'}</td>
                            <td style={{ color: '#ef4444', fontSize: '13px', fontStyle: 'italic', fontWeight: 500 }}>
                              {b.motivo_baja}
                            </td>
                            <td style={{ fontSize: '12px' }}>{formatFecha(b.fecha_baja)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmación para Dar de Baja */}
      {showBajaModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <AlertTriangle size={22} color="#ef4444" />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Retiro Definitivo de Activo</h3>
              </div>
              <button onClick={() => setShowBajaModal(false)} style={styles.closeBtn} className="btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterBajaSubmit} style={styles.form}>
              <div className="glass-panel" style={{padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)'}}>
                <p style={{fontSize: '13px', color: '#f87171', margin: 0, lineHeight: 1.5}}>
                  ⚠️ <strong>¡ADVERTENCIA!</strong> Dar de baja el serial <strong>{bajaSerialTag}</strong> lo retirará permanentemente de la bodega operativa. No podrá reservarse para futuros eventos.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="motivoBaja">Dictamen Técnico / Motivo de Baja</label>
                <textarea 
                  id="motivoBaja"
                  required
                  rows={4}
                  className="form-textarea"
                  placeholder="Ej: Daño total en display y transformador principal por sobrevoltaje. Reparación no viable financieramente."
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              <div style={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowBajaModal(false)} 
                  className="btn" 
                  style={styles.cancelBtn}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  style={styles.bajaConfirmBtn}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Registrando baja...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
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
    gap: '28px',
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
    gap: '12px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '12px 20px',
  },
  errorText: {
    fontSize: '14px',
    color: '#f87171',
    fontWeight: 500,
    margin: 0,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    padding: '12px 20px',
  },
  successText: {
    fontSize: '14px',
    color: 'var(--color-success)',
    fontWeight: 500,
    margin: 0,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    width: '100%',
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '18px 20px',
    borderLeft: '3px solid var(--accent-secondary)',
  },
  kpiIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '4px 0 0 0',
    color: 'var(--text-primary)',
  },
  tabsContainer: {
    display: 'flex',
    padding: '6px',
    gap: '6px',
    width: 'fit-content',
    borderRadius: '10px',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  tabButtonActive: {
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
  },
  tabContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
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
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
  stockStatusContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px',
    marginBottom: '6px',
  },
  progressBarBackground: {
    display: 'flex',
    height: '6px',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  stockDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  noStockPlaceholder: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '4px 0',
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
    gap: '8px',
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
    margin: '0 auto 16px auto',
    width: '100%',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
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
  comprasGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    width: '100%',
    alignItems: 'start',
  },
  compraFormPanel: {
    padding: '24px',
    width: '100%',
  },
  compraHistoryPanel: {
    padding: '24px',
    width: '100%',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  purchaseNotice: {
    display: 'flex',
    gap: '10px',
    padding: '12px 16px',
    background: 'rgba(99, 102, 241, 0.04)',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(3, 7, 18, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: 'var(--shadow-glow)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-muted)',
    paddingBottom: '12px',
  },
  modalHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-muted)',
    color: 'var(--text-secondary)',
  },
  bajaConfirmBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    padding: '10px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
