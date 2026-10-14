import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type SatelliteRadiationReading } from '@delta-signal/contracts';
import { calendarDay } from '../../../lib/format';
import { DIVISION_TILES, canonicalDivision } from '../../../lib/alerts';
import { SOLAR_BINS, median, solarLevel } from '../../../lib/radiation';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

const MIN_BAR_SCALE = 22;
type SortKey = 'name' | 'div' | 'val';
type Query = { date?: string; division?: string; q?: string; sort?: string; dir?: string };

type Row = { id: string; name: string; division: string; value: number };

const fmt1 = (n: number) => n.toFixed(1);

/** Daily satellite shortwave radiation by district (Web UI Reference). */
export default async function RadiationPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;

  const days = await apiGet<string[]>(routes.radiation.days, 300).catch(() => [] as string[]);
  const date = sp.date && days.includes(sp.date) ? sp.date : days[0];
  const readings = date
    ? await apiGet<SatelliteRadiationReading[]>(`${routes.radiation.daily}?date=${date}`, 300).catch(() => [] as SatelliteRadiationReading[])
    : [];

  if (!date || readings.length === 0) {
    return (
      <>
        <PageHeader title="Solar radiation" description="Daily total of sunlight reaching the ground in each district, measured by satellite." />
        <EmptyState title="No radiation data available" description="Readings appear here after the daily Open-Meteo Satellite sync." />
      </>
    );
  }

  const all: Row[] = readings
    .filter((r) => r.shortwaveRadiationSum != null)
    .map((r) => ({
      id: r.districtId,
      name: canonicalDivision(r.district?.name ?? r.districtId),
      division: canonicalDivision(r.district?.division?.name ?? '—'),
      value: r.shortwaveRadiationSum as number,
    }));

  // KPIs and tiles always describe the whole country for the day, whatever the table filter.
  const byValue = [...all].sort((a, b) => b.value - a.value);
  const highest = byValue[0];
  const lowest = byValue[byValue.length - 1];
  const nationalMedian = median(all.map((r) => r.value));

  const tiles = DIVISION_TILES.map(([name, area]) => {
    const members = all.filter((r) => r.division === name);
    const avg = members.length ? members.reduce((s, r) => s + r.value, 0) / members.length : null;
    return { name, area, avg };
  });

  const division = tiles.some((t) => t.name === sp.division) ? sp.division : undefined;
  const q = sp.q?.trim() || '';
  const sort: SortKey = sp.sort === 'name' || sp.sort === 'div' ? sp.sort : 'val';
  const dir = sp.dir === 'asc' ? 1 : sp.dir === 'desc' ? -1 : sort === 'val' ? -1 : 1;

  const rows = all
    .filter((r) => (!division || r.division === division) && (!q || r.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      const cmp = sort === 'val' ? a.value - b.value : sort === 'div' ? (a.division + a.name).localeCompare(b.division + b.name) : a.name.localeCompare(b.name);
      return cmp * dir;
    });

  const barScale = Math.max(MIN_BAR_SCALE, highest.value);
  const dateIdx = days.indexOf(date);
  const older = days[dateIdx + 1];
  const newer = days[dateIdx - 1];
  const dateLabel = `${calendarDay(date).short} ${date.slice(0, 4)}`;

  const href = (o: Partial<Record<keyof Query, string | undefined>>) => {
    const next: Query = { date: dateIdx === 0 ? undefined : date, division, q: q || undefined, sort: sp.sort, dir: sp.dir, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/radiation${qs ? `?${qs}` : ''}`;
  };
  const dayHref = (d: string, index: number) => href({ date: index === 0 ? undefined : d });
  const sortHref = (key: SortKey) => {
    const active = sort === key;
    const nextDir = active ? (dir === 1 ? 'desc' : 'asc') : key === 'val' ? 'desc' : 'asc';
    return href({ sort: key, dir: nextDir });
  };
  const ariaSort = (key: SortKey) => (sort === key ? (dir === 1 ? 'ascending' : 'descending') : 'none');
  const arrow = (key: SortKey) => (sort === key ? (dir === 1 ? '▲' : '▼') : '');

  return (
    <>
      <PageHeader
        title="Solar radiation"
        description="Daily total of sunlight reaching the ground in each district, measured by satellite."
        action={
          <div className="rad-source">
            <span className="rad-badge">Observed · satellite</span>
            <span className="rad-source-long">Source: Open-Meteo Satellite</span>
            <span className="rad-source-short">Open-Meteo</span>
          </div>
        }
      />

      <div className="rad-datebar">
        <div className="rad-date">
          {older ? (
            <Link className="rad-step" href={dayHref(older, dateIdx + 1)} aria-label="Previous day"><NavIcon name="chevron-left" /></Link>
          ) : (
            <span className="rad-step rad-step--off" aria-disabled="true" aria-label="Previous day (no older data)"><NavIcon name="chevron-left" /></span>
          )}
          <span className="rad-chip"><NavIcon name="calendar" />{dateLabel}</span>
          {newer ? (
            <Link className="rad-step" href={dayHref(newer, dateIdx - 1)} aria-label="Next day"><NavIcon name="chevron-right" /></Link>
          ) : (
            <span className="rad-step rad-step--off" aria-disabled="true" aria-label="Next day (no newer data)"><NavIcon name="chevron-right" /></span>
          )}
        </div>
        {dateIdx === 0 && <span className="rad-hint">Latest available day. Satellite data arrives with a short delay.</span>}
      </div>

      <div className="rad-kpis">
        <div className="rad-kpi">
          <span>Highest district</span>
          <strong>{fmt1(highest.value)}<small> MJ/m²</small></strong>
          <span>{highest.name} · {highest.division}</span>
        </div>
        <div className="rad-kpi">
          <span>Lowest district</span>
          <strong>{fmt1(lowest.value)}<small> MJ/m²</small></strong>
          <span>{lowest.name} · {lowest.division}</span>
        </div>
        <div className="rad-kpi rad-kpi--median">
          <span>National median</span>
          <strong>{nationalMedian != null ? fmt1(nationalMedian) : '—'}<small> MJ/m²</small></strong>
          <span>Across {all.length} districts</span>
        </div>
      </div>

      <div className="rad-layout">
        <section className="rad-card rad-map" aria-labelledby="rad-div-h">
          <div className="rad-card-head">
            <h2 id="rad-div-h">Division average</h2>
            <span><span className="rad-sel-hint">MJ/m² · select to filter</span><span className="rad-sel-short">MJ/m²</span></span>
          </div>
          <div className="rad-tiles">
            {tiles.map((t) => {
              const on = division === t.name;
              return (
                <Link
                  key={t.name}
                  href={href({ division: on ? undefined : t.name })}
                  className={`rad-tile${t.avg != null ? ` rad-lvl-${solarLevel(t.avg)}` : ''}${on ? ' rad-tile--on' : ''}`}
                  style={{ gridArea: t.area }}
                  aria-pressed={on}
                  aria-label={`${t.name} division average ${t.avg != null ? fmt1(t.avg) : 'unavailable'} MJ per square metre. ${on ? 'Selected, select again to show all.' : 'Select to filter the table.'}`}
                >
                  <span>{t.name}</span>
                  <strong>{t.avg != null ? fmt1(t.avg) : '—'}</strong>
                </Link>
              );
            })}
          </div>
          <div className="rad-legend">
            {SOLAR_BINS.map((b) => <span key={b.level}><i className={`rad-swatch rad-lvl-${b.level}`} />{b.label}</span>)}
          </div>
          <p className="rad-note">
            Average of the division&apos;s districts for {dateLabel}. Lower values usually mean more cloud cover. 1 MJ/m² ≈ 0.28 kWh/m².
          </p>
        </section>

        <section className="rad-card rad-table-card" aria-labelledby="rad-tbl-h">
          <div className="rad-tbl-head">
            <h2 id="rad-tbl-h">All districts</h2>
            <form className="rad-filters" method="get" role="search">
              {dateIdx !== 0 && <input type="hidden" name="date" value={date} />}
              {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
              {sp.dir && <input type="hidden" name="dir" value={sp.dir} />}
              <label className="rad-find">
                <NavIcon name="search" />
                <input key={q} type="search" name="q" defaultValue={q} placeholder="Find a district" aria-label="Find a district" />
              </label>
              <button type="submit" className="sr-only">Search</button>
              <AutoSubmitSelect name="division" className="select-field" defaultValue={division ?? ''} aria-label="Division">
                <option value="">All divisions</option>
                {tiles.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </AutoSubmitSelect>
            </form>
          </div>

          <div className="rad-count-mobile">{rows.length === all.length ? `${all.length} districts` : `${rows.length} of ${all.length} districts`} · {sort === 'val' ? (dir === -1 ? 'highest first' : 'lowest first') : `sorted by ${sort === 'div' ? 'division' : 'name'}`}</div>

          <div className="rad-table" role="table" aria-label="Daily shortwave radiation by district">
            <div className="rad-row rad-row--head" role="row">
              <div role="columnheader" aria-sort={ariaSort('name')}><Link href={sortHref('name')}>District <span>{arrow('name')}</span></Link></div>
              <div role="columnheader" aria-sort={ariaSort('div')} className="rad-col-div"><Link href={sortHref('div')}>Division <span>{arrow('div')}</span></Link></div>
              <div role="columnheader" aria-sort={ariaSort('val')}><Link href={sortHref('val')}>Shortwave radiation, MJ/m² <span>{arrow('val')}</span></Link></div>
            </div>
            {rows.map((r) => (
              <Link key={r.id} className="rad-row" role="row" href={`/locations/districts/${r.id}`}>
                <div role="cell" className="rad-name">{r.name}</div>
                <div role="cell" className="rad-col-div rad-muted">{r.division}</div>
                <div role="cell" className="rad-val">
                  <span className="rad-bar"><i className={`rad-lvl-${solarLevel(r.value)}`} style={{ width: `${Math.round((r.value / barScale) * 100)}%` }} /></span>
                  <strong>{fmt1(r.value)}</strong>
                </div>
              </Link>
            ))}
          </div>
          {rows.length === 0 && (
            <EmptyState
              title={q ? `No districts match “${q}”` : 'No districts to show'}
              action={<Link className="button" href={href({ q: undefined, division: undefined })}>Clear filters</Link>}
            />
          )}
          <div className="rad-foot">
            <span>{rows.length === all.length ? `${all.length} districts` : `${rows.length} of ${all.length} districts`}</span>
            <span>Daily sum for {dateLabel}</span>
          </div>
        </section>
      </div>
      <p className="rad-foot-mobile">Daily sum for {dateLabel}. Lower values usually mean more cloud cover.</p>
    </>
  );
}
