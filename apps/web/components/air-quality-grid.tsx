import Link from 'next/link';
import { routes, type DistrictWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

// US EPA PM2.5 breakpoints (2024 revision)
function aqiClass(pm25: number): {
  label: string;
  css: string;
  advice: string;
} {
  if (pm25 <= 9.0)   return { label: 'Good',                          css: 'aqi-good',           advice: 'Air is clean' };
  if (pm25 <= 35.4)  return { label: 'Moderate',                      css: 'aqi-moderate',       advice: 'Acceptable' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy for sensitive groups', css: 'aqi-sensitive',      advice: 'Sensitive groups: limit outdoors' };
  if (pm25 <= 125.4) return { label: 'Unhealthy',                     css: 'aqi-unhealthy',      advice: 'Reduce outdoor exertion' };
  if (pm25 <= 225.4) return { label: 'Very unhealthy',                css: 'aqi-very-unhealthy', advice: 'Avoid outdoor exertion' };
  return               { label: 'Hazardous',                          css: 'aqi-hazardous',      advice: 'Stay indoors' };
}

export default async function AirQualityGrid() {
  let districts: DistrictWithClimate[] = [];
  let isLive = true;
  try {
    districts = await apiGet<DistrictWithClimate[]>(routes.locations.districts);
  } catch {
    isLive = false;
  }

  const withAqi = districts
    .filter((d): d is DistrictWithClimate & { avgPm25_30d: number } => d.avgPm25_30d != null)
    .sort((a, b) => b.avgPm25_30d - a.avgPm25_30d);

  const topDistricts = withAqi.slice(0, 5);

  return (
    <section className="aqi-section public-section" aria-label="Air quality ranking by district">
      <div className="aqi-section-header">
        <div>
          <p className="eyebrow">Modeled · 30-day average PM2.5</p>
          <h2>Air quality</h2>
          <p className="aqi-summary">
            {!isLive
              ? 'Air-quality data is temporarily unavailable.'
              : withAqi.length === 0
                ? 'No district air-quality summaries are available yet.'
                : 'Districts with the highest fine particulate matter (PM2.5)'}
          </p>
        </div>
      </div>

      {withAqi.length > 0 && <div className="aqi-ranking">
          {topDistricts.map((d, i) => {
          const aqi = aqiClass(d.avgPm25_30d);
          const barWidth = Math.min(100, (d.avgPm25_30d / 250) * 100);
          return (
            <div key={d.id} className={`aqi-row ${aqi.css}-border`} aria-label={`${d.name}: ${d.avgPm25_30d.toFixed(0)} µg/m³, ${aqi.label}`}>
              <span className="aqi-rank">#{i + 1}</span>
              <div className="aqi-row-main">
                <div className="aqi-row-top">
                  <strong className="aqi-district-name">{d.name}</strong>
                  {d.division?.name && (
                    <span className="aqi-division">{d.division.name}</span>
                  )}
                  <span className={`aqi-badge ${aqi.css}`}>{aqi.label}</span>
                </div>
                <div className="aqi-bar-track" title={aqi.advice}>
                  <div
                    className={`aqi-bar-fill ${aqi.css}-fill`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="aqi-value">{d.avgPm25_30d.toFixed(0)} µg/m³</span>
              </div>
            </div>
          );
        })}
      </div>}
      {withAqi.length === 0 && <div className="empty-state" role="status">{isLive ? 'No district PM2.5 summaries are available yet.' : 'Air-quality data is temporarily unavailable.'}</div>}

      <div className="aqi-footer">
        <div className="aqi-legend">
          {([
            ['aqi-good', 'Good 0–9.0'],
            ['aqi-moderate', 'Moderate 9.1–35.4'],
            ['aqi-sensitive', 'Sensitive groups 35.5–55.4'],
            ['aqi-unhealthy', 'Unhealthy 55.5–125.4'],
            ['aqi-very-unhealthy', 'Very unhealthy 125.5–225.4'],
            ['aqi-hazardous', 'Hazardous 225.5+'],
          ] as [string, string][]).map(([cls, label]) => (
            <span key={cls} className="aqi-legend-item">
              <span className={`aqi-swatch ${cls}-fill`} />
              {label}
            </span>
          ))}
        </div>
        <p className="aqi-legend-note">
          Scale: US EPA PM2.5 (2024) · Sensitive groups: children, older adults, people with respiratory conditions
        </p>
      </div>

      <Link href="/locations" className="button ghost aqi-cta">
        All 64 districts →
      </Link>
    </section>
  );
}
