import Link from 'next/link';

// Root 404 page — shown when no admin route matches.
export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#0f172a',
        color: '#f1f5f9',
      }}
    >
      <p
        style={{
          fontSize: '4rem',
          fontWeight: 700,
          color: 'var(--accent, #3b82f6)',
          lineHeight: 1,
          margin: 0,
        }}
      >
        404
      </p>
      <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
        This page does not exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.25rem',
          background: 'var(--accent, #3b82f6)',
          color: '#fff',
          borderRadius: 6,
          fontSize: '0.9rem',
          textDecoration: 'none',
        }}
      >
        Go to dashboard
      </Link>
    </div>
  );
}
