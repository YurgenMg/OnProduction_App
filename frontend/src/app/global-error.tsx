'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#060913',
        fontFamily: "'Outfit', sans-serif",
        color: '#f8fafc',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '480px',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
            Algo salió mal
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '15px' }}>
            {error?.message || 'Se produjo un error inesperado en la aplicación.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
