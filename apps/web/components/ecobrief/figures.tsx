/** Print-safe SVG figures for EcoBrief: no colour-only encoding (series differ by dash and direct labels). */

export interface LineSeries {
  key: string;
  label: string;
  points: Array<{ year: number; value: number }>;
}

const DASH = ['', '6 3', '2 3', '10 3 2 3'];

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

export function LineChart({ series, unit, label }: { series: LineSeries[]; unit: string; label: string }) {
  const W = 640;
  const H = 280;
  const m = { top: 24, right: 84, bottom: 34, left: 52 };
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return null;
  const years = pts.map((p) => p.year);
  const x0 = Math.min(...years);
  const x1 = Math.max(...years);
  const yMax = niceMax(Math.max(...pts.map((p) => p.value)));
  const x = (yr: number) => m.left + (x1 === x0 ? (W - m.left - m.right) / 2 : ((yr - x0) / (x1 - x0)) * (W - m.left - m.right));
  const y = (v: number) => m.top + (1 - v / yMax) * (H - m.top - m.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
  const xTicks = uniqueYears.length <= 8 ? uniqueYears : [x0, Math.round(x0 + (x1 - x0) / 3), Math.round(x0 + (2 * (x1 - x0)) / 3), x1];

  return (
    <svg className="jr-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} className="jr-grid" />
          <text x={m.left - 8} y={y(t) + 4} textAnchor="end" className="jr-axis">{t >= 100 ? Math.round(t) : t.toFixed(t % 1 ? 1 : 0)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t} x={x(t)} y={H - m.bottom + 18} textAnchor="middle" className="jr-axis">{t}</text>
      ))}
      <text x={m.left - 40} y={12} className="jr-axis jr-axis-unit">{unit}</text>
      {series.map((s, i) => {
        if (!s.points.length) return null;
        const d = s.points.map((p, k) => `${k ? 'L' : 'M'}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
        const last = s.points[s.points.length - 1];
        return (
          <g key={s.key} className={`jr-line jr-line--${i % 4}`}>
            <path d={d} fill="none" strokeDasharray={DASH[i % 4]} />
            {s.points.map((p) => (
              <circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={2.6} />
            ))}
            <text x={x(last.year) + 8} y={y(last.value) + 4} className="jr-line-label">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ items, label, unit }: { items: Array<{ label: string; value: number }>; label: string; unit: string }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.value), 1);
  const rowH = 26;
  const labelW = 210;
  const W = 640;
  const H = items.length * rowH + 8;
  return (
    <svg className="jr-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {items.map((it, i) => {
        const w = (it.value / max) * (W - labelW - 70);
        return (
          <g key={it.label} transform={`translate(0 ${i * rowH + 4})`}>
            <text x={labelW - 8} y={15} textAnchor="end" className="jr-axis jr-bar-label">{it.label.length > 34 ? `${it.label.slice(0, 33)}…` : it.label}</text>
            <rect x={labelW} y={3} width={Math.max(2, w)} height={16} className="jr-bar" />
            <text x={labelW + Math.max(2, w) + 6} y={15} className="jr-axis">{it.value.toLocaleString()}<tspan className="jr-axis-unit"> {unit}</tspan></text>
          </g>
        );
      })}
    </svg>
  );
}
