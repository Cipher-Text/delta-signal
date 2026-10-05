import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { createRestorationProjectAction, joinRestorationProjectAction } from '../../../lib/restoration-actions';
import {
  routes,
  type PaginatedEnvelope,
  type RestorationCategory,
  type RestorationProjectListResponse,
  type ProjectStatus,
} from '@delta-signal/contracts';
import { dhakaDate, pluralize } from '../../../lib/format';
import type { DistrictWithDivision } from '../../../components/district-select';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';
import RegisterDrawer from '../../../components/restoration/register-drawer';

type Query = { category?: string; status?: string; districtId?: string; page?: string; created?: string; joined?: string; error?: string };

const CATEGORIES: { value: RestorationCategory; label: string; tint: string }[] = [
  { value: 'TREE_PLANTING', label: 'Tree planting', tint: 'bio' },
  { value: 'WETLAND_RESTORATION', label: 'Wetland restoration', tint: 'water' },
  { value: 'RIVERBANK_PROTECTION', label: 'Riverbank protection', tint: 'water' },
  { value: 'MANGROVE', label: 'Mangrove', tint: 'bio' },
  { value: 'WASTE_MANAGEMENT', label: 'Waste management', tint: 'earth' },
  { value: 'OTHER', label: 'Other', tint: 'neutral' },
];

const STATUSES: { value: ProjectStatus; label: string; dot: string; hollow?: boolean }[] = [
  { value: 'ACTIVE', label: 'Active', dot: '#2E9B66' },
  { value: 'PLANNED', label: 'Planned', dot: '#3388C7' },
  { value: 'PAUSED', label: 'Paused', dot: '#7B8782', hollow: true },
  { value: 'COMPLETED', label: 'Completed', dot: '#5F6F68', hollow: true },
];

const CREATOR_ROLES = new Set(['ORGANIZATION_ADMIN', 'ADMIN']);

