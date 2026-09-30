const SOURCES = [
  { name: 'Open-Meteo', body: 'Weather, climate and marine forecasts' },
  { name: 'GloFAS · Copernicus', body: 'River discharge forecasts' },
  { name: 'GBIF', body: 'Biodiversity occurrence records' },
] as const;

export default function DataSourcesSection() {
  return (
    <section className="data-sources-section public-section" aria-label="Where the data comes from">
      <div className="section-intro">
        <h2>Where the data comes from</h2>
      </div>
      <div className="data-sources-grid">
        {SOURCES.map((s) => (
          <div key={s.name} className="data-source-card">
            <strong>{s.name}</strong>
            <span>{s.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
