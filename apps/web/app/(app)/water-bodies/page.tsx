import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import {
  routes,
  type DistrictSummary,
  type WaterBody,
  type WaterBodyPagedResponse,
  type WaterLevelStation,
  type WaterLevelStationPagedResponse,
} from '@delta-signal/contracts';
import { titleCase } from '../../../lib/format';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

const PAGE_SIZE = 30;
const CACHE_SECONDS = 300;
const WATER_BODY_TYPES = ['RIVER', 'WETLAND', 'LAKE'] as const;
const TIDAL = [
  { value: 'Tidal', label: 'Tidal' },
  { value: 'Non-Tidal', label: 'Non-tidal' },
] as const;

type Query = {
  tab?: string;
  waterBodyType?: string;
  waterBodySubtype?: string;
  districtId?: string;
  upazilaId?: string;
  tidalStatus?: string;
  waterBodyId?: string;
  page?: string;
};

type Option = { id: string; name: string };

const CLASS_TINT: Record<string, string> = { RIVER: 'water', WETLAND: 'bio', LAKE: 'sky' };

const districtsShort = (wb: WaterBody): string => {
  const names = [...new Set(wb.upazilas.map((u) => u.upazila.district.name))];
  if (names.length === 0) return 'Not mapped yet';
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

const transboundary = (wb: WaterBody) =>
  wb.transboundaryFlag ? wb.transboundaryCountries || 'Yes, countries not listed' : 'No';

/** Water bodies registry and BWDB station directory in one tabbed card (Web UI Reference). */
export default async function WaterBodiesPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const tab = sp.tab === 'stations' ? 'stations' : 'water-bodies';
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { waterBodyType, waterBodySubtype, districtId, upazilaId, tidalStatus, waterBodyId } = sp;

  const wbParams = new URLSearchParams({ limit: tab === 'water-bodies' ? String(PAGE_SIZE) : '1', page: tab === 'water-bodies' ? String(page) : '1' });
  if (tab === 'water-bodies') {
    if (waterBodyType) wbParams.set('waterBodyType', waterBodyType);
    if (waterBodySubtype) wbParams.set('waterBodySubtype', waterBodySubtype);
    if (districtId) wbParams.set('districtId', districtId);
    if (upazilaId) wbParams.set('upazilaId', upazilaId);
  }

  // Station scope (district + water body); the tidal tabs count within it.
  const stScope = new URLSearchParams();
  if (tab === 'stations') {
    if (districtId) stScope.set('districtId', districtId);
    if (waterBodyId) stScope.set('waterBodyId', waterBodyId);
  }
  const stationUrl = (extra: Record<string, string>) =>
    `${routes.waterBodies.stations}?${new URLSearchParams({ ...Object.fromEntries(stScope), ...extra })}`;

  const wbFiltered = tab === 'water-bodies' && Boolean(waterBodyType || waterBodySubtype || districtId || upazilaId);
  const stFiltered = tab === 'stations' && Boolean(tidalStatus || districtId || waterBodyId);

  const [wbRes, wbAll, stRes, stAll, stCountAll, stCountTidal, stCountNon, subtypes, districts, upazilas, waterBodyOptions] =
    await Promise.all([
      apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?${wbParams}`, CACHE_SECONDS),
      wbFiltered ? apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?limit=1&page=1`, CACHE_SECONDS) : Promise.resolve(null),
      apiGet<WaterLevelStationPagedResponse>(
        stationUrl({ limit: tab === 'stations' ? String(PAGE_SIZE) : '1', page: tab === 'stations' ? String(page) : '1', ...(tab === 'stations' && tidalStatus ? { tidalStatus } : {}) }),
        CACHE_SECONDS,
      ),
      stFiltered
        ? apiGet<WaterLevelStationPagedResponse>(`${routes.waterBodies.stations}?limit=1&page=1`, CACHE_SECONDS)
        : Promise.resolve(null),
      tab === 'stations' ? apiGet<WaterLevelStationPagedResponse>(stationUrl({ limit: '1', page: '1' }), CACHE_SECONDS) : Promise.resolve(null),
      tab === 'stations' ? apiGet<WaterLevelStationPagedResponse>(stationUrl({ limit: '1', page: '1', tidalStatus: 'Tidal' }), CACHE_SECONDS) : Promise.resolve(null),
      tab === 'stations' ? apiGet<WaterLevelStationPagedResponse>(stationUrl({ limit: '1', page: '1', tidalStatus: 'Non-Tidal' }), CACHE_SECONDS) : Promise.resolve(null),
      tab === 'water-bodies' ? apiGet<string[]>(routes.waterBodies.subtypes, 3600).catch(() => []) : Promise.resolve([] as string[]),
      apiGet<DistrictSummary[]>(routes.locations.districts, 3600),
      tab === 'water-bodies' && districtId
        ? apiGet<Option[]>(`${routes.locations.upazilas}?districtId=${districtId}`, 3600).catch(() => [])
        : Promise.resolve([] as Option[]),
      tab === 'stations' ? loadAllWaterBodyOptions() : Promise.resolve([] as Option[]),
    ]);

  const wbTotal = (wbAll ?? wbRes).total;
  // Tab counts are always the unfiltered totals; stRes is already unfiltered unless a station filter is active.
  const stTotal = (stAll ?? stRes).total;
  const tabHref = (t: 'water-bodies' | 'stations') => (t === 'stations' ? '/water-bodies?tab=stations' : '/water-bodies');

  // URL with filters overridden (undefined removes one); keeps the active tab.
  const href = (o: Partial<Record<keyof Query, string | undefined>>) => {
    const next: Query = { tab: tab === 'stations' ? 'stations' : undefined, waterBodyType, waterBodySubtype, districtId, upazilaId, tidalStatus, waterBodyId, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/water-bodies${qs ? `?${qs}` : ''}`;
  };

  const districtName = districts.find((d) => d.id === districtId)?.name;
  const upazilaName = upazilas.find((u) => u.id === upazilaId)?.name;
  const waterBodyName = waterBodyOptions.find((w) => w.id === waterBodyId)?.name;

  const chips = (
    tab === 'water-bodies'
      ? [
          waterBodyType && { key: 'type', label: `Class: ${titleCase(waterBodyType)}`, remove: href({ waterBodyType: undefined, page: undefined }) },
          waterBodySubtype && { key: 'subtype', label: `Type: ${waterBodySubtype}`, remove: href({ waterBodySubtype: undefined, page: undefined }) },
          districtId && { key: 'district', label: `District: ${districtName ?? districtId}`, remove: href({ districtId: undefined, upazilaId: undefined, page: undefined }) },
          upazilaId && { key: 'upazila', label: `Upazila: ${upazilaName ?? upazilaId}`, remove: href({ upazilaId: undefined, page: undefined }) },
        ]
      : [
          tidalStatus && { key: 'tidal', label: `Tidal status: ${tidalStatus === 'Tidal' ? 'Tidal' : 'Non-tidal'}`, remove: href({ tidalStatus: undefined, page: undefined }) },
          districtId && { key: 'district', label: `District: ${districtName ?? districtId}`, remove: href({ districtId: undefined, page: undefined }) },
          waterBodyId && { key: 'wb', label: `Water body: ${waterBodyName ?? waterBodyId}`, remove: href({ waterBodyId: undefined, page: undefined }) },
        ]
  ).filter(Boolean) as { key: string; label: string; remove: string }[];
  const clearHref = tab === 'stations' ? '/water-bodies?tab=stations' : '/water-bodies';

  const footnote =
    tab === 'water-bodies'
      ? 'Districts come from mapped upazila coverage. Many rivers are not yet mapped to upazilas.'
      : 'Stations are operated by the Bangladesh Water Development Board (BWDB). Open a station for its latest water level and forecast.';

  return (
    <>
      <PageHeader
        title="Water Bodies"
        description={
          <>
            <span className="dt-desc-long">Rivers, wetlands and lakes of Bangladesh, and the BWDB stations that monitor their water levels.</span>
            <span className="dt-desc-short">Rivers, wetlands, lakes and BWDB stations</span>
          </>
        }
        action={<Link className="dt-about" href="/map">Open on map →</Link>}
      />

      <section className="dt-card">
        <nav className="dt-tabs" aria-label="Record type">
          <Link href={tabHref('water-bodies')} aria-current={tab === 'water-bodies' ? 'page' : undefined}>
            Water bodies <span>{wbTotal.toLocaleString()}</span>
          </Link>
          <Link href={tabHref('stations')} aria-current={tab === 'stations' ? 'page' : undefined}>
            <span className="dt-lab-long">Water level stations</span><span className="dt-lab-short">Stations</span> <span>{stTotal.toLocaleString()}</span>
          </Link>
        </nav>

        {tab === 'water-bodies' ? (
          <>
            <form className="dt-filters" method="get" aria-label="Water body filters">
              <div className="dt-filter-row">
                <label>
                  Class
                  <AutoSubmitSelect name="waterBodyType" className="select-field" defaultValue={waterBodyType ?? ''}>
                    <option value="">All classes</option>
                    {WATER_BODY_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  Type
                  <AutoSubmitSelect name="waterBodySubtype" className="select-field" defaultValue={waterBodySubtype ?? ''}>
                    <option value="">All types</option>
                    {subtypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  District
                  <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''} clears={['upazilaId']}>
                    <option value="">All districts</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  Upazila
                  <AutoSubmitSelect name="upazilaId" className="select-field" defaultValue={upazilaId ?? ''} disabled={!districtId}>
                    <option value="">All upazilas</option>
                    {upazilas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <noscript><button type="submit" className="button">Apply</button></noscript>
                <span className="dt-count">{wbRes.total.toLocaleString()} {wbRes.total === 1 ? 'water body' : 'water bodies'}</span>
              </div>
              {chips.length > 0 && <Chips chips={chips} clearHref={clearHref} />}
            </form>

            <div className="dt-table" role="table" aria-label="Water bodies">
              <div className="dt-row dt-row--head dt-row--wb" role="row">
                <div role="columnheader">Name</div>
                <div role="columnheader">Class</div>
                <div role="columnheader" className="dt-col-type">Type</div>
                <div role="columnheader" className="dt-col-districts">Districts</div>
                <div role="columnheader" className="dt-col-tb">Transboundary</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {wbRes.data.map((wb) => {
                const districtsText = districtsShort(wb);
                const tb = transboundary(wb);
                const tint = CLASS_TINT[wb.waterBodyType] ?? 'water';
                return (
                  <Link key={wb.id} className="dt-row dt-row--wb" role="row" href={`/water-bodies/${wb.slug}`}>
                    <div role="cell" className="dt-col-name dt-strong">{wb.nameEn}</div>
                    <div role="cell" className="dt-col-class">
                      <span className={`dt-pill dt-pill--${tint}`}>{titleCase(wb.waterBodyType)}</span>
                    </div>
                    <div role="cell" className="dt-col-type">{wb.waterBodySubtype ?? '—'}</div>
                    <div role="cell" className={`dt-col-districts${wb.upazilas.length === 0 ? ' dt-muted' : ''}`}>{districtsText}</div>
                    <div role="cell" className={`dt-col-tb${wb.transboundaryFlag ? '' : ' dt-muted'}`}>{tb}</div>
                    <div role="cell" className="dt-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="dt-mobile-tags">
                      <span className={`dt-pill dt-pill--${tint}`}>{titleCase(wb.waterBodyType)}</span>
                      {wb.waterBodySubtype}
                    </div>
                    <div className="dt-meta">
                      {districtsText}{wb.transboundaryFlag ? ` · Shared with ${wb.transboundaryCountries || 'neighbouring countries'}` : ''}
                    </div>
                  </Link>
                );
              })}
            </div>
            {wbRes.data.length === 0 && (
              <EmptyState
                title="No water bodies match these filters"
                description="Try another class, type or district."
                action={<Link className="button" href={clearHref}>Clear filters</Link>}
              />
            )}
            <ListPagination
              pathname="/water-bodies"
              page={page}
              pageSize={PAGE_SIZE}
              total={wbRes.total}
              query={{ waterBodyType, waterBodySubtype, districtId, upazilaId }}
              summary
            />
          </>
        ) : (
          <>
            <form className="dt-filters" method="get" aria-label="Station filters">
              <input type="hidden" name="tab" value="stations" />
              {tidalStatus && <input type="hidden" name="tidalStatus" value={tidalStatus} />}
              <div className="dt-filter-row">
                <div className="dt-seg-wrap">
                  <span className="dt-seg-label">Tidal status</span>
                  <nav className="dt-seg" aria-label="Tidal status">
                    <Link href={href({ tidalStatus: undefined, page: undefined })} aria-current={!tidalStatus ? 'true' : undefined}>
                      All <span>{(stCountAll ?? stRes).total}</span>
                    </Link>
                    {TIDAL.map((t) => (
                      <Link key={t.value} href={href({ tidalStatus: t.value, page: undefined })} aria-current={tidalStatus === t.value ? 'true' : undefined}>
                        {t.label} <span>{(t.value === 'Tidal' ? stCountTidal : stCountNon)?.total ?? 0}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
                <label>
                  District
                  <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''}>
                    <option value="">All districts</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <label>
                  Water body
                  <AutoSubmitSelect name="waterBodyId" className="select-field" defaultValue={waterBodyId ?? ''}>
                    <option value="">All water bodies</option>
                    {waterBodyOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </AutoSubmitSelect>
                </label>
                <noscript><button type="submit" className="button">Apply</button></noscript>
                <span className="dt-count">{stRes.total.toLocaleString()} {stRes.total === 1 ? 'station' : 'stations'}</span>
              </div>
              {chips.length > 0 && <Chips chips={chips} clearHref={clearHref} />}
            </form>

            <div className="dt-table" role="table" aria-label="Water level stations">
              <div className="dt-row dt-row--head dt-row--st" role="row">
                <div role="columnheader" className="dt-col-serial">#</div>
                <div role="columnheader">Station</div>
                <div role="columnheader" className="dt-col-river">River</div>
                <div role="columnheader" className="dt-col-sdistrict">District</div>
                <div role="columnheader" className="dt-col-swb">Water body</div>
                <div role="columnheader" className="dt-col-tidal">Tidal status</div>
                <div role="columnheader" aria-hidden="true" />
              </div>
              {stRes.data.map((s: WaterLevelStation) => {
                const linked = s.waterBodies?.[0]?.waterBody.nameEn;
                const extra = (s.waterBodies?.length ?? 0) - 1;
                const tidal = s.tidalStatus ? (s.tidalStatus === 'Tidal' ? 'Tidal' : 'Non-tidal') : null;
                return (
                  <Link key={s.id} className="dt-row dt-row--st" role="row" href={`/water-bodies/stations/${s.id}`}>
                    <div role="cell" className="dt-col-serial">{s.serial}</div>
                    <div role="cell" className="dt-col-name">
                      <span className="dt-strong">{s.name}</span>
                      <code>{s.stationCode}</code>
                    </div>
                    <div role="cell" className="dt-col-river">{s.riverName ?? '—'}</div>
                    <div role="cell" className="dt-col-sdistrict">{s.district?.name ?? '—'}</div>
                    <div role="cell" className={`dt-col-swb${linked ? '' : ' dt-muted'}`}>{linked ? `${linked}${extra > 0 ? ` +${extra}` : ''}` : 'Not linked'}</div>
                    <div role="cell" className="dt-col-tidal">
                      {tidal && <span className={`dt-tidal${tidal === 'Tidal' ? ' dt-tidal--tidal' : ''}`}>{tidal}</span>}
                    </div>
                    <div role="cell" className="dt-col-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                    <div className="dt-meta">{[s.riverName, s.district?.name].filter(Boolean).join(' · ')}</div>
                  </Link>
                );
              })}
            </div>
            {stRes.data.length === 0 && (
              <EmptyState
                title="No stations match these filters"
                action={<Link className="button" href={clearHref}>Clear filters</Link>}
              />
            )}
            <ListPagination
              pathname="/water-bodies"
              page={page}
              pageSize={PAGE_SIZE}
              total={stRes.total}
              query={{ tab: 'stations', tidalStatus, districtId, waterBodyId }}
              summary
            />
          </>
        )}

        <p className="dt-foot">{footnote}</p>
      </section>
      <p className="dt-foot-mobile">{footnote}</p>
    </>
  );
}

function Chips({ chips, clearHref }: { chips: { key: string; label: string; remove: string }[]; clearHref: string }) {
  return (
    <div className="dt-chips">
      <span>Filtered by</span>
      {chips.map((c) => (
        <Link key={c.key} className="dt-chip" href={c.remove} aria-label={`Remove filter ${c.label}`}>
          {c.label}
          <NavIcon name="close" />
        </Link>
      ))}
      <Link className="dt-clear" href={clearHref}>Clear all</Link>
    </div>
  );
}

/** Every water body (id + name) for the station filter; the API caps a page at 100. */
async function loadAllWaterBodyOptions(): Promise<Option[]> {
  const first = await apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?limit=100&page=1`, 3600);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?limit=100&page=${i + 2}`, 3600),
    ),
  );
  return [first, ...rest].flatMap((r) => r.data).map((w) => ({ id: w.id, name: w.nameEn }));
}
