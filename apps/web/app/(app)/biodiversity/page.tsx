import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import {
  routes,
  type DistrictSummary,
  type Occurrence,
  type PaginatedEnvelope,
  type Species,
} from '@delta-signal/contracts';
import { dhakaDate } from '../../../lib/format';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

const PAGE_SIZE_SPECIES = 20;
const PAGE_SIZE_OCCURRENCES = 10;

const IUCN: Record<string, { code: string; label: string }> = {
  LC: { code: 'LC', label: 'Least concern' },
  NT: { code: 'NT', label: 'Near threatened' },
  VU: { code: 'VU', label: 'Vulnerable' },
  EN: { code: 'EN', label: 'Endangered' },
  CR: { code: 'CR', label: 'Critically endangered' },
};

const sentenceCase = (v: string) => {
  const t = v.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type Query = { tab?: string; search?: string; districtId?: string; page?: string };

/** Common name first (when GBIF has one), scientific name in italics beneath; italic alone otherwise. */
function SpeciesName({ species }: { species: Pick<Species, 'canonicalName' | 'vernacularName'> }) {
  return species.vernacularName ? (
    <div className="bio-name">
      <strong>{species.vernacularName}</strong>
      <em>{species.canonicalName}</em>
    </div>
  ) : (
    <div className="bio-name">
      <strong><em>{species.canonicalName}</em></strong>
    </div>
  );
}

export default async function BiodiversityPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const tab = sp.tab === 'occurrences' ? 'occurrences' : 'species';
  const search = sp.search?.trim() || undefined;
  const districtId = sp.districtId || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const speciesParams = new URLSearchParams({
    page: tab === 'species' ? String(page) : '1',
    pageSize: tab === 'species' ? String(PAGE_SIZE_SPECIES) : '1',
  });
  if (tab === 'species' && search) speciesParams.set('search', search);

  const occParams = new URLSearchParams({
    page: tab === 'occurrences' ? String(page) : '1',
    pageSize: tab === 'occurrences' ? String(PAGE_SIZE_OCCURRENCES) : '1',
  });
  if (tab === 'occurrences' && districtId) occParams.set('districtId', districtId);

  // Tab counts are always the unfiltered totals, so a search/district filter never changes them.
  const needsSpeciesTotal = tab === 'species' && Boolean(search);
  const needsOccTotal = tab === 'occurrences' && Boolean(districtId);

  const [speciesRes, occRes, speciesAll, occAll, districts] = await Promise.all([
    apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?${speciesParams}`),
    apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?${occParams}`),
    needsSpeciesTotal
      ? apiGet<PaginatedEnvelope<Species>>(`${routes.biodiversity.species}?page=1&pageSize=1`)
      : Promise.resolve(null),
    needsOccTotal
      ? apiGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?page=1&pageSize=1`)
      : Promise.resolve(null),
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600).catch(() => []),
  ]);

  const speciesTotal = (speciesAll ?? speciesRes).total;
  const occurrenceTotal = (occAll ?? occRes).total;
  const districtName = districts.find((d) => d.id === districtId)?.name;
  const tabHref = (t: 'species' | 'occurrences') => (t === 'species' ? '/biodiversity' : '/biodiversity?tab=occurrences');

  const footnote =
    tab === 'species'
      ? 'Occurrences are GBIF records in Bangladesh. They reflect recording effort, not how common a species is.'
      : 'Observed is the date of the sighting. Records come from GBIF and may include historical data.';

  return (
    <>
      <PageHeader
        title="Biodiversity"
        description={
          <>
            <span className="bio-desc-long">Species and occurrence records for Bangladesh, synced daily from GBIF.</span>
            <span className="bio-desc-short">GBIF records for Bangladesh · synced daily</span>
          </>
        }
        action={<Link className="bio-about" href="/methodology">About GBIF data →</Link>}
      />

      <section className="bio-card">
        <nav className="bio-tabs" aria-label="Record type">
          <Link href={tabHref('species')} aria-current={tab === 'species' ? 'page' : undefined}>
            Species <span>{speciesTotal.toLocaleString()}</span>
          </Link>
          <Link href={tabHref('occurrences')} aria-current={tab === 'occurrences' ? 'page' : undefined}>
            Occurrence records <span>{occurrenceTotal.toLocaleString()}</span>
          </Link>
        </nav>

        {tab === 'species' ? (
          <>
            <form className="bio-toolbar" method="get" role="search">
              <label className="bio-search">
                <NavIcon name="search" />
                <input
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search scientific or common name"
                  aria-label="Search species by scientific or common name"
                />
              </label>
              <button type="submit" className="sr-only">Search</button>
              <span className="bio-count">
                {search ? `${speciesRes.total.toLocaleString()} matching “${search}”` : `${speciesTotal.toLocaleString()} species`}
              </span>
              {search && <Link className="bio-reset" href="/biodiversity">Clear search</Link>}
            </form>

            <div className="bio-table" role="table" aria-label="Species">
              <div className="bio-row bio-row--head bio-row--species" role="row">
                <div role="columnheader">Species</div>
                <div role="columnheader" className="bio-col-family">Family</div>
                <div role="columnheader" className="bio-col-iucn">IUCN status</div>
                <div role="columnheader" className="bio-col-num">Occurrences</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {speciesRes.data.map((s) => {
                const iucn = s.iucnStatus ? IUCN[s.iucnStatus.toUpperCase()] : undefined;
                return (
                  <Link key={s.id} className="bio-row bio-row--species" role="row" href={`/biodiversity/species/${s.id}`}>
                    <div role="cell" className="bio-col-name"><SpeciesName species={s} /></div>
                    <div role="cell" className="bio-col-family">{s.family ?? '—'}</div>
                    <div role="cell" className="bio-col-iucn">
                      {s.iucnStatus ? (
                        <span className="bio-iucn" title={iucn?.label ?? s.iucnStatus}>{iucn?.code ?? s.iucnStatus}</span>
                      ) : (
                        <span className="bio-muted">Not available</span>
                      )}
                    </div>
                    <div role="cell" className="bio-col-num">
                      {s._count.occurrences.toLocaleString()}<small> records</small>
                    </div>
                    <div role="cell" className="bio-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="bio-meta">
                      {s.family ?? 'Family not recorded'}{iucn ? ` · IUCN ${iucn.code}` : ''}
                    </div>
                  </Link>
                );
              })}
            </div>
            {speciesRes.data.length === 0 && (
              <EmptyState
                title={search ? `No species match “${search}”` : 'No species recorded yet'}
                description={search ? 'Check the spelling, or try the genus name.' : 'Species appear here after the daily GBIF sync.'}
                action={search ? <Link className="button" href="/biodiversity">Clear search</Link> : undefined}
              />
            )}
            <ListPagination
              pathname="/biodiversity"
              page={speciesRes.page}
              pageSize={PAGE_SIZE_SPECIES}
              total={speciesRes.total}
              query={{ search }}
              summary
            />
          </>
        ) : (
          <>
            <form className="bio-toolbar" method="get">
              <input type="hidden" name="tab" value="occurrences" />
              <label className="bio-district">
                District
                <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                  <option value="">All Bangladesh</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </AutoSubmitSelect>
              </label>
              <noscript><button type="submit" className="button">Apply</button></noscript>
              <span className="bio-count">
                {districtId && districtName
                  ? `${occRes.total.toLocaleString()} ${occRes.total === 1 ? 'record' : 'records'} in ${districtName}`
                  : `${occurrenceTotal.toLocaleString()} records`}
              </span>
              <span className="bio-sort">Newest observations first</span>
            </form>

            <div className="bio-table" role="table" aria-label="Occurrence records">
              <div className="bio-row bio-row--head bio-row--occ" role="row">
                <div role="columnheader">Species</div>
                <div role="columnheader" className="bio-col-district">District</div>
                <div role="columnheader" className="bio-col-observed">Observed</div>
                <div role="columnheader" className="bio-col-basis">Basis of record</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {occRes.data.map((o) => {
                const observed = o.observedAt ? dhakaDate(o.observedAt) : 'Date not recorded';
                const basis = o.basisOfRecord ? sentenceCase(o.basisOfRecord) : '—';
                const division = o.district?.division?.name;
                return (
                  <Link key={o.id} className="bio-row bio-row--occ" role="row" href={`/biodiversity/species/${o.speciesId}`}>
                    <div role="cell" className="bio-col-name"><SpeciesName species={o.species} /></div>
                    <div role="cell" className="bio-col-district">
                      <span>{o.district?.name ?? '—'}</span>
                      {division && <small>{division} division</small>}
                    </div>
                    <div role="cell" className="bio-col-observed">{observed}</div>
                    <div role="cell" className="bio-col-basis">{basis}</div>
                    <div role="cell" className="bio-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="bio-meta">{[o.district?.name, observed, basis].filter(Boolean).join(' · ')}</div>
                  </Link>
                );
              })}
            </div>
            {occRes.data.length === 0 && (
              <EmptyState
                title={districtName ? `No records in ${districtName}` : 'No occurrence records yet'}
                description={districtName ? 'Try another district, or choose All Bangladesh.' : 'Records appear here after the daily GBIF sync.'}
              />
            )}
            <ListPagination
              pathname="/biodiversity"
              page={occRes.page}
              pageSize={PAGE_SIZE_OCCURRENCES}
              total={occRes.total}
              query={{ tab: 'occurrences', districtId }}
              summary
            />
          </>
        )}

        <p className="bio-foot">{footnote}</p>
      </section>
      <p className="bio-foot-mobile">{footnote}</p>
    </>
  );
}
