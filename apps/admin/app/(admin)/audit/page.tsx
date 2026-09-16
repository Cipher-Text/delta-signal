import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';

const PAGE_SIZE = 50;

interface AuditEvent {
  id: string;
  action: string;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { displayName: string; email: string; role: string } | null;
}

interface PaginatedResponse {
  data: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_VARIANT: Record<string, string> = {
  USER_REGISTER: 'tag-info',
  USER_LOGIN: 'tag-muted',
  USER_LOGIN_FAILED: 'tag-danger',
  USER_LOGOUT: 'tag-muted',
  USER_ROLE_CHANGE: 'tag-warning',
  USER_DEACTIVATE: 'tag-danger',
  REPORT_SUBMIT: 'tag-info',
  REPORT_STATUS_CHANGE: 'tag-warning',
  REPORT_COMMENT_ADD: 'tag-muted',
  REPORT_MEDIA_ADD: 'tag-muted',
  ALERT_CREATE: 'tag-warning',
  ALERT_STATUS_CHANGE: 'tag-warning',
  DATASET_ACCESS: 'tag-info',
  DATASET_DOWNLOAD: 'tag-info',
  DATASET_UPDATE: 'tag-warning',
  OBSERVATION_SUBMIT: 'tag-info',
  OBSERVATION_TRUST_CHANGE: 'tag-warning',
  OBSERVATION_UPDATE: 'tag-muted',
  OBSERVATION_DELETE: 'tag-danger',
  RESTORATION_PROJECT_CREATE: 'tag-info',
  RESTORATION_PROJECT_UPDATE: 'tag-warning',
  RESTORATION_PROJECT_JOIN: 'tag-muted',
  DATASET_ACCESS_DECISION: 'tag-warning',
  PERMISSION_GRANT: 'tag-danger',
  PERMISSION_REVOKE: 'tag-danger',
};

const ENTITY_TYPES = [
  'User', 'CitizenReport', 'Alert', 'Observation',
  'RestorationProject', 'Dataset', 'Permission',
];

const ACTIONS = [
  'USER_REGISTER', 'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT',
  'USER_ROLE_CHANGE', 'USER_DEACTIVATE',
  'REPORT_SUBMIT', 'REPORT_STATUS_CHANGE',
  'ALERT_CREATE', 'ALERT_STATUS_CHANGE',
  'OBSERVATION_SUBMIT', 'OBSERVATION_TRUST_CHANGE', 'OBSERVATION_DELETE',
  'RESTORATION_PROJECT_CREATE', 'RESTORATION_PROJECT_JOIN',
  'DATASET_ACCESS', 'DATASET_DOWNLOAD', 'DATASET_UPDATE', 'DATASET_ACCESS_DECISION',
  'PERMISSION_GRANT', 'PERMISSION_REVOKE',
];

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AuditPage(
  props: {
    searchParams: Promise<{
      page?: string;
      action?: string;
      entityType?: string;
      userId?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const { action, entityType, userId } = searchParams;

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(userId ? { userId } : {}),
  });

  const result = await apiGet<PaginatedResponse>(`/api/v1/users/audit-events?${qs}`, accessToken);
  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  function pageUrl(p: number) {
    const params = new URLSearchParams({ page: String(p) });
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    if (userId) params.set('userId', userId);
    return `/audit?${params}`;
  }

  const hasFilters = !!(action || entityType || userId);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>
            Immutable record of all platform actions — {result.total.toLocaleString()} events
            {hasFilters && ' (filtered)'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="filter-bar">
        <select name="action" className="filter-select" defaultValue={action ?? ''}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{titleCase(a)}</option>
          ))}
        </select>
        <select name="entityType" className="filter-select" defaultValue={entityType ?? ''}>
          <option value="">All entities</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <input
          name="userId"
          type="text"
          placeholder="Filter by user ID…"
          defaultValue={userId ?? ''}
          className="filter-input filter-input-sm"
        />
        <button type="submit" className="btn btn-secondary">Filter</button>
        {hasFilters && (
          <Link href="/audit" className="btn btn-ghost">Clear</Link>
        )}
      </form>

      {/* Audit table */}
      <div className="data-table">
        <div className="data-table-head">
          <span>Timestamp</span>
          <span>Action</span>
          <span>Actor</span>
          <span>Entity</span>
          <span>IP</span>
          <span>Detail</span>
        </div>

        {result.data.length === 0 ? (
          <div className="empty-state">No audit events match the current filters.</div>
        ) : (
          result.data.map((event) => (
            <div className="data-table-row" key={event.id}>
              <span className="audit-timestamp">{formatDateTime(event.createdAt)}</span>
              <span>
                <span className={`tag ${ACTION_VARIANT[event.action] ?? 'tag-muted'}`}>
                  {titleCase(event.action)}
                </span>
              </span>
              <span className="audit-actor">
                {event.user ? (
                  <>
                    <strong>{event.user.displayName}</strong>
                    <small>{event.user.email}</small>
                  </>
                ) : (
                  <span className="muted">System</span>
                )}
              </span>
              <span className="audit-entity">
                {event.entityType && (
                  <span className="tag tag-muted">{event.entityType}</span>
                )}
                {event.entityId && (
                  <code className="audit-entity-id">{event.entityId.slice(-8)}</code>
                )}
              </span>
              <span className="audit-ip">{event.ipAddress ?? '—'}</span>
              <span className="audit-meta">
                {event.meta ? (
                  <code className="audit-meta-json">
                    {JSON.stringify(event.meta).slice(0, 80)}
                  </code>
                ) : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="btn btn-ghost">← Previous</Link>
          )}
          <span className="page-info">Page {page} of {totalPages} ({result.total.toLocaleString()} events)</span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="btn btn-ghost">Next →</Link>
          )}
        </div>
      )}
    </>
  );
}
