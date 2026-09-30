import Link from 'next/link';

const SOURCES = [
  { name: 'Open-Meteo', body: 'Weather, climate and marine forecasts' },
  { name: 'GloFAS · Copernicus', body: 'River discharge forecasts' },
  { name: 'GBIF', body: 'Biodiversity occurrence records' },
] as const;

export default function DataSourcesSection() {
  return (
    <section className="data-sources-section" aria-label="Where the data comes from">
      <div className="data-sources-inner">
        <div className="data-sources-title">
          <h2>Where the data comes from</h2>
          <Link href="/methodology">Methodology →</Link>
        </div>
        {SOURCES.map((s) => (
          <div key={s.name} className="data-source-item">
            <strong>{s.name}</strong>
            <span>{s.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
