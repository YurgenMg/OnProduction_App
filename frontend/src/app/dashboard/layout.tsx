'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../services/supabase-client';
import { 
  LayoutDashboard, 
  CalendarRange, 
  Package, 
  ShieldAlert, 
  LogOut, 
  User,
  Menu,
  X,
  Settings,
  Users,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import QuickStartButton from '../../components/ui/QuickStartButton';

interface UserProfile {
  id: number;
  nombre_completo: string;
  email: string;
  rol: {
    nombre: string;
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ── OPTIMIZACIÓN: getSession y la query de perfil en paralelo ──
        const [{ data: { session } }] = await Promise.all([
          supabase.auth.getSession(),
        ]);

        if (!session) {
          router.push('/login');
          return;
        }

        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('id, nombre_completo, email, rol:roles(nombre)')
          .eq('id', session.user.id)          // usa PK UUID, no email (más rápido)
          .is('deleted_at', null)
          .single();

        if (error || !userData) {
          console.warn('Acceso denegado:', error);
          await supabase.auth.signOut();
          router.push('/login?error=unauthorized');
          return;
        }
        setProfile(userData as unknown as UserProfile);
      } catch (err) {
        console.error('Error comprobando autenticación:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loaderText}>Verificando credenciales...</p>
      </div>
    );
  }

  // ── OPTIMIZACIÓN: memoizar menú para evitar recálculo en cada render ──
  const menuItems = useMemo(() => {
    const base = [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Eventos & Cotizaciones', path: '/dashboard/eventos', icon: CalendarRange },
      { name: 'Clientes', path: '/dashboard/clientes', icon: Users },
      { name: 'Inventario', path: '/dashboard/inventario', icon: Package },
      { name: 'Caja & Cartera', path: '/dashboard/caja', icon: Wallet },
      { name: 'Garantías & Daños', path: '/dashboard/garantias', icon: ShieldAlert },
    ];
    if (profile?.rol.nombre === 'Administrador') {
      return [
        ...base,
        { name: 'Usuarios & Roles', path: '/dashboard/usuarios', icon: User },
        { name: 'Mi Empresa', path: '/dashboard/configuracion', icon: Settings },
      ];
    }
    return base;
  }, [profile?.rol.nombre]);

  return (
    <div style={styles.layoutContainer}>
      {/* Sidebar para Escritorio */}
      <aside className="glass-panel" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBadge}>OP</div>
          <span style={styles.logoText}>OnProduction</span>
        </div>

        <nav style={styles.navMenu}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {})
                }}
              >
                <Icon 
                  size={20} 
                  color={isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)'} 
                />
                <span style={isActive ? { fontWeight: 600 } : {}}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          {profile && (
            <div style={styles.profileSection}>
              <div style={styles.avatar}>
                <User size={18} color="var(--accent-secondary)" />
              </div>
              <div style={styles.profileInfo}>
                <span style={styles.profileName} title={profile.nombre_completo}>
                  {profile.nombre_completo}
                </span>
                <span style={styles.profileRole}>
                  {profile.rol.nombre}
                </span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn} className="btn">
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Header Móvil */}
      <header style={styles.mobileHeader}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBadgeSmall}>OP</div>
          <span style={styles.logoTextSmall}>OnProduction</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={styles.mobileMenuBtn}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Menu Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="glass-panel" style={styles.mobileMenu}>
          <nav style={styles.navMenuMobile}>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  style={{
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {})
                  }}
                >
                  <Icon 
                    size={20} 
                    color={isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)'} 
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div style={styles.mobileMenuFooter}>
            {profile && (
              <div style={styles.profileSection}>
                <div style={styles.avatar}>
                  <User size={18} color="var(--accent-secondary)" />
                </div>
                <div style={styles.profileInfo}>
                  <span style={styles.profileName}>{profile.nombre_completo}</span>
                  <span style={styles.profileRole}>{profile.rol.nombre}</span>
                </div>
              </div>
            )}
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }} 
              style={styles.logoutBtn} 
              className="btn"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper} className="content-wrapper">
          {children}
        </div>
      </main>
      {/* Atajos Globales */}
      <QuickStartButton />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  layoutContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  sidebar: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    bottom: '16px',
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
    borderRadius: '16px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    paddingLeft: '8px',
  },
  logoBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '18px',
    color: '#ffffff',
    boxShadow: 'var(--shadow-glow)',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(to right, #ffffff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid transparent',
    transition: 'var(--transition-smooth)',
  },
  navLinkActive: {
    background: 'rgba(99, 102, 241, 0.08)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: 'auto',
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '20px',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    width: '180px',
  },
  profileName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileRole: {
    fontSize: '12px',
    color: 'var(--accent-secondary)',
    fontWeight: 500,
  },
  logoutBtn: {
    width: '100%',
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px',
    fontSize: '14px',
  },
  mainContent: {
    flex: 1,
    paddingLeft: '312px', /* Ancho de sidebar + espaciado */
    minHeight: '100vh',
    width: '100%',
  },
  contentWrapper: {
    padding: '32px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
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
  /* Estilos Móviles */
  mobileHeader: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: 'rgba(6, 9, 19, 0.8)',
    backdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--border-muted)',
    zIndex: 90,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
  },
  logoBadgeSmall: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '15px',
    color: '#ffffff',
  },
  logoTextSmall: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  mobileMenuBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  mobileMenu: {
    position: 'fixed',
    top: '64px',
    left: '10px',
    right: '10px',
    bottom: '10px',
    zIndex: 95,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px',
  },
  navMenuMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  mobileMenuFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: 'auto',
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '20px',
  }
};
