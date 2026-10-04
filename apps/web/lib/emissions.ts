import type { NationalEmissionReading } from '@delta-signal/contracts';

export const CODES = {
  total: 'EN.GHG.ALL.MT.CE.AR5',
  co2: 'EN.GHG.CO2.MT.CE.AR5',
  ch4: 'EN.GHG.CH4.MT.CE.AR5',
  n2o: 'EN.GHG.N2O.MT.CE.AR5',
} as const;

export type YearRow = {
  year: number;
  total: number;
  co2: number | null;
  ch4: number | null;
  n2o: number | null;
  /** Total minus CO₂, CH₄ and N₂O (mainly fluorinated gases). */
  other: number | null;
  /** Percent change in total vs the previous year, when that year exists. */
  change: number | null;
};

/** Pivot the API's (year, indicator) rows into one row per year, ascending. Years without a total are skipped. */
export function pivotByYear(readings: NationalEmissionReading[]): YearRow[] {
  const byYear = new Map<number, Partial<Record<keyof typeof CODES, number | null>>>();
  for (const r of readings) {
    const key = (Object.keys(CODES) as Array<keyof typeof CODES>).find((k) => CODES[k] === r.indicatorCode);
    if (!key) continue;
    byYear.set(r.year, { ...byYear.get(r.year), [key]: r.value });
  }
  const years = [...byYear.keys()].filter((y) => byYear.get(y)?.total != null).sort((a, b) => a - b);
  return years.map((year) => {
    const v = byYear.get(year)!;
    const total = v.total as number;
    const prev = byYear.get(year - 1)?.total;
    const parts = [v.co2, v.ch4, v.n2o];
    return {
      year,
      total,
      co2: v.co2 ?? null,
      ch4: v.ch4 ?? null,
      n2o: v.n2o ?? null,
      other: parts.every((p) => p != null) ? Math.max(0, total - (parts as number[]).reduce((a, b) => a + b, 0)) : null,
      change: prev ? (total / prev - 1) * 100 : null,
    };
  });
}

/** "+2.3%" / "−1.4%" with a real minus sign (§10A). */
export const signedPercent = (n: number, decimals = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(decimals)}%`;

export function toCsv(rows: YearRow[]): string {
  const cell = (n: number | null) => (n == null ? '' : n.toFixed(2));
  const lines = ['Year,Total (Mt CO2e),CO2 (Mt CO2e),CH4 (Mt CO2e),N2O (Mt CO2e),Other (Mt CO2e)'];
  for (const r of [...rows].sort((a, b) => b.year - a.year)) {
    lines.push([r.year, cell(r.total), cell(r.co2), cell(r.ch4), cell(r.n2o), cell(r.other)].join(','));
  }
  return lines.join('\n') + '\n';
}

// ── Stacked area chart geometry (viewBox 800 × 300) ─────────────────────────

const W = { left: 44, right: 730, top: 28, bottom: 272 };
const LAYERS = ['ch4', 'n2o', 'other', 'co2'] as const;
export type Layer = (typeof LAYERS)[number];

export type ChartModel = {
  yTicks: Array<{ value: number; y: number }>;
  /** `near` marks a label too close to the final year to fit beside it at mobile text sizes. */
  xTicks: Array<{ year: number; x: number; near: boolean }>;
  areas: Array<{ layer: Layer; points: string; labelY: number | null }>;
};

export function buildChart(rows: YearRow[]): ChartModel | null {
  const usable = rows.filter((r) => r.co2 != null && r.ch4 != null && r.n2o != null && r.other != null);
  if (usable.length < 2) return null;

  const y0 = usable[0].year;
  const y1 = usable[usable.length - 1].year;
  const niceMax = Math.ceil(Math.max(...usable.map((r) => r.total)) / 25) * 25;
  const x = (year: number) => W.left + ((year - y0) / (y1 - y0)) * (W.right - W.left);
  const y = (v: number) => W.bottom - (v / niceMax) * (W.bottom - W.top);
  const f = (n: number) => n.toFixed(1);

  // Cumulative top of each layer, per year.
  const tops = usable.map((r) => {
    let sum = 0;
    const out = {} as Record<Layer, { lo: number; hi: number }>;
    for (const l of LAYERS) {
      const lo = sum;
      sum += r[l] as number;
      out[l] = { lo, hi: sum };
    }
    return out;
  });

  const areas = LAYERS.map((layer) => {
    const upper = usable.map((r, i) => `${f(x(r.year))},${f(y(tops[i][layer].hi))}`);
    const lower = usable.map((r, i) => `${f(x(r.year))},${f(y(tops[i][layer].lo))}`).reverse();
    const last = tops[tops.length - 1][layer];
    return { layer, points: [...upper, ...lower].join(' '), labelY: layer === 'other' ? null : y((last.lo + last.hi) / 2) + 4 };
  });

  const span = y1 - y0;
  const step = span > 12 ? 10 : 2;
  const years: number[] = [];
  for (let yr = y0; yr < y1; yr += step) years.push(yr);
  years.push(y1);

  return {
    yTicks: Array.from({ length: Math.floor(niceMax / 50) + 1 }, (_, i) => ({ value: i * 50, y: y(i * 50) })),
    xTicks: [...new Set(years)].map((year) => ({ year, x: x(year), near: year !== y1 && x(y1) - x(year) < 70 })),
    areas,
  };
}

export const CHART_BOUNDS = W;
