import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { createAlertAction, cancelAlertAction, editAlertAction } from '../../../lib/alert-actions';

const PAGE_SIZE = 20;

type AlertStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
type AlertSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'EMERGENCY';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  instructions: string | null;
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
  district: { id: string; name: string; division: { id: string; name: string } } | null;
}

interface PaginatedResponse {
  data: Alert[];
  total: number;
  page: number;
  pageSize: number;
}

interface District {
  id: string;
  name: string;
  division?: { id: string; name: string };
}

const STATUS_TABS: { value: AlertStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const SEVERITIES: AlertSeverity[] = ['INFO', 'WATCH', 'WARNING', 'EMERGENCY'];

const SEV_BADGE: Record<AlertSeverity, string> = {
  EMERGENCY: 'sev-emergency',
  WARNING: 'sev-warning',
  WATCH: 'sev-watch',
  INFO: 'sev-info',
};

const STATUS_BADGE: Record<AlertStatus, string> = {
  ACTIVE: 'alert-status-active',
  CANCELLED: 'alert-status-cancelled',
  EXPIRED: 'alert-status-expired',
};

function titleCase(str: string) {
  return str.charAt(0) + str.slice(1).toLowerCase();
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AlertsPage(
  props: {
    searchParams: Promise<{ tab?: string; page?: string; success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const activeTab =
    (STATUS_TABS.find((t) => t.value === searchParams.tab)?.value ?? 'ACTIVE') as AlertStatus;
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const [mainRes, ...countAndDistricts] = await Promise.all([
    apiGet<PaginatedResponse>(
      `/api/v1/alerts?status=${activeTab}&page=${page}&pageSize=${PAGE_SIZE}`,
      accessToken,
    ),
    ...STATUS_TABS.map((t) =>
      apiGet<PaginatedResponse>(`/api/v1/alerts?status=${t.value}&pageSize=1`, accessToken)
        .then((r) => ({ kind: 'count' as const, status: t.value as AlertStatus, total: r.total }))
        .catch(() => ({ kind: 'count' as const, status: t.value as AlertStatus, total: 0 })),
    ),
    apiGet<District[]>('/api/v1/locations/districts', accessToken)
      .then((d) => ({ kind: 'districts' as const, data: d }))
      .catch(() => ({ kind: 'districts' as const, data: [] as District[] })),
  ]);

  const countMap: Record<string, number> = {};
  let districts: District[] = [];
  for (const item of countAndDistricts) {
    if (item.kind === 'count') countMap[item.status] = item.total;
    else districts = item.data;
  }

  const totalPages = Math.ceil(mainRes.total / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <h1>Alert Management</h1>
        <p>Issue, monitor, and cancel environmental alerts. Activating an alert dispatches email notifications.</p>
      </div>

      {/* ── Create form ── */}
      <details className="create-panel" {...(searchParams.error ? { open: true } : {})}>
        <summary className="create-panel-summary">
          <span className="create-panel-label">+ New Alert</span>
          <span className="create-panel-hint">Issue a new alert — goes live immediately</span>
        </summary>

        <div className="create-panel-body">
          {searchParams.error && (
            <div className="flash flash-error">{searchParams.error}</div>
          )}
          <form action={createAlertAction} className="alert-form">
            <div className="form-row">
              <div className="field field-grow">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="e.g. Flash flood warning — Sylhet division"
                />
              </div>
              <div className="field field-fixed">
                <label htmlFor="severity">Severity</label>
                <select id="severity" name="severity" className="role-select" required>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                required
                minLength={20}
                maxLength={5000}
                rows={3}
                className="note-input"
                style={{ width: '100%' }}
                placeholder="Describe the situation, affected areas, and current conditions (min 20 characters)"
              />
            </div>

            <div className="field">
              <label htmlFor="instructions">
                Instructions <span className="field-optional">(optional)</span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                maxLength={2000}
                rows={2}
                className="note-input"
                style={{ width: '100%' }}
                placeholder="What should people do? e.g. Avoid low-lying areas, move to higher ground"
              />
            </div>

            <div className="form-row">
              <div className="field field-grow">
                <label htmlFor="districtId">
                  District <span className="field-optional">(optional — leave blank for nationwide)</span>
                </label>
                <select id="districtId" name="districtId" className="role-select">
                  <option value="">Nationwide (all districts)</option>
                  {(() => {
                    const grouped = new Map<string, District[]>();
                    for (const d of districts) {
                      const div = d.division?.name ?? 'Other';
                      if (!grouped.has(div)) grouped.set(div, []);
                      grouped.get(div)!.push(d);
                    }
                    return [...grouped.entries()].map(([divName, divDistricts]) => (
                      <optgroup key={divName} label={divName}>
                        {divDistricts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>
              <div className="field field-fixed">
                <label htmlFor="expiresAt">
                  Expires <span className="field-optional">(optional)</span>
                </label>
                <input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                  className="role-select"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-danger">
                Issue alert
              </button>
              <p className="form-actions-note">
                Alert goes live immediately and subscribers are notified by email.
              </p>
            </div>
          </form>
        </div>
      </details>

      {/* ── Flash ── */}
      {searchParams.success === 'created' && (
        <div className="flash flash-success">Alert issued and notifications dispatched.</div>
      )}
      {searchParams.success === 'cancelled' && (
        <div className="flash flash-success">Alert cancelled.</div>
      )}
      {searchParams.success === 'edited' && (
        <div className="flash flash-success">Alert updated.</div>
      )}

      {/* ── Status tabs ── */}
      <div className="tab-bar">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={`/alerts?tab=${t.value}`}
            className={`tab${activeTab === t.value ? ' active' : ''}`}
          >
            {t.label}
            <span className="count">{countMap[t.value] ?? 0}</span>
          </Link>
        ))}
      </div>

      {/* ── Alert list ── */}
      <div className="table-wrapper">
        {mainRes.data.length === 0 ? (
          <div className="empty-state">No {titleCase(activeTab)} alerts.</div>
        ) : (
          mainRes.data.map((alert) => (
            <div key={alert.id} className={`alert-row sev-border-${alert.severity.toLowerCase()}`}>
              <div className="alert-row-header">
                <div className="alert-badges">
                  <span className={`badge ${SEV_BADGE[alert.severity]}`}>{alert.severity}</span>
                  <span className={`badge ${STATUS_BADGE[alert.status]}`}>
                    {titleCase(alert.status)}
                  </span>
                </div>
                <span className="alert-meta">
                  {alert.district
                    ? `${alert.district.name}, ${alert.district.division.name}`
                    : 'Nationwide'}
                  {' · '}issued {relativeTime(alert.issuedAt)}
                  {alert.expiresAt && ` · expires ${formatDateTime(alert.expiresAt)}`}
                </span>
              </div>

              <div className="alert-title">{alert.title}</div>
              <div className="alert-description">{alert.description}</div>

              {alert.instructions && (
                <div className="alert-instructions">
                  <strong>Instructions:</strong> {alert.instructions}
                </div>
              )}

              {alert.status === 'ACTIVE' && (
                <div className="alert-actions">
                  {/* Edit instructions / expiry */}
                  <details className="deactivate-details">
                    <summary className="btn btn-secondary btn-sm">Edit</summary>
                    <div className="deactivate-confirm">
                      <form action={editAlertAction} className="alert-edit-form">
                        <input type="hidden" name="id" value={alert.id} />
                        <input type="hidden" name="tab" value={activeTab} />
                        <div className="field">
                          <label htmlFor={`instructions-${alert.id}`}>Instructions</label>
                          <textarea
                            id={`instructions-${alert.id}`}
                            name="instructions"
                            rows={2}
                            className="note-input"
                            style={{ width: '100%' }}
                            defaultValue={alert.instructions ?? ''}
                            maxLength={2000}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`expires-${alert.id}`}>Expiry (optional)</label>
                          <input
                            id={`expires-${alert.id}`}
                            name="expiresAt"
                            type="datetime-local"
                            className="role-select"
                            defaultValue={
                              alert.expiresAt
                                ? new Date(alert.expiresAt).toISOString().slice(0, 16)
                                : ''
                            }
                          />
                        </div>
                        <button type="submit" className="btn btn-secondary btn-sm">
                          Save changes
                        </button>
                      </form>
                    </div>
                  </details>

                  {/* Cancel with confirmation */}
                  <details className="deactivate-details">
                    <summary className="btn btn-danger-outline btn-sm">Cancel alert</summary>
                    <div className="deactivate-confirm">
                      <p>
                        Cancel <strong>{alert.title}</strong>? Subscribers will not be
                        notified of the cancellation.
                      </p>
                      <form action={cancelAlertAction}>
                        <input type="hidden" name="id" value={alert.id} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          Confirm cancel
                        </button>
                      </form>
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={`/alerts?tab=${activeTab}&page=${page - 1}`} className="btn btn-ghost">
              Previous
            </Link>
          )}
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/alerts?tab=${activeTab}&page=${page + 1}`} className="btn btn-ghost">
              Next
            </Link>
          )}
        </div>
      )}
    </>
  );
}
