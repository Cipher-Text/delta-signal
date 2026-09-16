import Link from 'next/link';
import { apiGet } from '../../../../lib/api';
import { routes, type WaterLevelStationPagedResponse, type DistrictSummary, type WaterBodyPagedResponse } from '@delta-signal/contracts';

export default async function WaterLevelStationsPage(
  props: {
    searchParams: Promise<{ districtId?: string; upazilaId?: string; waterBodyId?: string; tidalStatus?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { districtId, upazilaId, waterBodyId, tidalStatus } = searchParams;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  let path = `${routes.waterBodies.stations}?limit=30&page=${page}`;
  if (districtId) path += `&districtId=${districtId}`;
  if (upazilaId) path += `&upazilaId=${upazilaId}`;
  if (waterBodyId) path += `&waterBodyId=${waterBodyId}`;
  if (tidalStatus) path += `&tidalStatus=${encodeURIComponent(tidalStatus)}`;

  const [res, districts, upazilas, waterBodies] = await Promise.all([
    apiGet<WaterLevelStationPagedResponse>(path, 300),
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600),
    apiGet<{ id: string; name: string }[]>(`${routes.locations.upazilas}${districtId ? `?districtId=${districtId}` : ''}`, 3600).catch(() => []),
    apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?limit=100&page=1`, 3600),
  ]);

  const TIDAL_OPTIONS = ['Tidal', 'Non-Tidal'];

  function buildHref(overrides: { districtId?: string; upazilaId?: string; waterBodyId?: string; tidalStatus?: string; page?: number }) {
    const d = overrides.districtId ?? districtId ?? '';
    const u = overrides.upazilaId ?? upazilaId ?? '';
    const w = overrides.waterBodyId ?? waterBodyId ?? '';
    const t = overrides.tidalStatus ?? tidalStatus ?? '';
    const p = overrides.page ?? 1;
    const params = new URLSearchParams();
    if (d) params.set('districtId', d);
    if (u) params.set('upazilaId', u);
    if (w) params.set('waterBodyId', w);
    if (t) params.set('tidalStatus', t);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/water-bodies/stations${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Water Level Stations</h1>
          <p>BWDB monitoring stations across Bangladesh.</p>
        </div>
        <Link href="/water-bodies" className="button ghost">
          ← Water Bodies
        </Link>
      </div>

      {/* Tidal status filter */}
      <div className="toolbar" aria-label="Tidal status filter">
        <Link
          className={`chip${!tidalStatus ? ' active' : ''}`}
          href={buildHref({ tidalStatus: '', page: 1 })}
        >
          All stations
        </Link>
        {TIDAL_OPTIONS.map((t) => (
          <Link
            key={t}
            className={`chip${tidalStatus === t ? ' active' : ''}`}
            href={buildHref({ tidalStatus: t, page: 1 })}
          >
            {t}
          </Link>
        ))}
      </div>

      <form className="toolbar" method="get" aria-label="Station filters">
        {tidalStatus && <input type="hidden" name="tidalStatus" value={tidalStatus} />}
        <label htmlFor="districtId">District</label>
        <select id="districtId" name="districtId" className="select-field" defaultValue={districtId ?? ''}>
          <option value="">All districts</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <label htmlFor="upazilaId">Upazila</label>
        <select id="upazilaId" name="upazilaId" className="select-field" defaultValue={upazilaId ?? ''}>
          <option value="">All upazilas</option>{upazilas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label htmlFor="waterBodyId">Water body</label>
        <select id="waterBodyId" name="waterBodyId" className="select-field" defaultValue={waterBodyId ?? ''}>
          <option value="">All water bodies</option>
          {waterBodies.data.map((waterBody) => <option key={waterBody.id} value={waterBody.id}>{waterBody.nameEn}</option>)}
        </select>
        <button type="submit" className="button">Apply</button>
        {(districtId || upazilaId || waterBodyId || tidalStatus) && (
          <Link className="button ghost" href="/water-bodies/stations">Reset</Link>
        )}
      </form>

      <div className="table" role="table" aria-label="Water level stations">
        <div className="table-row table-head" role="row">
          <span>#</span>
          <span>Station</span>
          <span>Code</span>
          <span>River</span>
          <span>Tidal Status</span>
          <span>Water Bodies</span>
        </div>
        {res.data.map((station) => (
          <div className="table-row" role="row" key={station.id}>
            <span className="text-muted" style={{ fontSize: '0.85em' }}>
              {station.serial}
            </span>
            <span>
              <Link href={`/water-bodies/stations/${station.id}`}>{station.name}</Link>
            </span>
            <span className="tag muted">{station.stationCode}</span>
            <span>{station.riverName ?? '—'}</span>
            <span>{station.tidalStatus ?? '—'}</span>
            <span>
              {station.waterBodies && station.waterBodies.length > 0
                ? station.waterBodies.map(({ waterBody }) => (
                    <Link
                      key={waterBody.id}
                      href={`/water-bodies/${waterBody.code}`}
                      style={{ marginRight: '0.4rem' }}
                    >
                      {waterBody.nameEn}
                    </Link>
                  ))
                : '—'}
            </span>
          </div>
        ))}
        {res.data.length === 0 && (
          <div className="empty-state">No stations found for this filter.</div>
        )}
      </div>

      {res.totalPages > 1 && (
        <div className="toolbar" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          {page > 1 && (
            <Link className="chip" href={buildHref({ page: page - 1 })}>
              ← Previous
            </Link>
          )}
          <span className="chip active" aria-current="page">
            {page} / {res.totalPages}
          </span>
          {page < res.totalPages && (
            <Link className="chip" href={buildHref({ page: page + 1 })}>
              Next →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
