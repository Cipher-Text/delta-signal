import Link from 'next/link';

const PERSONAS = [
  {
    icon: '🙋',
    role: 'Citizen',
    headline: 'Report what you see',
    body: 'Submit pollution incidents, log water contamination, or flag illegal dumping directly from your district. Every verified report shapes the national data layer.',
    primaryCta:   { label: 'Create free account', href: '/register' },
    secondaryCta: { label: 'Browse reports',       href: '/reports'  },
    accent: 'persona-citizen',
  },
  {
    icon: '🔬',
    role: 'Researcher',
    headline: 'Access research-grade data',
    body: 'Download GBIF occurrence datasets, 30-day climate averages by division, verified pollution records, and GloFAS flood forecasts — all open or request-access.',
    primaryCta:   { label: 'Request data access', href: '/register' },
    secondaryCta: { label: 'Browse datasets',      href: '/data'     },
    accent: 'persona-researcher',
  },
  {
    icon: '🌱',
    role: 'NGO / Agency',
    headline: 'Publish restoration projects',
    body: 'List active campaigns, publish official warnings, track restoration milestones across Bangladesh, and contribute verified environmental records to the public layer.',
    primaryCta:   { label: 'Register organisation', href: '/register' },
    secondaryCta: { label: 'View projects',          href: '/restoration' },
    accent: 'persona-ngo',
  },
] as const;

export default function PersonaFooter() {
  return (
    <section className="persona-footer" aria-label="Get involved">
      <div className="persona-footer-header">
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Open platform · Zero paywall
        </p>
        <h2>Are you a Citizen, Researcher, or NGO?</h2>
        <p className="persona-footer-sub">
          Delta Signal is free and open. Sign up to contribute data, submit reports,
          join restoration projects, or download datasets for research.
        </p>
      </div>

      <div className="persona-grid">
        {PERSONAS.map((p) => (
          <article key={p.role} className={`persona-card ${p.accent}`} aria-label={p.role}>
            <div className="persona-icon" aria-hidden="true">
              {p.icon}
            </div>
            <div className="persona-role-tag">{p.role}</div>
            <h3 className="persona-headline">{p.headline}</h3>
            <p className="persona-body">{p.body}</p>
            <div className="persona-actions">
              <Link href={p.primaryCta.href} className="button persona-primary-cta">
                {p.primaryCta.label}
              </Link>
              <Link href={p.secondaryCta.href} className="button ghost persona-ghost-cta">
                {p.secondaryCta.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
