import Link from 'next/link';
import {
  routes,
  type Alert,
  type CitizenReport,
  type CurrentWeatherReading,
  type DistrictWithClimate,
  type DivisionWithClimate,
  type HourlyAirQualityReading,
  type Observation,
  type Occurrence,
  type PaginatedEnvelope,
  type RestorationProject,
  type StationFloodForecast,
} from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { relativeTime, titleCase } from '../../../../../lib/format';

function aqiClass(pm25: number | null): { label: string; css: string } {
  if (pm25 === null) return { label: 'No data', css: 'aqi-none' };
  if (pm25 <= 12)    return { label: 'Good',       css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',   css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*', css: 'aqi-sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',  css: 'aqi-unhealthy' };
  return               { label: 'Hazardous',        css: 'aqi-hazardous' };
}

const SEVERITY_BADGE: Record<string, string> = {
  EMERGENCY: 'danger', WARNING: 'warning', WATCH: 'warning', INFO: 'info',
};

const TRUST_BADGE: Record<string, string> = {
  RESEARCH_GRADE: 'success', COMMUNITY: 'info', UNVERIFIED: 'muted',
};

async function tryGet<T>(url: string, revalidate = 900): Promise<T | null> {
  try { return await apiGet<T>(url, revalidate); } catch { return null; }
}

