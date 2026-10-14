import Link from 'next/link';
import type { ReactNode } from 'react';
import type { EcoBrief } from '@delta-signal/contracts';
import { calendarDay, dhakaDateTimeShort, pluralize, titleCase } from '../../lib/format';
import { BarChart, LineChart } from './figures';
import ReportActions from './report-actions';

const fmt = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const int = (v: number) => v.toLocaleString('en-GB');
const calDate = (iso: string) => {
  const d = calendarDay(iso.slice(0, 10));
  return `${d.short} ${iso.slice(0, 4)}`;
};

/** Numbers tables and figures in reading order, as a journal does. */
function counter() {
  let table = 0;
  let figure = 0;
  return { table: () => ++table, figure: () => ++figure };
}

function Table({ n, title, children, note }: { n: number; title: string; children: ReactNode; note?: string }) {
  return (
    <figure className="jr-table">
      <figcaption><b>Table {n}.</b> {title}</figcaption>
      <div className="jr-table-scroll">{children}</div>
      {note && <p className="jr-table-note">{note}</p>}
    </figure>
  );
}

function Figure({ n, title, children, note }: { n: number; title: string; children: ReactNode; note?: string }) {
  return (
    <figure className="jr-figure">
      {children}
      <figcaption><b>Figure {n}.</b> {title}{note ? ` ${note}` : ''}</figcaption>
    </figure>
  );
}

export function buildCitation(report: EcoBrief, url: string): string {
  const year = report.generatedAt.slice(0, 4);
  const sources = report.methods.sources.map((s) => s.name).join('; ');
  return `Delta Signal. (${year}). ${report.title} [Report ${report.reportId}; ${report.query.from} to ${report.query.to}]. Generated ${report.generatedAt.slice(0, 10)}. Data sources: ${sources}. ${url}`;
}

