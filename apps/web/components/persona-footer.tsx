import Link from 'next/link';

const PERSONAS = [
  {
    role: 'Citizens',
    headline: 'Report what you see',
    body: 'Flag pollution, water contamination or illegal dumping in your district. Reports are reviewed before they appear on the public map.',
    cta: { label: 'Submit a report →', href: '/reports' },
    accent: 'persona-citizen',
  },
  {
    role: 'Researchers',
    headline: 'Access research-grade data',
    body: 'Download climate summaries, flood forecasts, biodiversity records and reviewed citizen reports.',
    cta: { label: 'Request data access →', href: '/register' },
    accent: 'persona-researcher',
  },
  {
    role: 'NGOs & agencies',
    headline: 'Publish restoration projects',
    body: 'List campaigns, track restoration milestones and contribute verified environmental records.',
    cta: { label: 'Register your organisation →', href: '/register' },
    accent: 'persona-ngo',
  },
] as const;

export default function PersonaFooter() {
  return (
    <section className="persona-footer" aria-label="Take part">
      <div className="persona-footer-header">
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Take part
        </p>
        <h2>Delta Signal is free and open.</h2>
        <p className="persona-footer-sub">An account lets you contribute and download.</p>
        <Link href="/register" className="button persona-primary-cta">
          Create a free account
        </Link>
      </div>

      <div className="persona-grid">
        {PERSONAS.map((p) => (
          <article key={p.role} className={`persona-card ${p.accent}`} aria-label={p.role}>
            <div className="persona-role-tag">{p.role}</div>
            <h3 className="persona-headline">{p.headline}</h3>
            <p className="persona-body">{p.body}</p>
            <Link href={p.cta.href} className="persona-cta-link">
              {p.cta.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
