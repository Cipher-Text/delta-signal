import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationHeader, LocationSectionNav, LocationSourceNote } from '../../../../../components/location-page';
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

      <LocationHeader
        level="Union"
        parentLabel={`${upazila.name}, ${district.name}`}
        name={union.name}
        bnName={union.bnName}
        summary="Most granular climate data available for this location · 30-day derived averages"
        statusLabel={`${aqi.label} · 30-day PM2.5`}
        statusClass={aqi.css}
        freshness={union.climateUpdatedAt ? `Climate updated ${relativeTime(union.climateUpdatedAt)}` : 'Climate update time unavailable'}
      />

      <LocationSectionNav
        label="Union sections"
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'climate', label: 'Climate' },
          { id: 'context', label: 'Context' },
        ]}
      />

      <div className="location-section-stack">
        <section id="overview" className="location-section" aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="sr-only">Union environmental overview</h2>
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
        </section>

        <section id="climate" className="location-section" aria-labelledby="climate-heading">
          <h2 id="climate-heading" className="sr-only">Climate detail</h2>
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Climate detail</h2>
                <p>
                  {union.climateUpdatedAt
                    ? `30-day rolling averages · Updated ${relativeTime(union.climateUpdatedAt)}`
                    : '30-day rolling averages from OpenMeteo'}
                </p>
              </div>
            </div>
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
          </article>
        </section>

        <section id="context" className="location-section" aria-labelledby="context-heading">
          <h2 id="context-heading" className="sr-only">Available environmental context</h2>
          <div className="access-note">
        <strong>Weather and flood data available at district level</strong>
        <span>
          For current weather, air quality, flood forecasts, biodiversity, and community reports, visit the{' '}
          <Link href={`/locations/districts/${district.id}`}>{district.name} district page</Link>.
        </span>
          </div>
        </section>
      </div>

      <LocationSourceNote>
        Source: OpenMeteo forecast and air-quality data · Union values are derived aggregates, not local station observations.
      </LocationSourceNote>
    </>
  );
}
