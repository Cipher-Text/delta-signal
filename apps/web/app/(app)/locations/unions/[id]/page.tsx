import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationSourceNote } from '../../../../../components/location-page';
import NavIcon from '../../../../../components/nav-icons';
import { canonicalDivision } from '../../../../../lib/alerts';
import { relativeTime } from '../../../../../lib/format';

interface UnionDetail {
  id: string;
  name: string;
  bnName: string | null;
  upazila: {
    id: string;
    name: string;
    district: { id: string; name: string; division: { id: string; name: string } };
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

/** WHO UV index bands, applied to the displayed (rounded) 30-day mean. */
function uvBand(uv: number): string {
  const v = Math.round(uv);
  if (v <= 2) return 'Low';
  if (v <= 5) return 'Moderate';
  if (v <= 7) return 'High';
  if (v <= 10) return 'Very high';
  return 'Extreme';
}

const num = (v: number | null, digits = 1) => (v == null ? '—' : v.toFixed(digits));

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

/** Union overview (Web UI Reference): climate-and-air card, "Part of" links up the hierarchy, link to the district. */
export default async function UnionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const u = await apiGet<UnionDetail>(routes.locations.union(id), 900);
  const { upazila } = u;
  const { district } = upazila;
  const division = canonicalDivision(district.division.name);

  const parents = [
    { level: 'Upazila', name: upazila.name, href: `/locations/upazilas/${upazila.id}` },
    { level: 'District', name: district.name, href: `/locations/districts/${district.id}` },
    { level: 'Division', name: division, href: `/locations/divisions/${district.division.id}` },
  ];

  return (
    <div className="dv-page">
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: division, href: `/locations/divisions/${district.division.id}` },
          { label: district.name, href: `/locations/districts/${district.id}` },
          { label: upazila.name, href: `/locations/upazilas/${upazila.id}` },
          { label: u.name },
        ]}
      />

      <header className="dv-head">
        <div>
          <h1>{u.name} union</h1>
          <p>{upazila.name} upazila, {district.name} district, {division} division</p>
        </div>
        <span className="dv-fresh">
          Climate: Open-Meteo, 30-day summary
          {u.climateUpdatedAt ? ` · updated ${relativeTime(u.climateUpdatedAt)}` : ''}
        </span>
      </header>

      <div className="dv-split uz-split">
        <section className="dv-card" aria-labelledby="cl-h">
          <div className="dv-card-head">
            <h2 id="cl-h">Climate and air, last 30 days</h2>
            <span>Open-Meteo</span>
          </div>
          <div className="uz-tiles">
            <Tile
              label="Temperature"
              value={num(u.avgTemp30d)}
              unit=" °C"
              notes={['30-day mean', ...(u.minTemp30d != null && u.maxTemp30d != null ? [`Range ${num(u.minTemp30d)}–${num(u.maxTemp30d)} °C`] : [])]}
            />
            <Tile label="Rainfall" value={num(u.totalPrecip30d, 0)} unit=" mm" notes={['30-day total']} />
            <Tile label="Humidity" value={num(u.avgHumidity30d, 0)} unit=" %" notes={['30-day mean']} />
            <Tile label="Cloud cover" value={num(u.avgCloudCover30d, 0)} unit=" %" notes={['30-day mean']} />
            <Tile label="Wind speed" value={num(u.avgWindSpeed30d)} unit=" km/h" notes={['30-day mean']} />
            <Tile
              label="UV index"
              value={num(u.avgUvIndex30d)}
              notes={['30-day mean', ...(u.avgUvIndex30d != null ? [`WHO band: ${uvBand(u.avgUvIndex30d)}`] : [])]}
            />
            <Tile label="PM2.5" value={num(u.avgPm25_30d, 0)} unit=" µg/m³" notes={['30-day mean']} />
            <Tile label="PM10" value={num(u.avgPm10_30d, 0)} unit=" µg/m³" notes={['30-day mean']} />
          </div>
          <p className="dv-note uz-note">
            Modeled values for this area, not readings from a local station. Nearby unions and the upazila can show the same values because the climate model covers a wider area than a union. PM2.5 and PM10 categories apply to 24-hour values, so none are shown for 30-day means.
          </p>
        </section>

        <aside className="dv-side" aria-label="Part of and district">
          <section className="dv-card" aria-labelledby="po-h">
            <h2 id="po-h">Part of</h2>
            <ul className="uz-unions uz-part">
              {parents.map((p) => (
                <li key={p.level}>
                  <Link href={p.href}>
                    <span>
                      <small>{p.level}</small>
                      <b>{p.name}</b>
                    </span>
                    <NavIcon name="chevron-right" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="dv-card uz-more">
            <h2>More for this area</h2>
            <p>Alerts, river stations, reports and observations are shown at district level.</p>
            <Link href={`/locations/districts/${district.id}`} className="uz-open">Open {district.name} district</Link>
          </section>
        </aside>
      </div>

      <LocationSourceNote>
        Source: Open-Meteo forecast and air-quality data · Values are derived 30-day averages, not local station observations.
      </LocationSourceNote>
    </div>
  );
}
