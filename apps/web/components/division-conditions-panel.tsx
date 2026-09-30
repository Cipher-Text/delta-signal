'use client';

import { useState } from 'react';
import type { DivisionWithClimate } from '@delta-signal/contracts';

// Approximate NW→NE, W→E, SW→S geographic layout (not to scale) — matches the design's tile map.
const TILE_ORDER = ['Rangpur', 'Mymensingh', 'Sylhet', 'Rajshahi', 'Dhaka', 'Chattagram', 'Khulna', 'Barisal'];

type MetricKey = 'rainfall' | 'temperature' | 'uv';

const METRICS: Record<MetricKey, { label: string; unit: string; get: (d: DivisionWithClimate) => number | null }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', get: (d) => d.totalPrecip30d },
  temperature: { label: 'Temperature', unit: '°C', get: (d) => d.avgTemp30d },
  uv: { label: 'UV index', unit: '', get: (d) => d.avgUvIndex30d },
};

function formatValue(value: number, unit: string): string {
  return unit === '°C' || unit === '' ? value.toFixed(1) : value.toFixed(0);
}

export default function DivisionConditionsPanel({ divisions }: { divisions: DivisionWithClimate[] }) {
  const [metric, setMetric] = useState<MetricKey>('rainfall');
  const config = METRICS[metric];

  const values = divisions
    .map((d) => config.get(d))
    .filter((v): v is number => v != null);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const step = (max - min) / 4 || 1;
  const thresholds = [min + step, min + step * 2, min + step * 3];

  function levelFor(value: number | null): number {
    if (value == null) return 0;
    if (value < thresholds[0]) return 1;
    if (value < thresholds[1]) return 2;
    if (value < thresholds[2]) return 3;
    return 4;
  }

  const byName = new Map(divisions.map((d) => [d.name, d]));
  const tableDivisions = [...divisions].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="division-conditions">
      <div className="division-tilemap-card">
        <div className="division-tilemap-header">
          <div className="metric-toggle" role="tablist">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={metric === key}
                className={metric === key ? 'is-active' : ''}
                onClick={() => setMetric(key)}
              >
                {METRICS[key].label}
              </button>
            ))}
          </div>
          <span className="division-tilemap-caption">
            {config.label} · 30-day rolling{config.unit ? `, ${config.unit}` : ''}
          </span>
        </div>

        <div className="division-tilemap-grid">
          {TILE_ORDER.map((name) => {
            const division = byName.get(name);
            const value = division ? config.get(division) : null;
            const level = levelFor(value);
            return (
              <div key={name} className={`division-tile division-tile--level-${level}`}>
                <span className="division-tile-name">{name}</span>
                {value != null ? (
                  <span className="division-tile-value">
                    {formatValue(value, config.unit)}
                    {config.unit && <small>{config.unit}</small>}
                  </span>
                ) : (
                  <span className="division-tile-value division-tile-value--none">No data</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="division-tilemap-footer">
          <div className="division-tilemap-legend">
            <span><i className="division-tile--level-1" /> {'<'} {formatValue(thresholds[0], config.unit)}</span>
            <span><i className="division-tile--level-2" /> {formatValue(thresholds[0], config.unit)}–{formatValue(thresholds[1], config.unit)}</span>
            <span><i className="division-tile--level-3" /> {formatValue(thresholds[1], config.unit)}–{formatValue(thresholds[2], config.unit)}</span>
            <span><i className="division-tile--level-4" /> ≥ {formatValue(thresholds[2], config.unit)}</span>
          </div>
          <span className="division-tilemap-note">Division tile map: positions approximate, not to scale.</span>
        </div>
      </div>

      <div className="division-table-card">
        <div className="data-table" role="table" aria-label="Division conditions">
          <div className="data-table-row data-table-head" role="row">
            <span role="columnheader">Division</span>
            <span role="columnheader">Temp °C</span>
            <span role="columnheader">Rain mm</span>
            <span role="columnheader">UV</span>
          </div>
          {tableDivisions.map((d) => (
            <div key={d.id} className="data-table-row" role="row">
              <span role="cell">{d.name}</span>
              <span role="cell">{d.avgTemp30d != null ? d.avgTemp30d.toFixed(1) : '—'}</span>
              <span role="cell">{d.totalPrecip30d != null ? d.totalPrecip30d.toFixed(0) : '—'}</span>
              <span role="cell">{d.avgUvIndex30d != null ? d.avgUvIndex30d.toFixed(1) : '—'}</span>
            </div>
          ))}
        </div>
        <p className="division-table-footnote">Temperature and UV: 30-day mean. Rainfall: 30-day total.</p>
      </div>
    </div>
  );
}