function groupByDivision(districts: DistrictWithDivision[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  for (const d of districts) {
    const div = d.division?.name ?? 'Other';
    if (!map.has(div)) map.set(div, []);
    map.get(div)!.push({ id: d.id, name: d.name });
  }
  return [...map.entries()].map(([division, list]) => ({ division, districts: list }));
}

function datesLabel(start: string | null, end: string | null, status: ProjectStatus): string {
  if (start && end) return status === 'COMPLETED' ? `${dhakaDate(start)} – ${dhakaDate(end)}` : `Started ${dhakaDate(start)} · ends ${dhakaDate(end)}`;
  if (start) return `Started ${dhakaDate(start)}`;
  if (end) return `Ends ${dhakaDate(end)}`;
  return 'No dates set';
}

function href(q: Query, patch: Partial<Query>) {
  const next = { ...q, ...patch };
  const params = new URLSearchParams();
  if (next.category) params.set('category', next.category);
  if (next.status) params.set('status', next.status);
  if (next.districtId) params.set('districtId', next.districtId);
  const s = params.toString();
  return s ? `/restoration?${s}` : '/restoration';
}

/** Restoration directory (Web UI Reference): stats, category segments, status/district filters, project cards, register drawer. */
export default async function RestorationPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const category = CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined;
  const status = STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;
  const districtId = sp.districtId || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q: Query = { category, status, districtId };

  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  const canCreate = user !== null && CREATOR_ROLES.has(user.role);

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  if (districtId) params.set('districtId', districtId);
  const path = `${routes.restoration.projects}?${params}`;
  const empty: RestorationProjectListResponse = {
    data: [], total: 0, page: 1, pageSize: 20,
    stats: { active: 0, planned: 0, paused: 0, completed: 0, participants: 0 }, categoryCounts: {},
  };

  const [res, districts, organizations] = await Promise.all([
    (user ? apiGetAuthed<RestorationProjectListResponse>(path, accessToken) : apiGet<RestorationProjectListResponse>(path, 0)).catch(() => empty),
    apiGet<DistrictWithDivision[]>(routes.locations.districts, 3600).catch((): DistrictWithDivision[] => []),
    canCreate
      ? apiGetAuthed<PaginatedEnvelope<{ id: string; name: string }>>(`${routes.organizations.list}?pageSize=100`, accessToken)
          .then((r) => r.data)
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const tiles = [
    { label: 'Active projects', value: res.stats.active },
    { label: 'Planned', value: res.stats.planned },
    { label: 'Completed', value: res.stats.completed },
    { label: 'Participants', value: res.stats.participants },
  ];
  const everyone = CATEGORIES.reduce((n, c) => n + (res.categoryCounts[c.value] ?? 0), 0);
  const segments = [
    { key: '', label: 'All', count: everyone },
    ...CATEGORIES.map((c) => ({ key: c.value as string, label: c.label, count: res.categoryCounts[c.value] ?? 0 })).filter(
      (s) => s.count > 0 || s.key === category,
    ),
  ];
  const districtName = districts.find((d) => d.id === districtId)?.name;
  const chips: { label: string; href: string; aria: string }[] = [];
  if (status) chips.push({ label: `Status: ${STATUSES.find((s) => s.value === status)?.label}`, href: href(q, { status: undefined }), aria: 'Remove status filter' });
  if (districtId) chips.push({ label: `District: ${districtName ?? '…'}`, href: href(q, { districtId: undefined }), aria: 'Remove district filter' });

  return (
    <div className="page-stack rs-page">
      <PageHeader
        title="Restoration"
        description={<><span className="rs-sub-long">Conservation and restoration projects you can follow or join.</span><span className="rs-sub-short">Projects you can follow or join</span></>}
        action={
          canCreate && (
            <RegisterDrawer
              action={createRestorationProjectAction}
              categories={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              districts={groupByDivision(districts)}
              organizations={organizations}
            />
          )
        }
      />

      {sp.joined && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />You&apos;ve joined the project.</div>}
      {sp.created && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Project registered.</div>}
      {sp.error && <div className="pf-notice pf-notice--err" role="alert">{sp.error}</div>}

      <dl className="rs-stats">
        {tiles.map((t) => (
          <div key={t.label} className="rs-stat">
            <dt>{t.label}</dt>
            <dd data-zero={t.value === 0}>{t.value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      <div className="rs-controls">
        <nav className="dt-seg rs-seg" aria-label="Category">
          {segments.map((s) => (
            <Link key={s.key} href={href(q, { category: s.key || undefined })} aria-current={(category ?? '') === s.key ? 'true' : undefined}>
              {s.label}
              <span>{s.count}</span>
            </Link>
          ))}
        </nav>
        <form method="get" action="/restoration" className="rs-filters">
          {category && <input type="hidden" name="category" value={category} />}
          <label>
            <span className="rs-lab">Status</span>
            <AutoSubmitSelect name="status" aria-label="Status" defaultValue={status ?? ''}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <label>
            <span className="rs-lab">District</span>
            <AutoSubmitSelect name="districtId" aria-label="District" defaultValue={districtId ?? ''}>
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </AutoSubmitSelect>
          </label>
        </form>
      </div>

      <div className="rs-count-row">
        <span className="rs-count">{pluralize(res.total, 'project')} · active first</span>
        {chips.length > 0 && (
          <div className="dt-chips">
            <span>Filtered by</span>
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="dt-chip" aria-label={c.aria}>
                {c.label}
                <NavIcon name="close" />
              </Link>
            ))}
            <Link href={href({}, { category })} className="dt-clear">Clear all</Link>
          </div>
        )}
      </div>

      {res.data.length === 0 ? (
        <EmptyState
          title="No projects match."
          description="Try another category, status or district."
          action={category || status || districtId ? <Link className="org-apply" href="/restoration">Clear filters</Link> : undefined}
        />
      ) : (
        <ul className="rs-grid">
          {res.data.map((p) => {
            const cat = CATEGORIES.find((c) => c.value === p.category);
            const st = STATUSES.find((s) => s.value === p.status);
            const open = p.status === 'ACTIVE' || p.status === 'PLANNED';
            return (
              <li key={p.id} className="rs-card">
                <div className="rs-card-tags">
                  <span className={`org-pill org-pill--${cat?.tint ?? 'neutral'}`}>{cat?.label ?? p.category}</span>
                  <span className="rs-status">
                    <span className="rs-dot" data-hollow={st?.hollow ? 'true' : undefined} style={{ ['--dot' as string]: st?.dot }} aria-hidden="true" />
                    {st?.label ?? p.status}
                  </span>
                </div>
                <h3><Link href={`/restoration/${p.id}`}>{p.title}</Link></h3>
                <p className="rs-where">
                  <NavIcon name="organizations" />
                  {p.organization?.name ?? 'No organization'}
                  <span aria-hidden="true">·</span>
                  <NavIcon name="locations" />
                  {p.district?.name ?? 'District not set'}
                </p>
                <p className={`rs-desc${p.description ? '' : ' rs-muted'}`}>{p.description || 'No description yet.'}</p>
                <div className="rs-meta">
                  <span>{datesLabel(p.startDate, p.endDate, p.status)}</span>
                  {p.impactSummary && <span><b>Impact:</b> {p.impactSummary}</span>}
                </div>
                <div className="rs-card-foot">
                  <span className="rs-people"><NavIcon name="members" />{pluralize(p._count.participants, 'participant')}</span>
                  {open &&
                    (p.joinedByMe ? (
                      <span className="rs-joined"><NavIcon name="check" />Joined</span>
                    ) : user ? (
                      <form action={joinRestorationProjectAction}>
                        <input type="hidden" name="projectId" value={p.id} />
                        <button type="submit" className="pf-btn-outline">Join project</button>
                      </form>
                    ) : (
                      <Link href="/login?next=/restoration" className="pf-btn-outline">Sign in to join</Link>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ListPagination pathname="/restoration" page={res.page} pageSize={res.pageSize} total={res.total} query={q} />
    </div>
  );
}
