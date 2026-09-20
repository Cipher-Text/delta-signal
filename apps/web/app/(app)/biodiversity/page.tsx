import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type Species, type Occurrence, type PaginatedEnvelope } from '@delta-signal/contracts';
import { relativeTime } from '../../../lib/format';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

export default async function BiodiversityPage(
  props: {
    searchParams: Promise<{ search?: string; districtId?: string; speciesPage?: string; occurrencePage?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const search = searchParams.search;
  const districtId = searchParams.districtId;
  const speciesPage = Math.max(1, Number(searchParams.speciesPage ?? 1) || 1);
  const occurrencePage = Math.max(1, Number(searchParams.occurrencePage ?? 1) || 1);
  const speciesPath = search
    ? `${routes.biodiversity.species}?search=${encodeURIComponent(search)}&page=${speciesPage}&pageSize=20`
    : `${routes.biodiversity.species}?page=${speciesPage}&pageSize=20`;

  const [speciesRes, occurrencesRes] = await Promise.all([
    apiGet<PaginatedEnvelope<Species>>(speciesPath),
    apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?page=${occurrencePage}&pageSize=10${districtId ? `&districtId=${districtId}` : ''}`),
  ]);
  const districts = await apiGet<{ id: string; name: string }[]>(routes.locations.districts, 3600).catch(() => []);

  return (
    <>
      <PageHeader title="Biodiversity" description="Species and occurrence records synced daily from GBIF." />

      <div className="metric-grid">
        <div className="metric">
          <span>Species recorded</span>
          <strong>{speciesRes.total}</strong>
        </div>
        <div className="metric">
          <span>Occurrence records</span>
          <strong>{occurrencesRes.total}</strong>
        </div>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Species</h2>
            <p>Search by scientific or common name</p>
          </div>
        </div>
        <form method="get" className="search-row">
          <div className="field">
            <label htmlFor="search">Search species</label>
            <input id="search" name="search" type="text" defaultValue={search} placeholder="e.g. Heritiera fomes" />
          </div>
          <button className="button ghost" type="submit">
            Search
          </button>
        </form>

        <ListResultToolbar total={speciesRes.total} label="species" />

        <div className="table" role="table" aria-label="Species">
          <div className="table-row table-head" role="row">
            <span>Species</span>
            <span>Common name</span>
            <span>Family</span>
            <span>Occurrences</span>
          </div>
          {speciesRes.data.map((s) => (
            <Link className="table-row table-row-link" role="row" key={s.id} href={`/biodiversity/species/${s.id}`}>
              <strong><em>{s.canonicalName}</em></strong>
              <span>{s.vernacularName ?? '—'}</span>
              <span>{s.family ?? '—'}</span>
              <span>{s._count.occurrences}</span>
            </Link>
          ))}
          {speciesRes.data.length === 0 && (
            <div className="empty-state">No species match this search yet.</div>
          )}
        </div>
        <ListPagination pathname="/biodiversity" page={speciesRes.page} pageSize={speciesRes.pageSize} total={speciesRes.total} query={{ search, districtId, occurrencePage: String(occurrencePage) }} pageParam="speciesPage" />
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent occurrence records</h2>
            <p>Latest synced sightings</p>
          </div>
        </div>
        <ListResultToolbar total={occurrencesRes.total} label="occurrence records" />
        <form className="toolbar" method="get" aria-label="Occurrence filters">
          {search && <input type="hidden" name="search" value={search} />}
          <label htmlFor="occurrenceDistrict">District</label>
          <select id="occurrenceDistrict" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
            <option value="">All Bangladesh</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="button" type="submit">Apply</button>
        </form>
        <div className="table" role="table" aria-label="Occurrence records">
          <div className="table-row table-head" role="row">
            <span>Species</span>
            <span>Location</span>
            <span>Recorded</span>
            <span>Basis</span>
          </div>
          {occurrencesRes.data.map((o) => (
            <div className="table-row" role="row" key={o.id}>
              <strong>{o.species.canonicalName}</strong>
              <span>{o.district?.name ?? '—'}</span>
              <span>{o.observedAt ? relativeTime(o.observedAt) : '—'}</span>
              <span>{o.basisOfRecord ?? '—'}</span>
            </div>
          ))}
          {occurrencesRes.data.length === 0 && (
            <div className="empty-state">
              No occurrence records yet — the daily GBIF sync hasn&apos;t run.
            </div>
          )}
        </div>
        <ListPagination pathname="/biodiversity" page={occurrencesRes.page} pageSize={occurrencesRes.pageSize} total={occurrencesRes.total} query={{ search, districtId, speciesPage: String(speciesPage) }} pageParam="occurrencePage" />
      </article>
    </>
  );
}
