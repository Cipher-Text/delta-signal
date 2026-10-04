import Link from 'next/link';
import {
  routes,
  type Dataset,
  type DistrictSummary,
  type PaginatedEnvelope,
  type Species,
} from '@delta-signal/contracts';
import { apiGet } from '../../../lib/api';
import { titleCase } from '../../../lib/format';
import EmptyState from '../../../components/empty-state';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

const PER_GROUP = 8;

const matches = (q: string, ...fields: Array<string | null | undefined>) =>
  fields.some((f) => f?.toLowerCase().includes(q));

/** Global search (top bar): places, datasets and species. Species use the API's own search. */
export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await props.searchParams).q ?? '').trim();

  if (!q) {
    return (
      <>
        <PageHeader title="Search" description="Find places, datasets and species." />
        <EmptyState
          title="Search Delta Signal"
          description="Try a district such as “Sylhet”, a dataset such as “air quality”, or a species such as “myna”."
        />
      </>
    );
  }

  const needle = q.toLowerCase();
  const [districts, datasetsRes, speciesRes] = await Promise.all([
    apiGet<DistrictSummary[]>(routes.locations.districts).catch(() => []),
    apiGet<PaginatedEnvelope<Dataset>>(`${routes.datasets.list}?pageSize=100`).catch(() => null),
    apiGet<PaginatedEnvelope<Species>>(
      `${routes.biodiversity.species}?search=${encodeURIComponent(q)}&page=1&pageSize=${PER_GROUP}`,
    ).catch(() => null),
  ]);

  const placeHits = districts.filter((d) => matches(needle, d.name, d.bnName, d.division?.name));
  const datasetHits = (datasetsRes?.data ?? []).filter((d) =>
    matches(needle, d.name, d.description, d.source, d.category),
  );
  const speciesHits = speciesRes?.data ?? [];
  const speciesTotal = speciesRes?.total ?? 0;
  const total = placeHits.length + datasetHits.length + speciesTotal;

  return (
    <>
      <PageHeader title="Search" description={<>Results for “{q}”</>} />
      <ListResultToolbar total={total} label={total === 1 ? 'result' : 'results'} />

      {total === 0 && (
        <EmptyState
          title={`No results for “${q}”`}
          description="Check the spelling or try a broader term, such as a district, dataset or species name."
        />
      )}

      {placeHits.length > 0 && (
        <article className="panel search-group">
          <div className="panel-header"><div><h2>Places</h2><p>{placeHits.length === 1 ? '1 district' : `${placeHits.length} districts`}</p></div></div>
          <ul className="search-list">
            {placeHits.slice(0, PER_GROUP).map((d) => (
              <li key={d.id}>
                <Link href={`/locations/districts/${d.id}`}>
                  <strong>{d.name}</strong>
                  <span>{d.division?.name ? `${d.division.name} division` : 'District'}</span>
                </Link>
              </li>
            ))}
          </ul>
          {placeHits.length > PER_GROUP && <p className="search-more"><Link href="/locations">Browse all locations →</Link></p>}
        </article>
      )}

      {datasetHits.length > 0 && (
        <article className="panel search-group">
          <div className="panel-header"><div><h2>Datasets</h2><p>{datasetHits.length === 1 ? '1 dataset' : `${datasetHits.length} datasets`}</p></div></div>
          <ul className="search-list">
            {datasetHits.slice(0, PER_GROUP).map((d) => (
              <li key={d.id}>
                <Link href={`/data/${d.id}`}>
                  <strong>{d.name}</strong>
                  <span>{titleCase(d.category)}{d.provider?.name ? ` · ${d.provider.name}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
          {datasetHits.length > PER_GROUP && <p className="search-more"><Link href="/data">Browse all datasets →</Link></p>}
        </article>
      )}

      {speciesHits.length > 0 && (
        <article className="panel search-group">
          <div className="panel-header"><div><h2>Species</h2><p>{speciesTotal === 1 ? '1 taxon' : `${speciesTotal.toLocaleString()} taxa`}</p></div></div>
          <ul className="search-list">
            {speciesHits.map((s) => (
              <li key={s.id}>
                <Link href={`/biodiversity/species/${s.id}`}>
                  <strong>{s.vernacularName ?? s.canonicalName}</strong>
                  <span><em>{s.canonicalName}</em>{s.family ? ` · ${s.family}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
          {speciesTotal > PER_GROUP && (
            <p className="search-more"><Link href={`/biodiversity?search=${encodeURIComponent(q)}`}>See all {speciesTotal.toLocaleString()} species →</Link></p>
          )}
        </article>
      )}
    </>
  );
}
