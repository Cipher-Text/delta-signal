import Link from 'next/link';
import {
  routes,
  type Alert,
  type CurrentWeatherReading,
  type DistrictWithClimate,
  type DivisionActivity,
  type DivisionWithClimate,
  type HourlyAirQualityReading,
  type PaginatedEnvelope,
  type StationFloodForecast,
} from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationSectionNav, LocationSourceNote } from '../../../../../components/location-page';
import NavIcon from '../../../../../components/nav-icons';
import { canonicalDivision } from '../../../../../lib/alerts';
import { calendarDay, dhakaDate, pluralize, relativeTime, titleCase } from '../../../../../lib/format';

/** District names as the mock spells them (seed names differ). */
const DISPLAY_NAME: Record<string, string> = { Barisal: 'Barishal', Chittagong: 'Chattogram', Comilla: 'Cumilla', Jessore: 'Jashore', Bogra: 'Bogura' };
const shown = (name: string) => DISPLAY_NAME[name] ?? name;

/** A station is "above usual" at 1.5× its median or more. Ratios under 1 m³/s medians are noise, so they are not computed. */
const ABOVE_USUAL = 1.5;
const MIN_MEDIAN = 1;
const PM_SCALE = 60;

async function tryGet<T>(url: string, revalidate = 900): Promise<T | null> {
  try {
    return await apiGet<T>(url, revalidate);
  } catch {
    return null;
  }
}

const num = (v: number | null, digits = 1) => (v == null ? '—' : v.toFixed(digits));

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub: string }) {
  return (
    <div className="dv-tile">
      <span className="dv-tile-label">{label}</span>
      <span className="dv-tile-value">
        {value}
        {unit && value !== '—' && <small>{unit}</small>}
      </span>
      <span className="dv-tile-sub">{sub}</span>
    </div>
  );
}

