import Link from 'next/link';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1M18.5 18.5l-2.1-2.1M7.6 7.6 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 9c2 0 2-2.5 4-2.5S8 9 10 9s2-2.5 4-2.5S16 9 18 9s2-2.5 4-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 15c2 0 2-2.5 4-2.5S8 15 10 15s2-2.5 4-2.5S16 15 18 15s2-2.5 4-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8h11a2.5 2.5 0 1 0-2.4-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 12.5h14a2.5 2.5 0 1 1-2.4 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 17h8a2 2 0 1 1-1.9 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 19c0-6 3-9 9-11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AnchorWaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.3V15M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 15c0 3 2.7 5 6 5s6-2 6-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.5 19.5c1.5 0 1.5-1.6 3-1.6s1.5 1.6 3 1.6 1.5-1.6 3-1.6 1.5 1.6 3 1.6 1.5-1.6 3-1.6 1.5 1.6 3 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 6.5 10h2.2L4.5 16h5.5v5.5M12 2.5l5.5 7.5h-2.2l4.2 6h-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 16v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 10c0-4 3-6 7-6 0 4-3 6-7 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 14c0-3-2.2-4.5-5-4.5 0 3 2.2 4.5 5 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function EmissionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.5 19v-5.5l4-3 4 3 3.5-2.8 4.5 2.8V19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 6c.6-1 .6-2-.3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19.3 7.3c1-1.4.8-2.8-.3-4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const TOPICS = [
  { href: '/locations', label: 'Weather & climate', body: 'Temperature, rainfall and UV by division and district.', icon: SunIcon, accent: 'topic-icon--blue' },
  { href: '/water-bodies', label: 'Rivers & water', body: 'River discharge forecasts and water bodies.', icon: WaveIcon, accent: 'topic-icon--blue' },
  { href: '/locations', label: 'Air quality', body: 'Fine particulate levels for all 64 districts.', icon: WindIcon, accent: 'topic-icon--gray' },
  { href: '/biodiversity', label: 'Biodiversity', body: 'Species occurrence records from GBIF.', icon: LeafIcon, accent: 'topic-icon--green' },
  { href: '/map', label: 'Forests & land', body: 'Forest cover, land use and protected areas.', icon: TreeIcon, accent: 'topic-icon--green' },
  { href: '/map', label: 'Agriculture', body: 'Growing conditions and agricultural land.', icon: SproutIcon, accent: 'topic-icon--amber' },
  { href: '/marine', label: 'Marine', body: 'Bay of Bengal wave and sea-surface forecasts.', icon: AnchorWaveIcon, accent: 'topic-icon--blue' },
  { href: '/emissions', label: 'Emissions', body: 'Emissions inventory by sector and area.', icon: EmissionsIcon, accent: 'topic-icon--amber' },
] as const;

export default function TopicsGrid() {
  return (
    <section id="topics" className="topics-section public-section" aria-label="Explore by topic">
      <div className="section-intro">
        <h2>Explore by topic</h2>
        <p>Each topic brings together maps, indicators and datasets.</p>
      </div>

      <div className="topics-grid">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} href={t.href} className="topic-card">
              <span className={`topic-icon ${t.accent}`}>
                <Icon />
              </span>
              <strong>{t.label}</strong>
              <span className="topic-body">{t.body}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
