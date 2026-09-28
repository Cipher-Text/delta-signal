import Link from 'next/link';
import { routes, type PlatformMetrics } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

export default async function HeroSection() {
  let metrics: PlatformMetrics | null = null;
  try {
    metrics = await apiGet<PlatformMetrics>(routes.metrics.platform);
  } catch {
    // hero still renders — live bar is additive, not load-bearing
  }

  const hasEmergency = (metrics?.emergencyAlerts ?? 0) > 0;

  return (
    <section className="public-hero" aria-label="Platform overview">
      <div className="public-hero-layout">
        <div className="public-hero-copy">
          <p className="eyebrow">Environmental intelligence · Bangladesh</p>
          <h1>Understand Bangladesh’s environment, place by place.</h1>
          <p className="public-hero-description">
            Explore environmental observations, local reports, forecasts and research with their sources and geographic context.
          </p>

          <div className="button-row">
            <Link className="button" href="/map">
              Explore the map <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button ghost" href="/data">
              Browse datasets
            </Link>
          </div>

          <p className="hero-open-note">
            An independent public platform. Sources and update times are shown with each view.
          </p>
        </div>

        <aside className="hero-snapshot" aria-label="Delta Signal platform snapshot">
          <div className="hero-snapshot-header">
            <div>
              <p className="hero-snapshot-kicker">Platform snapshot</p>
              <h2>Bangladesh signal</h2>
            </div>
            <span className={`hero-snapshot-state${hasEmergency ? ' is-critical' : ''}`}>
              <span className="hero-live-dot" aria-hidden="true" />
              {metrics ? (hasEmergency ? 'Urgent alerts' : 'Monitoring') : 'Status unavailable'}
            </span>
          </div>

          {metrics ? (
            <>
              <Link className="hero-alert-summary" href="/alerts">
                <span className="hero-alert-summary-label">Active alerts</span>
                <strong>{metrics.activeAlerts.toLocaleString()}</strong>
                <span className="hero-alert-summary-link">Review alerts <span aria-hidden="true">→</span></span>
              </Link>
              <div className="hero-snapshot-stats">
                <div>
                  <strong>{metrics.districtsWithResearchGradeObservations.toLocaleString()}</strong>
                  <span>districts with research-grade observations</span>
                </div>
                <div>
                  <strong>{metrics.verifiedReports.toLocaleString()}</strong>
                  <span>verified public reports</span>
                </div>
              </div>
              <p className="hero-snapshot-footnote">Counts describe platform records, not environmental condition.</p>
            </>
          ) : (
            <p className="hero-snapshot-unavailable" role="status">
              The platform snapshot is temporarily unavailable. You can still explore the map and public datasets.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
