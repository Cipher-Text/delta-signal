import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { relativeTime } from '../../../../../lib/format';

interface UpazilaDetail {
  id: string;
  name: string;
  bnName: string | null;
  areaSqKm: number | null;
  district: {
    id: string;
    name: string;
    division: { id: string; name: string };
  };
  unions: { id: string; name: string; bnName: string | null }[];
  avgTemp30d: number | null;
  minTemp30d: number | null;
  maxTemp30d: number | null;
  avgHumidity30d: number | null;
  totalPrecip30d: number | null;
  avgWindSpeed30d: number | null;
  avgCloudCover30d: number | null;
  avgPm25_30d: number | null;
  avgPm10_30d: number | null;
  avgUvIndex30d: number | null;
  climateUpdatedAt: string | null;
}

function aqiClass(pm25: number | null): { label: string; css: string } {
  if (pm25 === null) return { label: 'No data', css: 'aqi-none' };
  if (pm25 <= 12)    return { label: 'Good',       css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',   css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*', css: 'aqi-sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',  css: 'aqi-unhealthy' };
  return               { label: 'Hazardous',        css: 'aqi-hazardous' };
}

export default async function UpazilaPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const upazila = await apiGet<UpazilaDetail>(routes.locations.upazila(params.id), 900);
  const aqi = aqiClass(upazila.avgPm25_30d);

  return (
    <>
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: upazila.district.division.name, href: `/locations/divisions/${upazila.district.division.id}` },
          { label: upazila.district.name, href: `/locations/districts/${upazila.district.id}` },
          { label: upazila.name },
        ]}
      />

      <div className="panel-header">
        <div>
          <p className="eyebrow">Upazila · {upazila.district.name}, {upazila.district.division.name}</p>
          <h1>
            {upazila.name}
            {upazila.bnName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 10, fontSize: '0.75em' }}>
                {upazila.bnName}
              </span>
            )}
          </h1>
          <p>
            {upazila.unions.length} union{upazila.unions.length !== 1 ? 's' : ''}
            {upazila.areaSqKm != null && ` · ${upazila.areaSqKm.toLocaleString()} km²`}
          </p>
        </div>
        <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
      </div>

      {/* Primary climate metrics */}
      <div className="metric-grid">
        {upazila.avgTemp30d != null && (
          <div className="metric">
            <span>Avg temperature</span>
            <strong>{upazila.avgTemp30d.toFixed(1)}°C</strong>
            <small>
              {upazila.minTemp30d != null && upazila.maxTemp30d != null
                ? `${upazila.minTemp30d.toFixed(1)}–${upazila.maxTemp30d.toFixed(1)}°C range`
                : '30-day average'}
            </small>
          </div>
        )}
        {upazila.totalPrecip30d != null && (
          <div className="metric">
            <span>Total precipitation</span>
            <strong>
              {upazila.totalPrecip30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}>mm</small>
            </strong>
            <small>Last 30 days</small>
          </div>
        )}
        {upazila.avgHumidity30d != null && (
          <div className="metric">
            <span>Avg humidity</span>
            <strong>{upazila.avgHumidity30d.toFixed(0)}%</strong>
            <small>30-day average</small>
          </div>
        )}
        {upazila.avgPm25_30d != null && (
          <div className="metric">
            <span>PM2.5 air quality</span>
            <strong>
              {upazila.avgPm25_30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}> µg/m³</small>
            </strong>
            <small
              className={
                upazila.avgPm25_30d > 55.4 ? 'danger'
                : upazila.avgPm25_30d > 35.4 ? 'warning'
                : 'success'
              }
            >
              {aqi.label}
            </small>
          </div>
        )}
      </div>

      {/* Secondary climate metrics */}
      {(upazila.avgWindSpeed30d != null || upazila.avgUvIndex30d != null || upazila.avgPm10_30d != null || upazila.avgCloudCover30d != null) && (
        <div className="metric-grid">
          {upazila.avgWindSpeed30d != null && (
            <div className="metric">
              <span>Avg wind speed</span>
              <strong>
                {upazila.avgWindSpeed30d.toFixed(1)}
                <small style={{ fontSize: '1rem' }}>km/h</small>
              </strong>
              <small>30-day average</small>
            </div>
          )}
          {upazila.avgUvIndex30d != null && (
            <div className="metric">
              <span>UV index</span>
              <strong>{upazila.avgUvIndex30d.toFixed(1)}</strong>
              <small>30-day average</small>
            </div>
          )}
          {upazila.avgPm10_30d != null && (
            <div className="metric">
              <span>PM10</span>
              <strong>
                {upazila.avgPm10_30d.toFixed(0)}
                <small style={{ fontSize: '1rem' }}> µg/m³</small>
              </strong>
              <small>30-day average</small>
            </div>
          )}
          {upazila.avgCloudCover30d != null && (
            <div className="metric">
              <span>Cloud cover</span>
              <strong>{upazila.avgCloudCover30d.toFixed(0)}%</strong>
              <small>30-day average</small>
            </div>
          )}
        </div>
      )}

      {/* Unions grid */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Unions</h2>
            <p>{upazila.unions.length} unions in {upazila.name} — click to view climate data</p>
          </div>
        </div>
        <div className="union-list">
          {upazila.unions.map((u) => (
            <Link key={u.id} href={`/locations/unions/${u.id}`} className="union-list-item">
              {u.name}
              {u.bnName && <small>{u.bnName}</small>}
            </Link>
          ))}
          {upazila.unions.length === 0 && (
            <div className="empty-state">No unions listed for this upazila.</div>
          )}
        </div>
      </article>

      {upazila.climateUpdatedAt && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          Climate data updated {relativeTime(upazila.climateUpdatedAt)} · 30-day rolling average from OpenMeteo
        </p>
      )}
    </>
  );
}
