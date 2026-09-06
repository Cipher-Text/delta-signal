import Link from 'next/link';
import { routes, type DistrictWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

// WHO PM2.5 AQI breakpoints
function aqiClass(pm25: number): {
  label: string;
  css: string;
  advice: string;
} {
  if (pm25 <= 12)    return { label: 'Good',        css: 'aqi-good',      advice: 'Air is clean' };
  if (pm25 <= 35.4)  return { label: 'Moderate',    css: 'aqi-moderate',  advice: 'Acceptable' };
  if (pm25 <= 55.4)  return { label: 'Unhealthy*',  css: 'aqi-sensitive', advice: 'Sensitive groups: limit outdoors' };
  if (pm25 <= 150.4) return { label: 'Unhealthy',   css: 'aqi-unhealthy', advice: 'Reduce outdoor exertion' };
  return               { label: 'Hazardous',         css: 'aqi-hazardous', advice: 'Stay indoors' };
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

  const median = withAqi.length === 0 ? null : withAqi.length % 2 === 1
    ? withAqi[Math.floor(withAqi.length / 2)].avgPm25_30d
    : (withAqi[withAqi.length / 2 - 1].avgPm25_30d + withAqi[withAqi.length / 2].avgPm25_30d) / 2;

  const topDistricts = withAqi.slice(0, 10);
  const unhealthyCount = withAqi.filter((d) => d.avgPm25_30d > 55.4).length;

  return (
    <section className="aqi-section public-section" aria-label="Air quality ranking by district">
      <div className="aqi-section-header">
        <div>
          <p className="eyebrow">30-Day average PM2.5 · {withAqi.length} districts with data</p>
          <h2>District air quality</h2>
          <p className="aqi-summary">{!isLive ? 'Air-quality data is temporarily unavailable.' : median === null ? 'No district air-quality summaries are available yet.' : <>Median district concentration {median.toFixed(0)} µg/m³
            {unhealthyCount > 0 && (
              <span className="danger">
                {' '}· {unhealthyCount} district{unhealthyCount > 1 ? 's' : ''} above 55.4 µg/m³
              </span>
            )}</>}</p>
        </div>
        <p className="aqi-legend-note">
          * Unhealthy for sensitive groups (children, elderly, respiratory conditions)
        </p>
      </div>

      {withAqi.length > 0 && <div className="aqi-ranking">
          {topDistricts.map((d, i) => {
          const aqi = aqiClass(d.avgPm25_30d);
          const barWidth = Math.min(100, (d.avgPm25_30d / 200) * 100);
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
            ['aqi-good', 'Good (0–12)'],
            ['aqi-moderate', 'Moderate (12–35)'],
            ['aqi-sensitive', 'Unhealthy* (35–55)'],
            ['aqi-unhealthy', 'Unhealthy (55–150)'],
            ['aqi-hazardous', 'Hazardous (>150)'],
          ] as [string, string][]).map(([cls, label]) => (
            <span key={cls} className="aqi-legend-item">
              <span className={`aqi-swatch ${cls}-fill`} />
              {label}
            </span>
          ))}
        </div>
        <Link href="/data" className="button ghost" style={{ flexShrink: 0 }}>
          Download air quality data
        </Link>
      </div>
    </section>
  );
}
