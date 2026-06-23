'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../services/supabase-client';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  Mail, 
  User, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface Role {
  id: number;
  nombre: string;
}

interface UserProfile {
  id: number;
  nombre_completo: string;
  email: string;
  created_at: string;
  rol: {
    id: number;
    nombre: string;
  };
}

export default function UsuariosPage() {
  const router = useRouter();
  
  // Estados de datos
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Estados de retroalimentación
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar datos al montar el componente
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Cargar roles y usuarios en paralelo para evitar waterfalls
        const [rolesResult] = await Promise.all([
          supabase
            .from('roles')
            .select('id, nombre')
            .is('deleted_at', null)
            .order('nombre'),
          fetchUsuarios()
        ]);

        const { data: rolesData, error: rolesError } = rolesResult;
        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

      } catch (err: any) {
        setErrorMsg('Error al inicializar la gestión de usuarios: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Función para obtener usuarios de la API
  const fetchUsuarios = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const res = await fetch('/api/usuarios', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al obtener listado de usuarios');
    }
    setUsuarios(data);
  };

  // Enviar formulario para crear un usuario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          password,
          nombre_completo: nombreCompleto,
          rol_id: rolId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el usuario');
      }

      // Añadir el nuevo usuario a la tabla
      setUsuarios([data, ...usuarios]);
      
      // Limpiar formulario y cerrar modal
      setNombreCompleto('');
      setEmail('');
      setPassword('');
      setRolId('');
      setShowForm(false);
      
      setSuccessMsg('Usuario registrado exitosamente en el sistema.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Desactivar un usuario (Soft Delete)
  const handleDelete = async (id: number, nombre: string) => {
    if (submitting) return;
    if (!confirm(`¿Estás seguro de que deseas desactivar al usuario "${nombre}" del sistema? Ya no podrá iniciar sesión.`)) {
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/usuarios?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al desactivar el usuario');
      }

      // Remover de la tabla local
      setUsuarios(usuarios.filter(u => u.id !== id));
      setSuccessMsg(`Usuario "${nombre}" desactivado con éxito.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatFecha = (fechaStr: string) => {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Cargando panel de administración de usuarios...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Usuarios & Roles</h1>
          <p style={styles.subtitle}>Gestiona las cuentas de acceso y sus niveles de permisos en OnProduction</p>
        </div>
        <button onClick={() => { setErrorMsg(''); setShowForm(true); }} className="btn btn-primary">
          <UserPlus size={18} />
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={styles.successAlert}>
          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorAlert}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Panel / Tabla Principal */}
      <div className="glass-panel" style={styles.mainPanel}>
        <div style={styles.panelHeader}>
          <Users size={20} color="var(--accent-secondary)" />
          <h2 style={styles.panelTitle}>Cuentas Activas ({usuarios.length})</h2>
        </div>

        {usuarios.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No hay usuarios activos registrados.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol de Acceso</th>
                  <th>Fecha de Registro</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre_completo}</td>
                    <td>{u.email}</td>
                    <td>
                      <div style={styles.roleTagContainer}>
                        <Shield size={14} color="var(--accent-secondary)" />
                        <span style={styles.roleTag}>{u.rol?.nombre}</span>
                      </div>
                    </td>
                    <td>{formatFecha(u.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(u.id, u.nombre_completo)} 
                        style={styles.deleteBtn}
                        title="Desactivar acceso"
                        className="btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Formulario Emergente de Registro */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <UserPlus size={20} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Agregar Nuevo Usuario</h3>
              </div>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn} className="btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-name">
                  Nombre Completo
                </label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    id="new-name"
                    type="text"
                    required
                    placeholder="Ej. Carlos Gomez"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className="form-input"
                    style={styles.inputWithIcon}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-email">
                  Correo Electrónico
                </label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input
                    id="new-email"
                    type="email"
                    required
                    placeholder="ejemplo@onproduction.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={styles.inputWithIcon}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  Contraseña Inicial
                </label>
                <div style={styles.inputWrapper}>
                  <Key size={18} style={styles.inputIcon} />
                  <input
                    id="new-password"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={styles.inputWithIcon}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-role">
                  Rol del Sistema
                </label>
                <div style={styles.inputWrapper}>
                  <ShieldCheck size={18} style={styles.inputIcon} />
                  <select
                    id="new-role"
                    required
                    value={rolId}
                    onChange={(e) => setRolId(e.target.value)}
                    className="form-input"
                    style={{ ...styles.inputWithIcon, appearance: 'none', background: 'rgba(255, 255, 255, 0.03)' }}
                    disabled={submitting}
                  >
                    <option value="" disabled style={{background: '#0e1322'}}>Seleccionar rol...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} style={{background: '#0e1322', color: '#fff'}}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="btn" 
                  style={styles.cancelBtn}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? 'Creando cuenta...' : 'Crear Usuario'}
                  {!submitting && <ArrowRight size={16} />}
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
  mainPanel: {
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
  roleTagContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleTag: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
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
    gap: '24px',
    boxShadow: 'var(--shadow-glow)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-muted)',
    paddingBottom: '16px',
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
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    width: '100%',
    paddingLeft: '46px',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '14px',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-muted)',
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#34d399',
    fontSize: '14px',
    fontWeight: 500,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f87171',
    fontSize: '14px',
    fontWeight: 500,
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
