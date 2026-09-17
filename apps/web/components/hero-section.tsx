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
      <p className="eyebrow">Public Environmental Intelligence · Bangladesh</p>
      <h1>Understand Bangladesh’s environment, place by place.</h1>

      {metrics && (
        <div className="hero-live-bar" role="status" aria-label="Current platform statistics">
          {hasEmergency && (
            <span className="hero-live-stat hero-live-stat--emergency">
              <span className="hero-live-dot hero-live-dot--danger" aria-hidden="true" />
              {metrics.emergencyAlerts} emergency alert{metrics.emergencyAlerts > 1 ? 's' : ''}
            </span>
          )}
          <span className="hero-live-stat">
            <span
              className={`hero-live-dot${!hasEmergency ? ' hero-live-dot--pulse' : ''}`}
              aria-hidden="true"
            />
            {metrics.activeAlerts} active alert{metrics.activeAlerts !== 1 ? 's' : ''}
          </span>
          <span className="hero-live-stat hero-live-stat--divider">
            {metrics.districtsWithResearchGradeObservations} district{metrics.districtsWithResearchGradeObservations !== 1 ? 's' : ''} covered
          </span>
        </div>
      )}

      <div className="button-row">
        <Link className="button" href="/map">
          Explore live map
        </Link>
        <Link className="button ghost" href="/alerts">
          View alerts
        </Link>
      </div>

      <p className="hero-open-note">
        Independent public platform — not a government service. Data sources and update times are shown with each view.{' '}
        <Link href="/data">Browse datasets →</Link>
      </p>
    </section>
  );
}
