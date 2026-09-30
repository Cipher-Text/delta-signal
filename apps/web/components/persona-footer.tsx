import Link from 'next/link';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 3h4M10 3v6.5L5.5 18A2 2 0 0 0 7.3 21h9.4a2 2 0 0 0 1.8-3L14 9.5V3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8.5 15h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 11 12 4l8.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V20h13V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

const PERSONAS = [
  {
    role: 'Citizens',
    icon: UserIcon,
    headline: 'Report what you see',
    body: 'Flag pollution, water contamination or illegal dumping in your district. Reports are reviewed before they appear on the public map.',
    cta: { label: 'Submit a report →', href: '/reports' },
  },
  {
    role: 'Researchers',
    icon: FlaskIcon,
    headline: 'Access research-grade data',
    body: 'Download climate summaries, flood forecasts, biodiversity records and reviewed citizen reports.',
    cta: { label: 'Request data access →', href: '/register' },
  },
  {
    role: 'NGOs & agencies',
    icon: BuildingIcon,
    headline: 'Publish restoration projects',
    body: 'List campaigns, track restoration milestones and contribute verified environmental records.',
    cta: { label: 'Register your organisation →', href: '/register' },
  },
] as const;

export default function PersonaFooter() {
  return (
    <section className="persona-footer public-section" aria-label="Take part">
      <div className="persona-footer-header">
        <div>
          <h2>Take part</h2>
          <p>Delta Signal is free and open. An account lets you contribute and download.</p>
        </div>
        <Link href="/register" className="button">
          Create a free account
        </Link>
      </div>

      <div className="persona-grid">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <article key={p.role} className="persona-card" aria-label={p.role}>
              <div className="persona-card-kicker">
                <Icon />
                <span>{p.role.toUpperCase()}</span>
              </div>
              <h3 className="persona-headline">{p.headline}</h3>
              <p className="persona-body">{p.body}</p>
              <Link href={p.cta.href} className="persona-cta-link">
                {p.cta.label}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