export default async function DivisionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [divisions, districts] = await Promise.all([
    apiGet<DivisionWithClimate[]>(routes.locations.divisions, 900),
    apiGet<DistrictWithClimate[]>(`${routes.locations.districts}?divisionId=${params.id}`, 900),
  ]);
  const division = divisions.find((d) => d.id === params.id);
  if (!division) return <p className="empty-state">Division not found.</p>;

  const districtIds = new Set(districts.map((district) => district.id));
  const [alertsRes, weather, airQuality, flood, reportsRes, observationsRes, occurrencesRes, restorationRes] = await Promise.all([
    tryGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?status=ACTIVE&pageSize=100`, 300),
    tryGet<CurrentWeatherReading[]>(routes.weather.current, 300),
    tryGet<HourlyAirQualityReading[]>(routes.weather.airQuality, 900),
    tryGet<StationFloodForecast[]>(routes.flood.forecast, 3600),
    tryGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?status=VERIFIED&pageSize=100`, 900),
    tryGet<PaginatedEnvelope<Observation>>(`${routes.observations.list}?pageSize=100`, 900),
    tryGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?pageSize=100`, 900),
    tryGet<PaginatedEnvelope<RestorationProject>>(`${routes.restoration.projects}?pageSize=100`, 900),
  ]);

  const activeAlerts = (alertsRes?.data ?? []).filter((alert) => !alert.district || districtIds.has(alert.district.id));
  const divisionWeather = (weather ?? []).filter((reading) => districtIds.has(reading.districtId));
  const divisionAirQuality = (airQuality ?? []).filter((reading) => districtIds.has(reading.districtId));
  const divisionFlood = (flood ?? []).filter((reading) => reading.station?.districtId && districtIds.has(reading.station.districtId));
  const divisionReports = (reportsRes?.data ?? []).filter((report) => report.districtId && districtIds.has(report.districtId));
  const divisionObservations = (observationsRes?.data ?? []).filter((observation) => observation.districtId && districtIds.has(observation.districtId));
  const divisionOccurrences = (occurrencesRes?.data ?? []).filter((occurrence) => occurrence.districtId && districtIds.has(occurrence.districtId));
  const divisionRestoration = (restorationRes?.data ?? []).filter((project) => project.districtId && districtIds.has(project.districtId));
  const aqi = aqiClass(division.avgPm25_30d);
  const emergency = activeAlerts.find((alert) => alert.severity === 'EMERGENCY');
  const floodStations = new Set(divisionFlood.map((reading) => reading.stationId));
  const districtsWithWeather = new Set(divisionWeather.map((reading) => reading.districtId)).size;
  const districtsWithAirQuality = new Set(divisionAirQuality.map((reading) => reading.districtId)).size;

  return (
    <>
      <LocationBreadcrumb crumbs={[{ label: 'Locations', href: '/locations' }, { label: division.name }]} />
      {emergency && <Link className="alert-strip danger" href={`/alerts/${emergency.id}`} role="alert">{emergency.title} — {emergency.district?.name ?? `${division.name} Division`} →</Link>}

      <div className="panel-header">
        <div>
          <p className="eyebrow">Division · Bangladesh</p>
          <h1>{division.name}{division.bnName && <span className="muted" style={{ fontWeight: 400, marginLeft: 10, fontSize: '0.75em' }}>{division.bnName}</span>}</h1>
          <p>{districts.length} district{districts.length !== 1 ? 's' : ''}{division.areaSqKm != null && ` · ${division.areaSqKm.toLocaleString()} km²`}</p>
        </div>
        <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
          <span className={`aqi-badge ${aqi.css}`}>{aqi.label} · 30-day PM2.5</span>
          <small className="muted">{division.climateUpdatedAt ? `Climate updated ${relativeTime(division.climateUpdatedAt)}` : 'Climate update time unavailable'}</small>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric"><span>Avg temperature</span><strong>{division.avgTemp30d != null ? `${division.avgTemp30d.toFixed(1)}°C` : '—'}</strong><small>{division.minTemp30d != null && division.maxTemp30d != null ? `${division.minTemp30d.toFixed(1)}–${division.maxTemp30d.toFixed(1)}°C range` : '30-day average'}</small></div>
        <div className="metric"><span>Total precipitation</span><strong>{division.totalPrecip30d != null ? <>{division.totalPrecip30d.toFixed(0)}<small style={{ fontSize: '1rem' }}>mm</small></> : '—'}</strong><small>Last 30 days</small></div>
        <div className="metric"><span>Avg humidity</span><strong>{division.avgHumidity30d != null ? `${division.avgHumidity30d.toFixed(0)}%` : '—'}</strong><small>30-day average</small></div>
        <div className="metric"><span>PM2.5</span><strong>{division.avgPm25_30d != null ? <>{division.avgPm25_30d.toFixed(0)}<small style={{ fontSize: '1rem' }}> µg/m³</small></> : '—'}</strong><small>30-day average · OpenMeteo</small></div>
      </div>

      <div className="content-grid" style={{ marginTop: 18 }}>
        <article className="panel">
          <div className="panel-header"><div><h2>Active alerts</h2><p>Operational warnings affecting this division</p></div><Link href="/alerts" className="button ghost">View all</Link></div>
          {activeAlerts.length > 0 ? <div className="table" role="table" aria-label="Active division alerts"><div className="table-row table-head" role="row"><span>Alert</span><span>Severity</span><span>Issued</span></div>{activeAlerts.slice(0, 5).map((alert) => <Link className="table-row table-row-link" role="row" key={alert.id} href={`/alerts/${alert.id}`}><strong>{alert.title}</strong><span className={`tag ${SEVERITY_BADGE[alert.severity] ?? 'info'}`}>{titleCase(alert.severity)}</span><span>{relativeTime(alert.issuedAt)}</span></Link>)}</div> : <p className="empty-state">No active alerts for this division.</p>}
        </article>
        <article className="panel">
          <div className="panel-header"><div><h2>Signal coverage</h2><p>Latest available records by district</p></div></div>
          <div className="access-grid">
            <div className="access-grid-row"><span>Weather readings</span><strong>{districtsWithWeather}/{districts.length} districts</strong></div>
            <div className="access-grid-row"><span>Air-quality readings</span><strong>{districtsWithAirQuality}/{districts.length} districts</strong></div>
            <div className="access-grid-row"><span>Flood stations</span><strong>{floodStations.size}</strong></div>
            <div className="access-grid-row"><span>Verified reports</span><strong>{divisionReports.length}</strong></div>
            <div className="access-grid-row"><span>Research observations</span><strong>{divisionObservations.length}</strong></div>
          </div>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 12 }}>Counts reflect the latest records returned by the public APIs.</p>
        </article>
      </div>

      {divisionFlood.length > 0 && <article className="panel" style={{ marginTop: 18 }}><div className="panel-header"><div><h2>Flood and water signals</h2><p>Station-based simulated river discharge · not an official warning</p></div><Link href="/water-bodies/stations" className="button ghost">View stations</Link></div><div className="table" role="table" aria-label="Division flood signals"><div className="table-row table-head" role="row"><span>Station</span><span>River</span><span>Forecast date</span><span>Discharge</span></div>{divisionFlood.slice(0, 6).map((reading) => <Link className="table-row table-row-link" role="row" key={reading.id} href={`/water-bodies/stations/${reading.stationId}`}><strong>{reading.station?.name ?? 'Station'}</strong><span>{reading.station?.riverName ?? '—'}</span><span>{new Date(reading.forecastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span>{reading.riverDischarge != null ? `${reading.riverDischarge.toFixed(0)} m³/s` : '—'}</span></Link>)}</div></article>}

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header"><div><h2>Environmental activity</h2><p>Recent public evidence, biodiversity records, and restoration work</p></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href="/reports" className="button ghost">Reports</Link><Link href="/observations" className="button ghost">Observations</Link></div></div>
        {divisionReports.length > 0 && <><h3 style={{ fontSize: '0.92rem', margin: '4px 0 8px' }}>Verified reports</h3><div className="table" role="table" aria-label="Recent verified reports"><div className="table-row table-head" role="row"><span>Title</span><span>Category</span><span>District</span><span>Submitted</span></div>{divisionReports.slice(0, 5).map((report) => <Link className="table-row table-row-link" role="row" key={report.id} href={`/reports/${report.id}`}><strong>{report.title}</strong><span>{titleCase(report.category)}</span><span>{report.district?.name ?? '—'}</span><span>{relativeTime(report.createdAt)}</span></Link>)}</div></>}
        {divisionObservations.length > 0 && <><h3 style={{ fontSize: '0.92rem', margin: '18px 0 8px' }}>Observations</h3><div className="table" role="table" aria-label="Recent observations"><div className="table-row table-head" role="row"><span>Category</span><span>Species</span><span>Trust</span><span>Observed</span></div>{divisionObservations.slice(0, 5).map((observation) => <Link className="table-row table-row-link" role="row" key={observation.id} href={`/observations/${observation.id}`}><span>{titleCase(observation.category)}</span><span>{observation.species ?? '—'}</span><span className={`tag ${TRUST_BADGE[observation.trustLevel] ?? 'muted'}`}>{titleCase(observation.trustLevel)}</span><span>{relativeTime(observation.observedAt)}</span></Link>)}</div></>}
        {(divisionOccurrences.length > 0 || divisionRestoration.length > 0) && <div className="content-grid" style={{ marginTop: 18 }}>{divisionOccurrences.length > 0 && <div><h3 style={{ fontSize: '0.92rem', margin: '0 0 8px' }}>Biodiversity</h3><div className="access-grid"><div className="access-grid-row"><span>Species recorded</span><strong>{new Set(divisionOccurrences.map((occurrence) => occurrence.speciesId)).size}</strong></div><div className="access-grid-row"><span>Occurrence records</span><strong>{divisionOccurrences.length}</strong></div></div><Link href="/biodiversity" className="muted" style={{ display: 'inline-block', marginTop: 10, fontSize: '0.82rem' }}>Browse biodiversity →</Link></div>}{divisionRestoration.length > 0 && <div><h3 style={{ fontSize: '0.92rem', margin: '0 0 8px' }}>Restoration</h3><div className="access-grid"><div className="access-grid-row"><span>Projects</span><strong>{divisionRestoration.length}</strong></div><div className="access-grid-row"><span>Active projects</span><strong>{divisionRestoration.filter((project) => project.status === 'ACTIVE').length}</strong></div></div><Link href="/restoration" className="muted" style={{ display: 'inline-block', marginTop: 10, fontSize: '0.82rem' }}>Browse restoration →</Link></div>}</div>}
        {divisionReports.length === 0 && divisionObservations.length === 0 && divisionOccurrences.length === 0 && divisionRestoration.length === 0 && <p className="empty-state">No public activity records are available for this division yet.</p>}
      </article>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <div>
            <h2>Districts</h2>
            <p>Select a district for detailed weather, flood, biodiversity, and community data.</p>
          </div>
        </div>
        <div className="division-grid">
          {districts.map((district) => {
            const districtAqi = aqiClass(district.avgPm25_30d);
            return (
              <Link key={district.id} href={`/locations/districts/${district.id}`} className={`division-card ${districtAqi.css}`} style={{ textDecoration: 'none' }}>
                <div className="division-card-top">
                  <span className="division-name">{district.name}</span>
                  {district.bnName && <span className="division-bn">{district.bnName}</span>}
                </div>
                <div className="division-card-temp">{district.avgTemp30d != null ? `${district.avgTemp30d.toFixed(1)}°C` : '—'}</div>
                <div className="division-card-aqi">
                  <span className={`aqi-badge ${districtAqi.css}`}>{districtAqi.label}</span>
                  {district.avgPm25_30d != null && <span className="division-pm25">PM2.5 {district.avgPm25_30d.toFixed(0)} µg/m³</span>}
                </div>
                <div className="division-card-footer">
                  {district.totalPrecip30d != null && <span>{district.totalPrecip30d.toFixed(0)}mm rain</span>}
                  {district.avgUvIndex30d != null && <span>UV {district.avgUvIndex30d.toFixed(1)}</span>}
                </div>
              </Link>
            );
          })}
          {districts.length === 0 && <div className="empty-state">No districts found for this division.</div>}
        </div>
      </article>
    </>
  );
}
