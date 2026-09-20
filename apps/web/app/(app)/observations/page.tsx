import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { submitObservationAction } from '../../../lib/observation-actions';
import { routes, type Observation, type PaginatedEnvelope } from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../lib/format';
import DistrictSelect, { type DistrictWithDivision } from '../../../components/district-select';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

const CATEGORIES = [
  'BIODIVERSITY',
  'WATER_QUALITY',
  'AIR_QUALITY',
  'LAND_USE',
  'RESTORATION',
] as const;

const TRUST_VARIANT: Record<string, string> = {
  RESEARCH_GRADE: 'success',
  COMMUNITY: 'info',
  UNVERIFIED: 'muted',
  FLAGGED: 'danger',
};

type DistrictOption = DistrictWithDivision;

export default async function ObservationsPage(
  props: {
    searchParams: Promise<{ category?: string; trustLevel?: string; districtId?: string; page?: string; submitted?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const category = searchParams.category;
  const { trustLevel, districtId } = searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const observationParams = new URLSearchParams();
  if (category) observationParams.set('category', category);
  if (trustLevel) observationParams.set('trustLevel', trustLevel);
  if (districtId) observationParams.set('districtId', districtId);
  observationParams.set('page', String(page));
  observationParams.set('pageSize', '20');
  const observationsPath = observationParams.toString() ? `${routes.observations.list}?${observationParams}` : routes.observations.list;

  const [observationsRes, user] = await Promise.all([
    apiGet<PaginatedEnvelope<Observation>>(observationsPath),
    getCurrentUser(),
  ]);

  const districts = await apiGet<DistrictOption[]>(routes.locations.districts).catch(() => []);

  return (
    <>
      <PageHeader title="Observations" description="Environmental observations from citizens and researchers." />

      <div className="toolbar" aria-label="Category filter">
        <Link className={`chip${!category ? ' active' : ''}`} href={`/observations${trustLevel || districtId ? `?${new URLSearchParams({ ...(trustLevel ? { trustLevel } : {}), ...(districtId ? { districtId } : {}) }).toString()}` : ''}`}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            className={`chip${category === c ? ' active' : ''}`}
            href={`/observations?${new URLSearchParams({ category: c, ...(trustLevel ? { trustLevel } : {}), ...(districtId ? { districtId } : {}) }).toString()}`}
          >
            {titleCase(c)}
          </Link>
        ))}
      </div>

      <ListResultToolbar total={observationsRes.total} label="observations" />

      <form className="toolbar" method="get" aria-label="Observation filters">
        {category && <input type="hidden" name="category" value={category} />}
        <label htmlFor="trustLevel">Trust</label>
        <select id="trustLevel" name="trustLevel" className="select-field" defaultValue={trustLevel ?? ''}>
          <option value="">All public records</option><option value="RESEARCH_GRADE">Research grade</option><option value="COMMUNITY">Community</option><option value="UNVERIFIED">Unverified</option>
        </select>
        <label htmlFor="observationDistrict">District</label>
        <select id="observationDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
          <option value="">All districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
      </form>

      <div className="table" role="table" aria-label="Observations">
        <div className="table-row table-head" role="row">
          <span>Observation</span>
          <span>Location</span>
          <span>Trust level</span>
          <span>Observed</span>
        </div>
        {observationsRes.data.map((o) => (
          <Link className="table-row table-row-link" role="row" key={o.id} href={`/observations/${o.id}`}>
            <span>{titleCase(o.category)}</span>
            <span>{o.district?.name ?? '—'}</span>
            <span className={`tag ${TRUST_VARIANT[o.trustLevel] ?? 'muted'}`}>
              {titleCase(o.trustLevel)}
            </span>
            <span>{relativeTime(o.observedAt)}</span>
          </Link>
        ))}
        {observationsRes.data.length === 0 && (
          <div className="empty-state">No observations match this category yet.</div>
        )}
      </div>
      <ListPagination pathname="/observations" page={observationsRes.page} pageSize={observationsRes.pageSize} total={observationsRes.total} query={{ category, trustLevel, districtId }} />

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Submit an observation</h2>
            <p>Submitted observations start as &quot;Unverified&quot; until a researcher or admin reviews them.</p>
          </div>
        </div>

        {searchParams.submitted && (
          <p className="form-success">
            Observation submitted — it&apos;s recorded as Unverified until a
            researcher or admin promotes its trust level.
          </p>
        )}
        {searchParams.error && <p className="form-error">{searchParams.error}</p>}

        <form action={submitObservationAction} className="submit-form">
          <div className="field">
            <label htmlFor="category">Observation type</label>
            <select id="category" name="category" className="select-field" required>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{titleCase(c)}</option>
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
              placeholder="Describe what you observed, when, and any evidence (at least 20 characters)" />
          </div>
          <button className="button" type="submit">
            Submit observation
          </button>
        </form>
      </article>
    </>
  );
}
