import Link from 'next/link';
import {
  routes,
  type Alert,
  type CitizenReport,
  type CurrentWeatherReading,
  type HourlyAirQualityReading,
  type MarineForecast,
  type Observation,
  type Occurrence,
  type PaginatedEnvelope,
  type RestorationProject,
  type SatelliteRadiationReading,
  type StationFloodForecast,
} from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationSectionNav, LocationSourceNote } from '../../../../../components/location-page';
import NavIcon from '../../../../../components/nav-icons';
import { canonicalDivision } from '../../../../../lib/alerts';
import { calendarDay, dhakaDate, dhakaToday, pluralize, relativeTime, titleCase } from '../../../../../lib/format';

interface DistrictDetail {
  id: string;
  name: string;
  bnName: string | null;
  areaSqKm: number | null;
  isCoastal: boolean;
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
}

/** US EPA PM2.5 categories. They describe 24-hour values: used for the latest hourly reading only, never for 30-day means. */
function pmCategory(pm25: number): { label: string; tone: string } {
  if (pm25 <= 12) return { label: 'Good range', tone: 'good' };
  if (pm25 <= 35.4) return { label: 'Moderate range', tone: 'moderate' };
  if (pm25 <= 55.4) return { label: 'Unhealthy for sensitive groups', tone: 'sensitive' };
  if (pm25 <= 150.4) return { label: 'Unhealthy range', tone: 'unhealthy' };
  if (pm25 <= 250.4) return { label: 'Very unhealthy range', tone: 'very' };
  return { label: 'Hazardous range', tone: 'hazardous' };
}

type Sky = 'clear' | 'partly' | 'fog' | 'rain' | 'storm' | 'snow';
function sky(code: number | null): { label: string; kind: Sky | null } {
  if (code === null) return { label: '—', kind: null };
  if (code === 0) return { label: 'Clear', kind: 'clear' };
  if (code <= 3) return { label: 'Partly cloudy', kind: 'partly' };
  if (code <= 48) return { label: 'Foggy', kind: 'fog' };
  if (code <= 55) return { label: 'Drizzle', kind: 'rain' };
  if (code <= 65) return { label: 'Rain', kind: 'rain' };
  if (code <= 75) return { label: 'Snow', kind: 'snow' };
  if (code <= 82) return { label: 'Showers', kind: 'rain' };
  if (code <= 99) return { label: 'Thunderstorm', kind: 'storm' };
  return { label: '—', kind: null };
}

function SkyIcon({ kind, label }: { kind: Sky | null; label: string }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, role: 'img', 'aria-label': label };
  const cloud = <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5 4.25 4.25 0 0 1 17 18z" />;
  switch (kind) {
    case 'clear':
      return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case 'partly':
      return <svg {...p}><circle cx="8" cy="8" r="3" /><path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7" />{cloud}</svg>;
    case 'rain':
      return <svg {...p}>{cloud}<path d="M9 21l1-2M13 21l1-2M17 21l1-2" /></svg>;
    case 'storm':
      return <svg {...p}>{cloud}<path d="M12 14l-2 4h3l-2 4" /></svg>;
    case 'fog':
      return <svg {...p}><path d="M4 9h16M3 13h18M5 17h14" /></svg>;
    case 'snow':
      return <svg {...p}>{cloud}<path d="M9 21h.01M13 21h.01M17 21h.01" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="1" /></svg>;
  }
}

/** UV index WHO bands, applied to the displayed (rounded) value. */
function uvBand(uv: number): string {
  const v = Math.round(uv);
  if (v <= 2) return 'Low';
  if (v <= 5) return 'Moderate';
  if (v <= 7) return 'High';
  if (v <= 10) return 'Very high';
  return 'Extreme';
}

/** A station is "above usual" at 1.5x its median; ratios on medians under 1 m³/s are noise and not computed. */
const MIN_MEDIAN = 1;

async function tryGet<T>(url: string, revalidate = 900): Promise<T | null> {
  try {
    return await apiGet<T>(url, revalidate);
  } catch {
    return null;
  }
}

const num = (v: number | null | undefined, digits = 1) => (v == null ? '—' : v.toFixed(digits));

function Tile({ label, value, unit, notes }: { label: string; value: string; unit?: string; notes: string[] }) {
  return (
    <div className="uz-tile">
      <span className="uz-tile-label">{label}</span>
      <span className="uz-tile-value">
        {value}
        {unit && value !== '—' && <small>{unit}</small>}
      </span>
      {notes.map((n) => (
        <span key={n} className="uz-tile-note">{n}</span>
      ))}
    </div>
  );
}

