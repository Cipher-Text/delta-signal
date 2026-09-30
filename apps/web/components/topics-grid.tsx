import Link from 'next/link';

const TOPICS = [
  { href: '/locations', label: 'Weather & climate', body: 'Temperature, rainfall and UV by division and district.' },
  { href: '/water-bodies', label: 'Rivers & water', body: 'River discharge forecasts and water bodies.' },
  { href: '/locations', label: 'Air quality', body: 'Fine particulate levels for all 64 districts.' },
  { href: '/biodiversity', label: 'Biodiversity', body: 'Species occurrence records from GBIF.' },
  { href: '/marine', label: 'Marine', body: 'Bay of Bengal wave and sea-surface forecasts.' },
  { href: '/emissions', label: 'Emissions', body: 'Emissions inventory by sector and area.' },
] as const;

export default function TopicsGrid() {
  return (
    <section id="topics" className="topics-section public-section" aria-label="Explore by topic">
      <div className="section-intro">
        <h2>Explore by topic</h2>
        <p>Each topic brings together maps, indicators and datasets.</p>
      </div>

      <div className="topics-grid">
        {TOPICS.map((t) => (
          <Link key={t.label} href={t.href} className="topic-card">
            <strong>{t.label}</strong>
            <span>{t.body}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