/** Division overview (Web UI Reference): header, 30-day tiles, districts, hazards now, coverage, river discharge, activity. */
export default async function DivisionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [divisions, districts] = await Promise.all([
    apiGet<DivisionWithClimate[]>(routes.locations.divisions, 900),
    apiGet<DistrictWithClimate[]>(`${routes.locations.districts}?divisionId=${id}`, 900),
  ]);
  const division = divisions.find((d) => d.id === id);
  if (!division) return <p className="empty-state">Division not found.</p>;

  const districtIds = new Set(districts.map((d) => d.id));
  const [alertsRes, weather, airQuality, flood, activity] = await Promise.all([
    tryGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?status=ACTIVE&pageSize=100`, 300),
    tryGet<CurrentWeatherReading[]>(routes.weather.current, 300),
    tryGet<HourlyAirQualityReading[]>(routes.weather.airQuality, 900),
    tryGet<StationFloodForecast[]>(routes.flood.forecast, 3600),
    tryGet<DivisionActivity>(routes.locations.divisionActivity(id), 600),
  ]);

  // Alerts: nationwide ones (no district) count too, as does any alert whose extra areas touch this division.
  const alerts = (alertsRes?.data ?? []).filter(
    (a) => !a.district || districtIds.has(a.district.id) || (a.areas ?? []).some((x) => x.district && districtIds.has(x.district.id)),
  );
  const weatherCover = new Set((weather ?? []).filter((r) => districtIds.has(r.districtId)).map((r) => r.districtId)).size;
  const airCover = new Set((airQuality ?? []).filter((r) => districtIds.has(r.districtId)).map((r) => r.districtId)).size;

  const stations = (flood ?? [])
    .filter((r) => r.station?.districtId && districtIds.has(r.station.districtId))
    .map((r) => {
      const median = r.riverDischargeMedian;
      const ratio = r.riverDischarge != null && median != null && median >= MIN_MEDIAN ? r.riverDischarge / median : null;
      return { id: r.stationId, name: r.station?.name ?? '—', river: r.station?.riverName ?? '—', q: r.riverDischarge, ratio, date: r.forecastDate };
    })
    .sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1) || (b.q ?? 0) - (a.q ?? 0));
  const above = stations.filter((s) => s.ratio != null && s.ratio >= ABOVE_USUAL);
  const topStation = above[0];
  const forecastDay = stations[0]?.date ? calendarDay(stations[0].date.slice(0, 10)).short : null;

  const counts = activity?.counts;
  const recent = activity?.recent;
  const hasActivity = !!counts && counts.verifiedReports + counts.researchObservations + counts.occurrences + counts.restorationProjects > 0;
  const name = canonicalDivision(division.name);
  const area = division.areaSqKm != null ? ` · ${Math.round(division.areaSqKm).toLocaleString()} km²` : '';

  return (
    <div className="dv-page">
      <LocationBreadcrumb crumbs={[{ label: 'Locations', href: '/locations' }, { label: name }]} />

      <header className="dv-head">
        <div>
          <h1>{name} division</h1>
          <p>{pluralize(districts.length, 'district')}{area}</p>
        </div>
        <span className="dv-fresh">
          Climate: Open-Meteo, 30-day summary
          {division.climateUpdatedAt ? ` · updated ${relativeTime(division.climateUpdatedAt)}` : ''}
        </span>
      </header>

      <LocationSectionNav
        label="On this page"
        items={[{ id: 'overview', label: 'Overview' }, { id: 'districts', label: 'Districts' }, { id: 'hazards', label: 'Hazards' }, { id: 'activity', label: 'Activity' }]}
      />

      <div id="overview" className="dv-tiles">
        <Tile
          label="Temperature"
          value={num(division.avgTemp30d)}
          unit=" °C"
          sub={division.minTemp30d != null && division.maxTemp30d != null ? `30-day mean · range ${num(division.minTemp30d)}–${num(division.maxTemp30d)}` : '30-day mean'}
        />
        <Tile label="Rainfall" value={num(division.totalPrecip30d, 0)} unit=" mm" sub="30-day total, district average" />
        <Tile label="Humidity" value={num(division.avgHumidity30d, 0)} unit=" %" sub="30-day mean" />
        <Tile label="PM2.5" value={num(division.avgPm25_30d, 0)} unit=" µg/m³" sub="30-day mean" />
      </div>

      <div className="dv-split">
        <section id="districts" className="dv-card" aria-labelledby="dt-h">
          <div className="dv-card-head">
            <h2 id="dt-h">Districts</h2>
            <span>30-day summary · select a district for details</span>
          </div>
          {districts.length === 0 ? (
            <p className="dv-empty">No districts found for this division.</p>
          ) : (
            <>
              <div className="dv-table" role="table" aria-label={`Districts in ${name} division`}>
                <div className="dv-row dv-row--districts dv-row--head" role="row">
                  <div role="columnheader">District</div>
                  <div role="columnheader" className="dv-num">Temp °C</div>
                  <div role="columnheader" className="dv-num">Rain mm</div>
                  <div role="columnheader">PM2.5 µg/m³</div>
                  <div role="columnheader" className="dv-num">UV</div>
                  <div role="columnheader" />
                </div>
                {districts.map((d) => (
                  <Link key={d.id} href={`/locations/districts/${d.id}`} className="dv-row dv-row--districts" role="row">
                    <div role="cell" className="dv-strong">{shown(d.name)}</div>
                    <div role="cell" className="dv-num">{num(d.avgTemp30d)}</div>
                    <div role="cell" className="dv-num">{num(d.totalPrecip30d, 0)}</div>
                    <div role="cell" className="dv-pm">
                      <span className="dv-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, ((d.avgPm25_30d ?? 0) / PM_SCALE) * 100)}%` }} /></span>
                      {num(d.avgPm25_30d, 0)}
                    </div>
                    <div role="cell" className="dv-num">{num(d.avgUvIndex30d)}</div>
                    <div role="cell" className="dv-chev"><NavIcon name="chevron-right" /></div>
                  </Link>
                ))}
              </div>
              <ul className="dv-list">
                {districts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/locations/districts/${d.id}`}>
                      <span className="dv-list-main">
                        <strong>{shown(d.name)}</strong>
                        <small>{num(d.totalPrecip30d, 0)} mm rain · PM2.5 {num(d.avgPm25_30d, 0)} · UV {num(d.avgUvIndex30d)}</small>
                      </span>
                      <span className="dv-list-temp">{num(d.avgTemp30d)} °C</span>
                      <NavIcon name="chevron-right" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="dv-note">PM2.5 categories apply to 24-hour values, so none are shown for 30-day means.</p>
        </section>

        <div className="dv-side">
          <section id="hazards" className="dv-card" aria-labelledby="hz-h">
            <h2 id="hz-h">Hazards now</h2>
            {alerts.length === 0 ? (
              <div className="dv-hazard">
                <span className="dv-hazard-icon dv-hazard-icon--ok"><NavIcon name="check" /></span>
                <div>
                  <strong>No active alerts</strong>
                  <small>For {name} division · <Link href="/alerts">All alerts</Link></small>
                </div>
              </div>
            ) : (
              alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="dv-hazard">
                  <span className={`dv-hazard-icon dv-hazard-icon--${a.severity === 'EMERGENCY' || a.severity === 'WARNING' ? 'bad' : 'warn'}`}><NavIcon name="alerts" /></span>
                  <div>
                    <strong><Link href={`/alerts/${a.id}`}>{a.title}</Link></strong>
                    <small>{titleCase(a.severity)} · {a.district ? shown(a.district.name) : 'Nationwide'} · <Link href="/alerts">All alerts</Link></small>
                  </div>
                </div>
              ))
            )}
            {stations.length > 0 && (
              <div className="dv-hazard">
                <span className={`dv-hazard-icon dv-hazard-icon--${above.length ? 'warn' : 'ok'}`}><NavIcon name="water-bodies" /></span>
                <div>
                  <strong>{above.length} of {stations.length} stations above usual</strong>
                  <small>
                    {topStation ? `${topStation.name} on the ${topStation.river} · ` : ''}
                    {forecastDay ? `forecast for ${forecastDay} · ` : ''}not an official warning
                  </small>
                </div>
              </div>
            )}
          </section>

          <section className="dv-card" aria-labelledby="cv-h">
            <h2 id="cv-h">Data coverage</h2>
            <dl className="dv-coverage">
              <div><dt>Weather readings</dt><dd>{weatherCover} / {districts.length} districts</dd></div>
              <div><dt>Air quality readings</dt><dd>{airCover} / {districts.length} districts</dd></div>
              <div><dt>Flood stations</dt><dd>{stations.length}</dd></div>
              <div><dt>Verified reports</dt><dd>{counts?.verifiedReports ?? '—'}</dd></div>
              <div><dt>Research observations</dt><dd>{counts?.researchObservations ?? '—'}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      {stations.length > 0 && (
        <section className="dv-card" aria-labelledby="fl-h">
          <div className="dv-card-head">
            <div>
              <h2 id="fl-h">River discharge forecast</h2>
              <span>{forecastDay ? `Forecast for ${forecastDay} · ` : ''}GloFAS model · not an official warning</span>
            </div>
            <Link href="/water-bodies?tab=stations" className="dv-link">All {stations.length} stations</Link>
          </div>
          <div className="dv-table" role="table" aria-label="Flood forecast by station">
            <div className="dv-row dv-row--stations dv-row--head" role="row">
              <div role="columnheader">Station</div>
              <div role="columnheader">River</div>
              <div role="columnheader" className="dv-num">Discharge m³/s</div>
              <div role="columnheader" className="dv-num">vs usual</div>
            </div>
            {stations.slice(0, 6).map((s) => (
              <div key={s.id} className="dv-row dv-row--stations" role="row">
                <div role="cell" className="dv-strong">{s.name}</div>
                <div role="cell" className="dv-muted">{s.river}</div>
                <div role="cell" className="dv-num">{s.q != null ? Math.round(s.q * 10) / 10 : '—'}</div>
                <div role="cell" className="dv-num">
                  <span className="dv-ratio" data-hi={s.ratio != null && s.ratio >= ABOVE_USUAL}>{s.ratio != null ? `${s.ratio.toFixed(1)}×` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
          <ul className="dv-list">
            {stations.slice(0, 6).map((s) => (
              <li key={s.id}>
                <div className="dv-list-row">
                  <span className="dv-list-main">
                    <strong>{s.name}</strong>
                    <small>{s.river} · {s.q != null ? Math.round(s.q * 10) / 10 : '—'} m³/s</small>
                  </span>
                  <span className="dv-ratio" data-hi={s.ratio != null && s.ratio >= ABOVE_USUAL}>{s.ratio != null ? `${s.ratio.toFixed(1)}×` : '—'}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="dv-note">&quot;vs usual&quot; compares the forecast with the station&apos;s median discharge. It is shown for stations whose median is at least {MIN_MEDIAN} m³/s.</p>
        </section>
      )}

      <section id="activity" className="dv-card" aria-labelledby="act-h">
        <div className="dv-card-head">
          <div>
            <h2 id="act-h">Environmental activity</h2>
            <span>
              {hasActivity
                ? `${pluralize(counts!.verifiedReports, 'verified report')}, ${pluralize(counts!.researchObservations, 'research observation')}, ${pluralize(counts!.occurrences, 'species record')} and ${pluralize(counts!.restorationProjects, 'restoration project')} in this division.`
                : 'No verified reports, observations, species records or restoration projects here yet.'}
            </span>
          </div>
          <div className="dv-actions">
            <Link href="/reports" className="dv-link">Report an issue</Link>
            <Link href="/observations" className="dv-link">Add an observation</Link>
          </div>
        </div>
        {recent && (recent.reports.length > 0 || recent.observations.length > 0) && (
          <div className="dv-recent">
            {recent.reports.length > 0 && (
              <div>
                <h3>Verified reports</h3>
                <ul>
                  {recent.reports.map((r) => (
                    <li key={r.id}>
                      <Link href={`/reports/${r.id}`}>{r.title}</Link>
                      <small>{titleCase(r.category)} · {r.district ? shown(r.district.name) : 'District not set'} · Updated {dhakaDate(r.updatedAt)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recent.observations.length > 0 && (
              <div>
                <h3>Observations</h3>
                <ul>
                  {recent.observations.map((o) => (
                    <li key={o.id}>
                      <Link href={`/observations/${o.id}`}>{o.species ?? titleCase(o.category)}</Link>
                      <small>{titleCase(o.trustLevel)} · {o.district ? shown(o.district.name) : 'District not set'} · {dhakaDate(o.observedAt)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <LocationSourceNote>
        Climate: Open-Meteo 30-day derived averages. Other sections use the latest public records returned by their respective Delta Signal APIs.
      </LocationSourceNote>
    </div>
  );
}
