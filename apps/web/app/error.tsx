'use client';

// Root error boundary — catches errors that escape route-group boundaries
// (e.g., an exception thrown inside the root layout itself).
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
          }}
        >
          <p style={{ color: 'var(--muted, #5f6f68)', fontSize: '0.95rem' }}>
            Something went wrong. Please try again.
          </p>
          {error.digest && (
            <p style={{ color: 'var(--muted-soft, #87948f)', fontSize: '0.8rem' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--primary, #178a63)',
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
