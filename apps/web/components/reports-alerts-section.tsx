import Link from 'next/link';
import { routes, type CitizenReport, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import { titleCase, relativeTime } from '../lib/format';

const SEVERITY_CLASS: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'warning',
  INFO: 'info',
};

interface PreviewItem {
  title: string;
  meta: string;
  severityClass?: string;
}

/**
 * `isLive: false` means the API itself was unreachable. The caller keeps this
 * distinct from a real empty list so an outage is never presented as "none yet".
 */
async function loadReports(): Promise<{ items: PreviewItem[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?pageSize=3`);
    return {
      isLive: true,
      items: res.data.map((r) => ({
        title: r.title,
        meta: `${r.district?.name ?? 'Nationwide'} · ${titleCase(r.status)} ${relativeTime(r.updatedAt)}`,
      })),
    };
  } catch {
    return { isLive: false, items: [] };
  }
}

async function loadAlerts(): Promise<{ items: PreviewItem[]; isLive: boolean }> {
  try {
    const res = await apiGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?pageSize=3`);
    return {
      isLive: true,
      items: res.data.map((a) => ({
        title: a.title,
        meta: `${titleCase(a.severity)} severity · issued ${relativeTime(a.issuedAt)}`,
        severityClass: SEVERITY_CLASS[a.severity],
      })),
    };
  } catch {
    return { isLive: false, items: [] };
  }
}

export default async function ReportsAlertsSection() {
  const [reports, alerts] = await Promise.all([loadReports(), loadAlerts()]);
  const noReports = reports.isLive && reports.items.length === 0;
  const noAlerts = alerts.isLive && alerts.items.length === 0;

  return (
    <section
      id="reports"
      className="public-grid public-section"
      aria-label="Reports and alerts"
    >
      {/* ── Verified reports ── */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Verified reports</h2>
            <p>Public users see only reviewed environmental issues.</p>
          </div>
          <Link className="button ghost" href="/reports">
            View all
          </Link>
        </div>

        <div className="record-list">
          {!reports.isLive && <div className="empty-state" role="status">Verified reports are temporarily unavailable.</div>}
          {noReports && <div className="empty-state">No verified reports yet.</div>}
          {reports.items.map((r) => (
            <div key={r.title} className="record-item">
              <strong>{r.title}</strong>
              <span>{r.meta}</span>
            </div>
          ))}
        </div>

        <Link className="button ghost gated-action" href="/login">
          Sign in to submit a report
        </Link>
      </article>

      {/* ── Active alerts ── */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Active alerts</h2>
            <p>Public warnings, concise and easy to scan.</p>
          </div>
          <Link className="button ghost" href="/alerts">
            View all alerts
          </Link>
        </div>

        <div className="record-list">
          {!alerts.isLive && <div className="empty-state" role="status">Alert data is temporarily unavailable.</div>}
          {noAlerts && <div className="empty-state">No active alerts right now.</div>}
          {alerts.items.map((a) => (
            <div key={a.title} className="record-item">
              <strong className={a.severityClass ?? ''}>{a.title}</strong>
              <span>{a.meta}</span>
            </div>
          ))}
        </div>

        <Link className="button ghost gated-action" href="/alerts">
          See all alerts
        </Link>
      </article>
    </section>
  );
}
