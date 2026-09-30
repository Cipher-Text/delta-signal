import Link from 'next/link';
import {
  routes,
  type CurrentWeatherReading,
  type PlatformMetrics,
  type StationFloodForecast,
} from '@delta-signal/contracts';
import { classifyFloodRisk } from '@delta-signal/shared';
import { apiGet } from '../lib/api';

interface WeatherSnapshot {
  hottest: { district: string; temp: number };
  coolest: { district: string; temp: number };
  rainingCount: number;
  totalDistricts: number;
  observedAt: string | null;
}

async function loadWeather(): Promise<WeatherSnapshot | null> {
  try {
    const readings = await apiGet<CurrentWeatherReading[]>(routes.weather.current, 900);
    const withTemp = readings.filter(
      (r): r is CurrentWeatherReading & { temperature2m: number; district: { name: string } } =>
        r.temperature2m !== null && Boolean(r.district),
    );
    if (withTemp.length === 0) return null;

    const hottest = withTemp.reduce((a, b) => (a.temperature2m > b.temperature2m ? a : b));
    const coolest = withTemp.reduce((a, b) => (a.temperature2m < b.temperature2m ? a : b));
    const observedAt = readings
      .map((r) => r.readingTime)
      .sort()
      .at(-1) ?? null;

    return {
      hottest: { district: hottest.district.name, temp: hottest.temperature2m },
      coolest: { district: coolest.district.name, temp: coolest.temperature2m },
      rainingCount: readings.filter((r) => (r.precipitation ?? 0) > 0).length,
      totalDistricts: readings.length,
      observedAt,
    };
  } catch {
    return null;
  }
}

async function loadActiveAlerts(): Promise<number | null> {
  try {
    const metrics = await apiGet<PlatformMetrics>(routes.metrics.platform);
    return metrics.activeAlerts;
  } catch {
    return null;
  }
}

interface RiverStatus {
  label: string;
  averageRatio: number;
  forecastDate: string | null;
}

async function loadRiverStatus(): Promise<RiverStatus | null> {
  try {
    const forecasts = await apiGet<StationFloodForecast[]>(routes.flood.forecast);
    if (forecasts.length === 0) return null;

    const latestByStation = new Map<string, StationFloodForecast>();
    for (const f of forecasts) {
      const existing = latestByStation.get(f.stationId);
      if (!existing || new Date(f.forecastDate) > new Date(existing.forecastDate)) {
        latestByStation.set(f.stationId, f);
      }
    }

    const ratios: number[] = [];
    let highCount = 0;
    let elevatedCount = 0;
    for (const f of latestByStation.values()) {
      if (f.riverDischarge == null || f.riverDischargeMean == null || f.riverDischargeMean <= 0) continue;
      ratios.push(f.riverDischarge / f.riverDischargeMean);
      const risk = classifyFloodRisk(f.riverDischarge, f.riverDischargeMean, f.riverDischargeP75);
      if (risk === 'HIGH') highCount++;
      else if (risk === 'ELEVATED') elevatedCount++;
    }
    if (ratios.length === 0) return null;

    const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    const label =
      highCount > 0
        ? `${highCount} station${highCount > 1 ? 's' : ''} showing a high discharge signal`
        : elevatedCount > 0
          ? `${elevatedCount} station${elevatedCount > 1 ? 's' : ''} showing elevated discharge`
          : `At the historical reference (${averageRatio.toFixed(1)}×)`;

    const forecastDate = forecasts
      .map((f) => f.forecastDate)
      .sort()
      .at(-1) ?? null;

    return { label, averageRatio, forecastDate };
  } catch {
    return null;
  }
}

export default async function RightNowSection() {
  const [weather, activeAlerts, river] = await Promise.all([
    loadWeather(),
    loadActiveAlerts(),
    loadRiverStatus(),
  ]);

  if (!weather && activeAlerts === null && !river) return null;

  return (
    <section className="right-now public-section" aria-label="Current conditions across Bangladesh">
      <div className="section-intro">
        <p className="eyebrow">Live snapshot</p>
        <h2>Right now</h2>
      </div>

      <div className="rightnow-grid">
        {weather && (
          <>
            <article className="metric">
              <span>Hottest district</span>
              <strong>{weather.hottest.temp.toFixed(1)}°C</strong>
              <small>{weather.hottest.district}</small>
            </article>
            <article className="metric">
              <span>Coolest district</span>
              <strong>{weather.coolest.temp.toFixed(1)}°C</strong>
              <small>{weather.coolest.district}</small>
            </article>
            <article className="metric">
              <span>Rain reported</span>
              <strong>{weather.rainingCount}</strong>
              <small>of {weather.totalDistricts} districts</small>
            </article>
          </>
        )}

        {activeAlerts !== null && (
          <Link href="/alerts" className="metric metric-link">
            <span>Alerts</span>
            <strong>{activeAlerts}</strong>
            <small>{activeAlerts > 0 ? 'Active alerts — review →' : 'No active alerts'}</small>
          </Link>
        )}

        {river && (
          <article className="metric">
            <span>River discharge</span>
            <strong>{river.averageRatio.toFixed(1)}×</strong>
            <small>{river.label}</small>
          </article>
        )}
      </div>

      <p className="rightnow-footnote">
        {weather?.observedAt
          ? `Observed · ${new Date(weather.observedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
          : 'Observed conditions'}
        {' · Forecast · GloFAS'}
        {river?.forecastDate ? ` · checked ${new Date(river.forecastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
        {' · Source: Open-Meteo · Coverage: Bangladesh'}
      </p>
    </section>
  );
}
