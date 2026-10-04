import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { dhakaDate, dhakaTime, titleCase } from '../../../lib/format';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';
import StatusBadge, { type StatusLevel } from '../../../components/status-badge';

const SEVERITIES = ['EMERGENCY', 'WARNING', 'WATCH', 'INFO'] as const;

const ALERT_TYPES = [
  'FLOOD', 'FLASH_FLOOD', 'CYCLONE', 'STORM_SURGE', 'HEATWAVE', 'AIR_QUALITY',
  'WATER_POLLUTION', 'LANDSLIDE', 'DROUGHT', 'WILDFIRE', 'OTHER',
] as const;

// Watch and Warning are distinct levels (§9.1); INFO is neutral.
const SEVERITY_LEVEL: Record<string, StatusLevel> = {
  EMERGENCY: 'critical',
  WARNING: 'warning',
  WATCH: 'watch',
  INFO: 'unknown',
};

// Alerts are safety-critical: keep the cache short so new and cancelled alerts show within a minute.
const ALERTS_REVALIDATE_SECONDS = 60;
const HISTORY_PAGE_SIZE = 10;

export default async function AlertsPage(
  props: {
    searchParams: Promise<{ severity?: string; alertType?: string; districtId?: string; page?: string; historyPage?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const severity = searchParams.severity;
  const { alertType, districtId } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(searchParams.historyPage ?? 1) || 1);

  const alertParams = new URLSearchParams();
  if (severity) alertParams.set('severity', severity);
  if (alertType) alertParams.set('alertType', alertType);
  if (districtId) alertParams.set('districtId', districtId);
  alertParams.set('page', String(page));
  alertParams.set('pageSize', '20');

  const [activeRes, historyRes, districts] = await Promise.all([
    apiGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?${alertParams}`, ALERTS_REVALIDATE_SECONDS),
    apiGet<PaginatedEnvelope<Alert>>(
      `${routes.alerts.list}?status=EXPIRED&page=${historyPage}&pageSize=${HISTORY_PAGE_SIZE}`,
      ALERTS_REVALIDATE_SECONDS,
    ),
    apiGet<{ id: string; name: string }[]>(routes.locations.districts),
  ]);

  const emergency = activeRes.data.find((a) => a.severity === 'EMERGENCY');
  const checkedAt = `${dhakaTime(new Date().toISOString())}`;

  // Link to this page with some filters overridden; undefined removes a filter.
  const filterHref = (overrides: Partial<Record<'severity' | 'alertType' | 'districtId', string | undefined>>) => {
    const next = { severity, alertType, districtId, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const qs = params.toString();
    return `/alerts${qs ? `?${qs}` : ''}`;
  };

  const districtName = districts.find((d) => d.id === districtId)?.name;
  const hasFilters = Boolean(severity || alertType || districtId);
  const removableFilters = [
    alertType && { key: 'alertType', label: `Hazard: ${titleCase(alertType)}`, href: filterHref({ alertType: undefined }) },
    districtId && { key: 'districtId', label: `District: ${districtName ?? districtId}`, href: filterHref({ districtId: undefined }) },
  ].filter(Boolean) as { key: string; label: string; href: string }[];

  return (
    <>
      <PageHeader title="Alerts" description="Active disaster and environmental warnings for Bangladesh." />

      {emergency && (
        <Link className="alert-strip danger" href={`/alerts/${emergency.id}`} role="alert">
          {emergency.title} — {emergency.district?.name ?? 'Nationwide'} →
        </Link>
      )}

      <div className="toolbar" aria-label="Severity filter">
        <Link className={`chip${!severity ? ' active' : ''}`} href={filterHref({ severity: undefined })}>
          All
        </Link>
        {SEVERITIES.map((s) => (
          <Link key={s} className={`chip${severity === s ? ' active' : ''}`} href={filterHref({ severity: s })}>
            {titleCase(s)}
          </Link>
        ))}
      </div>

      <form className="toolbar" method="get" aria-label="Alert filters">
        {severity && <input type="hidden" name="severity" value={severity} />}
        <label className="filter-field" htmlFor="alertType">
          Hazard
          <select id="alertType" name="alertType" className="select-field" defaultValue={alertType ?? ''}>
            <option value="">All hazards</option>
            {ALERT_TYPES.map((v) => <option key={v} value={v}>{titleCase(v)}</option>)}
          </select>
        </label>
        <label className="filter-field" htmlFor="alertDistrict">
          District
          <select id="alertDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
            <option value="">All districts</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <button type="submit" className="button">Apply</button>
      </form>

      {removableFilters.length > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {removableFilters.map((f) => (
            <Link key={f.key} className="filter-pill" href={f.href} aria-label={`Remove filter ${f.label}`}>
              {f.label} <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link className="filter-clear" href="/alerts">Clear all</Link>
        </div>
      )}

      <ListResultToolbar total={activeRes.total} label={activeRes.total === 1 ? 'active alert' : 'active alerts'} />

      {activeRes.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No active alerts match these filters"
            description="Try a different hazard, district or severity."
            action={<Link className="button" href="/alerts">Clear all filters</Link>}
          />
        ) : (
          <EmptyState
            variant="healthy"
            title="No active alerts"
            description="Bangladesh environmental feeds currently show no active platform alerts."
            lastChecked={checkedAt}
          />
        )
      ) : (
        <div className="alert-grid">
          {activeRes.data.map((a) => {
            const level = SEVERITY_LEVEL[a.severity] ?? 'unknown';
            return (
              <Link key={a.id} href={`/alerts/${a.id}`} className={`alert-card alert-card-link alert-card--${level}`}>
                <StatusBadge level={level}>{titleCase(a.severity)}</StatusBadge>
                <h2>{a.title}</h2>
                <p>{a.description}</p>
                <p className="muted">
                  {a.district?.name ?? 'Nationwide'} · Issued {dhakaDate(a.issuedAt)}
                  {a.expiresAt && ` · Expires ${dhakaDate(a.expiresAt)}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
      <ListPagination pathname="/alerts" page={activeRes.page} pageSize={activeRes.pageSize} total={activeRes.total} query={{ severity, alertType, districtId, historyPage: historyPage > 1 ? String(historyPage) : undefined }} />

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Alert history</h2>
            <p>Expired alerts</p>
          </div>
        </div>
        {historyRes.data.length === 0 ? (
          <EmptyState title="No expired alerts yet" description="Alerts move here once they expire." />
        ) : (
          <div className="table" role="table" aria-label="Alert history">
            <div className="table-row table-head" role="row">
              <span>Alert</span>
              <span>Area</span>
              <span>Severity</span>
              <span>Status</span>
            </div>
            {historyRes.data.map((a) => (
              <Link className="table-row table-row-link" role="row" key={a.id} href={`/alerts/${a.id}`}>
                <strong>{a.title}</strong>
                <span>{a.district?.name ?? 'Nationwide'}</span>
                <span><StatusBadge level={SEVERITY_LEVEL[a.severity] ?? 'unknown'}>{titleCase(a.severity)}</StatusBadge></span>
                <span className="tag muted">{titleCase(a.status)}</span>
              </Link>
            ))}
          </div>
        )}
        <ListPagination
          pathname="/alerts"
          page={historyRes.page}
          pageSize={HISTORY_PAGE_SIZE}
          total={historyRes.total}
          query={{ severity, alertType, districtId, page: page > 1 ? String(page) : undefined }}
          pageParam="historyPage"
        />
      </article>

      <div className="access-note">
        <strong>Get notified about alerts</strong>
        <span>
          Visit your{' '}
          <Link href="/profile">profile</Link>{' '}
          to subscribe to district or nationwide alert emails.
        </span>
      </div>
    </>
  );
}
