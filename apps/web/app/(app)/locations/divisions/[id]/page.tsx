import Link from 'next/link';
import { routes, type DivisionWithClimate, type DistrictWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';

function aqiClass(pm25: number | null): { label: string; css: string } {
  if (pm25 === null) return { label: 'No data', css: 'aqi-none' };
  if (pm25 <= 12)    return { label: 'Good',       css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',   css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*', css: 'aqi-sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',  css: 'aqi-unhealthy' };
  return               { label: 'Hazardous',        css: 'aqi-hazardous' };
}

export default async function DivisionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [divisions, districts] = await Promise.all([
    apiGet<DivisionWithClimate[]>(routes.locations.divisions, 900),
    apiGet<DistrictWithClimate[]>(`${routes.locations.districts}?divisionId=${params.id}`, 900),
  ]);

  const division = divisions.find((d) => d.id === params.id);
  if (!division) {
    return <p className="empty-state">Division not found.</p>;
  }

  const aqi = aqiClass(division.avgPm25_30d);

  return (
    <>
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: division.name },
        ]}
      />

      <div className="panel-header">
        <div>
          <p className="eyebrow">Division · Bangladesh</p>
          <h1>
            {division.name}
            {division.bnName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 10, fontSize: '0.75em' }}>
                {division.bnName}
              </span>
            )}
          </h1>
          <p>
            {districts.length} district{districts.length !== 1 ? 's' : ''}
            {division.areaSqKm != null && ` · ${division.areaSqKm.toLocaleString()} km²`}
          </p>
        </div>
        <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
      </div>

      {/* 30-day climate metrics */}
      <div className="metric-grid">
        {division.avgTemp30d != null && (
          <div className="metric">
            <span>Avg temperature</span>
            <strong>{division.avgTemp30d.toFixed(1)}°C</strong>
            <small>
              {division.minTemp30d != null && division.maxTemp30d != null
                ? `${division.minTemp30d.toFixed(1)}–${division.maxTemp30d.toFixed(1)}°C range`
                : '30-day average'}
            </small>
          </div>
        )}
        {division.totalPrecip30d != null && (
          <div className="metric">
            <span>Total precipitation</span>
            <strong>
              {division.totalPrecip30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}>mm</small>
            </strong>
            <small>Last 30 days</small>
          </div>
        )}
        {division.avgHumidity30d != null && (
          <div className="metric">
            <span>Avg humidity</span>
            <strong>{division.avgHumidity30d.toFixed(0)}%</strong>
            <small>30-day average</small>
          </div>
        )}
        {division.avgPm25_30d != null && (
          <div className="metric">
            <span>PM2.5 air quality</span>
            <strong>
              {division.avgPm25_30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}> µg/m³</small>
            </strong>
            <small
              className={
                division.avgPm25_30d > 55.4 ? 'danger'
                : division.avgPm25_30d > 35.4 ? 'warning'
                : 'success'
              }
            >
              {aqi.label}
            </small>
          </div>
        )}
      </div>

      {/* Districts grid */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Districts</h2>
            <p>Select a district for detailed environmental data including live weather, flood forecast, and community activity.</p>
          </div>
        </div>
        <div className="division-grid">
          {districts.map((d) => {
            const daqi = aqiClass(d.avgPm25_30d);
            return (
              <Link
                key={d.id}
                href={`/locations/districts/${d.id}`}
                className={`division-card ${daqi.css}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="division-card-top">
                  <span className="division-name">{d.name}</span>
                  {d.bnName && <span className="division-bn">{d.bnName}</span>}
                </div>
                <div className="division-card-temp">
                  {d.avgTemp30d != null ? `${d.avgTemp30d.toFixed(1)}°C` : '—'}
                </div>
                <div className="division-card-aqi">
                  <span className={`aqi-badge ${daqi.css}`}>{daqi.label}</span>
                  {d.avgPm25_30d != null && (
                    <span className="division-pm25">PM2.5 {d.avgPm25_30d.toFixed(0)} µg/m³</span>
                  )}
                </div>
                <div className="division-card-footer">
                  {d.totalPrecip30d != null && <span>{d.totalPrecip30d.toFixed(0)}mm</span>}
                  {d.avgUvIndex30d != null && <span>UV {d.avgUvIndex30d.toFixed(1)}</span>}
                </div>
              </Link>
            );
          })}
          {districts.length === 0 && (
            <div className="empty-state">No districts found for this division.</div>
          )}
        </div>
      </article>
    </>
  );
}
