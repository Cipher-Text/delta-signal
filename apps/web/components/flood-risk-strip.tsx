import { routes, type StationFloodForecast } from '@delta-signal/contracts';
import { classifyFloodRisk } from '@delta-signal/shared';
import { apiGet } from '../lib/api';

type RiskLevel = 'HIGH' | 'ELEVATED';

interface FloodRiskStation {
  stationId: string;
  stationName: string;
  riverName: string;
  districtName: string;
  ratio: number;
  discharge: number;
  risk: RiskLevel;
  forecastDate: string;
}

export default async function FloodRiskStrip() {
  let forecasts: StationFloodForecast[] = [];
  try {
    forecasts = await apiGet<StationFloodForecast[]>(routes.flood.forecast);
  } catch {
    return null;
  }

  // The API returns one current forecast row per station. Keep station-level
  // context so a district with multiple rivers is not flattened incorrectly.
  const latestByStation = new Map<string, StationFloodForecast>();
  for (const f of forecasts) {
    const existing = latestByStation.get(f.stationId);
    if (!existing || new Date(f.forecastDate) > new Date(existing.forecastDate)) {
      latestByStation.set(f.stationId, f);
    }
  }

  const atRisk: FloodRiskStation[] = [];
  for (const [stationId, f] of latestByStation.entries()) {
    const risk = classifyFloodRisk(f.riverDischarge, f.riverDischargeMean, f.riverDischargeP75);
    if (risk && f.riverDischarge != null && f.riverDischargeMean != null && f.riverDischargeMean > 0) {
      atRisk.push({
        stationId,
        stationName: f.station?.name ?? 'Water-level station',
        riverName: f.station?.riverName ?? 'River not recorded',
        districtName: f.station?.district?.name ?? 'District not recorded',
        ratio: f.riverDischarge / f.riverDischargeMean,
        discharge: f.riverDischarge,
        risk,
        forecastDate: f.forecastDate,
      });
    }
  }

  // Sort: HIGH first, then by ratio descending
  atRisk.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'HIGH' ? -1 : 1;
    return b.ratio - a.ratio;
  });

  const highCount = atRisk.filter((d) => d.risk === 'HIGH').length;
  const currentForecastDate = forecasts
    .map((forecast) => forecast.forecastDate)
    .sort()
    .at(-1);

  return (
    <section className="flood-strip public-section" aria-label="Flood risk alert strip">
      <div className="flood-strip-header">
        <span className="flood-strip-icon">🌊</span>
        <div>
          <strong className="flood-strip-title">
            {highCount > 0
              ? `${highCount} station${highCount > 1 ? 's' : ''} showing a high river-discharge signal`
              : atRisk.length > 0
                ? `${atRisk.length} station${atRisk.length > 1 ? 's' : ''} showing elevated river discharge`
                : forecasts.length > 0
                  ? 'No elevated river-discharge signal in current station forecasts'
                  : 'Flood forecast data is currently unavailable'}
          </strong>
          <span className="flood-strip-note">
            {' '}— Simulated station discharge compared with historical values; this is not an official flood warning or flood-impact assessment. Source: OpenMeteo GloFAS{currentForecastDate ? ` · Forecast date ${currentForecastDate}` : ''}.
          </span>
        </div>
      </div>

      {atRisk.length > 0 && <div className="flood-chip-row">
        {atRisk.slice(0, 8).map((d) => (
          <span
            key={d.stationId}
            className={`flood-chip flood-chip-${d.risk.toLowerCase()}`}
            title={`${d.stationName}, ${d.riverName}, ${d.districtName} · River discharge ${d.ratio.toFixed(1)}× historical mean`}
          >
            {d.stationName}
            <span className="flood-chip-ratio">{d.ratio.toFixed(1)}×</span>
          </span>
        ))}
      </div>}
    </section>
  );
}
