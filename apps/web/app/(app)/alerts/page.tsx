import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { titleCase } from '../../../lib/format';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

const SEVERITIES = ['EMERGENCY', 'WARNING', 'WATCH', 'INFO'] as const;

const SEVERITY_CARD_CLASS: Record<string, string> = {
  EMERGENCY: 'danger-card',
  WARNING: 'warning-card',
  WATCH: 'warning-card',
  INFO: 'info-card',
};

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'warning',
  INFO: 'info',
};

export default async function AlertsPage(
  props: {
    searchParams: Promise<{ severity?: string; alertType?: string; districtId?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const severity = searchParams.severity;
  const { alertType, districtId } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const alertParams = new URLSearchParams();
  if (severity) alertParams.set('severity', severity);
  if (alertType) alertParams.set('alertType', alertType);
  if (districtId) alertParams.set('districtId', districtId);
  alertParams.set('page', String(page));
  alertParams.set('pageSize', '20');
  const activePath = alertParams.toString() ? `${routes.alerts.list}?${alertParams}` : routes.alerts.list;

  const [activeRes, historyRes, districts] = await Promise.all([
    apiGet<PaginatedEnvelope<Alert>>(activePath),
    apiGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?status=EXPIRED`),
    apiGet<{ id: string; name: string }[]>(routes.locations.districts),
  ]);

  const emergency = activeRes.data.find((a) => a.severity === 'EMERGENCY');

  return (
    <>
      <PageHeader title="Alerts" description="Active disaster and environmental warnings for Bangladesh." />

      {emergency && (
        <Link className="alert-strip danger" href={`/alerts/${emergency.id}`} role="alert">
          {emergency.title} — {emergency.district?.name ?? 'Nationwide'} →
        </Link>
      )}

      <div className="toolbar" aria-label="Severity filter">
        <Link className={`chip${!severity ? ' active' : ''}`} href={`/alerts${alertType || districtId ? `?${new URLSearchParams({ ...(alertType ? { alertType } : {}), ...(districtId ? { districtId } : {}) }).toString()}` : ''}`}>
          All
        </Link>
        {SEVERITIES.map((s) => (
          <Link
            key={s}
            className={`chip${severity === s ? ' active' : ''}`}
            href={`/alerts?${new URLSearchParams({ severity: s, ...(alertType ? { alertType } : {}), ...(districtId ? { districtId } : {}) }).toString()}`}
          >
            {titleCase(s)}
          </Link>
        ))}
      </div>

      <ListResultToolbar total={activeRes.total} label="active alerts" />

      <form className="toolbar" method="get" aria-label="Alert filters">
        {severity && <input type="hidden" name="severity" value={severity} />}
        <label htmlFor="alertType">Hazard</label>
        <select id="alertType" name="alertType" className="select-field" defaultValue={alertType ?? ''}>
          <option value="">All hazards</option>{['FLOOD','FLASH_FLOOD','CYCLONE','STORM_SURGE','HEATWAVE','AIR_QUALITY','WATER_POLLUTION','LANDSLIDE','DROUGHT','WILDFIRE','OTHER'].map((v) => <option key={v} value={v}>{titleCase(v)}</option>)}
        </select>
        <label htmlFor="alertDistrict">District</label>
        <select id="alertDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
          <option value="">All districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      <div className="alert-grid">
        {activeRes.data.map((a) => (
          <Link
            key={a.id}
            href={`/alerts/${a.id}`}
            className={`alert-card alert-card-link ${SEVERITY_CARD_CLASS[a.severity] ?? 'info-card'}`}
          >
            <span className={SEVERITY_BADGE_CLASS[a.severity] ?? 'info'}>
              {titleCase(a.severity)}
            </span>
            <h2>{a.title}</h2>
            <p>{a.description}</p>
            <p className="muted">
              {a.district?.name ?? 'Nationwide'} · Issued{' '}
              {new Date(a.issuedAt).toLocaleDateString()}
              {a.expiresAt && ` · Expires ${new Date(a.expiresAt).toLocaleDateString()}`}
            </p>
          </Link>
        ))}
        {activeRes.data.length === 0 && (
          <div className="empty-state">No active alerts at this severity.</div>
        )}
      </div>
      <ListPagination pathname="/alerts" page={activeRes.page} pageSize={activeRes.pageSize} total={activeRes.total} query={{ severity, alertType, districtId }} />

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Alert history</h2>
            <p>Expired alerts</p>
          </div>
        </div>
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
              <span className={`tag ${SEVERITY_BADGE_CLASS[a.severity] ?? 'info'}`}>
                {titleCase(a.severity)}
              </span>
              <span className="tag muted">{titleCase(a.status)}</span>
            </Link>
          ))}
          {historyRes.data.length === 0 && (
            <div className="empty-state">No expired alerts yet.</div>
          )}
        </div>
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
