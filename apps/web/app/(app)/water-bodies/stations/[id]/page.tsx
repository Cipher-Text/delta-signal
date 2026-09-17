import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../../lib/api';
import {
  routes,
  type StationLatestReadingResponse,
  type StationFloodForecast,
  type WaterLevelThresholdStatus,
  type WaterLevelTrend,
} from '@delta-signal/contracts';
import { classifyFloodRisk } from '@delta-signal/shared';
import { relativeTime } from '../../../../../lib/format';

const STATUS_TAG: Record<NonNullable<WaterLevelThresholdStatus>, string> = {
  NORMAL: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
};

const TREND_LABEL: Record<NonNullable<WaterLevelTrend>, string> = {
  RISING: '↑ Rising',
  FALLING: '↓ Falling',
  STEADY: '→ Steady',
};

const RISK_TAG = { HIGH: 'danger', ELEVATED: 'warning' } as const;

function fmt(n: number | null, decimals = 2): string {
  return n !== null ? n.toFixed(decimals) : '—';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function StationDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [latestRes, forecasts] = await Promise.all([
    apiGet<StationLatestReadingResponse>(routes.flood.stationLatest(params.id), 300).catch(
      () => null,
    ),
    apiGet<StationFloodForecast[]>(routes.flood.forecastByStation(params.id), 3600).catch(
      () => [] as StationFloodForecast[],
    ),
  ]);

  if (!latestRes) notFound();

  const { station, latestReading, thresholdStatus } = latestRes;
  const currentForecast = [...forecasts].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))[0] ?? null;
  const forecastRisk = currentForecast
    ? classifyFloodRisk(currentForecast.riverDischarge, currentForecast.riverDischargeMean, currentForecast.riverDischargeP75)
    : null;
  const forecastRatio = currentForecast?.riverDischarge != null && currentForecast.riverDischargeMean
    ? currentForecast.riverDischarge / currentForecast.riverDischargeMean
    : null;
  const hasThresholds =
    station.dangerLevel !== null ||
    station.warningLevel !== null ||
    station.normalLevel !== null;

  return (
    <>
      <Link className="back-link" href="/water-bodies/stations">
        ← All stations
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          {station.tidalStatus && <span className="tag muted">{station.tidalStatus}</span>}
          {station.district && <span className="tag muted">{station.district.name}</span>}
        </div>
        <h1>{station.name}</h1>
        <div className="report-detail-meta">
          <span>{station.stationCode}</span>
          {station.riverName && <span>{station.riverName}</span>}
          <span>Station #{station.serial}</span>
        </div>
      </div>

      {/* Current reading */}
      <article className="panel">
        <h2>Current Reading</h2>
        {latestReading ? (
          <div className="obs-detail-grid">
            <div className="obs-detail-row">
              <span>Status</span>
              <strong>
                <span className={`tag ${STATUS_TAG[thresholdStatus!]}`}>{thresholdStatus}</span>
              </strong>
            </div>
            <div className="obs-detail-row">
              <span>Water level</span>
              <strong>{fmt(latestReading.waterLevel)} m</strong>
            </div>
            {latestReading.discharge !== null && (
              <div className="obs-detail-row">
                <span>Discharge</span>
                <strong>{fmt(latestReading.discharge)} m³/s</strong>
              </div>
            )}
            {latestReading.trend && (
              <div className="obs-detail-row">
                <span>Trend</span>
                <strong>{TREND_LABEL[latestReading.trend] ?? latestReading.trend}</strong>
              </div>
            )}
            {currentForecast && (
              <div className="obs-detail-row">
                <span>Forecast signal</span>
                <strong>
                  {forecastRisk ? <span className={`tag ${RISK_TAG[forecastRisk]}`}>{forecastRisk}</span> : <span className="tag muted">Within historical range</span>}
                  {forecastRatio != null && <small style={{ marginLeft: 8 }}>{forecastRatio.toFixed(1)}× mean</small>}
                </strong>
              </div>
            )}
            <div className="obs-detail-row">
              <span>Recorded</span>
              <strong>{relativeTime(latestReading.readingAt)}</strong>
            </div>
          </div>
        ) : (
          <p className="text-muted">No observed readings available for this station.</p>
        )}
      </article>

      {/* Alert thresholds */}
      {hasThresholds && (
        <article className="panel">
          <h2>Alert Thresholds</h2>
          <div className="obs-detail-grid">
            {station.normalLevel !== null && (
              <div className="obs-detail-row">
                <span>Normal level</span>
                <strong>{fmt(station.normalLevel)} m</strong>
              </div>
            )}
            {station.warningLevel !== null && (
              <div className="obs-detail-row">
                <span>Warning level</span>
                <strong>
                  <span className="tag warning">{fmt(station.warningLevel)} m</span>
                </strong>
              </div>
            )}
            {station.dangerLevel !== null && (
              <div className="obs-detail-row">
                <span>Danger level</span>
                <strong>
                  <span className="tag danger">{fmt(station.dangerLevel)} m</span>
                </strong>
              </div>
            )}
          </div>
        </article>
      )}

      {/* 30-day flood forecast */}
      <article className="panel">
        <h2>30-Day Flood Forecast</h2>
        {forecasts.length > 0 ? (
          <div className="table" role="table" aria-label="Flood forecast">
            <div className="table-row table-head" role="row">
              <span>Date</span>
              <span>Discharge (m³/s)</span>
              <span>Likely range (P25–P75)</span>
              <span>Extreme range (Min–Max)</span>
            </div>
            {forecasts.map((row) => (
              <div className="table-row" role="row" key={row.id}>
                <span>{fmtDate(row.forecastDate)}</span>
                <span>{fmt(row.riverDischarge, 1)}</span>
                <span>
                  {row.riverDischargeP25 !== null && row.riverDischargeP75 !== null
                    ? `${fmt(row.riverDischargeP25, 1)} – ${fmt(row.riverDischargeP75, 1)}`
                    : '—'}
                </span>
                <span>
                  {row.riverDischargeMin !== null && row.riverDischargeMax !== null
                    ? `${fmt(row.riverDischargeMin, 1)} – ${fmt(row.riverDischargeMax, 1)}`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No forecast data available for this station.</p>
        )}
        <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.85em' }}>
          Source: OpenMeteo GloFAS · Simulated discharge signal, not an official flood warning · Updated every 6 hours
        </p>
      </article>
    </>
  );
}
