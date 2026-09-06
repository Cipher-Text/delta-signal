import Link from 'next/link';

// Root 404 page — shown when no route matches and no closer not-found.tsx exists.
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
        fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      }}
    >
      <p
        style={{
          fontSize: '4rem',
          fontWeight: 700,
          color: 'var(--primary, #16a34a)',
          lineHeight: 1,
          margin: 0,
        }}
      >
        404
      </p>
      <p style={{ color: 'var(--muted, #6b7280)', fontSize: '0.95rem', margin: 0 }}>
        This page does not exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.25rem',
          background: 'var(--primary, #16a34a)',
          color: '#fff',
          borderRadius: 6,
          fontSize: '0.9rem',
          textDecoration: 'none',
        }}
      >
        Go home
      </Link>
    </div>
  );
}
