import Link from 'next/link';
import { routes, type Alert, type AlertSeverity, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import { formatDhakaCompact, formatDhakaDateTime } from '../lib/format';
import StatusBadge, { type StatusLevel } from './status-badge';

/**
 * Site-wide banners are reserved for Warning and above (docs/DESIGN.md §23).
 * Most severe first; labels follow the API's severity names and the UI reference.
 */
const BANNER_SEVERITIES: Array<{ severity: AlertSeverity; level: StatusLevel; label: string }> = [
  { severity: 'EMERGENCY', level: 'critical', label: 'Emergency' },
  { severity: 'WARNING', level: 'warning', label: 'Warning' },
];

async function fetchLatest(severity: AlertSeverity): Promise<PaginatedEnvelope<Alert>> {
  return apiGet<PaginatedEnvelope<Alert>>(
    `${routes.alerts.list}?status=ACTIVE&severity=${severity}&pageSize=1`,
  );
}

/**
 * One compact row: the single most severe active alert plus a count of the rest,
 * as in the UI reference. Renders nothing when there is nothing at Warning or above.
 */
export default async function EmergencyBanner() {
  const results = await Promise.allSettled(BANNER_SEVERITIES.map((s) => fetchLatest(s.severity)));

  const loaded = results.flatMap((r, i) =>
    r.status === 'fulfilled' ? [{ ...BANNER_SEVERITIES[i], res: r.value }] : [],
  );
  const top = loaded.find((l) => l.res.data.length > 0);
  if (!top) return null;

  const alert = top.res.data[0];
  const totalActive = loaded.reduce((sum, l) => sum + l.res.total, 0);
  const more = Math.max(0, totalActive - 1);

  return (
    <div
      className={`alert-bar alert-bar--${top.level}`}
      role="region"
      aria-label={`Active ${top.label.toLowerCase()} alert`}
    >
      <StatusBadge level={top.level}>{top.label}</StatusBadge>
      <span className="alert-bar-text">
        <Link href={`/alerts/${alert.id}`} className="alert-bar-title">
          {alert.title}
        </Link>
        <span className="alert-bar-meta">
          {alert.district ? ` · ${alert.district.name}` : ''} · issued{' '}
          <time dateTime={alert.issuedAt} title={formatDhakaDateTime(alert.issuedAt)}>
            {formatDhakaCompact(alert.issuedAt)}
          </time>
        </span>
      </span>
      <Link href="/alerts" className="alert-bar-link">
        {more > 0 ? `+${more} more active ${more === 1 ? 'alert' : 'alerts'} · ` : ''}View alerts →
      </Link>
    </div>
  );
}
