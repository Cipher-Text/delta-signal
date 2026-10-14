'use client';

import { useState } from 'react';
import type { EcoBrief } from '@delta-signal/contracts';

const csvCell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Long-format CSV with a metadata preamble, so the file explains itself when it is opened on its own. */
function buildCsv(report: EcoBrief, citation: string): string {
  const meta = [
    ['Delta Signal EcoBrief'],
    ['Report ID', report.reportId],
    ['Title', report.title],
    ['Area', report.area.name],
    ['Period', `${report.query.from} to ${report.query.to}`],
    ['Generated (UTC)', report.generatedAt],
    ['Observation filter', report.query.trust === 'research' ? 'Research grade only' : 'All non-flagged'],
    ['Climate basis', 'Latest rolling 30-day snapshot; not aligned to the selected period'],
    ['Suggested citation', citation],
    ...report.methods.sources.map((s) => [`Source (${s.topic})`, `${s.name}; licence: ${s.licence}`]),
  ].map((row) => `# ${row.join(': ')}`);

  const head = ['section', 'table', 'item', 'measure', 'value', 'unit', 'n', 'period_basis', 'source'];
  const rows: Array<Array<string | number | null>> = [];
  const { climate, biodiversity, emissions, observations } = report.sections;
  climate?.statistics.forEach((s) => {
    rows.push(['climate', 'district statistics', s.label, 'mean', s.mean, s.unit, s.n, climate.periodLabel, climate.source]);
    rows.push(['climate', 'district statistics', s.label, 'minimum', s.min, s.unit, s.n, climate.periodLabel, climate.source]);
    rows.push(['climate', 'district statistics', s.label, 'maximum', s.max, s.unit, s.n, climate.periodLabel, climate.source]);
  });
  climate?.districts.forEach((d) => {
    const base = ['climate', 'district values', d.name] as const;
    rows.push([...base, 'temperature', d.temperature, '°C', 1, climate.periodLabel, climate.source]);
    rows.push([...base, 'rainfall', d.rainfall, 'mm / 30 days', 1, climate.periodLabel, climate.source]);
    rows.push([...base, 'humidity', d.humidity, '%', 1, climate.periodLabel, climate.source]);
    rows.push([...base, 'pm2.5', d.pm25, 'µg/m³', 1, climate.periodLabel, climate.source]);
  });
  biodiversity?.species.forEach((s) =>
    rows.push(['biodiversity', 'species records', s.scientificName, s.kingdom ?? 'Unassigned', s.records, 'records', null, biodiversity.periodLabel, biodiversity.source]),
  );
  emissions?.series.forEach((s) =>
    s.points.forEach((p) => rows.push(['emissions', 'annual estimates', s.label, String(p.year), p.value, p.unit, null, emissions.periodLabel, emissions.source])),
  );
  observations?.byCategory.forEach((c) => rows.push(['observations', 'by category', c.category, 'records', c.count, 'records', null, observations.periodLabel, observations.source]));
  observations?.byTrustLevel.forEach((c) => rows.push(['observations', 'by review level', c.trustLevel, 'records', c.count, 'records', null, observations.periodLabel, observations.source]));

  return [...meta, '', head.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download, copy-citation and print controls. Hidden when the brief is printed. */
export default function ReportActions({ report, citation }: { report: EcoBrief; citation: string }) {
  const [copied, setCopied] = useState(false);
  const base = `ecobrief-${report.reportId.toLowerCase()}`;

  return (
    <div className="jr-actions">
      <button type="button" className="pf-btn-outline" onClick={() => save(new Blob([buildCsv(report, citation)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`)}>
        Download CSV
      </button>
      <button
        type="button"
        className="pf-btn-outline"
        onClick={() => save(new Blob([JSON.stringify({ citation, ...report }, null, 2)], { type: 'application/json' }), `${base}.json`)}
      >
        Download JSON
      </button>
      <button
        type="button"
        className="pf-btn-outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(citation);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable: the citation is on the page to copy by hand */
          }
        }}
      >
        {copied ? 'Citation copied' : 'Copy citation'}
      </button>
      <button type="button" className="pf-btn-solid" onClick={() => window.print()}>Print / save PDF</button>
    </div>
  );
}
