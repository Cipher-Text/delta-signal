import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../lib/api';
import { routes, type Alert } from '@delta-signal/contracts';
import { titleCase } from '../../../../lib/format';

const SEVERITY_BADGE: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING:   'warning',
  WATCH:     'warning',
  INFO:      'info',
};

const SEVERITY_STRIP: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING:   'warning',
  WATCH:     'warning',
  INFO:      'info',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'success',
  EXPIRED:   'muted',
  CANCELLED: 'muted',
  DRAFT:     'muted',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function AlertDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const alertOrNull = await apiGet<Alert>(routes.alerts.detail(params.id), 60).catch(() => null);

  if (!alertOrNull) notFound();
  const alert = alertOrNull;

  const isActive = alert.status === 'ACTIVE';
  const stripClass = SEVERITY_STRIP[alert.severity] ?? 'info';

  return (
    <>
      <Link className="back-link" href="/alerts">
        ← All alerts
      </Link>

      {isActive && (
        <div className={`alert-strip ${stripClass}`} role="alert">
          {titleCase(alert.severity)} alert — {alert.district?.name ?? 'Nationwide'}
        </div>
      )}

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className={`tag ${SEVERITY_BADGE[alert.severity] ?? 'info'}`}>
            {titleCase(alert.severity)}
          </span>
          <span className={`tag ${STATUS_BADGE[alert.status] ?? 'muted'}`}>
            {titleCase(alert.status)}
          </span>
        </div>
        <h1>{alert.title}</h1>
        <div className="report-detail-meta">
          <span>{alert.district ? `${alert.district.name}, ${alert.district.division?.name}` : 'Nationwide'}</span>
          <span>Issued {formatDate(alert.issuedAt)}</span>
          {alert.expiresAt && <span>Expires {formatDate(alert.expiresAt)}</span>}
        </div>
      </div>

      <article className="panel">
        <h2>Details</h2>
        <p className="report-description">{alert.description}</p>
      </article>

      {alert.instructions && (
        <article className="panel">
          <h2>Instructions</h2>
          <p className="report-description">{alert.instructions}</p>
        </article>
      )}

      <div className="access-note">
        <strong>Get notified about alerts like this</strong>
        <span>
          Manage your alert subscriptions in your{' '}
          <Link href="/profile">profile</Link>.
          {alert.district && ` You can subscribe specifically to ${alert.district.name}.`}
        </span>
      </div>
    </>
  );
}
