import { apiGet } from '../../../lib/api';
import { routes, type NationalEmissionReading, type EmissionIndicator } from '@delta-signal/contracts';

const INDICATOR_LABEL: Record<string, string> = {
  'EN.GHG.ALL.MT.CE.AR5': 'Total GHG',
  'EN.GHG.CO2.MT.CE.AR5': 'CO₂',
  'EN.GHG.CH4.MT.CE.AR5': 'CH₄',
  'EN.GHG.N2O.MT.CE.AR5': 'N₂O',
};

export default async function EmissionsPage(
  props: {
    searchParams: Promise<{ indicator?: string; from?: string; to?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { indicator, from, to } = searchParams;

  const params = new URLSearchParams();
  if (indicator) params.set('indicator', indicator);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const [readings, indicators] = await Promise.all([
    apiGet<NationalEmissionReading[]>(
      `${routes.emissions.list}${params.toString() ? `?${params.toString()}` : ''}`,
      900,
    ),
    apiGet<EmissionIndicator[]>(routes.emissions.indicators, 3600),
  ]);

  // Group by year for a compact table view (year → indicator → value)
  const years = [...new Set(readings.map((r) => r.year))].sort((a, b) => b - a);
  const indicatorCodes = [...new Set(readings.map((r) => r.indicatorCode))].sort();

  const byYearAndCode = new Map<string, number | null>();
  for (const r of readings) {
    byYearAndCode.set(`${r.year}__${r.indicatorCode}`, r.value);
  }

  const lastUpdated = readings[0]?.updatedAt
    ? new Date(readings[0].updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>National GHG Emissions</h1>
          <p>
            Bangladesh greenhouse gas emissions sourced from the World Bank Climate Change API.
            Values in Mt CO₂e, excluding land-use change (LULUCF).
            {lastUpdated && <span className="muted"> · Last synced {lastUpdated}</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="toolbar" method="get" aria-label="Emission filters">
        <label htmlFor="indicator">Indicator</label>
        <select id="indicator" name="indicator" className="select-field" defaultValue={indicator ?? ''}>
          <option value="">All indicators</option>
          {indicators.map((ind) => (
            <option key={ind.indicatorCode} value={ind.indicatorCode}>
              {INDICATOR_LABEL[ind.indicatorCode] ?? ind.indicatorCode}
            </option>
          ))}
        </select>

        <label htmlFor="from">From year</label>
        <input
          id="from"
          name="from"
          type="number"
          className="select-field"
          style={{ width: 90 }}
          defaultValue={from ?? ''}
          min={1976}
          max={2030}
          placeholder="1976"
        />

        <label htmlFor="to">To year</label>
        <input
          id="to"
          name="to"
          type="number"
          className="select-field"
          style={{ width: 90 }}
          defaultValue={to ?? ''}
          min={1976}
          max={2030}
          placeholder="2024"
        />

        <button type="submit" className="button">Apply</button>
        {(indicator || from || to) && (
          <a className="button ghost" href="/emissions">Reset</a>
        )}
      </form>

      {readings.length === 0 ? (
        <div className="empty-state">No emission data available for this filter.</div>
      ) : (
        <div className="table" role="table" aria-label="GHG emissions">
          <div
            className="table-row table-head"
            role="row"
            style={{ gridTemplateColumns: `80px repeat(${indicatorCodes.length}, 1fr)` }}
          >
            <span>Year</span>
            {indicatorCodes.map((code) => (
              <span key={code}>{INDICATOR_LABEL[code] ?? code}</span>
            ))}
          </div>

          {years.map((year) => (
            <div
              key={year}
              className="table-row"
              role="row"
              style={{ gridTemplateColumns: `80px repeat(${indicatorCodes.length}, 1fr)` }}
            >
              <strong>{year}</strong>
              {indicatorCodes.map((code) => {
                const val = byYearAndCode.get(`${year}__${code}`);
                return (
                  <span key={code} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {val !== undefined && val !== null ? val.toFixed(1) : '—'}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>
        Source: World Bank Climate Change API · Indicator codes: {indicatorCodes.join(', ')}
      </p>
    </>
  );
}