function CardHead({ title, sub, tag, link }: { title: string; sub?: string; tag?: string; link?: { href: string; label: string } }) {
  return (
    <div className="dv-card-head">
      <div>
        <h2>{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      {tag && <span className="dd-tag">{tag}</span>}
      {link && <Link href={link.href} className="dv-link">{link.label}</Link>}
    </div>
  );
}

/** District overview (Web UI Reference): now, air quality, hazards, 7-day forecast, last 30 days, nature, community, upazilas. */
export default async function DistrictPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const district = await apiGet<DistrictDetail>(routes.locations.district(id), 900);

  const [weather, air, daily, flood, alertsRes, marine, radiation, occurrencesRes, reportsRes, observationsRes, projectsRes] = await Promise.all([
    tryGet<CurrentWeatherReading>(routes.weather.currentByDistrict(id), 300),
    tryGet<HourlyAirQualityReading>(routes.weather.airQualityByDistrict(id), 900),
    tryGet<DailyForecast[]>(routes.weather.daily(id), 900),
    tryGet<StationFloodForecast[]>(routes.flood.forecastByDistrict(id), 3600),
    tryGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?districtId=${id}&status=ACTIVE&pageSize=3`, 300),
    district.isCoastal ? tryGet<MarineForecast[]>(routes.marine.forecastByDistrict(id), 3600) : Promise.resolve(null),
    tryGet<SatelliteRadiationReading[]>(routes.radiation.dailyByDistrict(id), 3600),
    tryGet<PaginatedEnvelope<Occurrence>>(`${routes.biodiversity.occurrences}?districtId=${id}&pageSize=5`, 900),
    tryGet<PaginatedEnvelope<CitizenReport>>(`${routes.reports.list}?districtId=${id}&pageSize=3`, 900),
    tryGet<PaginatedEnvelope<Observation>>(`${routes.observations.list}?districtId=${id}&pageSize=3`, 900),
    tryGet<PaginatedEnvelope<RestorationProject>>(`${routes.restoration.projects}?districtId=${id}&pageSize=3`, 900),
  ]);

  const name = district.name;
  const division = canonicalDivision(district.division.name);
  const area = district.areaSqKm != null ? ` · ${Math.round(district.areaSqKm).toLocaleString()} km²` : '';
  const alerts = alertsRes?.data ?? [];
  const forecast = (daily ?? []).slice(0, 7);
  const today = dhakaToday();

  // River: pick the station furthest above its usual (median) flow on the first forecast day; else the largest discharge.
  const firstDay = (flood ?? []).reduce<string | null>((min, r) => (!min || r.forecastDate < min ? r.forecastDate : min), null);
  const rows = flood ?? [];
  const todayRows = rows.filter((r) => r.forecastDate === firstDay);
  const scored = todayRows
    .map((r) => ({ r, ratio: r.riverDischarge != null && r.riverDischargeMedian != null && r.riverDischargeMedian >= MIN_MEDIAN ? r.riverDischarge / r.riverDischargeMedian : null }))
    .sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1) || (b.r.riverDischarge ?? 0) - (a.r.riverDischarge ?? 0));
  const pick = scored[0]?.r ?? null;
  const stationRows = pick ? rows.filter((r) => r.stationId === pick.stationId) : [];
  const peak = stationRows.reduce<StationFloodForecast | null>((best, r) => ((r.riverDischarge ?? -1) > (best?.riverDischarge ?? -1) ? r : best), null);
  const aboveCount = scored.filter((s) => s.ratio != null && s.ratio >= 1.5).length;

  const pmCat = air?.pm25 != null ? pmCategory(air.pm25) : null;
  const marineToday = marine?.[0] ?? null;
  const latestRadiation = (radiation ?? []).reduce<SatelliteRadiationReading | null>((best, r) => (!best || r.readingDate > best.readingDate ? r : best), null);

  const occurrences = occurrencesRes?.data ?? [];
  const latestOcc = occurrences.reduce<number | null>((max, o) => {
    const t = o.observedAt ? new Date(o.observedAt).getTime() : null;
    return t != null && (max == null || t > max) ? t : max;
  }, null);
  const ageYears = latestOcc != null ? (Date.now() - latestOcc) / (365.25 * 86_400_000) : null;

  const reports = reportsRes?.data ?? [];
  const observations = observationsRes?.data ?? [];
  const projects = projectsRes?.data ?? [];
  const hasCommunity = reports.length + observations.length + projects.length > 0;

  const rainDays = forecast.filter((f) => (f.precipitationSum ?? 0) > 0).length;
  const rainTotal = forecast.reduce((s, f) => s + (f.precipitationSum ?? 0), 0);

  return (
    <div className="dv-page">
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: division, href: `/locations/divisions/${district.division.id}` },
          { label: name },
        ]}
      />

      <header className="dv-head">
        <div>
          <h1>{name} district</h1>
          <p>{division} division · {pluralize(district.upazilas.length, 'upazila')}{area}</p>
        </div>
        <span className="dv-fresh">Times in BST (UTC+6)</span>
      </header>

      <LocationSectionNav
        label="On this page"
        items={[{ id: 'now', label: 'Now' }, { id: 'forecast', label: 'Forecast' }, { id: 'climate', label: 'Last 30 days' }, { id: 'nature', label: 'Nature' }, { id: 'upazilas', label: 'Upazilas' }]}
      />

      <div className="dd-top">
        <section id="now" className="dv-card" aria-labelledby="now-h">
          <CardHead
            title="Right now"
            sub={weather ? `Latest reading · ${dhakaDate(weather.readingTime)}` : 'No current reading available'}
            tag={weather ? 'Observed' : undefined}
          />
          {weather ? (
            <div className="dd-now">
              <Tile label="Temperature" value={num(weather.temperature2m)} unit=" °C" notes={[`Feels like ${num(weather.apparentTemperature)} °C`]} />
              <Tile label="Humidity" value={num(weather.relativeHumidity2m, 0)} unit=" %" notes={['Relative humidity']} />
              <Tile label="Wind" value={num(weather.windSpeed10m)} unit=" km/h" notes={['At 10 m']} />
              <Tile label="Rain" value={num(weather.precipitation)} unit=" mm" notes={['In the last hour']} />
            </div>
          ) : (
            <p className="dv-empty">Weather readings for {name} are temporarily unavailable.</p>
          )}
        </section>

        <section className="dv-card" aria-labelledby="aq-h">
          <CardHead title="Air quality" sub="Latest hourly reading · Open-Meteo" tag="Modeled" />
          {air && air.pm25 != null && pmCat ? (
            <>
              <div className="dd-pm">
                <span className="dd-pm-value">{num(air.pm25, 0)}<small> µg/m³ PM2.5</small></span>
                <span className={`dd-cat dd-cat--${pmCat.tone}`}><span aria-hidden="true" />{pmCat.label}</span>
              </div>
              <p className="dv-note">Category uses the US EPA 24-hour scale. One hourly reading can be higher or lower than the daily average.</p>
              <dl className="dv-coverage">
                {air.pm10 != null && <div><dt>PM10</dt><dd>{num(air.pm10, 0)} µg/m³</dd></div>}
                {air.nitrogenDioxide != null && <div><dt>NO₂</dt><dd>{num(air.nitrogenDioxide)} µg/m³</dd></div>}
                {air.ozone != null && <div><dt>O₃</dt><dd>{num(air.ozone)} µg/m³</dd></div>}
                {air.sulphurDioxide != null && <div><dt>SO₂</dt><dd>{num(air.sulphurDioxide)} µg/m³</dd></div>}
                {air.carbonMonoxide != null && <div><dt>CO</dt><dd>{num(air.carbonMonoxide, 0)} µg/m³</dd></div>}
              </dl>
            </>
          ) : (
            <p className="dv-empty">No air-quality reading for {name} yet.</p>
          )}
        </section>

        <section id="hazards" className="dv-card" aria-labelledby="hz-h">
          <CardHead title="Hazards" link={{ href: '/alerts', label: 'All alerts' }} />
          {alerts.length === 0 ? (
            <div className="dv-hazard">
              <span className="dv-hazard-icon dv-hazard-icon--ok"><NavIcon name="check" /></span>
              <div>
                <strong>No active alerts</strong>
                <small>For {name} district</small>
              </div>
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="dv-hazard">
                <span className={`dv-hazard-icon dv-hazard-icon--${a.severity === 'EMERGENCY' || a.severity === 'WARNING' ? 'bad' : 'warn'}`}><NavIcon name="alerts" /></span>
                <div>
                  <strong><Link href={`/alerts/${a.id}`}>{a.title}</Link></strong>
                  <small>{titleCase(a.severity)} · {a.district ? a.district.name : 'Nationwide'}</small>
                </div>
              </div>
            ))
          )}
          {pick && (
            <div className="dd-river">
              <div className="dd-river-head">
                <strong>River discharge, {pick.station?.name}</strong>
                <span className="dd-tag">Forecast</span>
              </div>
              <small>{pick.station?.riverName ? `${pick.station.riverName} river · ` : ''}GloFAS · not an official warning</small>
              <div className="dd-river-grid">
                <div>
                  <span>Today</span>
                  <b>{num(pick.riverDischarge)} <small>m³/s</small></b>
                  <small>Range {num(pick.riverDischargeMin)}–{num(pick.riverDischargeMax)}</small>
                </div>
                <div>
                  <span>Peak in next 30 days</span>
                  <b>{num(peak?.riverDischarge)} <small>m³/s</small></b>
                  <small>{peak ? `Forecast for ${calendarDay(peak.forecastDate.slice(0, 10)).short}` : ''}</small>
                </div>
              </div>
              <small className="dd-river-foot">{aboveCount} of {pluralize(scored.length, 'station')} above usual · <Link href="/water-bodies?tab=stations">Station forecast →</Link></small>
            </div>
          )}
        </section>
      </div>

      <section id="forecast" className="dv-card" aria-labelledby="fc-h">
        <CardHead title="7-day forecast" sub="Open-Meteo · high and low °C, chance of rain" tag="Forecast" />
        {forecast.length === 0 ? (
          <p className="dv-empty">The forecast for {name} is not available right now. It refreshes every 12 hours.</p>
        ) : (
          <>
          <ul className="dd-days">
            {forecast.map((f) => {
              const d = calendarDay(f.forecastDate.slice(0, 10));
              const s = sky(f.weatherCode);
              const isToday = f.forecastDate.slice(0, 10) === today;
              return (
                <li key={f.id}>
                  <span className="dd-day">{isToday ? 'Today' : d.weekdayShort}</span>
                  <span className="dd-date">{d.short}</span>
                  <span className="dd-sky"><SkyIcon kind={s.kind} label={s.label} /></span>
                  <span className="dd-cond">{s.label}</span>
                  <span className="dd-temp"><b>{num(f.temperature2mMax, 0)}°</b> <span>{num(f.temperature2mMin, 0)}°</span></span>
                  <span className="dd-rain">{f.precipitationProbabilityMax != null ? `${f.precipitationProbabilityMax}% rain` : '—'}</span>
                </li>
              );
            })}
          </ul>
          <p className="dv-note">
            {rainDays === 0
              ? 'No rain expected this week; all days forecast 0.0 mm.'
              : `Rain forecast on ${rainDays} of ${forecast.length} days, ${rainTotal.toFixed(1)} mm in total.`}
          </p>
          </>
        )}
      </section>

      {district.isCoastal && marineToday && (
        <section className="dv-card" aria-labelledby="mr-h">
          <CardHead title="Marine conditions" sub={`Wave and swell forecast · ${calendarDay(marineToday.forecastDate.slice(0, 10)).short}`} tag="Forecast" link={{ href: '/marine', label: 'Marine page' }} />
          <div className="dd-now dd-now--4">
            <Tile label="Wave height" value={num(marineToday.waveHeightMax)} unit=" m" notes={['Max today']} />
            <Tile label="Wave period" value={num(marineToday.wavePeriodMax, 0)} unit=" s" notes={['Peak period']} />
            <Tile label="Swell height" value={num(marineToday.swellWaveHeightMax)} unit=" m" notes={['Max today']} />
            <Tile label="Sea surface" value={num(marineToday.seaSurfaceTemp)} unit=" °C" notes={['Surface water']} />
          </div>
        </section>
      )}

      <section id="climate" className="dv-card" aria-labelledby="cl-h">
        <CardHead title="Last 30 days" sub={`Open-Meteo${district.climateUpdatedAt ? ` · updated ${relativeTime(district.climateUpdatedAt)}` : ''}`} tag="Modeled" />
        <div className="uz-tiles">
          <Tile label="Temperature" value={num(district.avgTemp30d)} unit=" °C" notes={[district.minTemp30d != null && district.maxTemp30d != null ? `Mean · range ${num(district.minTemp30d)}–${num(district.maxTemp30d)}` : 'Mean']} />
          <Tile label="Rainfall" value={num(district.totalPrecip30d, 0)} unit=" mm" notes={['30-day total']} />
          <Tile label="Humidity" value={num(district.avgHumidity30d, 0)} unit=" %" notes={['Mean']} />
          <Tile label="Cloud cover" value={num(district.avgCloudCover30d, 0)} unit=" %" notes={['Mean']} />
          <Tile label="Wind speed" value={num(district.avgWindSpeed30d)} unit=" km/h" notes={['Mean']} />
          <Tile label="UV index" value={num(district.avgUvIndex30d)} notes={[district.avgUvIndex30d != null ? `Mean · WHO band: ${uvBand(district.avgUvIndex30d)}` : 'Mean']} />
          <Tile label="PM2.5" value={num(district.avgPm25_30d, 0)} unit=" µg/m³" notes={['Mean']} />
          <Tile label="PM10" value={num(district.avgPm10_30d, 0)} unit=" µg/m³" notes={['Mean']} />
        </div>
        {latestRadiation && latestRadiation.shortwaveRadiationSum != null && (
          <p className="dv-note uz-note">
            Solar radiation: latest complete day {dhakaDate(`${latestRadiation.readingDate.slice(0, 10)}T00:00:00+06:00`)}, {latestRadiation.shortwaveRadiationSum.toFixed(1)} MJ/m² · <Link href="/radiation">Radiation page</Link>
          </p>
        )}
      </section>

      <section id="nature" className="dv-card" aria-labelledby="nt-h">
        <CardHead title="Recent species records" sub={`GBIF occurrences in ${name}`} link={{ href: '/biodiversity', label: 'All species' }} />
        {occurrences.length === 0 ? (
          <p className="dv-empty">No species records in {name} yet.</p>
        ) : (
          <>
            <ul className="dd-species">
              {occurrences.map((o) => (
                <li key={o.id}>
                  <Link href={`/biodiversity/species/${o.speciesId}`}>
                    <span className="dd-sp-main">
                      <em>{o.species.canonicalName}</em>
                      <small>{o.species.kingdom ?? '—'}</small>
                    </span>
                    <span className="dd-sp-date">{o.observedAt ? dhakaDate(o.observedAt) : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {ageYears != null && ageYears >= 1 && (
              <p className="dv-note">The most recent record is {ageYears < 1.9 ? 'about a year' : `about ${Math.round(ageYears)} years`} old.</p>
            )}
          </>
        )}
      </section>

      <section className="dv-card" aria-labelledby="cm-h">
        <div className="dv-card-head">
          <div>
            <h2 id="cm-h">Community activity</h2>
            <span>
              {hasCommunity
                ? `Latest verified reports, observations and restoration projects in ${name}.`
                : `No verified reports, observations or restoration projects in ${name} yet.`}
            </span>
          </div>
          <div className="dv-actions">
            <Link href="/reports" className="dv-link">Report an issue</Link>
            <Link href="/observations" className="dv-link">Add an observation</Link>
          </div>
        </div>
        {hasCommunity && (
          <div className="dv-recent">
            {reports.length > 0 && (
              <div>
                <h3>Verified reports</h3>
                <ul>{reports.map((r) => <li key={r.id}><Link href={`/reports/${r.id}`}>{r.title}</Link><small>{titleCase(r.category)} · Updated {dhakaDate(r.updatedAt)}</small></li>)}</ul>
              </div>
            )}
            {observations.length > 0 && (
              <div>
                <h3>Observations</h3>
                <ul>{observations.map((o) => <li key={o.id}><Link href={`/observations/${o.id}`}>{o.species ?? titleCase(o.category)}</Link><small>{titleCase(o.trustLevel)} · {dhakaDate(o.observedAt)}</small></li>)}</ul>
              </div>
            )}
            {projects.length > 0 && (
              <div>
                <h3>Restoration projects</h3>
                <ul>{projects.map((p) => <li key={p.id}><Link href={`/restoration/${p.id}`}>{p.title}</Link><small>{titleCase(p.status)} · {titleCase(p.category)}</small></li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section id="upazilas" className="dv-card" aria-labelledby="up-h">
        <CardHead title="Upazilas" sub={`${district.upazilas.length} in ${name}`} />
        {district.upazilas.length === 0 ? (
          <p className="dv-empty">No upazilas listed for this district.</p>
        ) : (
          <ul className="uz-unions dd-upazilas">
            {district.upazilas.map((u) => (
              <li key={u.id}>
                <Link href={`/locations/upazilas/${u.id}`}>
                  {u.name}
                  <NavIcon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LocationSourceNote>
        Weather, air quality and 30-day climate: Open-Meteo. River discharge: GloFAS model via Open-Meteo, not an official warning. Species: GBIF. Other sections use the latest public records from Delta Signal.
      </LocationSourceNote>
    </div>
  );
}
