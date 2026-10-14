import Link from 'next/link';
import { routes } from '@delta-signal/contracts';
import { apiGet } from '../../../../../lib/api';
import LocationBreadcrumb from '../../../../../components/location-breadcrumb';
import { LocationSourceNote } from '../../../../../components/location-page';
import NavIcon from '../../../../../components/nav-icons';
import { canonicalDivision } from '../../../../../lib/alerts';
import { pluralize, relativeTime } from '../../../../../lib/format';

interface UpazilaDetail {
  id: string;
  name: string;
  bnName: string | null;
  areaSqKm: number | null;
  district: { id: string; name: string; division: { id: string; name: string } };
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

/** Upazila overview (Web UI Reference): one climate-and-air card, unions list, link up to the district. */
export default async function UpazilaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const u = await apiGet<UpazilaDetail>(routes.locations.upazila(id), 900);
  const division = canonicalDivision(u.district.division.name);
  const area = u.areaSqKm != null ? ` · ${Math.round(u.areaSqKm).toLocaleString()} km²` : '';

  return (
    <div className="dv-page">
      <LocationBreadcrumb
        crumbs={[
          { label: 'Locations', href: '/locations' },
          { label: division, href: `/locations/divisions/${u.district.division.id}` },
          { label: u.district.name, href: `/locations/districts/${u.district.id}` },
          { label: u.name },
        ]}
      />

      <header className="dv-head">
        <div>
          <h1>{u.name} upazila</h1>
          <p>{u.district.name} district, {division} division · {pluralize(u.unions.length, 'union')}{area}</p>
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
            Modeled values for the upazila, not readings from a local station. PM2.5 and PM10 categories apply to 24-hour values, so none are shown for 30-day means.
          </p>
        </section>

        <aside className="dv-side" aria-label="Unions and district">
          <section className="dv-card" aria-labelledby="un-h">
            <div className="dv-card-head">
              <h2 id="un-h">Unions</h2>
              <span>{u.unions.length}</span>
            </div>
            {u.unions.length === 0 ? (
              <p className="dv-empty">No unions listed for this upazila.</p>
            ) : (
              <ul className="uz-unions">
                {u.unions.map((x) => (
                  <li key={x.id}>
                    <Link href={`/locations/unions/${x.id}`}>
                      {x.name}
                      <NavIcon name="chevron-right" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dv-card uz-more">
            <h2>More for this area</h2>
            <p>Alerts, river stations, reports and observations are shown at district level.</p>
            <Link href={`/locations/districts/${u.district.id}`} className="uz-open">Open {u.district.name} district</Link>
          </section>
        </aside>
      </div>

      <LocationSourceNote>
        Source: Open-Meteo forecast and air-quality data · Values are derived 30-day averages, not local station observations.
      </LocationSourceNote>
    </div>
  );
}
