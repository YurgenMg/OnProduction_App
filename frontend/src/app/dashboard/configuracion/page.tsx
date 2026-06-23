'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../services/supabase-client';
import { 
  Building, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard,
  Image,
  RefreshCw,
  FileText
} from 'lucide-react';

interface EmpresaConfig {
  nombre_empresa: string;
  eslogan: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  logo_url: string | null;
}

export default function ConfiguracionEmpresaPage() {
  const router = useRouter();
  
  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [eslogan, setEslogan] = useState('');
  const [nit, setNit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Estados del archivo de logotipo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Estados de retroalimentación
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar la configuración actual al montar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/empresa', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Error al obtener la configuración de la empresa');
        }

        if (data) {
          setNombreEmpresa(data.nombre_empresa || '');
          setEslogan(data.eslogan || '');
          setNit(data.nit || '');
          setTelefono(data.telefono || '');
          setEmail(data.email || '');
          setDireccion(data.direccion || '');
          setLogoUrl(data.logo_url || null);
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [router]);

  // Manejar arrastrar y soltar / selección de imagen
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Archivo no válido. Solo se permiten imágenes PNG, JPG, JPEG o SVG.');
      return;
    }

    // Validar tamaño máximo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('La imagen supera el límite de 2MB. Carga una imagen más liviana.');
      return;
    }

    setLogoFile(file);
    setErrorMsg('');

    // Crear previsualización local
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      
      // Extraer sólo la parte base64 (removiendo el prefijo data:image/*;base64,)
      const base64String = (reader.result as string).split(',')[1];
      setLogoBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Guardar configuración modificada
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const payload = {
        nombre_empresa: nombreEmpresa,
        eslogan,
        nit,
        telefono,
        email,
        direccion,
        logo_url: logoUrl, // Mantener la actual si no se subió una nueva
        logo_base64: logoBase64,
        logo_filename: logoFile ? logoFile.name : null,
        logo_mime: logoFile ? logoFile.type : null
      };

      const res = await fetch('/api/empresa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cambios');
      }

      setLogoUrl(data.logo_url);
      setLogoBase64(null);
      setLogoFile(null);
      
      setSuccessMsg('Información de la empresa y logotipo actualizados con éxito. Los PDFs se generarán automáticamente con este diseño.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Cargando configuración de la empresa...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Mi Empresa</h1>
          <p style={styles.subtitle}>Configura el nombre, NIT, dirección y logotipo del emisor que saldrá en las facturas PDF</p>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={styles.successAlert} className="glass-panel">
          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorAlert} className="glass-panel">
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Formulario a la Izquierda y Subida de Logo a la Derecha */}
      <div style={styles.gridSplit} className="grid-split">
        {/* Formulario de Configuración */}
        <div className="glass-panel" style={styles.formPanel}>
          <div style={styles.panelHeader}>
            <Building size={20} color="var(--accent-secondary)" />
            <h2 style={styles.panelTitle}>Datos Corporativos</h2>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="emp-name">
                Nombre de la Empresa / Razón Social
              </label>
              <div style={styles.inputWrapper}>
                <Building size={18} style={styles.inputIcon} />
                <input
                  id="emp-name"
                  type="text"
                  required
                  placeholder="Ej. OnProduction S.A.S."
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-eslogan">
                Eslogan o Descripción Secundaria
              </label>
              <div style={styles.inputWrapper}>
                <FileText size={18} style={styles.inputIcon} />
                <input
                  id="emp-eslogan"
                  type="text"
                  placeholder="Ej. LOGÍSTICA & ALQUILER DE EQUIPOS"
                  value={eslogan}
                  onChange={(e) => setEslogan(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-nit">
                NIT / Identificación Tributaria
              </label>
              <div style={styles.inputWrapper}>
                <CreditCard size={18} style={styles.inputIcon} />
                <input
                  id="emp-nit"
                  type="text"
                  required
                  placeholder="Ej. 901.458.732-1"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-tel">
                Teléfono de Contacto
              </label>
              <div style={styles.inputWrapper}>
                <Phone size={18} style={styles.inputIcon} />
                <input
                  id="emp-tel"
                  type="text"
                  required
                  placeholder="Ej. +57 (300) 123-4567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-email">
                Correo Electrónico de Facturación
              </label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  id="emp-email"
                  type="email"
                  required
                  placeholder="Ej. facturacion@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-dir">
                Dirección Física / Ciudad
              </label>
              <div style={styles.inputWrapper}>
                <MapPin size={18} style={styles.inputIcon} />
                <input
                  id="emp-dir"
                  type="text"
                  required
                  placeholder="Ej. Calle 100 #15-30, Bogotá"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="form-input"
                  style={styles.inputWithIcon}
                  disabled={saving}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={styles.submitBtn}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <span>Guardar Configuración</span>
              )}
            </button>
          </form>
        </div>

        {/* Carga del Logotipo */}
        <div className="glass-panel" style={styles.logoPanel}>
          <div style={styles.panelHeader}>
            <Image size={20} color="var(--accent-secondary)" />
            <h2 style={styles.panelTitle}>Logotipo de la Empresa</h2>
          </div>

          <div style={styles.logoSection}>
            {/* Visualizador de Previsualización */}
            <div style={styles.previewContainer} className="glass-card">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Logotipo Corporativo" 
                  style={styles.logoImage} 
                />
              ) : (
                <div style={styles.noLogoPlaceholder}>
                  <Building size={48} color="var(--text-muted)" />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin Logotipo</span>
                </div>
              )}
            </div>

            {/* Subidor Drag & Drop */}
            <div style={styles.uploadBox} className="glass-card">
              <UploadCloud size={32} color="var(--accent-secondary)" style={{ marginBottom: '8px' }} />
              <p style={styles.uploadText}>Carga tu Logotipo Corporativo</p>
              <span style={styles.uploadSubtext}>Formatos: PNG, JPG, JPEG o SVG (máx. 2MB)</span>
              
              <label htmlFor="logo-upload" style={styles.uploadLabel} className="btn btn-secondary">
                Seleccionar Imagen
              </label>
              <input 
                id="logo-upload"
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
                disabled={saving}
              />
            </div>
            
            {logoFile && (
              <div style={styles.fileInfo}>
                <span style={styles.fileName}>{logoFile.name}</span>
                <span style={styles.fileSize}>({(logoFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
            
            <p style={styles.logoNote}>
              * Nota: La imagen se ajustará automáticamente de manera perfecta y proporcional (dentro de una caja de 45x45 pt) en el encabezado de tu factura PDF. Para mejores resultados, usa un logotipo con fondo transparente.
            </p>
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
  gridSplit: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '24px',
    alignItems: 'start',
    width: '100%',
  },
  formPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  logoPanel: {
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
  submitBtn: {
    marginTop: '10px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    width: '100%',
  },
  previewContainer: {
    width: '180px',
    height: '180px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid var(--border-muted)',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '16px',
  },
  logoImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  noLogoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  uploadBox: {
    width: '100%',
    padding: '30px 20px',
    border: '1px dashed var(--border-muted)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  uploadText: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  uploadSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '16px',
    textAlign: 'center',
  },
  uploadLabel: {
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--accent-secondary)',
    fontWeight: 500,
  },
  fileName: {
    maxWidth: '220px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSize: {
    color: 'var(--text-muted)',
  },
  logoNote: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    textAlign: 'justify',
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
    width: '100%',
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
    width: '100%',
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
