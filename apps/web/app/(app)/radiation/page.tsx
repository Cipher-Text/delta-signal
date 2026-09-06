import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type SatelliteRadiationReading, type DistrictSummary } from '@delta-signal/contracts';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function RadiationPage({
  searchParams,
}: {
  searchParams: { districtId?: string; from?: string; to?: string };
}) {
  const { districtId, from, to } = searchParams;

  let radiationUrl: string;
  if (districtId) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    radiationUrl = `${routes.radiation.dailyByDistrict(districtId)}${qs ? `?${qs}` : ''}`;
  } else {
    radiationUrl = routes.radiation.daily;
  }

  const [districts, readings] = await Promise.all([
    apiGet<DistrictSummary[]>(routes.locations.districts, 3600),
    apiGet<SatelliteRadiationReading[]>(radiationUrl, 300).catch(() => []),
  ]);

  const selectedDistrict = districtId ? districts.find((d) => d.id === districtId) : null;
  const hasFilter = !!(districtId || from || to);

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Satellite Radiation</h1>
          <p>
            Daily shortwave radiation sum (MJ/m²) from satellite observations across all districts
            of Bangladesh. Data sourced from OpenMeteo Satellite API.
            {selectedDistrict && <span className="muted"> · {selectedDistrict.name}</span>}
          </p>
        </div>
      </div>

      <form className="toolbar" method="get" aria-label="Radiation filters">
        <label htmlFor="districtId">District</label>
        <select
          id="districtId"
          name="districtId"
          className="select-field"
          defaultValue={districtId ?? ''}
        >
          <option value="">All districts</option>
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
          <a className="button ghost" href="/radiation">
            Reset
          </a>
        )}
      </form>

      {readings.length === 0 ? (
        <div className="empty-state">No radiation data available for this filter.</div>
      ) : districtId ? (
        /* District time-series view */
        <div className="table" role="table" aria-label="Radiation readings">
          <div
            className="table-row table-head"
            role="row"
            style={{ gridTemplateColumns: '160px 1fr' }}
          >
            <span>Date</span>
            <span>Shortwave Radiation (MJ/m²)</span>
          </div>
          {readings.map((row) => (
            <div
              key={row.id}
              className="table-row"
              role="row"
              style={{ gridTemplateColumns: '160px 1fr' }}
            >
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(row.readingDate)}
              </strong>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.shortwaveRadiationSum !== null && row.shortwaveRadiationSum !== undefined
                  ? row.shortwaveRadiationSum.toFixed(2)
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* All districts — latest snapshot */
        <div className="table" role="table" aria-label="Radiation by district">
          <div
            className="table-row table-head"
            role="row"
            style={{ gridTemplateColumns: '160px 110px 1fr' }}
          >
            <span>District</span>
            <span>As of</span>
            <span>Shortwave Radiation (MJ/m²)</span>
          </div>
          {readings.map((row) => (
            <div
              key={row.id}
              className="table-row"
              role="row"
              style={{ gridTemplateColumns: '160px 110px 1fr' }}
            >
              <Link href={`/radiation?districtId=${row.districtId}`} className="table-title-link">
                {row.district?.name ?? row.districtId}
              </Link>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(row.readingDate)}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.shortwaveRadiationSum !== null && row.shortwaveRadiationSum !== undefined
                  ? row.shortwaveRadiationSum.toFixed(2)
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>
        Source: OpenMeteo Satellite Radiation API · Daily shortwave radiation sum across 64 districts
      </p>
    </>
  );
}
