import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';

const PAGE_SIZE = 30;

type JobStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'QUEUED' | 'CANCELLED';

interface IngestionJob {
  id: string;
  status: JobStatus;
  startedAt: string | null;
  endedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  provider: { id: string; name: string; type: string };
}

interface PaginatedResponse {
  data: IngestionJob[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_TABS: { value: JobStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'QUEUED', label: 'Queued' },
];

const STATUS_BADGE: Record<JobStatus, string> = {
  RUNNING: 'badge-under-review',
  SUCCEEDED: 'badge-verified',
  FAILED: 'badge-rejected',
  QUEUED: 'badge-submitted',
  CANCELLED: 'badge-rejected',
};

function duration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const end = endedAt ? new Date(endedAt) : new Date();
  const ms = end.getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function titleCase(str: string) {
  return str.charAt(0) + str.slice(1).toLowerCase();
}

export default async function IngestionPage(
  props: {
    searchParams: Promise<{ tab?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const activeTab = (STATUS_TABS.find((t) => t.value === searchParams.tab)?.value ?? 'ALL') as JobStatus | 'ALL';
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const statusParam = activeTab === 'ALL' ? '' : `&status=${activeTab}`;
  const [mainRes, ...countResults] = await Promise.all([
    apiGet<PaginatedResponse>(
      `/api/v1/ingestion/jobs?page=${page}&pageSize=${PAGE_SIZE}${statusParam}`,
      accessToken,
    ).catch(() => ({ data: [] as IngestionJob[], total: 0, page: 1, pageSize: PAGE_SIZE })),
    ...(['RUNNING', 'SUCCEEDED', 'FAILED', 'QUEUED'] as JobStatus[]).map((s) =>
      apiGet<PaginatedResponse>(`/api/v1/ingestion/jobs?status=${s}&pageSize=1`, accessToken)
        .then((r) => ({ status: s, total: r.total }))
        .catch(() => ({ status: s, total: 0 })),
    ),
  ]);

  const countMap = Object.fromEntries(countResults.map((c) => [c.status, c.total]));
  const totalPages = Math.ceil(mainRes.total / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <h1>Ingestion Jobs</h1>
        <p>Live view of data ingestion runs — weather, biodiversity, and future providers.</p>
      </div>

      <div className="tab-bar">
        {STATUS_TABS.map((t) => (
          <a
            key={t.value}
            href={`/ingestion?tab=${t.value}`}
            className={`tab${activeTab === t.value ? ' active' : ''}`}
          >
            {t.label}
            {t.value !== 'ALL' && (
              <span className="count">{countMap[t.value] ?? 0}</span>
            )}
          </a>
        ))}
      </div>

      <div className="table-wrapper">
        {mainRes.data.length === 0 ? (
          <div className="empty-state">
            {activeTab === 'ALL'
              ? 'No ingestion jobs yet — jobs appear here once a scheduled sync runs.'
              : `No ${titleCase(activeTab)} jobs.`}
          </div>
        ) : (
          mainRes.data.map((job) => (
            <div key={job.id} className="report-row">
              <div className="report-meta">
                <div className="report-title-row">
                  <span className={`badge ${STATUS_BADGE[job.status]}`}>
                    {titleCase(job.status)}
                  </span>
                  <span className="report-title">{job.provider.name}</span>
                </div>
                <div className="report-subtitle">
                  {job.provider.type.replace(/_/g, ' ')}
                  {' · '}started {job.startedAt ? relativeTime(job.startedAt) : relativeTime(job.createdAt)}
                  {' · '}duration: {duration(job.startedAt, job.endedAt)}
                </div>
                {job.errorMsg && (
                  <div className="report-subtitle" style={{ color: 'var(--red-600)', marginTop: '4px' }}>
                    Error: {job.errorMsg}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <a href={`/ingestion?tab=${activeTab}&page=${page - 1}`} className="btn btn-ghost">
              Previous
            </a>
          )}
          <span className="page-info">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/ingestion?tab=${activeTab}&page=${page + 1}`} className="btn btn-ghost">
              Next
            </a>
          )}
        </div>
      )}
    </>
  );
}
