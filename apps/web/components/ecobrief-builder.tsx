'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { EcoBrief, EcoBriefTopic } from '@delta-signal/contracts';

export type EcoBriefAreaOption = { value: string; label: string };

const TOPICS: Array<{ id: EcoBriefTopic; title: string; detail: string }> = [
  { id: 'climate', title: 'Climate & rainfall', detail: 'Latest 30-day rolling conditions' },
  { id: 'biodiversity', title: 'Biodiversity', detail: 'Dated GBIF occurrence records' },
  { id: 'emissions', title: 'Emissions', detail: 'National annual greenhouse gas estimates' },
  { id: 'observations', title: 'Community observations', detail: 'Submissions by category and review level' },
];

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function makeCsv(report: EcoBrief) {
  const rows: string[][] = [['section', 'measure', 'period', 'value', 'unit', 'source']];
  const climate = report.sections.climate;
  climate?.metrics.forEach((metric) => rows.push(['climate', metric.label, climate.periodLabel, metric.value == null ? '' : String(metric.value), metric.unit, climate.source]));
  const biodiversity = report.sections.biodiversity;
  biodiversity?.topSpecies.forEach((species) => rows.push(['biodiversity', species.scientificName, biodiversity.periodLabel, String(species.records), 'records', biodiversity.source]));
  const emissions = report.sections.emissions;
  emissions?.points.forEach((point) => rows.push(['emissions', String(point.year), emissions.periodLabel, String(point.value), point.unit, emissions.source]));
  const observations = report.sections.observations;
  observations?.byCategory.forEach((item) => rows.push(['observations', item.category, observations.periodLabel, String(item.count), 'records', observations.source]));
  observations?.byTrustLevel.forEach((item) => rows.push(['observation review level', item.trustLevel, observations.periodLabel, String(item.count), 'records', observations.source]));
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

function DownloadActions({ report }: { report: EcoBrief }) {
  function downloadCsv() {
    const blob = new Blob([makeCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ecobrief-${report.area.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <div className="eb-actions"><button type="button" className="button ghost" onClick={downloadCsv}>Download data CSV</button><button type="button" className="button" onClick={() => window.print()}>Print / save PDF</button></div>;
}

function ClimateSection({ data }: { data: NonNullable<EcoBrief['sections']['climate']> }) {
  return <section className="eb-section" aria-labelledby="eb-climate-title">
    <header className="eb-section-head"><div><p className="eb-kicker">Climate</p><h2 id="eb-climate-title">Recent conditions</h2></div><span className="eb-source">{data.source}</span></header>
    <p className="eb-period-note">{data.periodLabel}{data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
    {data.available ? <div className="eb-metrics">{data.metrics.map((metric) => <article className="eb-metric" key={metric.key}><span>{metric.label}</span><strong>{metric.value == null ? '—' : metric.value.toFixed(1)}<small> {metric.unit}</small></strong></article>)}</div> : <p className="eb-empty">No recent climate data is available for this area.</p>}
    <p className="eb-method-note">{data.note} Coverage: {data.coverage.reportingDistricts} of {data.coverage.totalDistricts} districts.</p>
  </section>;
}

function BiodiversitySection({ data }: { data: NonNullable<EcoBrief['sections']['biodiversity']> }) {
  return <section className="eb-section" aria-labelledby="eb-biodiversity-title">
    <header className="eb-section-head"><div><p className="eb-kicker">Biodiversity</p><h2 id="eb-biodiversity-title">Recorded species</h2></div><span className="eb-source">{data.source}</span></header>
    <p className="eb-big-stat">{data.coverage.occurrenceRecords.toLocaleString()} <span>records across {data.coverage.speciesRecorded.toLocaleString()} species</span></p>
    {data.topSpecies.length > 0 && <div className="eb-list">{data.topSpecies.map((species) => <div className="eb-list-row" key={species.scientificName}><span>{species.commonName || species.scientificName}<em>{species.commonName ? species.scientificName : ''}</em></span><strong>{species.records} <small>records</small></strong></div>)}</div>}
    <p className="eb-method-note">{data.note}</p>
  </section>;
}

function EmissionsSection({ data }: { data: NonNullable<EcoBrief['sections']['emissions']> }) {
  const max = Math.max(1, ...data.points.map((point) => point.value));
  return <section className="eb-section" aria-labelledby="eb-emissions-title">
    <header className="eb-section-head"><div><p className="eb-kicker">Emissions</p><h2 id="eb-emissions-title">Annual greenhouse gas estimates</h2></div><span className="eb-source">{data.source}</span></header>
    {data.available ? <div className="eb-bars" role="list" aria-label="Annual greenhouse gas emissions">
      {data.points.map((point) => <div className="eb-bar-row" role="listitem" key={point.year}><span>{point.year}</span><div className="eb-bar-track"><i style={{ width: `${Math.max(1, (point.value / max) * 100)}%` }} /></div><strong>{point.value.toFixed(1)} <small>{point.unit}</small></strong></div>)}
    </div> : <p className="eb-empty">Emissions data is not available for this subnational area or period.</p>}
    <p className="eb-method-note">{data.note}</p>
  </section>;
}

function ObservationsSection({ data }: { data: NonNullable<EcoBrief['sections']['observations']> }) {
  const total = Math.max(1, data.coverage.observations);
  return <section className="eb-section" aria-labelledby="eb-observations-title">
    <header className="eb-section-head"><div><p className="eb-kicker">Community data</p><h2 id="eb-observations-title">Environmental observations</h2></div><span className="eb-source">{data.source}</span></header>
    <p className="eb-big-stat">{data.coverage.observations.toLocaleString()} <span>records in this period</span></p>
    <div className="eb-columns">
      <div><h3>By topic</h3>{data.byCategory.length ? data.byCategory.map((item) => <div className="eb-count-row" key={item.category}><span>{item.category.replace(/_/g, ' ').toLowerCase()}</span><strong>{item.count}</strong></div>) : <p className="eb-empty">No records in this period.</p>}</div>
      <div><h3>Review level</h3>{data.byTrustLevel.length ? data.byTrustLevel.map((item) => <div className="eb-count-row" key={item.trustLevel}><span>{item.trustLevel.replace(/_/g, ' ').toLowerCase()}</span><strong>{item.count}</strong></div>) : <p className="eb-empty">No records in this period.</p>}</div>
    </div>
    <p className="eb-method-note">{data.note}</p>
  </section>;
}

function periodLabel(from: string, to: string) {
  const fmt = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

export default function EcoBriefBuilder({
  areas,
  initialArea,
  initialFrom,
  initialTo,
  initialTopics,
  report,
  error,
}: {
  areas: EcoBriefAreaOption[];
  initialArea: string;
  initialFrom: string;
  initialTo: string;
  initialTopics: EcoBriefTopic[];
  report: EcoBrief | null;
  error: string | null;
}) {
  const [area, setArea] = useState(initialArea);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [preset, setPreset] = useState('custom');
  const [topics, setTopics] = useState<EcoBriefTopic[]>(initialTopics);

  function setPeriod(value: string) {
    setPreset(value);
    if (value === 'custom') return;
    const days = Number(value);
    setFrom(dateOffset(days - 1));
    setTo(new Date().toISOString().slice(0, 10));
  }

  function toggleTopic(topic: EcoBriefTopic) {
    setTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!topics.length) {
      event.preventDefault();
      return;
    }
  }

  return <div className="eb-page">
    <form className="eb-builder panel" action="/ecobrief" method="get" onSubmit={submit}>
      <div className="eb-builder-heading"><div><p className="eb-kicker">Build a brief</p><h2>Choose your scope</h2></div><span>Data availability varies by topic</span></div>
      <div className="eb-controls">
        <label className="eb-field eb-field--area"><span>Area</span><select name="area" value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <label className="eb-field"><span>Time period</span><select value={preset} onChange={(event) => setPeriod(event.target.value)}><option value="custom">Custom dates</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option><option value="1825">Last 5 years</option></select></label>
        <label className="eb-field"><span>From</span><input type="date" name="from" value={from} onChange={(event) => { setFrom(event.target.value); setPreset('custom'); }} required /></label>
        <label className="eb-field"><span>To</span><input type="date" name="to" value={to} onChange={(event) => { setTo(event.target.value); setPreset('custom'); }} required /></label>
      </div>
      <fieldset className="eb-topics"><legend>Include data</legend><div className="eb-topic-grid">{TOPICS.map((topic) => <label className="eb-topic" key={topic.id}><input type="checkbox" name="topics" value={topic.id} checked={topics.includes(topic.id)} onChange={() => toggleTopic(topic.id)} /><span className="eb-topic-copy"><strong>{topic.title}</strong><small>{topic.detail}</small></span></label>)}</div></fieldset>
      {!topics.length && <p className="eb-form-error" role="alert">Select at least one topic to generate a brief.</p>}
      <div className="eb-submit-row"><p>Summaries describe the data. They do not infer causes.</p><button className="button" type="submit" disabled={!topics.length}>Generate EcoBrief <span aria-hidden="true">→</span></button></div>
    </form>

    {error && <div className="alert-strip warning eb-error" role="alert">{error}</div>}
    {report ? <main className="eb-report" aria-labelledby="eb-report-title">
      <header className="eb-report-head"><div><p className="eb-kicker">Your environmental data brief</p><h2 id="eb-report-title">{report.area.name}</h2><p>{periodLabel(report.period.from, report.period.to)} · Created {new Date(report.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><DownloadActions report={report} /></header>
      <div className="eb-summary"><span className="eb-summary-mark" aria-hidden="true">i</span><div><strong>At a glance</strong><ul>{report.summary.map((item) => <li key={item}>{item}</li>)}</ul><p>Each section shows its source, coverage, and limits so you can judge what the data supports.</p></div></div>
      {report.sections.climate && <ClimateSection data={report.sections.climate} />}
      {report.sections.biodiversity && <BiodiversitySection data={report.sections.biodiversity} />}
      {report.sections.emissions && <EmissionsSection data={report.sections.emissions} />}
      {report.sections.observations && <ObservationsSection data={report.sections.observations} />}
      <footer className="eb-report-foot">Data snapshot generated {new Date(report.generatedAt).toISOString()} · See each section for source and limitations.</footer>
    </main> : !error && <section className="eb-empty-start"><div className="eb-empty-icon" aria-hidden="true">EB</div><h2>Your brief will appear here</h2><p>Pick an area, period, and data themes above. EcoBrief will assemble a source-linked snapshot from the datasets available for that selection.</p></section>}
  </div>;
}
