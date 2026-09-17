import { routes, type CurrentWeatherReading } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

export default async function LiveWeatherStrip() {
  let readings: CurrentWeatherReading[] = [];
  try {
    readings = await apiGet<CurrentWeatherReading[]>(routes.weather.current, 900);
  } catch {
    return null;
  }

  if (readings.length === 0) return null;

  const withTemp = readings.filter((r) => r.temperature2m !== null && r.district);

  if (withTemp.length === 0) return null;

  const hottest = withTemp.reduce((a, b) =>
    (a.temperature2m as number) > (b.temperature2m as number) ? a : b,
  );
  const coolest = withTemp.reduce((a, b) =>
    (a.temperature2m as number) < (b.temperature2m as number) ? a : b,
  );
  const rainingCount = readings.filter((r) => (r.precipitation ?? 0) > 0).length;
  const latestReadingTime = readings
    .map((reading) => reading.readingTime)
    .sort()
    .at(-1);

  return (
    <div className="live-weather-strip" aria-label="Latest available weather conditions across Bangladesh">
      <span className="live-weather-label">Latest available</span>
      <span className="live-weather-stat">
        Hottest: <strong>{hottest.district?.name}</strong>{' '}
        {(hottest.temperature2m as number).toFixed(1)}°C
      </span>
      <span className="live-weather-divider" aria-hidden="true" />
      <span className="live-weather-stat">
        Coolest: <strong>{coolest.district?.name}</strong>{' '}
        {(coolest.temperature2m as number).toFixed(1)}°C
      </span>
      {rainingCount > 0 && (
        <>
          <span className="live-weather-divider" aria-hidden="true" />
          <span className="live-weather-stat">
            Rain in <strong>{rainingCount}</strong> district{rainingCount !== 1 ? 's' : ''}
          </span>
        </>
      )}
      {latestReadingTime && (
        <span className="live-weather-meta">
          Observed {new Date(latestReadingTime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
