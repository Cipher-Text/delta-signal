import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { relativeTime } from '../../../../../lib/format';

interface UnionDetail {
  id: string;
  name: string;
  bnName: string | null;
  upazila: {
    id: string;
    name: string;
    district: {
      id: string;
      name: string;
      division: { id: string; name: string };
    };
  };
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

export default async function UnionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const union = await apiGet<UnionDetail>(routes.locations.union(params.id), 900);
  const { upazila } = union;
  const { district } = upazila;
  const aqi = aqiClass(union.avgPm25_30d);

  return (
    <>
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: district.division.name, href: `/locations/divisions/${district.division.id}` },
          { label: district.name, href: `/locations/districts/${district.id}` },
          { label: upazila.name, href: `/locations/upazilas/${upazila.id}` },
          { label: union.name },
        ]}
      />

      <div className="panel-header">
        <div>
          <p className="eyebrow">Union · {upazila.name}, {district.name}</p>
          <h1>
            {union.name}
            {union.bnName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 10, fontSize: '0.75em' }}>
                {union.bnName}
              </span>
            )}
          </h1>
          <p>Most granular climate data available for this location</p>
        </div>
        <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
      </div>

      {/* Primary climate metrics */}
      <div className="metric-grid">
        {union.avgTemp30d != null && (
          <div className="metric">
            <span>Avg temperature</span>
            <strong>{union.avgTemp30d.toFixed(1)}°C</strong>
            <small>
              {union.minTemp30d != null && union.maxTemp30d != null
                ? `${union.minTemp30d.toFixed(1)}–${union.maxTemp30d.toFixed(1)}°C range`
                : '30-day average'}
            </small>
          </div>
        )}
        {union.totalPrecip30d != null && (
          <div className="metric">
            <span>Total precipitation</span>
            <strong>
              {union.totalPrecip30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}>mm</small>
            </strong>
            <small>Last 30 days</small>
          </div>
        )}
        {union.avgHumidity30d != null && (
          <div className="metric">
            <span>Avg humidity</span>
            <strong>{union.avgHumidity30d.toFixed(0)}%</strong>
            <small>30-day average</small>
          </div>
        )}
        {union.avgPm25_30d != null && (
          <div className="metric">
            <span>PM2.5 air quality</span>
            <strong>
              {union.avgPm25_30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}> µg/m³</small>
            </strong>
            <small
              className={
                union.avgPm25_30d > 55.4 ? 'danger'
                : union.avgPm25_30d > 35.4 ? 'warning'
                : 'success'
              }
            >
              {aqi.label}
            </small>
          </div>
        )}
      </div>

      {/* Secondary climate metrics */}
      <div className="metric-grid">
        {union.avgWindSpeed30d != null && (
          <div className="metric">
            <span>Avg wind speed</span>
            <strong>
              {union.avgWindSpeed30d.toFixed(1)}
              <small style={{ fontSize: '1rem' }}>km/h</small>
            </strong>
            <small>30-day average</small>
          </div>
        )}
        {union.avgUvIndex30d != null && (
          <div className="metric">
            <span>UV index</span>
            <strong>{union.avgUvIndex30d.toFixed(1)}</strong>
            <small>30-day average</small>
          </div>
        )}
        {union.avgPm10_30d != null && (
          <div className="metric">
            <span>PM10</span>
            <strong>
              {union.avgPm10_30d.toFixed(0)}
              <small style={{ fontSize: '1rem' }}> µg/m³</small>
            </strong>
            <small>30-day average</small>
          </div>
        )}
        {union.avgCloudCover30d != null && (
          <div className="metric">
            <span>Cloud cover</span>
            <strong>{union.avgCloudCover30d.toFixed(0)}%</strong>
            <small>30-day average</small>
          </div>
        )}
      </div>

      {/* District-level detail prompt */}
      <div className="access-note">
        <strong>Live weather and flood data available at district level</strong>
        <span>
          For current weather, air quality, flood forecasts, biodiversity, and community reports, visit the{' '}
          <Link href={`/locations/districts/${district.id}`}>{district.name} district page</Link>.
        </span>
      </div>

      {union.climateUpdatedAt && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          Climate data updated {relativeTime(union.climateUpdatedAt)} · 30-day rolling average from OpenMeteo
        </p>
      )}
    </>
  );
}
