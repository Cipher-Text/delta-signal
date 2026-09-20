import Link from 'next/link';
import { routes, type DivisionWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../../../lib/api';
import PageHeader from '../../../components/page-header';

function aqiClass(pm25: number | null): { label: string; css: string } {
  if (pm25 === null) return { label: 'No data', css: 'aqi-none' };
  if (pm25 <= 12)    return { label: 'Good',       css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',   css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*', css: 'aqi-sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',  css: 'aqi-unhealthy' };
  return               { label: 'Hazardous',        css: 'aqi-hazardous' };
}

export default async function LocationsPage() {
  const divisions = await apiGet<DivisionWithClimate[]>(routes.locations.divisions, 900);

  const updatedAt = divisions.find((d) => d.climateUpdatedAt)?.climateUpdatedAt;

  return (
    <>
      <PageHeader
        eyebrow="30-Day Rolling Average · All 8 Divisions"
        title="Locations"
        description="Browse Bangladesh by division, district, upazila, and union to view environmental conditions."
      />

      <div className="division-grid">
        {divisions.map((div) => {
          const aqi = aqiClass(div.avgPm25_30d);
          const temp = div.avgTemp30d != null ? `${div.avgTemp30d.toFixed(1)}°C` : '—';

          return (
            <Link
              key={div.id}
              href={`/locations/divisions/${div.id}`}
              className={`division-card ${aqi.css}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="division-card-top">
                <span className="division-name">{div.name}</span>
                {div.bnName && <span className="division-bn">{div.bnName}</span>}
              </div>
              <div className="division-card-temp">{temp}</div>
              <div className="division-card-aqi">
                <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
                {div.avgPm25_30d != null && (
                  <span className="division-pm25">PM2.5 {div.avgPm25_30d.toFixed(0)} µg/m³</span>
                )}
              </div>
              <div className="division-card-footer">
                {div.totalPrecip30d != null && (
                  <span title="Total precipitation last 30 days">{div.totalPrecip30d.toFixed(0)}mm rain</span>
                )}
                {div.avgUvIndex30d != null && (
                  <span title="30-day average UV index">UV {div.avgUvIndex30d.toFixed(1)}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {updatedAt && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
          Updated nightly from OpenMeteo ·{' '}
          {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </>
  );
}
