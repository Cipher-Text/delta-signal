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
  sentence: string;
  forecastTime: string | null;
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
    const sentence =
      highCount > 0
        ? `River discharge at monitored stations shows ${highCount} station${highCount > 1 ? 's' : ''} at a high discharge signal.`
        : elevatedCount > 0
          ? `River discharge at monitored stations shows ${elevatedCount} station${elevatedCount > 1 ? 's' : ''} elevated above the historical reference.`
          : `River discharge at monitored stations is at the historical reference (${averageRatio.toFixed(1)}×).`;

    const forecastTime = forecasts
      .map((f) => f.forecastDate)
      .sort()
      .at(-1) ?? null;

    return { sentence, forecastTime };
  } catch {
    return null;
  }
}

function ThermometerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3s6 6.8 6 11a6 6 0 1 1-12 0c0-4.2 6-11 6-11Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12.3 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 21.5 20h-19Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default async function HeroSection() {
  const [weather, activeAlerts, river] = await Promise.all([
    loadWeather(),
    loadActiveAlerts(),
    loadRiverStatus(),
  ]);

  const hasEmergency = (activeAlerts ?? 0) > 0;
  const observedLabel = weather?.observedAt
    ? `Observed · ${new Date(weather.observedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} BST (UTC+6)`
    : null;
  const checkedLabel = river?.forecastTime
    ? new Date(river.forecastTime).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <section className="public-hero" aria-label="Delta Signal">
      <div className="public-hero-layout">
        <div className="public-hero-copy">
          <p className="eyebrow">Bangladesh · Environmental data</p>
          <h1>Understand Bangladesh’s environment, place by place.</h1>
          <p className="public-hero-description hero-description-full">
            Weather, rivers, air quality and biodiversity for every division and district —
            with the source and update time on every number.
          </p>
          <p className="public-hero-description hero-description-short">
            Weather, rivers, air quality and biodiversity for every district — with the source on every number.
          </p>

          <div className="button-row">
            <Link className="button" href="/map">
              Explore the map <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button ghost" href="/data">
              Browse datasets
            </Link>
          </div>

          <p className="hero-open-note">
            Independent public platform — not a government service. Data from Open-Meteo, GloFAS and GBIF.
          </p>
        </div>

        {(weather || activeAlerts !== null || river) && (
          <aside className="hero-now-card" aria-label="Right now">
            <div className="hero-now-header">
              <h2>Right now</h2>
              {observedLabel && <span className="hero-now-observed">{observedLabel}</span>}
            </div>

            {weather && (
              <div className="hero-now-rows">
                <div className="hero-now-row">
                  <span className="hero-now-icon hero-now-icon--hot"><ThermometerIcon /></span>
                  <div className="hero-now-row-text">
                    <span className="hero-now-row-label">Hottest district</span>
                    <strong className="hero-now-row-name">{weather.hottest.district}</strong>
                  </div>
                  <div className="hero-now-row-value">
                    <strong>{weather.hottest.temp.toFixed(1)}</strong> <span>°C</span>
                  </div>
                </div>

                <div className="hero-now-row">
                  <span className="hero-now-icon hero-now-icon--cool"><ThermometerIcon /></span>
                  <div className="hero-now-row-text">
                    <span className="hero-now-row-label">Coolest district</span>
                    <strong className="hero-now-row-name">{weather.coolest.district}</strong>
                  </div>
                  <div className="hero-now-row-value">
                    <strong>{weather.coolest.temp.toFixed(1)}</strong> <span>°C</span>
                  </div>
                </div>

                <div className="hero-now-row">
                  <span className="hero-now-icon hero-now-icon--rain"><DropletIcon /></span>
                  <div className="hero-now-row-text">
                    <span className="hero-now-row-label">Rain reported</span>
                    <strong className="hero-now-row-name">Across the country</strong>
                  </div>
                  <div className="hero-now-row-value">
                    <strong>{weather.rainingCount}</strong> <span>districts</span>
                  </div>
                </div>
              </div>
            )}

            {(activeAlerts !== null || river) && (
              <div className={`hero-now-alert${hasEmergency ? ' is-warning' : ' is-ok'}`}>
                <span className="hero-now-alert-icon" aria-hidden="true">
                  {hasEmergency ? <AlertIcon /> : <CheckCircleIcon />}
                </span>
                <div>
                  <strong>
                    {activeAlerts === null
                      ? 'Alert status unavailable'
                      : hasEmergency
                        ? `${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''}`
                        : 'No active alerts'}
                  </strong>
                  {river && (
                    <p>
                      {river.sentence}
                      {checkedLabel ? ` Forecast · GloFAS · checked ${checkedLabel}` : ' Forecast · GloFAS'}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="hero-now-footer">
              <span>Source: Open-Meteo · Coverage: Bangladesh</span>
              <Link href="/map">All conditions →</Link>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
