import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type MarineForecast, type DistrictSummary } from '@delta-signal/contracts';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmt(val: number | null | undefined, decimals = 1): string {
  return val !== null && val !== undefined ? val.toFixed(decimals) : '—';
}

function compassDir(deg: number | null | undefined): string {
  if (deg === null || deg === undefined) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? '—';
}

export default async function MarinePage(
  props: {
    searchParams: Promise<{ districtId?: string; from?: string; to?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { districtId, from, to } = searchParams;

  let marineUrl: string;
  if (districtId) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    marineUrl = `${routes.marine.forecastByDistrict(districtId)}${qs ? `?${qs}` : ''}`;
  } else {
    marineUrl = routes.marine.forecast;
  }

  const [districts, forecasts] = await Promise.all([
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600),
    apiGet<MarineForecast[]>(marineUrl, 300).catch(() => []),
  ]);

  const selectedDistrict = districtId ? districts.find((d) => d.id === districtId) : null;
  const hasFilter = !!(districtId || from || to);

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Marine Weather Forecast</h1>
          <p>
            Wave height, swell, and sea surface temperature for coastal districts of Bangladesh.
            Data sourced from OpenMeteo Marine API.
            {selectedDistrict && <span className="muted"> · {selectedDistrict.name}</span>}
          </p>
        </div>
      </div>

      <form className="toolbar" method="get" aria-label="Marine forecast filters">
        <label htmlFor="districtId">District</label>
        <select
          id="districtId"
          name="districtId"
          className="select-field"
          defaultValue={districtId ?? ''}
        >
          <option value="">All coastal districts</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <label htmlFor="from">From</label>
        <input
          id="from"
          name="from"
          type="date"
          className="select-field"
          defaultValue={from ?? ''}
        />

        <label htmlFor="to">To</label>
        <input
          id="to"
          name="to"
          type="date"
          className="select-field"
          defaultValue={to ?? ''}
        />

        <button type="submit" className="button">
          Apply
        </button>
        {hasFilter && (
          <a className="button ghost" href="/marine">
            Reset
          </a>
        )}
      </form>

      {forecasts.length === 0 ? (
        <div className="empty-state">
          {districtId
            ? 'No marine forecast data for this district. Only coastal districts have marine data.'
            : 'No marine forecast data available.'}
        </div>
      ) : districtId ? (
        /* District time-series view */
        <div className="table" role="table" aria-label="Marine forecast">
          <div
            className="table-row table-head"
            role="row"
            style={{ gridTemplateColumns: '120px repeat(6, 1fr)' }}
          >
            <span>Date</span>
            <span>Wave H. (m)</span>
            <span>Wind Wave H. (m)</span>
            <span>Swell H. (m)</span>
            <span>SST (°C)</span>
            <span>Wave Period (s)</span>
            <span>Swell Dir.</span>
          </div>
          {forecasts.map((row) => (
            <div
              key={row.id}
              className="table-row"
              role="row"
              style={{ gridTemplateColumns: '120px repeat(6, 1fr)' }}
            >
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(row.forecastDate)}
              </strong>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.waveHeightMax)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.windWaveHeightMax)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.swellWaveHeightMax)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.seaSurfaceTemp)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.wavePeriodMax)}</span>
              <span>{compassDir(row.swellWaveDirectionDominant)}</span>
            </div>
          ))}
        </div>
      ) : (
        /* All coastal districts — latest snapshot */
        <div className="table" role="table" aria-label="Marine forecast by district">
          <div
            className="table-row table-head"
            role="row"
            style={{ gridTemplateColumns: '160px 110px repeat(4, 1fr)' }}
          >
            <span>District</span>
            <span>As of</span>
            <span>Wave H. (m)</span>
            <span>Swell H. (m)</span>
            <span>SST (°C)</span>
            <span>Period (s)</span>
          </div>
          {forecasts.map((row) => (
            <div
              key={row.id}
              className="table-row"
              role="row"
              style={{ gridTemplateColumns: '160px 110px repeat(4, 1fr)' }}
            >
              <Link href={`/marine?districtId=${row.districtId}`} className="table-title-link">
                {row.district?.name ?? row.districtId}
              </Link>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(row.forecastDate)}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.waveHeightMax)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.swellWaveHeightMax)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.seaSurfaceTemp)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.wavePeriodMax)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>
        Source: OpenMeteo Marine Weather API · Coastal district monitoring coordinates
      </p>
    </>
  );
}
