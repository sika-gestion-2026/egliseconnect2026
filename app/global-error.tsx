'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF8F3',
          color: '#0B2E6B',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⛪</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 12px' }}>
            Église Connect
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 24px' }}>
            Une erreur critique s&apos;est produite. Veuillez recharger la page.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0B2E6B',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
