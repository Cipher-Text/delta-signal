import Link from 'next/link';
import {
  routes,
  type CurrentWeatherReading,
  type HourlyAirQualityReading,
  type StationFloodForecast,
  type Alert,
  type Occurrence,
  type CitizenReport,
  type Observation,
  type RestorationProject,
  type PaginatedEnvelope,
  type MarineForecast,
  type SatelliteRadiationReading,
} from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { titleCase, relativeTime } from '../../../../../lib/format';

// District detail includes upazilas list and all 11 climate fields
interface DistrictDetail {
  id: string;
  name: string;
  bnName: string | null;
  areaSqKm: number | null;
  isCoastal: boolean;
  coastLat: number | null;
  coastLng: number | null;
  division: { id: string; name: string };
  upazilas: { id: string; name: string; bnName: string | null }[];
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

interface DailyForecast {
  id: string;
  forecastDate: string;
  weatherCode: number | null;
  temperature2mMax: number | null;
  temperature2mMin: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  windSpeed10mMax: number | null;
  uvIndexMax: number | null;
}

type DistrictTab = 'overview' | 'climate' | 'emissions' | 'activity';

function aqiClass(pm25: number | null): { label: string; css: string } {
  if (pm25 === null) return { label: 'No data', css: 'aqi-none' };
  if (pm25 <= 12)    return { label: 'Good',       css: 'aqi-good' };
  if (pm25 <= 35.4)  return { label: 'Moderate',   css: 'aqi-moderate' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*', css: 'aqi-sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',  css: 'aqi-unhealthy' };
  return               { label: 'Hazardous',        css: 'aqi-hazardous' };
}

function weatherDesc(code: number | null): string {
  if (code === null) return '—';
  if (code === 0)  return 'Clear';
  if (code <= 3)   return 'Partly cloudy';
  if (code <= 48)  return 'Foggy';
  if (code <= 55)  return 'Drizzle';
  if (code <= 65)  return 'Rain';
  if (code <= 75)  return 'Snow';
  if (code <= 82)  return 'Showers';
  if (code <= 99)  return 'Thunderstorm';
  return '—';
}

const SEVERITY_BADGE: Record<string, string> = {
  EMERGENCY: 'danger',
  WARNING: 'warning',
  WATCH: 'warning',
  INFO: 'info',
};

const TRUST_BADGE: Record<string, string> = {
  RESEARCH_GRADE: 'success',
  COMMUNITY: 'info',
  UNVERIFIED: 'muted',
};

async function tryGet<T>(url: string, revalidate = 900): Promise<T | null> {
  try {
    return await apiGet<T>(url, revalidate);
  } catch {
    return null;
  }
}

export default async function DistrictPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const { id } = params;
  const tab = (searchParams.tab as DistrictTab) ?? 'overview';

  const district = await apiGet<DistrictDetail>(routes.locations.district(id), 900);

  const [
    weather,
    airQuality,
    forecastData,
    floodData,
    alertsRes,
    marine,
    radiation,
    occurrencesRes,
    reportsRes,
    observationsRes,
    restorationRes,
  ] = await Promise.all([
    tryGet<CurrentWeatherReading>(routes.weather.currentByDistrict(id), 300),
    tryGet<HourlyAirQualityReading>(routes.weather.airQualityByDistrict(id), 900),
    tryGet<DailyForecast[]>(routes.weather.daily(id), 900),
    tryGet<StationFloodForecast[]>(routes.flood.forecastByDistrict(id), 3600),
    tryGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?districtId=${id}&status=ACTIVE&pageSize=3`, 300),
    district.isCoastal
      ? tryGet<MarineForecast[]>(routes.marine.forecastByDistrict(id), 3600)
      : Promise.resolve(null),
    tryGet<SatelliteRadiationReading[]>(routes.radiation.dailyByDistrict(id), 3600),
    tryGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?districtId=${id}&pageSize=5`, 900),
    tryGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?districtId=${id}&pageSize=5`, 900),
    tryGet<PaginatedEnvelope<Observation>>(`${routes.observations.list}?districtId=${id}&pageSize=5`, 900),
    tryGet<PaginatedEnvelope<RestorationProject>>(`${routes.restoration.projects}?districtId=${id}&pageSize=3`, 900),
  ]);

  const pm25 = airQuality?.pm25 ?? district.avgPm25_30d;
  const aqi = aqiClass(pm25);
  const activeAlerts = alertsRes?.data ?? [];
  const emergency = activeAlerts.find((a) => a.severity === 'EMERGENCY');
  const forecast = forecastData?.slice(0, 7) ?? [];
  const floodToday = floodData?.[0] ?? null;
  const floodPeak = floodData && floodData.length > 0
    ? Math.max(...floodData.map((f) => f.riverDischargeMax ?? 0))
    : null;
  const marineToday = marine?.[0] ?? null;
  const radiationRecent = radiation?.slice(0, 7) ?? [];
  const hasReports = (reportsRes?.data.length ?? 0) > 0;
  const hasObs = (observationsRes?.data.length ?? 0) > 0;
  const hasRestoration = (restorationRes?.data.length ?? 0) > 0;

  return (
    <>
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: district.division.name, href: `/locations/divisions/${district.division.id}` },
          { label: district.name },
        ]}
      />

      {/* Emergency alert strip */}
      {emergency && (
        <Link className="alert-strip danger" href={`/alerts/${emergency.id}`} role="alert">
          {emergency.title} — {emergency.district?.name ?? district.name} →
        </Link>
      )}

      <div className="panel-header">
        <div>
          <p className="eyebrow">District · {district.division.name}</p>
          <h1>
            {district.name}
            {district.bnName && (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 10, fontSize: '0.75em' }}>
                {district.bnName}
              </span>
            )}
          </h1>
          <p>
            {district.upazilas.length} upazila{district.upazilas.length !== 1 ? 's' : ''}
            {district.areaSqKm != null && ` · ${district.areaSqKm.toLocaleString()} km²`}
            {district.isCoastal && ' · Coastal district'}
          </p>
        </div>
        <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
      </div>

      {/* Tab navigation */}
      <nav className="tab-nav" aria-label="District sections">
        <Link href="?tab=overview" className={tab === 'overview' ? 'active' : ''}>Overview</Link>
        <Link href="?tab=climate" className={tab === 'climate' ? 'active' : ''}>Climate</Link>
        <Link href="?tab=activity" className={tab === 'activity' ? 'active' : ''}>Activity</Link>
      </nav>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          {/* Current weather */}
          {weather && (
            <div className="metric-grid">
              <div className="metric">
                <span>Temperature</span>
                <strong>{weather.temperature2m?.toFixed(1) ?? '—'}°C</strong>
                <small>Feels like {weather.apparentTemperature?.toFixed(1) ?? '—'}°C</small>
              </div>
              <div className="metric">
                <span>Humidity</span>
                <strong>{weather.relativeHumidity2m?.toFixed(0) ?? '—'}%</strong>
                <small>Relative humidity</small>
              </div>
              <div className="metric">
                <span>Wind speed</span>
                <strong>
                  {weather.windSpeed10m?.toFixed(1) ?? '—'}
                  <small style={{ fontSize: '1rem' }}>km/h</small>
                </strong>
                <small>At 10m</small>
              </div>
              <div className="metric">
                <span>Precipitation</span>
                <strong>
                  {weather.precipitation?.toFixed(1) ?? '—'}
                  <small style={{ fontSize: '1rem' }}>mm</small>
                </strong>
                <small>Current</small>
              </div>
            </div>
          )}

          <div className="content-grid">
            {/* Air quality */}
            {airQuality && (
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Air Quality</h2>
                    <p>Latest hourly reading</p>
                  </div>
                  <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
                </div>

                {airQuality.pm25 != null && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="aqi-bar-track">
                      <div
                        className={`aqi-bar-fill ${aqi.css}-fill`}
                        style={{ width: `${Math.min(100, (airQuality.pm25 / 200) * 100)}%` }}
                      />
                    </div>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      PM2.5 {airQuality.pm25.toFixed(0)} µg/m³
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.88rem' }}>
                  {airQuality.pm10 != null && (
                    <>
                      <span className="muted">PM10</span>
                      <span>{airQuality.pm10.toFixed(0)} µg/m³</span>
                    </>
                  )}
                  {airQuality.nitrogenDioxide != null && (
                    <>
                      <span className="muted">NO₂</span>
                      <span>{airQuality.nitrogenDioxide.toFixed(1)} µg/m³</span>
                    </>
                  )}
                  {airQuality.ozone != null && (
                    <>
                      <span className="muted">O₃</span>
                      <span>{airQuality.ozone.toFixed(1)} µg/m³</span>
                    </>
                  )}
                  {airQuality.sulphurDioxide != null && (
                    <>
                      <span className="muted">SO₂</span>
                      <span>{airQuality.sulphurDioxide.toFixed(1)} µg/m³</span>
                    </>
                  )}
                  {airQuality.carbonMonoxide != null && (
                    <>
                      <span className="muted">CO</span>
                      <span>{airQuality.carbonMonoxide.toFixed(0)} µg/m³</span>
                    </>
                  )}
                  {airQuality.uvIndex != null && (
                    <>
                      <span className="muted">UV index</span>
                      <span>{airQuality.uvIndex.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </article>
            )}

            {/* Flood forecast */}
            {floodToday && (
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Flood Forecast</h2>
                    <p>30-day river discharge outlook</p>
                  </div>
                </div>
                <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {floodToday.riverDischargeMean != null && (
                    <div className="metric">
                      <span>Mean discharge</span>
                      <strong>
                        {floodToday.riverDischargeMean.toFixed(0)}
                        <small style={{ fontSize: '1rem' }}>m³/s</small>
                      </strong>
                      <small>Today</small>
                    </div>
                  )}
                  {floodPeak != null && floodPeak > 0 && (
                    <div className="metric">
                      <span>Peak (30-day)</span>
                      <strong>
                        {floodPeak.toFixed(0)}
                        <small style={{ fontSize: '1rem' }}>m³/s</small>
                      </strong>
                      <small>Max forecast</small>
                    </div>
                  )}
                </div>
                {floodToday.riverDischargeP25 != null && floodToday.riverDischargeP75 != null && (
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 10 }}>
                    Uncertainty band today: {floodToday.riverDischargeP25.toFixed(0)}–{floodToday.riverDischargeP75.toFixed(0)} m³/s
                  </p>
                )}
              </article>
            )}
          </div>

          {/* Marine conditions (coastal districts only) */}
          {district.isCoastal && marineToday && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Marine Conditions</h2>
                  <p>
                    Wave and swell forecast ·{' '}
                    {new Date(marineToday.forecastDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
              <div className="metric-grid">
                {marineToday.waveHeightMax != null && (
                  <div className="metric">
                    <span>Wave height</span>
                    <strong>
                      {marineToday.waveHeightMax.toFixed(1)}
                      <small style={{ fontSize: '1rem' }}>m</small>
                    </strong>
                    <small>Max today</small>
                  </div>
                )}
                {marineToday.wavePeriodMax != null && (
                  <div className="metric">
                    <span>Wave period</span>
                    <strong>
                      {marineToday.wavePeriodMax.toFixed(0)}
                      <small style={{ fontSize: '1rem' }}>s</small>
                    </strong>
                    <small>Peak period</small>
                  </div>
                )}
                {marineToday.swellWaveHeightMax != null && (
                  <div className="metric">
                    <span>Swell height</span>
                    <strong>
                      {marineToday.swellWaveHeightMax.toFixed(1)}
                      <small style={{ fontSize: '1rem' }}>m</small>
                    </strong>
                    <small>Max today</small>
                  </div>
                )}
                {marineToday.seaSurfaceTemp != null && (
                  <div className="metric">
                    <span>Sea surface temp</span>
                    <strong>{marineToday.seaSurfaceTemp.toFixed(1)}°C</strong>
                    <small>Surface water</small>
                  </div>
                )}
              </div>
            </article>
          )}

          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Active Alerts</h2>
                  <p>Environmental warnings for this district</p>
                </div>
                <Link href="/alerts" className="button ghost">View all alerts</Link>
              </div>
              <div className="table" role="table" aria-label="Active alerts">
                <div className="table-row table-head" role="row">
                  <span>Alert</span>
                  <span>Severity</span>
                  <span>Issued</span>
                  <span>Expires</span>
                </div>
                {activeAlerts.map((a) => (
                  <Link className="table-row table-row-link" role="row" key={a.id} href={`/alerts/${a.id}`}>
                    <strong>{a.title}</strong>
                    <span className={`tag ${SEVERITY_BADGE[a.severity] ?? 'info'}`}>{titleCase(a.severity)}</span>
                    <span>{relativeTime(a.issuedAt)}</span>
                    <span>{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('en-GB') : '—'}</span>
                  </Link>
                ))}
              </div>
            </article>
          )}
        </>
      )}

      {/* ── Climate tab ──────────────────────────────────────────────────────── */}
      {tab === 'climate' && (
        <>
          {/* 7-day forecast */}
          {forecast.length > 0 && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>7-Day Forecast</h2>
                  <p>Daily weather outlook</p>
                </div>
              </div>
              <div className="table" role="table" aria-label="7-day forecast">
                <div className="table-row table-head" role="row">
                  <span>Date</span>
                  <span>Condition</span>
                  <span>Temp range</span>
                  <span>Rain</span>
                </div>
                {forecast.map((f) => (
                  <div className="table-row" role="row" key={f.id}>
                    <span>
                      {new Date(f.forecastDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span>{weatherDesc(f.weatherCode)}</span>
                    <span>
                      {f.temperature2mMin?.toFixed(0) ?? '—'}–{f.temperature2mMax?.toFixed(0) ?? '—'}°C
                    </span>
                    <span>
                      {f.precipitationSum?.toFixed(1) ?? '—'}mm
                      {f.precipitationProbabilityMax != null && ` (${f.precipitationProbabilityMax}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* 30-day climate summary */}
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>30-Day Climate</h2>
                <p>
                  {district.climateUpdatedAt
                    ? `Updated ${relativeTime(district.climateUpdatedAt)}`
                    : 'Rolling 30-day average from OpenMeteo'}
                </p>
              </div>
            </div>
            <div className="metric-grid">
              {district.avgTemp30d != null && (
                <div className="metric">
                  <span>Avg temperature</span>
                  <strong>{district.avgTemp30d.toFixed(1)}°C</strong>
                  <small>
                    {district.minTemp30d != null && district.maxTemp30d != null
                      ? `${district.minTemp30d.toFixed(1)}–${district.maxTemp30d.toFixed(1)}°C`
                      : '30-day average'}
                  </small>
                </div>
              )}
              {district.totalPrecip30d != null && (
                <div className="metric">
                  <span>Total precipitation</span>
                  <strong>
                    {district.totalPrecip30d.toFixed(0)}
                    <small style={{ fontSize: '1rem' }}>mm</small>
                  </strong>
                  <small>Last 30 days</small>
                </div>
              )}
              {district.avgHumidity30d != null && (
                <div className="metric">
                  <span>Avg humidity</span>
                  <strong>{district.avgHumidity30d.toFixed(0)}%</strong>
                  <small>30-day average</small>
                </div>
              )}
              {district.avgUvIndex30d != null && (
                <div className="metric">
                  <span>UV index</span>
                  <strong>{district.avgUvIndex30d.toFixed(1)}</strong>
                  <small>30-day average</small>
                </div>
              )}
            </div>
            {(district.avgWindSpeed30d != null || district.avgPm10_30d != null || district.avgCloudCover30d != null) && (
              <div className="metric-grid" style={{ marginTop: 12 }}>
                {district.avgWindSpeed30d != null && (
                  <div className="metric">
                    <span>Avg wind speed</span>
                    <strong>
                      {district.avgWindSpeed30d.toFixed(1)}
                      <small style={{ fontSize: '1rem' }}>km/h</small>
                    </strong>
                    <small>30-day average</small>
                  </div>
                )}
                {district.avgPm10_30d != null && (
                  <div className="metric">
                    <span>PM10</span>
                    <strong>
                      {district.avgPm10_30d.toFixed(0)}
                      <small style={{ fontSize: '1rem' }}> µg/m³</small>
                    </strong>
                    <small>30-day average</small>
                  </div>
                )}
                {district.avgCloudCover30d != null && (
                  <div className="metric">
                    <span>Cloud cover</span>
                    <strong>{district.avgCloudCover30d.toFixed(0)}%</strong>
                    <small>30-day average</small>
                  </div>
                )}
              </div>
            )}
          </article>

          {/* Solar radiation */}
          {radiationRecent.length > 0 && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Solar Radiation</h2>
                  <p>Daily shortwave radiation sum — satellite data from OpenMeteo</p>
                </div>
              </div>
              <div className="table" role="table" aria-label="Solar radiation readings">
                <div className="table-row table-head" role="row">
                  <span>Date</span>
                  <span>Shortwave radiation</span>
                </div>
                {radiationRecent.map((r) => (
                  <div className="table-row" role="row" key={r.id}>
                    <span>
                      {new Date(r.readingDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span>
                      {r.shortwaveRadiationSum != null
                        ? `${r.shortwaveRadiationSum.toFixed(1)} MJ/m²`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          )}
        </>
      )}

      {/* ── Activity tab ─────────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <>
          {/* Biodiversity */}
          {occurrencesRes && occurrencesRes.data.length > 0 && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Biodiversity</h2>
                  <p>Recent species occurrences in this district</p>
                </div>
                <Link href="/biodiversity" className="button ghost">Browse all species</Link>
              </div>
              <div className="table" role="table" aria-label="Species occurrences">
                <div className="table-row table-head" role="row">
                  <span>Species</span>
                  <span>Common name</span>
                  <span>Kingdom</span>
                  <span>Observed</span>
                </div>
                {occurrencesRes.data.map((o) => (
                  <Link
                    className="table-row table-row-link"
                    role="row"
                    key={o.id}
                    href={`/biodiversity/species/${o.speciesId}`}
                  >
                    <strong><em>{o.species.canonicalName}</em></strong>
                    <span>{o.species.vernacularName ?? '—'}</span>
                    <span>{o.species.kingdom ?? '—'}</span>
                    <span>{o.observedAt ? relativeTime(o.observedAt) : '—'}</span>
                  </Link>
                ))}
              </div>
            </article>
          )}

          {/* Community activity */}
          {(hasReports || hasObs || hasRestoration) && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Community Activity</h2>
                  <p>Reports, observations, and restoration projects in this district</p>
                </div>
              </div>

              {hasReports && reportsRes && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                    <h3 style={{ fontSize: '0.92rem', margin: 0 }}>Citizen Reports</h3>
                    <Link href="/reports" className="muted" style={{ fontSize: '0.82rem' }}>View all →</Link>
                  </div>
                  <div className="table" role="table" aria-label="Recent reports">
                    <div className="table-row table-head" role="row">
                      <span>Title</span>
                      <span>Category</span>
                      <span>By</span>
                      <span>Submitted</span>
                    </div>
                    {reportsRes.data.map((r) => (
                      <Link className="table-row table-row-link" role="row" key={r.id} href={`/reports/${r.id}`}>
                        <strong>{r.title}</strong>
                        <span>{titleCase(r.category)}</span>
                        <span>{r.reporter?.displayName ?? '—'}</span>
                        <span>{relativeTime(r.createdAt)}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {hasObs && observationsRes && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 16 }}>
                    <h3 style={{ fontSize: '0.92rem', margin: 0 }}>Observations</h3>
                    <Link href="/observations" className="muted" style={{ fontSize: '0.82rem' }}>View all →</Link>
                  </div>
                  <div className="table" role="table" aria-label="Recent observations">
                    <div className="table-row table-head" role="row">
                      <span>Category</span>
                      <span>Species</span>
                      <span>Trust</span>
                      <span>Observed</span>
                    </div>
                    {observationsRes.data.map((o) => (
                      <Link className="table-row table-row-link" role="row" key={o.id} href={`/observations/${o.id}`}>
                        <span>{titleCase(o.category)}</span>
                        <span>{o.species ?? '—'}</span>
                        <span className={`tag ${TRUST_BADGE[o.trustLevel] ?? 'muted'}`}>
                          {titleCase(o.trustLevel)}
                        </span>
                        <span>{relativeTime(o.observedAt)}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {hasRestoration && restorationRes && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 16 }}>
                    <h3 style={{ fontSize: '0.92rem', margin: 0 }}>Restoration Projects</h3>
                    <Link href="/restoration" className="muted" style={{ fontSize: '0.82rem' }}>View all →</Link>
                  </div>
                  <div className="table" role="table" aria-label="Restoration projects">
                    <div className="table-row table-head" role="row">
                      <span>Project</span>
                      <span>Category</span>
                      <span>Status</span>
                      <span>Participants</span>
                    </div>
                    {restorationRes.data.map((r) => (
                      <Link className="table-row table-row-link" role="row" key={r.id} href={`/restoration/${r.id}`}>
                        <strong>{r.title}</strong>
                        <span>{titleCase(r.category)}</span>
                        <span className="tag muted">{titleCase(r.status)}</span>
                        <span>{r._count.participants}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </article>
          )}

          {!hasReports && !hasObs && !hasRestoration && (!occurrencesRes || occurrencesRes.data.length === 0) && (
            <p className="muted">No activity data recorded in this district yet.</p>
          )}

          {/* Upazilas */}
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Upazilas</h2>
                <p>{district.upazilas.length} upazilas in {district.name} — click to view climate data</p>
              </div>
            </div>
            <div className="union-list">
              {district.upazilas.map((u) => (
                <Link key={u.id} href={`/locations/upazilas/${u.id}`} className="union-list-item">
                  {u.name}
                  {u.bnName && <small>{u.bnName}</small>}
                </Link>
              ))}
            </div>
          </article>
        </>
      )}
    </>
  );
}
