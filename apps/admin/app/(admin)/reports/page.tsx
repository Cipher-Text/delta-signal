import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { updateReportStatusAction } from '../../../lib/report-actions';

const PAGE_SIZE = 20;

type ReportStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESOLVED';

interface Report {
  id: string;
  title: string;
  category: string;
  status: ReportStatus;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; displayName: string } | null;
  district: { id: string; name: string; division: { id: string; name: string } } | null;
}

interface PaginatedResponse {
  data: Report[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_TABS: { value: ReportStatus; label: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const TRANSITIONS: Record<
  ReportStatus,
  { status: ReportStatus; label: string; variant: string; notePlaceholder: string }[]
> = {
  SUBMITTED: [
    {
      status: 'UNDER_REVIEW',
      label: 'Start Review',
      variant: 'btn-secondary',
      notePlaceholder: 'Optional note for starting review...',
    },
  ],
  UNDER_REVIEW: [
    {
      status: 'VERIFIED',
      label: 'Verify',
      variant: 'btn-success',
      notePlaceholder: 'Optional note for verification...',
    },
    {
      status: 'REJECTED',
      label: 'Reject',
      variant: 'btn-danger',
      notePlaceholder: 'Reason for rejection (recommended)...',
    },
  ],
  VERIFIED: [
    {
      status: 'RESOLVED',
      label: 'Mark Resolved',
      variant: 'btn-success',
      notePlaceholder: 'Optional resolution summary...',
    },
  ],
  REJECTED: [],
  RESOLVED: [],
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  SUBMITTED: 'badge-submitted',
  UNDER_REVIEW: 'badge-under-review',
  VERIFIED: 'badge-verified',
  REJECTED: 'badge-rejected',
  RESOLVED: 'badge-resolved',
};

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function ReportsPage(
  props: {
    searchParams: Promise<{ tab?: string; page?: string; success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const activeTab =
    (STATUS_TABS.find((t) => t.value === searchParams.tab)?.value ?? 'SUBMITTED') as ReportStatus;
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const [mainRes, ...countResults] = await Promise.all([
    apiGet<PaginatedResponse>(
      `/api/v1/reports?status=${activeTab}&pageSize=${PAGE_SIZE}&page=${page}`,
      accessToken,
    ),
    ...STATUS_TABS.map((t) =>
      apiGet<PaginatedResponse>(`/api/v1/reports?status=${t.value}&pageSize=1`, accessToken)
        .then((r) => ({ status: t.value as ReportStatus, total: r.total }))
        .catch(() => ({ status: t.value as ReportStatus, total: 0 })),
    ),
  ]);

  const countMap = Object.fromEntries(countResults.map((c) => [c.status, c.total]));
  const totalPages = Math.ceil(mainRes.total / PAGE_SIZE);
  const transitions = TRANSITIONS[activeTab];

  return (
    <>
      <div className="page-header">
        <h1>Report Moderation</h1>
        <p>Review and action citizen-submitted environmental reports.</p>
      </div>

      {searchParams.success && (
        <div className="flash flash-success">Status updated successfully.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      <div className="tab-bar">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={`/reports?tab=${t.value}`}
            className={`tab${activeTab === t.value ? ' active' : ''}`}
          >
            {t.label}
            <span className="count">{countMap[t.value] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="table-wrapper">
        {mainRes.data.length === 0 ? (
          <div className="empty-state">
            No {titleCase(activeTab)} reports.
          </div>
        ) : (
          mainRes.data.map((report) => (
            <div key={report.id} className="report-row">
              <div className="report-meta">
                <div className="report-title-row">
                  <span className={`badge ${STATUS_BADGE[report.status]}`}>
                    {titleCase(report.status)}
                  </span>
                  <span className="report-title">{report.title}</span>
                </div>
                <div className="report-subtitle">
                  {titleCase(report.category)}
                  {report.district && ` · ${report.district.name}, ${report.district.division.name}`}
                  {report.reporter && ` · by ${report.reporter.displayName}`}
                  {` · submitted ${relativeTime(report.createdAt)}`}
                </div>
              </div>

              {transitions.length > 0 ? (
                <div className="actions">
                  {transitions.map((t) => (
                    <form
                      key={t.status}
                      action={updateReportStatusAction}
                      className="action-form"
                    >
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="status" value={t.status} />
                      <input type="hidden" name="returnTab" value={activeTab} />
                      <textarea
                        name="note"
                        className="note-input"
                        placeholder={t.notePlaceholder}
                        rows={2}
                      />
                      <button type="submit" className={`btn ${t.variant}`}>
                        {t.label}
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="terminal-note">Terminal status — no further actions.</p>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={`/reports?tab=${activeTab}&page=${page - 1}`} className="btn btn-ghost">
              Previous
            </Link>
          )}
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/reports?tab=${activeTab}&page=${page + 1}`} className="btn btn-ghost">
              Next
            </Link>
          )}
        </div>
      )}
    </>
  );
}
