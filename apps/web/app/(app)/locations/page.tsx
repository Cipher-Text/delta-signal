import Link from 'next/link';
import { routes, type DivisionWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../../../lib/api';
import { dhakaDate } from '../../../lib/format';
import { DIVISION_TILES, canonicalDivision } from '../../../lib/alerts';
import { LAYERS, LAYER_ORDER, binIndex, formatValue, type LayerKey } from '../../../lib/climate-layers';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

type SortKey = 'name' | 'districts' | 'temp' | 'rain' | 'pm' | 'uv';
type Query = { layer?: string; sort?: string; dir?: string };
const SORT_KEYS: readonly SortKey[] = ['name', 'districts', 'temp', 'rain', 'pm', 'uv'];

type Row = {
  id: string;
  name: string;
  districts: number;
  values: Record<LayerKey, number | null>;
};

const withUnit = (key: LayerKey, v: number | null) => {
  const layer = LAYERS[key];
  // Non-breaking space keeps the unit on the same line as its number (§10A).
  return v == null ? '—' : `${formatValue(layer, v)}${layer.unit ? `\u00a0${layer.unit}` : ''}`;
};

/** Division climate summaries: a layer map plus a sortable table (Web UI Reference). */
export default async function LocationsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const divisions = await apiGet<DivisionWithClimate[]>(routes.locations.divisions, 900).catch(() => [] as DivisionWithClimate[]);

  if (divisions.length === 0) {
    return (
      <>
        <PageHeader title="Locations" description="Climate summaries for Bangladesh's divisions." />
        <EmptyState title="No location data available" description="Climate summaries appear after the nightly Open-Meteo sync." />
      </>
    );
  }

  const layerKey: LayerKey = LAYER_ORDER.includes(sp.layer as LayerKey) ? (sp.layer as LayerKey) : 'temp';
  const layer = LAYERS[layerKey];
  const updatedAt = divisions.map((d) => d.climateUpdatedAt).filter(Boolean).sort().pop();

  const rows: Row[] = divisions.map((d) => ({
    id: d.id,
    name: canonicalDivision(d.name),
    districts: d._count?.districts ?? 0,
    values: { temp: d.avgTemp30d, rain: d.totalPrecip30d, pm: d.avgPm25_30d, uv: d.avgUvIndex30d },
  }));
  const byName = new Map(rows.map((r) => [r.name, r]));

  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : 'name';
  const dir = sp.dir === 'desc' ? -1 : sp.dir === 'asc' ? 1 : sort === 'name' ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name) * dir;
    const x = sort === 'districts' ? a.districts : a.values[sort];
    const y = sort === 'districts' ? b.districts : b.values[sort];
    if (x == null && y == null) return 0;
    if (x == null) return 1; // missing values always last
    if (y == null) return -1;
    return (x - y) * dir;
  });

  const layerValues = rows.map((r) => r.values[layerKey]).filter((v): v is number => v != null);
  const note = layerValues.length ? layer.note(layerValues) : '';

  const href = (o: Partial<Record<keyof Query, string | undefined>>) => {
    const next: Query = { layer: layerKey === 'temp' ? undefined : layerKey, sort: sp.sort, dir: sp.dir, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/locations${qs ? `?${qs}` : ''}`;
  };
  const sortHref = (key: SortKey) => href({ sort: key, dir: sort === key ? (dir === 1 ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' });
  const ariaSort = (key: SortKey) => (sort === key ? (dir === 1 ? 'ascending' : 'descending') : 'none');
  const arrow = (key: SortKey) => (sort === key ? (dir === 1 ? '▲' : '▼') : '');

  const columns: Array<{ key: SortKey; label: string; numeric: boolean }> = [
    { key: 'name', label: 'Division', numeric: false },
    { key: 'districts', label: 'Districts', numeric: true },
    { key: 'temp', label: 'Temp °C', numeric: true },
    { key: 'rain', label: 'Rain mm', numeric: true },
    { key: 'pm', label: 'PM2.5 µg/m³', numeric: true },
    { key: 'uv', label: 'UV', numeric: true },
  ];
  const cellValue = (r: Row, key: SortKey) =>
    key === 'name' ? r.name : key === 'districts' ? String(r.districts) : formatValue(LAYERS[key], r.values[key]);

  return (
    <>
      <PageHeader
        title="Locations"
        description="Climate summaries for Bangladesh's 8 divisions. Open a division to see its districts, upazilas and unions."
        action={
          <div className="loc-source">
            <span>Source: Open-Meteo · updated nightly</span>
            {updatedAt && <span>Last updated {dhakaDate(updatedAt)}</span>}
          </div>
        }
      />

      <div className="loc-layout">
        <section className="loc-card loc-map" aria-labelledby="loc-map-h">
          <div className="loc-card-head">
            <h2 id="loc-map-h">Divisions</h2>
            <span>{layer.desc}</span>
          </div>

          <nav className="dt-seg" aria-label="Map layer">
            {LAYER_ORDER.map((k) => (
              <Link key={k} href={href({ layer: k === 'temp' ? undefined : k })} aria-current={k === layerKey ? 'true' : undefined}>
                {LAYERS[k].label}
              </Link>
            ))}
          </nav>

          <div className="loc-tiles">
            {DIVISION_TILES.map(([name, area]) => {
              const r = byName.get(name);
              const v = r?.values[layerKey] ?? null;
              const cls = v == null ? 'loc-tile--none' : `loc-${layerKey}-${binIndex(layer, v) + 1}`;
              return r ? (
                <Link
                  key={name}
                  href={`/locations/divisions/${r.id}`}
                  className={`loc-tile ${cls}`}
                  style={{ gridArea: area }}
                  aria-label={`${name}, ${layer.label} ${withUnit(layerKey, v)}. Open division.`}
                >
                  <span>{name}</span>
                  <strong>{v == null ? '—' : formatValue(layer, v)}<small>{layer.unit ? ` ${layer.unit}` : ''}</small></strong>
                </Link>
              ) : (
                <div key={name} className="loc-tile loc-tile--none" style={{ gridArea: area }}><span>{name}</span><strong>—</strong></div>
              );
            })}
          </div>

          <div className="loc-legend">
            {layer.bins.map((b, i) => (
              <span key={b.label}><i className={`loc-swatch loc-${layerKey}-${i + 1}`} />{b.label}</span>
            ))}
          </div>
          {note && <p className="loc-note">{note}</p>}
        </section>

        <section className="loc-card loc-table-card" aria-labelledby="loc-tbl-h">
          <div className="loc-tbl-head">
            <h2 id="loc-tbl-h">30-day climate summary</h2>
            <span>Select a column to sort</span>
          </div>

          <div className="loc-table" role="table" aria-label="Division climate summary">
            <div className="loc-row loc-row--head" role="row">
              {columns.map((c) => (
                <div
                  key={c.key}
                  role="columnheader"
                  aria-sort={ariaSort(c.key)}
                  className={`${c.numeric ? 'loc-num' : ''}${c.key === layerKey ? ' loc-hl-head' : ''}`}
                >
                  <Link href={sortHref(c.key)}>{c.label} <span>{arrow(c.key)}</span></Link>
                </div>
              ))}
              <div role="columnheader" aria-hidden="true" />
            </div>
            {sorted.map((r) => (
              <Link key={r.id} className="loc-row" role="row" href={`/locations/divisions/${r.id}`}>
                {columns.map((c) => (
                  <div
                    key={c.key}
                    role="cell"
                    className={`${c.numeric ? 'loc-num' : 'loc-name'}${c.key === layerKey ? ' loc-hl' : ''}`}
                  >
                    {cellValue(r, c.key)}
                  </div>
                ))}
                <div role="cell" className="loc-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
                <div className="loc-mobile-main">{withUnit(layerKey, r.values[layerKey])}</div>
                <div className="loc-mobile-sub">
                  {r.districts} districts ·{' '}
                  {LAYER_ORDER.filter((k) => k !== layerKey).map((k) => `${LAYERS[k].label.replace(' index', '')} ${withUnit(k, r.values[k])}`).join(' · ')}
                </div>
              </Link>
            ))}
          </div>

          <p className="loc-foot">
            Temperature, PM2.5 and UV are 30-day means. Rain is the 30-day total. PM2.5 categories are defined on 24-hour values, so none are shown for 30-day means.
          </p>
        </section>
      </div>
    </>
  );
}
