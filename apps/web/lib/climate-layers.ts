import type { DivisionWithClimate } from '@delta-signal/contracts';

/**
 * Map layers for the Locations page. Bin edges are FIXED per metric and do not follow the day's
 * data (DESIGN.md §21A): a colour means the same value on every day. Values are classified as displayed.
 */
export type LayerKey = 'temp' | 'rain' | 'pm' | 'uv';

export interface Bin {
  /** Upper edge (exclusive) in the layer's displayed unit. */
  max: number;
  label: string;
}

export interface Layer {
  key: LayerKey;
  label: string;
  unit: string;
  decimals: number;
  desc: string;
  bins: readonly Bin[];
  value: (d: DivisionWithClimate) => number | null;
  /** Caption under the legend; may depend on the day's values. */
  note: (values: number[]) => string;
}

const range = (values: number[], decimals: number, unit: string) =>
  `${Math.min(...values).toFixed(decimals)}–${Math.max(...values).toFixed(decimals)}${unit ? ` ${unit}` : ''}`;

export const LAYERS: Record<LayerKey, Layer> = {
  temp: {
    key: 'temp',
    label: 'Temperature',
    unit: '°C',
    decimals: 1,
    desc: 'Mean temperature, 30 days',
    // Wide enough for winter (~18–22 °C) through summer (~29–31 °C).
    bins: [
      { max: 22, label: '< 22' },
      { max: 28, label: '22–27.9' },
      { max: Infinity, label: '≥ 28 °C' },
    ],
    value: (d) => d.avgTemp30d,
    note: (v) =>
      Math.max(...v) - Math.min(...v) <= 1.5
        ? `Narrow range (${range(v, 1, '°C')}): differences between divisions are small.`
        : 'Fixed bins, the same every day.',
  },
  rain: {
    key: 'rain',
    label: 'Rainfall',
    unit: 'mm',
    decimals: 0,
    desc: 'Total rainfall, 30 days',
    bins: [
      { max: 200, label: '< 200' },
      { max: 250, label: '200–249' },
      { max: 300, label: '250–299' },
      { max: Infinity, label: '≥ 300 mm' },
    ],
    value: (d) => d.totalPrecip30d,
    note: () => 'Fixed bins, the same every day (DESIGN.md §21A).',
  },
  pm: {
    key: 'pm',
    label: 'PM2.5',
    unit: 'µg/m³',
    decimals: 0,
    desc: 'Mean PM2.5, 30 days',
    bins: [
      { max: 20, label: '< 20' },
      { max: 35, label: '20–34' },
      { max: Infinity, label: '≥ 35 µg/m³' },
    ],
    value: (d) => d.avgPm25_30d,
    note: () => 'Concentration bands only. Air quality categories apply to 24-hour values, not 30-day means.',
  },
  uv: {
    key: 'uv',
    label: 'UV index',
    unit: '',
    decimals: 1,
    desc: 'Mean UV index, 30 days',
    // WHO categories: Low 0–2, Moderate 3–5, High 6–7, Very high 8–10, Extreme 11+ (continuous edges for decimals).
    bins: [
      { max: 3, label: 'Low < 3' },
      { max: 6, label: 'Moderate 3–5.9' },
      { max: 8, label: 'High 6–7.9' },
      { max: 11, label: 'Very high 8–10.9' },
      { max: Infinity, label: 'Extreme ≥ 11' },
    ],
    value: (d) => d.avgUvIndex30d,
    note: (v) => {
      const bands = new Set(v.map((x) => LAYERS.uv.bins.findIndex((b) => x < b.max)));
      if (bands.size === 1) {
        const band = LAYERS.uv.bins[[...bands][0]].label.split(' ').slice(0, -1).join(' ');
        return `Narrow range (${range(v, 1, '')}): all divisions are in the WHO “${band}” band.`;
      }
      return 'WHO UV categories, applied to the 30-day mean.';
    },
  },
};

export const LAYER_ORDER: readonly LayerKey[] = ['temp', 'rain', 'pm', 'uv'];

/** Index of the bin a displayed (rounded) value falls in. */
export function binIndex(layer: Layer, value: number): number {
  const shown = Number(value.toFixed(layer.decimals));
  return layer.bins.findIndex((b) => shown < b.max);
}

export const formatValue = (layer: Layer, value: number | null) => (value == null ? '—' : value.toFixed(layer.decimals));
