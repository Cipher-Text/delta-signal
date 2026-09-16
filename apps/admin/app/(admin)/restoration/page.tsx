import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { updateProjectStatusAction } from '../../../lib/restoration-admin-actions';

const PAGE_SIZE = 20;

type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
type RestorationCategory =
  | 'TREE_PLANTING'
  | 'WETLAND_RESTORATION'
  | 'RIVERBANK_PROTECTION'
  | 'MANGROVE'
  | 'WASTE_MANAGEMENT'
  | 'OTHER';

interface Project {
  id: string;
  title: string;
  description: string;
  category: RestorationCategory;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
  district: { id: string; name: string; division?: { name: string } } | null;
  _count: { participants: number };
}

interface PaginatedResponse {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_TABS: { value: ProjectStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE: 'tag-success',
  PLANNED: 'tag-info',
  PAUSED: 'tag-warning',
  COMPLETED: 'tag-muted',
};

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNED: ['ACTIVE', 'PAUSED'],
  ACTIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['ACTIVE', 'COMPLETED'],
  COMPLETED: [],
};

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default async function RestorationAdminPage(
  props: {
    searchParams: Promise<{ tab?: string; page?: string; success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const tab = (searchParams.tab as ProjectStatus | 'ALL') ?? 'ALL';
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(tab !== 'ALL' ? { status: tab } : {}),
  });

  const result = await apiGet<PaginatedResponse>(`/api/v1/restoration/projects?${qs}`, accessToken);
  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  function tabUrl(t: string) {
    return `/restoration?tab=${t}`;
  }

  function pageUrl(p: number) {
    return `/restoration?tab=${tab}&page=${p}`;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Restoration Projects</h1>
          <p>{result.total} total projects across all organizations</p>
        </div>
      </div>

      {searchParams.success === 'status' && (
        <div className="flash flash-success">Project status updated.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      <div className="tab-bar">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={tabUrl(t.value)}
            className={`tab-link${tab === t.value ? ' active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="table-wrapper">
        {result.data.length === 0 ? (
          <div className="empty-state">No projects with status {tab !== 'ALL' ? titleCase(tab) : ''}.</div>
        ) : (
          result.data.map((project) => (
            <div key={project.id} className="obs-admin-row">
              <div className="obs-admin-header">
                <div className="obs-admin-tags">
                  <span className={`tag ${STATUS_BADGE[project.status]}`}>
                    {titleCase(project.status)}
                  </span>
                  <span className="tag tag-muted">{titleCase(project.category)}</span>
                  {project._count.participants > 0 && (
                    <span className="tag tag-info">
                      {project._count.participants} participant{project._count.participants !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="obs-admin-meta">
                  {project.organization?.name ?? 'No organization'} ·{' '}
                  {project.district
                    ? `${project.district.name}, ${project.district.division?.name ?? ''}`
                    : 'No location'}{' '}
                  · Created {relativeTime(project.createdAt)}
                  {formatDate(project.startDate) && ` · Starts ${formatDate(project.startDate)}`}
                </span>
              </div>

              <strong className="obs-admin-title">{project.title}</strong>
              <p className="obs-admin-description">{project.description.slice(0, 200)}{project.description.length > 200 ? '…' : ''}</p>

              <div className="obs-admin-actions">
                {STATUS_TRANSITIONS[project.status].map((nextStatus) => (
                  <form key={nextStatus} action={updateProjectStatusAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="page" value={String(page)} />
                    <button type="submit" className="btn btn-secondary btn-sm">
                      → {titleCase(nextStatus)}
                    </button>
                  </form>
                ))}
                <Link
                  href={`/restoration/${project.id}`}
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View public page ↗
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="btn btn-ghost">← Previous</Link>
          )}
          <span className="page-info">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="btn btn-ghost">Next →</Link>
          )}
        </div>
      )}
    </>
  );
}
