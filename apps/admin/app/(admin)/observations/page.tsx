import { cookies } from 'next/headers';
import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { updateTrustAction, deleteObservationAction } from '../../../lib/observation-actions';

const PAGE_SIZE = 25;

type TrustLevel = 'RESEARCH_GRADE' | 'COMMUNITY' | 'UNVERIFIED' | 'FLAGGED';
type ObsCategory = 'BIODIVERSITY' | 'WATER_QUALITY' | 'AIR_QUALITY' | 'LAND_USE' | 'RESTORATION';

interface Observation {
  id: string;
  category: ObsCategory;
  trustLevel: TrustLevel;
  description: string;
  species: string | null;
  lat: number | null;
  lng: number | null;
  observedAt: string;
  createdAt: string;
  observer: { id: string; displayName: string } | null;
  district: { id: string; name: string; division?: { name: string } } | null;
}

interface PaginatedResponse {
  data: Observation[];
  total: number;
  page: number;
  pageSize: number;
}

const TRUST_TABS: { value: TrustLevel | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'RESEARCH_GRADE', label: 'Research Grade' },
  { value: 'FLAGGED', label: 'Flagged' },
];

const TRUST_BADGE: Record<TrustLevel, string> = {
  RESEARCH_GRADE: 'tag-success',
  COMMUNITY: 'tag-info',
  UNVERIFIED: 'tag-muted',
  FLAGGED: 'tag-danger',
};

const TRUST_ACTIONS: Record<TrustLevel, { to: TrustLevel; label: string }[]> = {
  UNVERIFIED: [
    { to: 'COMMUNITY', label: 'Elevate to Community' },
    { to: 'RESEARCH_GRADE', label: 'Mark Research Grade' },
    { to: 'FLAGGED', label: 'Flag' },
  ],
  COMMUNITY: [
    { to: 'RESEARCH_GRADE', label: 'Elevate to Research Grade' },
    { to: 'UNVERIFIED', label: 'Demote to Unverified' },
    { to: 'FLAGGED', label: 'Flag' },
  ],
  RESEARCH_GRADE: [
    { to: 'COMMUNITY', label: 'Demote to Community' },
    { to: 'FLAGGED', label: 'Flag' },
  ],
  FLAGGED: [
    { to: 'UNVERIFIED', label: 'Unflag' },
    { to: 'COMMUNITY', label: 'Clear to Community' },
  ],
};

const CATEGORIES: ObsCategory[] = [
  'BIODIVERSITY', 'WATER_QUALITY', 'AIR_QUALITY', 'LAND_USE', 'RESTORATION',
];

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

export default async function ObservationsPage(
  props: {
    searchParams: Promise<{
      tab?: string;
      category?: string;
      page?: string;
      success?: string;
      error?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const tab = (searchParams.tab as TrustLevel | 'ALL') ?? 'UNVERIFIED';
  const category = searchParams.category ?? '';
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(tab !== 'ALL' ? { trustLevel: tab } : {}),
    ...(category ? { category } : {}),
  });

  const result = await apiGet<PaginatedResponse>(`/api/v1/observations?${qs}`, accessToken);
  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  function tabUrl(t: string) {
    const params = new URLSearchParams({ tab: t });
    if (category) params.set('category', category);
    return `/observations?${params}`;
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams({ page: String(p), tab });
    if (category) params.set('category', category);
    return `/observations?${params}`;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Observation Moderation</h1>
          <p>Review field observations and manage data trust levels</p>
        </div>
      </div>

      {searchParams.success === 'trust' && (
        <div className="flash flash-success">Trust level updated.</div>
      )}
      {searchParams.success === 'deleted' && (
        <div className="flash flash-success">Observation deleted.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      {/* Status tabs */}
      <div className="tab-bar">
        {TRUST_TABS.map((t) => (
          <Link
            key={t.value}
            href={tabUrl(t.value)}
            className={`tab-link${tab === t.value ? ' active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Category filter */}
      <form method="get" className="filter-bar">
        <input type="hidden" name="tab" value={tab} />
        <select name="category" className="filter-select" defaultValue={category}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{titleCase(c)}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">Filter</button>
        {category && (
          <Link href={tabUrl(tab)} className="btn btn-ghost">Clear</Link>
        )}
      </form>

      <div className="table-wrapper">
        {result.data.length === 0 ? (
          <div className="empty-state">
            No {tab !== 'ALL' ? titleCase(tab).toLowerCase() : ''} observations.
          </div>
        ) : (
          result.data.map((obs) => (
            <div key={obs.id} className="obs-admin-row">
              <div className="obs-admin-header">
                <div className="obs-admin-tags">
                  <span className={`tag ${TRUST_BADGE[obs.trustLevel]}`}>
                    {titleCase(obs.trustLevel)}
                  </span>
                  <span className="tag tag-muted">{titleCase(obs.category)}</span>
                  {obs.species && (
                    <span className="tag tag-info">
                      <em>{obs.species}</em>
                    </span>
                  )}
                </div>
                <span className="obs-admin-meta">
                  {obs.observer?.displayName ?? 'Anonymous'} ·{' '}
                  {obs.district
                    ? `${obs.district.name}, ${obs.district.division?.name ?? ''}`
                    : 'No location'}{' '}
                  · {relativeTime(obs.createdAt)}
                </span>
              </div>

              <p className="obs-admin-description">{obs.description}</p>

              <div className="obs-admin-actions">
                {/* Trust-level transitions */}
                {TRUST_ACTIONS[obs.trustLevel].map((action) => (
                  <form key={action.to} action={updateTrustAction}>
                    <input type="hidden" name="id" value={obs.id} />
                    <input type="hidden" name="trustLevel" value={action.to} />
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="category" value={category} />
                    <input type="hidden" name="page" value={String(page)} />
                    <button type="submit" className="btn btn-secondary btn-sm">
                      {action.label}
                    </button>
                  </form>
                ))}

                {/* Delete with confirmation */}
                <details className="deactivate-details">
                  <summary className="btn btn-danger-outline btn-sm">Delete</summary>
                  <div className="deactivate-confirm">
                    <p>Permanently delete this observation? This cannot be undone.</p>
                    <form action={deleteObservationAction}>
                      <input type="hidden" name="id" value={obs.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="category" value={category} />
                      <input type="hidden" name="page" value={String(page)} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        Confirm delete
                      </button>
                    </form>
                  </div>
                </details>
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
          <span className="page-info">
            Page {page} of {totalPages} ({result.total} observations)
          </span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="btn btn-ghost">Next →</Link>
          )}
        </div>
      )}
    </>
  );
}
