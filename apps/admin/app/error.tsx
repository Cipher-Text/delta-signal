'use client';

// Root error boundary — catches errors that escape route-group boundaries.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#0f172a',
            color: '#f1f5f9',
          }}
        >
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Something went wrong. Please try again.
          </p>
          {error.digest && (
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--accent, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
