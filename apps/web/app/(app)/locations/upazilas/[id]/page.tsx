import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationHeader, LocationSectionNav, LocationSourceNote } from '../../../../../components/location-page';
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

      <LocationHeader
        level="Upazila"
        parentLabel={`${upazila.district.name}, ${upazila.district.division.name}`}
        name={upazila.name}
        bnName={upazila.bnName}
        summary={`${upazila.unions.length} union${upazila.unions.length !== 1 ? 's' : ''}${upazila.areaSqKm != null ? ` · ${upazila.areaSqKm.toLocaleString()} km²` : ''}`}
        statusLabel={`${aqi.label} · 30-day PM2.5`}
        statusClass={aqi.css}
        freshness={upazila.climateUpdatedAt ? `Climate updated ${relativeTime(upazila.climateUpdatedAt)}` : 'Climate update time unavailable'}
      />

      <LocationSectionNav
        label="Upazila sections"
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'climate', label: 'Climate' },
          { id: 'geography', label: 'Geography' },
        ]}
      />

      <div className="location-section-stack">
        <section id="overview" className="location-section" aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="sr-only">Upazila environmental overview</h2>
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
        </section>

        <section id="climate" className="location-section" aria-labelledby="climate-heading">
          <h2 id="climate-heading" className="sr-only">Climate detail</h2>
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Climate detail</h2>
                <p>
                  {upazila.climateUpdatedAt
                    ? `30-day rolling averages · Updated ${relativeTime(upazila.climateUpdatedAt)}`
                    : '30-day rolling averages from OpenMeteo'}
                </p>
              </div>
            </div>
            {(upazila.avgWindSpeed30d != null || upazila.avgUvIndex30d != null || upazila.avgPm10_30d != null || upazila.avgCloudCover30d != null) ? (
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
            ) : (
              <p className="empty-state">Additional climate indicators are not available for this upazila yet.</p>
            )}
          </article>
        </section>

        <section id="geography" className="location-section" aria-labelledby="geography-heading">
          <h2 id="geography-heading" className="sr-only">Upazila geography</h2>
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
        </section>
      </div>

      <LocationSourceNote>
        Source: OpenMeteo forecast and air-quality data · Values are derived 30-day averages, not local station observations.
      </LocationSourceNote>
    </>
  );
}
