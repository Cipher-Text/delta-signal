import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { routes, type MarineForecast } from '@delta-signal/contracts';
import { calendarDay, dhakaToday } from '../../../lib/format';
import { canonicalDivision } from '../../../lib/alerts';
import { COAST_ORDER, SEA_LEGEND, round1, seaState, travelDirection } from '../../../lib/marine';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import EmptyState from '../../../components/empty-state';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

const MIN_CHART_SCALE_M = 1.5;

type Row = {
  id: string;
  districtId: string;
  name: string;
  missing: boolean;
  wave: number;
  swell: number;
  period: number | null;
  sst: number | null;
  state: ReturnType<typeof seaState>;
  waveDir: ReturnType<typeof travelDirection>;
  swellDir: ReturnType<typeof travelDirection>;
};

const rank = (name: string) => {
  const i = COAST_ORDER.indexOf(name);
  return i === -1 ? COAST_ORDER.length : i;
};

function Arrow({ rotation }: { rotation: number }) {
  return (
    <span className="mar-arrow" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </span>
  );
}

/** Marine forecast for one day: wave-height chart along the coast plus a per-district table (Web UI Reference). */
export default async function MarinePage(props: { searchParams: Promise<{ date?: string; districtId?: string }> }) {
  const sp = await props.searchParams;

  const days = await apiGet<string[]>(routes.marine.forecastDays, 300).catch(() => [] as string[]);
  const date = sp.date && days.includes(sp.date) ? sp.date : days[0];

  const forecasts = date
    ? await apiGet<MarineForecast[]>(`${routes.marine.forecast}?date=${date}`, 300).catch(() => [] as MarineForecast[])
    : [];

  if (!date || forecasts.length === 0) {
    return (
      <>
        <PageHeader title="Marine forecast" description="Daily wave, swell and sea conditions for coastal districts of Bangladesh." />
        <EmptyState title="No marine forecast available" description="Forecasts appear here after the daily Open-Meteo Marine sync." />
      </>
    );
  }

  const all: Row[] = forecasts
    .map((f): Row => {
      const name = canonicalDivision(f.district?.name ?? f.districtId);
      const missing = f.waveHeightMax == null;
      const wave = missing ? 0 : round1(f.waveHeightMax as number);
      return {
        id: f.id,
        districtId: f.districtId,
        name,
        missing,
        wave,
        swell: f.swellWaveHeightMax == null ? 0 : round1(f.swellWaveHeightMax),
        period: f.wavePeriodMax,
        sst: f.seaSurfaceTemp,
        state: seaState(wave),
        waveDir: travelDirection(f.waveDirectionDominant, 'Waves'),
        swellDir: travelDirection(f.swellWaveDirectionDominant, 'Swell'),
      };
    })
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));

  const districtId = all.some((r) => r.districtId === sp.districtId) ? sp.districtId : undefined;
  const scope = districtId ? all.filter((r) => r.districtId === districtId) : all;
  const rows = scope.filter((r) => !r.missing);
  const missingNames = scope.filter((r) => r.missing).map((r) => r.name);
  const hasSst = rows.some((r) => r.sst != null);
  const chartScale = Math.max(MIN_CHART_SCALE_M, ...rows.map((r) => r.wave));
  const today = dhakaToday();
  const day = calendarDay(date);
  const rowHref = (id: string) => `/marine?date=${date}&districtId=${id}`;
  const dayHref = (d: string) => `/marine?date=${d}${districtId ? `&districtId=${districtId}` : ''}`;

  const footnote = `Arrows show the dominant direction waves travel toward.${hasSst ? '' : ' Sea surface temperature is not shown because no values were returned for these points.'}`;

  return (
    <>
      <PageHeader
        title="Marine forecast"
        description="Daily wave, swell and sea conditions for coastal districts of Bangladesh."
        action={
          <div className="mar-source">
            <span className="mar-badge">Forecast</span>
            <span className="mar-source-long">Source: Open-Meteo Marine</span>
            <span className="mar-source-short">Open-Meteo Marine</span>
          </div>
        }
      />

      <div className="mar-controls">
        <div className="mar-days-wrap">
          <span className="mar-label">Forecast day</span>
          <nav className="mar-days" aria-label="Forecast day">
            {days.slice(0, 7).map((d) => {
              const cd = calendarDay(d);
              return (
                <Link key={d} href={dayHref(d)} aria-current={d === date ? 'true' : undefined}>
                  <strong>{d === today ? 'Today' : cd.weekdayShort}</strong>
                  <span>{cd.short}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <form method="get" className="mar-district">
          <input type="hidden" name="date" value={date} />
          <label>
            <span className="mar-label">District</span>
            <AutoSubmitSelect name="districtId" className="select-field" defaultValue={districtId ?? ''}>
              <option value="">All coastal districts</option>
              {all.map((r) => <option key={r.districtId} value={r.districtId}>{r.name}</option>)}
            </AutoSubmitSelect>
          </label>
          <noscript><button type="submit" className="button">Apply</button></noscript>
        </form>
      </div>

      <div className="mar-layout">
        <section className="mar-card mar-chart" aria-labelledby="mar-coast-h">
          <div className="mar-card-head">
            <h2 id="mar-coast-h">Max wave height along the coast</h2>
            <span>West to east · {day.long}</span>
          </div>
          <div className="mar-bars" role="img" aria-label={`Bar chart of maximum wave height by coastal district for ${day.long}`}>
            {scope.map((r) => (
              <div key={r.districtId} className="mar-bar-row">
                <span className="mar-bar-name">{r.name}</span>
                <span className="mar-bar-track">
                  {!r.missing && (
                    <span className={`mar-fill mar-lvl-${r.state.level}`} style={{ width: `${Math.max(2, Math.round((r.wave / chartScale) * 100))}%` }} />
                  )}
                </span>
                <span className={`mar-bar-val${r.missing ? ' mar-muted' : ''}`}>{r.missing ? 'No data' : `${r.wave.toFixed(1)} m`}</span>
              </div>
            ))}
          </div>
          <div className="mar-legend">
            {SEA_LEGEND.map((g) => (
              <span key={g.level}><i className={`mar-swatch mar-lvl-${g.level}`} />{g.label}</span>
            ))}
          </div>
          <p className="mar-note">Sea state follows the WMO scale (code 3700) applied to maximum wave height.</p>
        </section>

        <section className="mar-card mar-table-card" aria-labelledby="mar-table-h">
          <div className="mar-card-head mar-card-head--row">
            <h2 id="mar-table-h">Forecast for {day.long}</h2>
            <span>{rows.length === 1 ? '1 district' : `${rows.length} districts`}</span>
          </div>

          <div className={`mar-table${hasSst ? ' mar-table--sst' : ''}`} role="table" aria-label="Marine forecast by district">
            <div className="mar-row mar-row--head" role="row">
              <div role="columnheader">District</div>
              <div role="columnheader">Sea state</div>
              <div role="columnheader" className="mar-num">Max wave height</div>
              <div role="columnheader" className="mar-num">Max swell height</div>
              <div role="columnheader" className="mar-num">Max wave period</div>
              {hasSst && <div role="columnheader" className="mar-num">Sea temp</div>}
              <div role="columnheader" aria-hidden="true" />
            </div>
            {rows.map((r) => (
              <Link key={r.id} className="mar-row" role="row" href={rowHref(r.districtId)}>
                <div role="cell" className="mar-name">
                  {r.name}
                  <span className="mar-sub">Swell {r.swell.toFixed(1)} m · Period {r.period != null ? r.period.toFixed(1) : '—'} s</span>
                </div>
                <div role="cell" className="mar-state">
                  <span className="mar-pill"><i className={`mar-swatch mar-lvl-${r.state.level}`} />{r.state.label}</span>
                </div>
                <div role="cell" className="mar-num mar-dir">
                  {r.waveDir && <span title={r.waveDir.label}><Arrow rotation={r.waveDir.rotation} /></span>}
                  {r.waveDir && <small>{r.waveDir.point}</small>}
                  <strong>{r.wave.toFixed(1)} m</strong>
                </div>
                <div role="cell" className="mar-num mar-dir mar-col-swell">
                  {r.swellDir && <span title={r.swellDir.label}><Arrow rotation={r.swellDir.rotation} /></span>}
                  {r.swellDir && <small>{r.swellDir.point}</small>}
                  <span>{r.swell.toFixed(1)} m</span>
                </div>
                <div role="cell" className="mar-num mar-col-period">{r.period != null ? r.period.toFixed(1) : '—'} s</div>
                {hasSst && <div role="cell" className="mar-num mar-col-sst">{r.sst != null ? `${r.sst.toFixed(1)} °C` : '—'}</div>}
                <div role="cell" className="mar-chev" aria-hidden="true"><NavIcon name="chevron" /></div>
              </Link>
            ))}
          </div>

          {missingNames.length > 0 && (
            <div className="mar-missing">
              <NavIcon name="help" />
              <span>
                <b>No marine values for {missingNames.join(' and ')}.</b> The forecast returned empty values for these monitoring points.
              </span>
            </div>
          )}
          <p className="mar-footnote">{footnote}</p>
        </section>
      </div>
      <p className="mar-foot-mobile">Sea state uses the WMO scale on maximum wave height. Arrows show where waves travel toward.</p>
    </>
  );
}
