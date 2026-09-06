import { routes, type PlatformMetrics } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

interface Metric {
  label: string;
  value: string;
  note: string;
  noteVariant?: 'warning' | 'danger' | 'success';
  highlight?: boolean;
}

async function loadMetrics(): Promise<{ metrics: Metric[]; isLive: boolean }> {
  try {
    const m = await apiGet<PlatformMetrics>(routes.metrics.platform);

    return { isLive: true, metrics: [
      {
        label: 'Verified reports',
        value: m.verifiedReports.toLocaleString(),
        note: 'Reviewed records only',
      },
      {
        label: 'Public datasets',
        value: m.publicDatasets.toLocaleString(),
        note: 'Catalog records with public preview',
      },
      {
        label: 'Research-grade observations',
        value: m.researchGradeObservations.toLocaleString(),
        note: `Across ${m.districtsWithResearchGradeObservations} districts`,
      },
      {
        label: 'Active restoration projects',
        value: m.activeRestorationProjects.toLocaleString(),
        note: 'Active or planned across all districts',
      },
    ] };
  } catch {
    return { isLive: false, metrics: [] };
  }
}

export default async function MetricsSection() {
  const { metrics, isLive } = await loadMetrics();

  return (
    <section
      id="dashboard"
      className="metrics-section public-section"
      aria-label="Platform coverage"
    >
      <div className="section-intro">
        <p className="eyebrow">About the public record</p>
        <h2>Platform coverage</h2>
        <p>These counts describe what Delta Signal contains, not Bangladesh’s environmental condition.</p>
      </div>
      <div className="metric-grid">
      {!isLive && (
        <div className="metric metric-unavailable" role="status">
          <span>Platform snapshot</span>
          <strong>Temporarily unavailable</strong>
          <small>Live platform totals could not be retrieved. Please try again shortly.</small>
        </div>
      )}
      {metrics.map((m) => (
        <article key={m.label} className={`metric${m.highlight ? ' highlight-metric' : ''}`}>
          <span>{m.label}</span>
          <strong>{m.value}</strong>
          <small className={m.noteVariant ?? ''}>{m.note}</small>
        </article>
      ))}
      </div>
    </section>
  );
}