/** The brief laid out as a short journal-style report: abstract, methods, results, limitations, citation, appendices. */
export default function EcoBriefReport({
  report,
  citation,
  reviewHref,
}: {
  report: EcoBrief;
  citation: string;
  /** Researchers and moderators get a link to the unverified observations behind the headline count. */
  reviewHref?: string;
}) {
  const c = counter();
  const { climate, biodiversity, emissions, observations } = report.sections;
  const period = `${calDate(report.query.from)} – ${calDate(report.query.to)}`;
  const included = report.topics.length;
  let sec = 1;

  const sources = report.methods.sources;
  const longDistrictTable = (climate?.districts.length ?? 0) > 12;
  const showSpeciesAppendix = (biodiversity?.species.length ?? 0) > 15;

  return (
    <article className="jr" aria-labelledby="jr-title">
      <div className="jr-actions-wrap">
        <ReportActions report={report} citation={citation} />
      </div>

      <header className="jr-head">
        <p className="jr-running">Delta Signal · Environmental data brief</p>
        <h1 id="jr-title">{report.title}</h1>
        <dl className="jr-meta">
          <div><dt>Report ID</dt><dd>{report.reportId}</dd></div>
          <div><dt>Area</dt><dd>{report.area.name}</dd></div>
          <div><dt>Period</dt><dd>{period}</dd></div>
          <div><dt>Generated</dt><dd>{dhakaDateTimeShort(report.generatedAt)} BST</dd></div>
        </dl>
      </header>

      <section className="jr-abstract" aria-labelledby="jr-abs">
        <h2 id="jr-abs">Abstract</h2>
        <p>{report.summary.join(' ')}</p>
        <p className="jr-keywords">
          <b>Scope:</b> {report.topics.map((t) => titleCase(t)).join(', ')} · {report.area.type === 'COUNTRY' ? 'national' : report.area.type.toLowerCase()} level
          {report.query.trust === 'research' ? ' · research-grade observations only' : ''}
        </p>
      </section>

      <section aria-labelledby="jr-m">
        <h2 id="jr-m"><span>{sec++}.</span> Scope and methods</h2>
        <p>
          This brief assembles {included === 1 ? 'one dataset' : `${included} datasets`} for {report.area.name} covering {period}. Every figure is computed directly from the
          records held by Delta Signal at the time of generation; no values are modelled or estimated by this report, and no causes are inferred.
          Dates are calendar dates (UTC).
        </p>
        <Table
          n={c.table()}
          title="Data sources, licences and the period each source describes."
          note="Climate is always the most recent 30-day snapshot, whatever dates are selected."
        >
          <table>
            <thead>
              <tr><th scope="col">Theme</th><th scope="col">Source</th><th scope="col">Licence</th><th scope="col">Data updated</th><th scope="col">Period basis</th></tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.topic}>
                  <th scope="row">{titleCase(s.topic)}</th>
                  <td>{s.name}</td>
                  <td>{s.licence}</td>
                  <td>{s.dataUpdatedAt ? calDate(s.dataUpdatedAt) : 'At generation'}</td>
                  <td>{s.topic === 'climate' ? 'Latest 30 days (snapshot)' : s.topic === 'emissions' ? 'Calendar years in range' : 'Observation date in range'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      </section>

      <section aria-labelledby="jr-r">
        <h2 id="jr-r"><span>{sec++}.</span> Results</h2>
        {(() => {
          let sub = 1;
          const R = sec - 1;
          return (
            <>
              {climate && (
                <section aria-labelledby="jr-c">
                  <h3 id="jr-c">{R}.{sub++} Climate</h3>
                  {climate.available ? (
                    <>
                      <p>
                        {climate.coverage.reportingDistricts > 1
                          ? <>Across {climate.coverage.reportingDistricts} of {climate.coverage.totalDistricts} districts, the mean temperature was </>
                          : <>In this district the mean temperature was </>}
                        <b>{fmt(climate.statistics[0]?.mean)} {climate.statistics[0]?.unit}</b>
                        {climate.statistics[0]?.n > 1 && <> (district range {fmt(climate.statistics[0].min)}–{fmt(climate.statistics[0].max)} {climate.statistics[0].unit})</>}, with a{climate.coverage.reportingDistricts > 1 ? ' mean' : ''} 30-day precipitation total of{' '}
                        <b>{fmt(climate.statistics[1]?.mean, 0)} mm</b>. These describe the latest 30-day window{climate.updatedAt ? ` (updated ${calDate(climate.updatedAt)})` : ''}, not the selected dates.
                      </p>
                      <Table
                        n={c.table()}
                        title={`Climate summary for ${pluralize(climate.coverage.reportingDistricts, 'reporting district')}, latest rolling 30 days.`}
                        note="Mean is the unweighted mean of district values; minimum and maximum are the lowest and highest district values."
                      >
                        <table>
                          <thead>
                            <tr><th scope="col">Measure</th><th scope="col" className="jr-num">Mean</th><th scope="col" className="jr-num">Min</th><th scope="col" className="jr-num">Max</th><th scope="col" className="jr-num">n</th><th scope="col">Unit</th></tr>
                          </thead>
                          <tbody>
                            {climate.statistics.map((s) => (
                              <tr key={s.key}>
                                <th scope="row">{s.label}</th>
                                <td className="jr-num">{fmt(s.mean)}</td>
                                <td className="jr-num">{fmt(s.min)}</td>
                                <td className="jr-num">{fmt(s.max)}</td>
                                <td className="jr-num">{s.n}</td>
                                <td>{s.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Table>
                      {climate.districts.length > 1 && !longDistrictTable && (
                        <DistrictTable n={c.table()} districts={climate.districts} />
                      )}
                      {longDistrictTable && <p>District-level values are given in Appendix A.</p>}
                    </>
                  ) : (
                    <p className="jr-empty">No recent climate data is available for this area.</p>
                  )}
                </section>
              )}

              {biodiversity && (
                <section aria-labelledby="jr-b">
                  <h3 id="jr-b">{R}.{sub++} Biodiversity</h3>
                  {biodiversity.coverage.occurrenceRecords > 0 ? (
                    <>
                      <p>
                        GBIF holds <b>{int(biodiversity.coverage.occurrenceRecords)}</b> dated occurrence records in the selected period, representing{' '}
                        <b>{int(biodiversity.coverage.speciesRecorded)}</b> species. Counts reflect sampling effort and do not estimate abundance.
                      </p>
                      <Figure
                        n={c.figure()}
                        title="Species with the most occurrence records in the selected period."
                        note="Bars show record counts, not population size."
                      >
                        <BarChart
                          label="Most recorded species"
                          unit="records"
                          items={biodiversity.species.slice(0, 10).map((s) => ({ label: s.commonName ?? s.scientificName, value: s.records }))}
                        />
                      </Figure>
                      <Table n={c.table()} title="Occurrence records and species by kingdom.">
                        <table>
                          <thead><tr><th scope="col">Kingdom</th><th scope="col" className="jr-num">Species</th><th scope="col" className="jr-num">Records</th></tr></thead>
                          <tbody>
                            {biodiversity.byKingdom.map((k) => (
                              <tr key={k.kingdom}><th scope="row">{k.kingdom}</th><td className="jr-num">{int(k.species)}</td><td className="jr-num">{int(k.records)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </Table>
                      {!showSpeciesAppendix && <SpeciesTable n={c.table()} species={biodiversity.species} />}
                      {showSpeciesAppendix && <p>The most-recorded species are listed in Appendix {longDistrictTable ? 'B' : 'A'}.</p>}
                    </>
                  ) : (
                    <p className="jr-empty">No dated occurrence records fall within the selected period for this area.</p>
                  )}
                </section>
              )}

              {emissions && (
                <section aria-labelledby="jr-e">
                  <h3 id="jr-e">{R}.{sub++} Emissions</h3>
                  {emissions.available ? (
                    <>
                      <EmissionsText emissions={emissions} />
                      <Figure
                        n={c.figure()}
                        title="Annual national greenhouse gas emissions, Mt CO₂e."
                        note="Lines are distinguished by dash pattern and end label."
                      >
                        <LineChart
                          label="Annual national greenhouse gas emissions by gas"
                          unit="Mt CO₂e"
                          series={emissions.series.map((s) => ({ key: s.key, label: ({ total: 'Total', co2: 'CO₂', ch4: 'CH₄', n2o: 'N₂O' } as Record<string, string>)[s.key] ?? s.label, points: s.points }))}
                        />
                      </Figure>
                      <EmissionsTable n={c.table()} emissions={emissions} />
                    </>
                  ) : (
                    <p className="jr-empty">{emissions.note}</p>
                  )}
                </section>
              )}

              {observations && (
                <section aria-labelledby="jr-o">
                  <h3 id="jr-o">{R}.{sub++} Community observations</h3>
                  <p>
                    <b>{int(observations.coverage.observations)}</b> {observations.trustFilter === 'research' ? 'research-grade' : 'non-flagged'} observation records fall within the selected period.
                    {observations.unverifiedInPeriod > 0 && (
                      <> Of all non-flagged records in the period, <b>{int(observations.unverifiedInPeriod)}</b> have not yet been reviewed.</>
                    )}
                  </p>
                  {observations.byCategory.length > 0 ? (
                    <div className="jr-pair">
                      <Table n={c.table()} title="Records by observation theme.">
                        <table>
                          <thead><tr><th scope="col">Theme</th><th scope="col" className="jr-num">Records</th></tr></thead>
                          <tbody>{observations.byCategory.map((i) => <tr key={i.category}><th scope="row">{titleCase(i.category)}</th><td className="jr-num">{int(i.count)}</td></tr>)}</tbody>
                        </table>
                      </Table>
                      <Table n={c.table()} title="Records by review level, all non-flagged records in the period.">
                        <table>
                          <thead><tr><th scope="col">Review level</th><th scope="col" className="jr-num">Records</th></tr></thead>
                          <tbody>{observations.byTrustLevel.map((i) => <tr key={i.trustLevel}><th scope="row">{titleCase(i.trustLevel)}</th><td className="jr-num">{int(i.count)}</td></tr>)}</tbody>
                        </table>
                      </Table>
                    </div>
                  ) : (
                    <p className="jr-empty">No observation records match the selected period and filter.</p>
                  )}
                  {reviewHref && observations.unverifiedInPeriod > 0 && (
                    <p className="jr-screen-only">
                      <Link href={reviewHref}>Review the unverified observations →</Link>
                    </p>
                  )}
                </section>
              )}
            </>
          );
        })()}
      </section>

      <section aria-labelledby="jr-l">
        <h2 id="jr-l"><span>{sec++}.</span> Limitations and data quality</h2>
        <ol className="jr-list">
          {[...report.limitations, ...report.methods.notes].map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="jr-ci">
        <h2 id="jr-ci"><span>{sec++}.</span> How to cite</h2>
        <p className="jr-citation">{citation}</p>
        <p>The report ID identifies the query. Re-running the same query on unchanged data returns the same ID; if the underlying data have been updated since {calDate(report.generatedAt)}, values may differ.</p>
      </section>

      <section aria-labelledby="jr-refs">
        <h2 id="jr-refs">References</h2>
        <ol className="jr-refs">
          {sources.map((s) => (
            <li key={s.topic}>
              {s.name}. {s.description}. Licence: {s.licence}.{s.url ? ` ${s.url}` : ''}
            </li>
          ))}
        </ol>
      </section>

      {(longDistrictTable || showSpeciesAppendix) && (
        <section className="jr-appendix" aria-labelledby="jr-app">
          <h2 id="jr-app">Appendices</h2>
          {longDistrictTable && climate && (
            <>
              <h3>Appendix A. Climate by district</h3>
              <DistrictTable n={c.table()} districts={climate.districts} />
            </>
          )}
          {showSpeciesAppendix && biodiversity && (
            <>
              <h3>Appendix {longDistrictTable ? 'B' : 'A'}. Species records</h3>
              <SpeciesTable n={c.table()} species={biodiversity.species} truncated={biodiversity.speciesListTruncated} total={biodiversity.coverage.speciesRecorded} />
            </>
          )}
        </section>
      )}

      <footer className="jr-foot">
        Report {report.reportId} · generated {report.generatedAt} · {report.area.name} · {period}
      </footer>
    </article>
  );
}

function DistrictTable({ n, districts }: { n: number; districts: NonNullable<EcoBrief['sections']['climate']>['districts'] }) {
  return (
    <Table n={n} title="Latest 30-day climate values by district." note="Temperature in °C, rainfall in mm over 30 days, humidity in %, PM2.5 in µg/m³ (30-day mean; no air-quality category applies).">
      <table>
        <thead>
          <tr><th scope="col">District</th><th scope="col" className="jr-num">Temp.</th><th scope="col" className="jr-num">Min</th><th scope="col" className="jr-num">Max</th><th scope="col" className="jr-num">Rain</th><th scope="col" className="jr-num">Humidity</th><th scope="col" className="jr-num">PM2.5</th></tr>
        </thead>
        <tbody>
          {districts.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.name}</th>
              <td className="jr-num">{fmt(d.temperature)}</td>
              <td className="jr-num">{fmt(d.temperatureMin)}</td>
              <td className="jr-num">{fmt(d.temperatureMax)}</td>
              <td className="jr-num">{fmt(d.rainfall, 0)}</td>
              <td className="jr-num">{fmt(d.humidity, 0)}</td>
              <td className="jr-num">{fmt(d.pm25, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}

function SpeciesTable({
  n,
  species,
  truncated,
  total,
}: {
  n: number;
  species: NonNullable<EcoBrief['sections']['biodiversity']>['species'];
  truncated?: boolean;
  total?: number;
}) {
  return (
    <Table
      n={n}
      title="Species with occurrence records in the selected period, most recorded first."
      note={truncated && total ? `The ${int(species.length)} most-recorded of ${int(total)} species are listed; the full table is in the CSV and JSON downloads.` : undefined}
    >
      <table>
        <thead>
          <tr><th scope="col">Species</th><th scope="col">Kingdom</th><th scope="col">Family</th><th scope="col" className="jr-num">Records</th><th scope="col">First</th><th scope="col">Last</th></tr>
        </thead>
        <tbody>
          {species.map((s) => (
            <tr key={s.scientificName}>
              <th scope="row"><em>{s.scientificName}</em>{s.commonName ? <span className="jr-sub"> {s.commonName}</span> : null}</th>
              <td>{s.kingdom ?? '—'}</td>
              <td>{s.family ?? '—'}</td>
              <td className="jr-num">{int(s.records)}</td>
              <td>{s.firstObserved ?? '—'}</td>
              <td>{s.lastObserved ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}

function EmissionsText({ emissions }: { emissions: NonNullable<EcoBrief['sections']['emissions']> }) {
  const pts = emissions.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  if (first.year === last.year) {
    return <p>The national estimate for {first.year} is <b>{fmt(first.value)} {first.unit}</b> of total greenhouse gases.</p>;
  }
  const change = first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : null;
  return (
    <p>
      The national total rose from <b>{fmt(first.value)}</b> to <b>{fmt(last.value)} {last.unit}</b> between {first.year} and {last.year}
      {change != null && <> (a change of {change >= 0 ? '+' : ''}{fmt(change)}%)</>}. Estimates are national and cannot be attributed to a region.
    </p>
  );
}

function EmissionsTable({ n, emissions }: { n: number; emissions: NonNullable<EcoBrief['sections']['emissions']> }) {
  const years = [...new Set(emissions.series.flatMap((s) => s.points.map((p) => p.year)))].sort((a, b) => a - b);
  return (
    <Table n={n} title="Annual national emissions by gas, Mt CO₂e (AR5 global warming potentials).">
      <table>
        <thead>
          <tr><th scope="col">Year</th>{emissions.series.map((s) => <th key={s.key} scope="col" className="jr-num">{s.label}</th>)}</tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <th scope="row">{y}</th>
              {emissions.series.map((s) => <td key={s.key} className="jr-num">{fmt(s.points.find((p) => p.year === y)?.value)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}
