import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../lib/api';
import { routes, type Observation } from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../../lib/format';

const TRUST_BADGE: Record<string, string> = {
  RESEARCH_GRADE: 'success',
  COMMUNITY:      'info',
  UNVERIFIED:     'muted',
  FLAGGED:        'danger',
};

const TRUST_DESCRIPTION: Record<string, string> = {
  RESEARCH_GRADE: 'Verified by a researcher or admin.',
  COMMUNITY:      'Reviewed and accepted by the community.',
  UNVERIFIED:     'Submitted but not yet reviewed.',
  FLAGGED:        'Flagged for review.',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ObservationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const observation = await apiGet<Observation>(
    routes.observations.detail(params.id),
    60,
  ).catch(() => null);

  if (!observation) notFound();

  return (
    <>
      <Link className="back-link" href="/observations">
        ← All observations
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className="tag">{titleCase(observation.category)}</span>
          <span className={`tag ${TRUST_BADGE[observation.trustLevel] ?? 'muted'}`}>
            {titleCase(observation.trustLevel)}
          </span>
        </div>
        <h1>
          {observation.species
            ? observation.species
            : `${titleCase(observation.category)} observation`}
        </h1>
        <div className="report-detail-meta">
          {observation.observer && (
            <span>By {observation.observer.displayName}</span>
          )}
          {observation.district && (
            <span>
              {observation.district.name}, {observation.district.division?.name}
            </span>
          )}
          <span>Observed {formatDate(observation.observedAt)}</span>
          <span>Submitted {relativeTime(observation.createdAt)}</span>
        </div>
      </div>

      <div className={`alert-strip ${TRUST_BADGE[observation.trustLevel] ?? 'info'}`}>
        {TRUST_DESCRIPTION[observation.trustLevel]}
      </div>

      <article className="panel">
        <h2>Description</h2>
        <p className="report-description">{observation.description}</p>
      </article>

      <article className="panel">
        <h2>Details</h2>
        <div className="obs-detail-grid">
          <div className="obs-detail-row">
            <span>Category</span>
            <strong>{titleCase(observation.category)}</strong>
          </div>
          {observation.species && (
            <div className="obs-detail-row">
              <span>Species</span>
              <strong>{observation.species}</strong>
            </div>
          )}
          <div className="obs-detail-row">
            <span>Location</span>
            <strong>
              {observation.district
                ? `${observation.district.name}, ${observation.district.division?.name}`
                : observation.lat != null
                  ? `${observation.lat.toFixed(4)}, ${observation.lng!.toFixed(4)}`
                  : 'Not specified'}
            </strong>
          </div>
          <div className="obs-detail-row">
            <span>Observed</span>
            <strong>{formatDate(observation.observedAt)}</strong>
          </div>
          <div className="obs-detail-row">
            <span>Submitted</span>
            <strong>{formatDate(observation.createdAt)}</strong>
          </div>
          {observation.observer && (
            <div className="obs-detail-row">
              <span>Observer</span>
              <strong>{observation.observer.displayName}</strong>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
