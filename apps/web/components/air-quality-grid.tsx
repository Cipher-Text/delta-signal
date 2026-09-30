import Link from 'next/link';
import { routes, type DistrictWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

// US EPA PM2.5 breakpoints (2024 revision)
function aqiClass(pm25: number): { label: string; css: string } {
  if (pm25 <= 9.0)   return { label: 'Good',                          css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',                      css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy for sensitive groups', css: 'aqi-sensitive' };
  if (pm25 <= 125.4) return { label: 'Unhealthy',                     css: 'aqi-unhealthy' };
  if (pm25 <= 225.4) return { label: 'Very unhealthy',                css: 'aqi-very-unhealthy' };
  return               { label: 'Hazardous',                          css: 'aqi-hazardous' };
}

export default async function AirQualityGrid() {
  let districts: DistrictWithClimate[] = [];
  let isLive = true;
  try {
    districts = await apiGet<DistrictWithClimate[]>(routes.locations.districts);
  } catch {
    isLive = false;
  }

  const withAqi = districts
    .filter((d): d is DistrictWithClimate & { avgPm25_30d: number } => d.avgPm25_30d != null)
    .sort((a, b) => b.avgPm25_30d - a.avgPm25_30d);

  const topDistricts = withAqi.slice(0, 6);

  const latestUpdate = districts
    .map((d) => d.climateUpdatedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const updatedLabel = latestUpdate
    ? new Date(latestUpdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div className="env-card aqi-card">
      <div className="env-card-header">
        <div>
          <h2>Air quality</h2>
          <p>Districts with the highest fine particulate matter (PM2.5)</p>
        </div>
        <div className="env-card-badges">
          <span className="badge-outline">Modeled</span>
          {updatedLabel && <span className="badge-soft">Updated {updatedLabel}</span>}
        </div>
      </div>

      {!isLive || topDistricts.length === 0 ? (
        <div className="empty-state" role="status">
          {isLive ? 'No district PM2.5 summaries are available yet.' : 'Air-quality data is temporarily unavailable.'}
        </div>
      ) : (
        <div className="data-table" role="table" aria-label="District air quality ranking">
          <div className="data-table-row data-table-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">District</span>
            <span role="columnheader">Division</span>
            <span role="columnheader">PM2.5 µg/m³</span>
            <span role="columnheader">Category</span>
          </div>
          {topDistricts.map((d, i) => {
            const aqi = aqiClass(d.avgPm25_30d);
            return (
              <div key={d.id} className="data-table-row" role="row">
                <span role="cell" className="muted">{i + 1}</span>
                <span role="cell"><strong>{d.name}</strong></span>
                <span role="cell" className="muted">{d.division?.name ?? '—'}</span>
                <span role="cell"><strong>{d.avgPm25_30d.toFixed(0)}</strong></span>
                <span role="cell">
                  <mark className={`tag aqi-badge ${aqi.css}`}>
                    <span className="aqi-badge-dot" />
                    {aqi.label}
                  </mark>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="aqi-legend">
        {([
          ['aqi-good', 'Good 0–9.0'],
          ['aqi-moderate', 'Moderate 9.1–35.4'],
          ['aqi-sensitive', 'Sensitive groups 35.5–55.4'],
          ['aqi-unhealthy', 'Unhealthy 55.5–125.4'],
          ['aqi-very-unhealthy', 'Very unhealthy 125.5–225.4'],
          ['aqi-hazardous', 'Hazardous 225.5+'],
        ] as [string, string][]).map(([cls, label]) => (
          <span key={cls} className="aqi-legend-item">
            <span className={`aqi-swatch ${cls}-fill`} />
            {label}
          </span>
        ))}
      </div>
      <p className="aqi-legend-note">
        Scale: US EPA PM2.5 (2024) · Sensitive groups: children, older adults, people with respiratory conditions
      </p>

      <div className="env-card-footer">
        <Link href="/locations">All 64 districts →</Link>
        <Link href="/data">Download data</Link>
      </div>
    </div>
  );
}
