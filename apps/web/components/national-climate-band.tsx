import { routes, type DivisionWithClimate } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

function precipIcon(mm: number | null): string {
  if (mm === null) return '';
  if (mm < 20)  return '☀';   // dry
  if (mm < 80)  return '⛅';  // light rain
  if (mm < 200) return '🌧';  // moderate
  return '⛈';                  // heavy / flood risk
}

export default async function NationalClimateBand() {
  let divisions: DivisionWithClimate[] = [];
  let isLive = true;
  try {
    divisions = await apiGet<DivisionWithClimate[]>(routes.locations.divisions);
  } catch {
    isLive = false;
  }

  const hasClimateData = divisions.some((d) => d.avgTemp30d !== null || d.totalPrecip30d !== null);

  return (
    <section className="climate-band public-section" aria-label="National climate overview by division">
      <div className="climate-band-header">
        <div>
          <p className="eyebrow">30-Day Rolling Average · All 8 Divisions</p>
          <h2>National Environmental Conditions</h2>
        </div>
        <p className="climate-band-note">{isLive ? 'Updated nightly from OpenMeteo. Rolling summaries, not live conditions.' : 'The division climate service is temporarily unavailable.'}</p>
      </div>

      {!isLive || !hasClimateData ? (
        <div className="empty-state" role="status">
          {isLive ? 'No 30-day division climate summaries are available yet.' : 'Division climate data is temporarily unavailable.'}
        </div>
      ) : <div className="division-grid">
        {divisions.map((div) => {
          const temp = div.avgTemp30d != null ? `${div.avgTemp30d.toFixed(1)}°C` : '—';
          const precip = div.totalPrecip30d;
          const uv = div.avgUvIndex30d;

          return (
            <article key={div.id} className="division-card">
              <div className="division-card-top">
                <span className="division-name">{div.name}</span>
                {div.bnName && <span className="division-bn">{div.bnName}</span>}
              </div>

              <div className="division-card-temp">{temp}</div>

              <div className="division-card-footer">
                {precip != null && (
                  <span title={`${precip.toFixed(0)}mm rain last 30 days`}>
                    {precipIcon(precip)} {precip.toFixed(0)}mm
                  </span>
                )}
                {uv != null && (
                  <span title={`UV index ${uv.toFixed(1)} (30-day avg)`}>
                    UV {uv.toFixed(1)}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>}
    </section>
  );
}
