'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../services/supabase-client';
import { Lock, Mail, AlertTriangle, Play } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Si ya hay una sesión activa, redirigir directamente al dashboard
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' 
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.' 
          : error.message
        );
      } else if (data.session) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg('Ocurrió un error inesperado al intentar iniciar sesión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>OP</div>
          <h1 style={styles.title}>OnProduction</h1>
          <p style={styles.subtitle}>Sistema Logístico & Transaccional</p>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertTriangle size={18} color="var(--color-danger)" />
            <span style={styles.errorText}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo Electrónico
            </label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                required
                placeholder="ejemplo@eventos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Autenticando...' : 'Iniciar Sesión'}
            {!loading && <Play size={14} fill="currentColor" />}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>Acceso exclusivo para personal autorizado</p>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '20px',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  logoBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '22px',
    color: '#ffffff',
    boxShadow: 'var(--shadow-glow)',
    marginBottom: '8px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(to right, #ffffff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
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
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
  },
  errorText: {
    fontSize: '13px',
    color: '#f87171',
    fontWeight: 500,
  },
  footer: {
    textAlign: 'center',
    marginTop: '8px',
  },
  footerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
