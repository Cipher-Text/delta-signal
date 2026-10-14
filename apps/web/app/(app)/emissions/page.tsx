import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type NationalEmissionReading } from '@delta-signal/contracts';
import { dhakaDate } from '../../../lib/format';
import { CODES, buildChart, pivotByYear, signedPercent, type Layer, type YearRow } from '../../../lib/emissions';
import EmptyState from '../../../components/empty-state';
import PageHeader from '../../../components/page-header';

const RANGES = [
  { key: 'all', label: 'All years' },
  { key: '2000', label: 'Since 2000' },
  { key: '10', label: 'Last 10 years' },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const LAYER_LABEL: Partial<Record<Layer, string>> = { co2: 'CO₂', ch4: 'CH₄', n2o: 'N₂O' };

const fmt1 = (n: number | null) => (n == null ? '—' : n.toFixed(1));
const share = (part: number | null, total: number) => (part == null ? null : Math.round((part / total) * 100));

function trend(now: number | null, then: number | null, year: number) {
  if (now == null || then == null) return null;
  return now > then ? `Up from ${then}% in ${year}` : now < then ? `Down from ${then}% in ${year}` : `Unchanged from ${year}`;
}

/** Bangladesh national greenhouse gas emissions by gas (Web UI Reference). */
export default async function EmissionsPage(props: { searchParams: Promise<{ range?: string }> }) {
  const sp = await props.searchParams;
  const range: RangeKey = RANGES.some((r) => r.key === sp.range) ? (sp.range as RangeKey) : 'all';

  const readings = await apiGet<NationalEmissionReading[]>(routes.emissions.list, 900).catch(() => [] as NationalEmissionReading[]);
  const all = pivotByYear(readings);

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Greenhouse gas emissions" description="Bangladesh national emissions by gas, in million tonnes of CO₂ equivalent, excluding land use (LULUCF)." />
        <EmptyState title="No emissions data available" description="Data appears here after the weekly World Bank sync." />
      </>
    );
  }

  const latest = all[all.length - 1];
  const first = all.find((r) => r.year === 2000);
  const startYear = range === 'all' ? all[0].year : range === '2000' ? 2000 : latest.year - 9;
  const inRange = all.filter((r) => r.year >= startYear);
  const chart = buildChart(inRange);
  const rangeLabel = `${inRange[0].year}–${latest.year}`;
  const updatedAt = readings.map((r) => r.updatedAt).sort().pop();

  const prev = all.find((r) => r.year === latest.year - 1);
  const sinceFirst = first ? (latest.total / first.total - 1) * 100 : null;
  const co2Now = share(latest.co2, latest.total);
  const ch4Now = share(latest.ch4, latest.total);
  const co2Then = first ? share(first.co2, first.total) : null;
  const ch4Then = first ? share(first.ch4, first.total) : null;

  const tableRows: YearRow[] = [...inRange].reverse();
  const footnote = 'All values in Mt CO₂e. "Other" is the total minus CO₂, CH₄ and N₂O (mainly fluorinated gases).';

  return (
    <>
      <PageHeader
        title="Greenhouse gas emissions"
        description="Bangladesh national emissions by gas, in million tonnes of CO₂ equivalent, excluding land use (LULUCF)."
        action={
          <div className="em-source">
            <span className="em-badge">Estimated</span>
            <span className="em-source-long">World Bank{updatedAt ? ` · updated ${dhakaDate(updatedAt)}` : ''}</span>
            <span className="em-source-short">World Bank{updatedAt ? ` · ${dhakaDate(updatedAt)}` : ''}</span>
          </div>
        }
      />

      <div className="em-kpis">
        <div className="em-kpi">
          <span>Total emissions, {latest.year}</span>
          <strong>{fmt1(latest.total)}<small> Mt CO₂e</small></strong>
          <span>{latest.change != null && prev ? `${signedPercent(latest.change)} vs ${prev.year}` : ' '}</span>
        </div>
        <div className="em-kpi">
          <span>Change since 2000</span>
          <strong>{sinceFirst != null ? signedPercent(sinceFirst, 0) : '—'}</strong>
          <span>{first ? `From ${fmt1(first.total)} to ${fmt1(latest.total)} Mt CO₂e` : 'No data for 2000'}</span>
        </div>
        <div className="em-kpi em-kpi--extra">
          <span>CO₂ share of total, {latest.year}</span>
          <strong>{co2Now != null ? `${co2Now}%` : '—'}</strong>
          <span>{trend(co2Now, co2Then, 2000) ?? ' '}</span>
        </div>
        <div className="em-kpi em-kpi--extra">
          <span>Methane share, {latest.year}</span>
          <strong>{ch4Now != null ? `${ch4Now}%` : '—'}</strong>
          <span>{trend(ch4Now, ch4Then, 2000) ?? ' '}</span>
        </div>
      </div>

      <section className="em-card em-chart" aria-labelledby="em-chart-h">
        <div className="em-chart-head">
          <div>
            <h2 id="em-chart-h">Emissions by gas, {rangeLabel}</h2>
            <span className="em-sub">Mt CO₂e per year, stacked</span>
          </div>
          <nav className="em-range" aria-label="Year range">
            {RANGES.map((r) => (
              <Link key={r.key} href={r.key === 'all' ? '/emissions' : `/emissions?range=${r.key}`} aria-current={range === r.key ? 'true' : undefined}>
                {r.label}
              </Link>
            ))}
          </nav>
        </div>

        {chart ? (
          <svg
            className="em-svg"
            viewBox="0 0 800 300"
            width="100%"
            role="img"
            aria-label={`Stacked area chart of Bangladesh greenhouse gas emissions by gas, ${inRange[0].year} to ${latest.year}. Total ${inRange[0].total < latest.total ? 'rose' : 'fell'} from ${fmt1(inRange[0].total)} to ${fmt1(latest.total)} Mt CO2e.`}
          >
            {chart.yTicks.map((t) => (
              <g key={t.value}>
                <line className="em-grid" x1="44" x2="730" y1={t.y.toFixed(1)} y2={t.y.toFixed(1)} />
                <text className="em-tick" x="38" y={(t.y + 4).toFixed(1)} textAnchor="end">{t.value}</text>
              </g>
            ))}
            {chart.areas.map((a) => (
              <g key={a.layer}>
                <polygon className={`em-area em-area--${a.layer}`} points={a.points} />
                {a.labelY != null && <text className="em-area-label" x="738" y={a.labelY.toFixed(1)}>{LAYER_LABEL[a.layer]}</text>}
              </g>
            ))}
            {chart.xTicks.map((t) => (
              <text key={t.year} className={`em-tick${t.near ? ' em-tick--near' : ''}`} x={t.x.toFixed(1)} y="292" textAnchor="middle">{t.year}</text>
            ))}
          </svg>
        ) : (
          <EmptyState title="Not enough data to chart this range" />
        )}

        <div className="em-legend">
          <span><i className="em-swatch em-area--co2" />CO₂ carbon dioxide</span>
          <span><i className="em-swatch em-area--ch4" />CH₄ methane</span>
          <span><i className="em-swatch em-area--n2o" />N₂O nitrous oxide</span>
          <span><i className="em-swatch em-area--other" />Other gases (total minus the three)</span>
        </div>
      </section>

      <section className="em-card em-table-card" aria-labelledby="em-tbl-h">
        <div className="em-tbl-head">
          <h2 id="em-tbl-h">Yearly values</h2>
          <a className="em-csv" href="/emissions/csv" download>Download CSV</a>
          <span className="em-unit">Mt CO₂e</span>
        </div>
        <div className="em-table" role="table" aria-label="Emissions by year, Mt CO₂e">
          <div className="em-row em-row--head" role="row">
            <div role="columnheader">Year</div>
            <div role="columnheader" className="em-num">Total</div>
            <div role="columnheader" className="em-num em-col-gas">CO₂</div>
            <div role="columnheader" className="em-num em-col-gas">CH₄</div>
            <div role="columnheader" className="em-num em-col-gas">N₂O</div>
            <div role="columnheader" className="em-num em-col-gas">Other</div>
            <div role="columnheader" className="em-num">vs prior year</div>
          </div>
          {tableRows.map((r) => (
            <div key={r.year} className="em-row" role="row">
              <div role="cell" className="em-year">{r.year}</div>
              <div role="cell" className="em-num em-total">{fmt1(r.total)}</div>
              <div role="cell" className="em-num em-col-gas">{fmt1(r.co2)}</div>
              <div role="cell" className="em-num em-col-gas">{fmt1(r.ch4)}</div>
              <div role="cell" className="em-num em-col-gas">{fmt1(r.n2o)}</div>
              <div role="cell" className="em-num em-col-gas em-muted">{fmt1(r.other)}</div>
              <div role="cell" className="em-num em-muted">{r.change != null ? signedPercent(r.change) : '—'}</div>
              <div className="em-mobile-gases">CO₂ {fmt1(r.co2)} · CH₄ {fmt1(r.ch4)} · N₂O {fmt1(r.n2o)}</div>
            </div>
          ))}
        </div>
        <p className="em-foot">
          {footnote} Indicators: {Object.values(CODES).join(', ')}.
        </p>
      </section>
      <p className="em-foot-mobile">Excludes land use (LULUCF). &quot;Other&quot; is the total minus CO₂, CH₄ and N₂O.</p>
    </>
  );
}
