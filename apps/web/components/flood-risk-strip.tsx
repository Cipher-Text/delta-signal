import { routes, type StationFloodForecast } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';

type RiskLevel = 'HIGH' | 'ELEVATED';

interface FloodRiskDistrict {
  districtId: string;
  districtName: string;
  ratio: number;
  discharge: number;
  risk: RiskLevel;
}

function computeRisk(
  discharge: number | null,
  mean: number | null,
  p75: number | null,
): RiskLevel | null {
  if (discharge == null || mean == null || mean === 0) return null;
  const ratio = discharge / mean;
  if (ratio >= 2.0 || (p75 != null && discharge > p75 * 1.5)) return 'HIGH';
  if (ratio >= 1.5 || (p75 != null && discharge > p75)) return 'ELEVATED';
  return null;
}

export default async function FloodRiskStrip() {
  let forecasts: StationFloodForecast[] = [];
  try {
    forecasts = await apiGet<StationFloodForecast[]>(routes.flood.forecast);
  } catch {
    return null;
  }

  // Take the highest-risk station per district, then filter to elevated/high risk
  const latestByDistrict = new Map<string, StationFloodForecast>();
  for (const f of forecasts) {
    const districtId = f.station?.districtId ?? '';
    if (!districtId) continue;
    const existing = latestByDistrict.get(districtId);
    if (!existing || new Date(f.forecastDate) > new Date(existing.forecastDate)) {
      latestByDistrict.set(districtId, f);
    }
  }

  const atRisk: FloodRiskDistrict[] = [];
  for (const [districtId, f] of latestByDistrict.entries()) {
    const risk = computeRisk(f.riverDischarge, f.riverDischargeMean, f.riverDischargeP75);
    if (risk && f.riverDischarge != null && f.riverDischargeMean != null && f.riverDischargeMean > 0) {
      atRisk.push({
        districtId,
        districtName: f.station?.district?.name ?? districtId,
        ratio: f.riverDischarge / f.riverDischargeMean,
        discharge: f.riverDischarge,
        risk,
      });
    }
  }

  if (atRisk.length === 0) return null;

  // Sort: HIGH first, then by ratio descending
  atRisk.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'HIGH' ? -1 : 1;
    return b.ratio - a.ratio;
  });

  const highCount = atRisk.filter((d) => d.risk === 'HIGH').length;

  return (
    <section className="flood-strip public-section" aria-label="Flood risk alert strip">
      <div className="flood-strip-header">
        <span className="flood-strip-icon">🌊</span>
        <div>
          <strong className="flood-strip-title">
            {highCount > 0
              ? `${highCount} district${highCount > 1 ? 's' : ''} showing a high river-discharge signal`
              : `${atRisk.length} district${atRisk.length > 1 ? 's' : ''} showing elevated river discharge`}
          </strong>
          <span className="flood-strip-note">
            {' '}— Station forecast compared with historical discharge. This is not a flood-impact assessment. Source: OpenMeteo GloFAS.
          </span>
        </div>
      </div>

      <div className="flood-chip-row">
        {atRisk.map((d) => (
          <span
            key={d.districtId}
            className={`flood-chip flood-chip-${d.risk.toLowerCase()}`}
            title={`River discharge ${d.ratio.toFixed(1)}× historical mean`}
          >
            {d.districtName}
            <span className="flood-chip-ratio">{d.ratio.toFixed(1)}×</span>
          </span>
        ))}
      </div>
    </section>
  );
}
