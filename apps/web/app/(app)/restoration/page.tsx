import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { createRestorationProjectAction, joinRestorationProjectAction } from '../../../lib/restoration-actions';
import { routes, type RestorationProject, type PaginatedEnvelope } from '@delta-signal/contracts';
import { titleCase } from '../../../lib/format';
import DistrictSelect, { type DistrictWithDivision } from '../../../components/district-select';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';

const CATEGORIES = [
  'TREE_PLANTING',
  'WETLAND_RESTORATION',
  'RIVERBANK_PROTECTION',
  'MANGROVE',
  'WASTE_MANAGEMENT',
  'OTHER',
] as const;

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: 'success',
  COMPLETED: 'success',
  PLANNED: 'info',
  PAUSED: 'muted',
};

const CREATOR_ROLES = new Set(['ORGANIZATION_ADMIN', 'ADMIN']);

type DistrictOption = DistrictWithDivision;

interface OrganizationOption {
  id: string;
  name: string;
}

export default async function RestorationPage({
  searchParams,
}: {
  searchParams: { category?: string; status?: string; districtId?: string; page?: string; created?: string; joined?: string; error?: string };
}) {
  const category = searchParams.category;
  const { status, districtId } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const projectParams = new URLSearchParams();
  if (category) projectParams.set('category', category);
  if (status) projectParams.set('status', status);
  if (districtId) projectParams.set('districtId', districtId);
  projectParams.set('page', String(page));
  projectParams.set('pageSize', '20');
  const projectsPath = projectParams.toString() ? `${routes.restoration.projects}?${projectParams}` : routes.restoration.projects;

  const [projectsRes, user] = await Promise.all([
    apiGet<PaginatedEnvelope<RestorationProject>>(projectsPath),
    getCurrentUser(),
  ]);

  const canCreate = user !== null && CREATOR_ROLES.has(user.role);
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const [districts, organizations] = await Promise.all([
        apiGet<DistrictOption[]>(routes.locations.districts).catch(() => []),
        canCreate
          ? apiGetAuthed<PaginatedEnvelope<OrganizationOption>>(`${routes.organizations.list}?pageSize=100`, accessToken).then((res) => res.data).catch(() => [])
          : Promise.resolve([]),
      ]);

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Restoration</h1>
          <p>Conservation and restoration projects.</p>
        </div>
      </div>

      {searchParams.joined && <p className="form-success">You&apos;ve joined the project.</p>}
      {searchParams.created && <p className="form-success">Project created.</p>}
      {searchParams.error && <p className="form-error">{searchParams.error}</p>}

      <div className="toolbar" aria-label="Category filter">
        <Link className={`chip${!category ? ' active' : ''}`} href={`/restoration${status || districtId ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(districtId ? { districtId } : {}) }).toString()}` : ''}`}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            className={`chip${category === c ? ' active' : ''}`}
            href={`/restoration?${new URLSearchParams({ category: c, ...(status ? { status } : {}), ...(districtId ? { districtId } : {}) }).toString()}`}
          >
            {titleCase(c)}
          </Link>
        ))}
      </div>

      <ListResultToolbar total={projectsRes.total} label="restoration projects" />

      <form className="toolbar" method="get" aria-label="Restoration filters">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="projectStatus">Status</label>
        <select id="projectStatus" name="status" className="select-field" defaultValue={status ?? ''}>
          <option value="">All statuses</option><option value="PLANNED">Planned</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option>
        </select>
        <label htmlFor="projectDistrict">District</label>
        <select id="projectDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
          <option value="">All districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      <div className="table restoration-table" role="table" aria-label="Restoration projects">
        <div className="table-row table-head" role="row">
          <span>Project</span>
          <span>Organization / Location</span>
          <span>Status</span>
          <span>Participants</span>
        </div>
        {projectsRes.data.map((p) => (
          <div className="table-row" role="row" key={p.id}>
            <Link href={`/restoration/${p.id}`} className="table-title-link">{p.title}</Link>
            <span>
              {p.organization?.name ?? '—'}
              {p.district?.name ? ` · ${p.district.name}` : ''}
            </span>
            <span className={`tag ${STATUS_VARIANT[p.status] ?? 'muted'}`}>{titleCase(p.status)}</span>
            <span className="restoration-participants-cell">
              <span>{p._count.participants}</span>
              {user && !canCreate && (
                <form action={joinRestorationProjectAction}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <button className="button ghost" type="submit" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                    Join
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}
        {projectsRes.data.length === 0 && (
          <div className="empty-state">No restoration projects match this category yet.</div>
        )}
      </div>
      <ListPagination pathname="/restoration" page={projectsRes.page} pageSize={projectsRes.pageSize} total={projectsRes.total} query={{ category, status, districtId }} />

      {canCreate && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Register a restoration project</h2>
              <p>Visible to the public immediately — no moderation queue yet.</p>
            </div>
          </div>
          <form action={createRestorationProjectAction} className="submit-form">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" required minLength={5} maxLength={200}
                placeholder="e.g. Sundarbans mangrove buffer restoration" />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" className="select-field" required>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{titleCase(c)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="organizationId">Organization (optional)</label>
              <select id="organizationId" name="organizationId" className="select-field">
                <option value="">Not specified</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="districtId">District (optional)</label>
              <DistrictSelect districts={districts} />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" required minLength={20} maxLength={2000} rows={4}
                placeholder="What is this project doing, and where? (at least 20 characters)" />
            </div>
            <div className="field">
              <label htmlFor="impactSummary">Impact summary (optional)</label>
              <input id="impactSummary" name="impactSummary" type="text" maxLength={500}
                placeholder="e.g. 640 ha mangrove restored" />
            </div>
            <button className="button" type="submit">
              Register project
            </button>
          </form>
        </article>
      )}
    </>
  );
}
