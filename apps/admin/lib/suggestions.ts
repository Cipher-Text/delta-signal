/** Shared by the Suggested Posts page: the suggestion shape and how each row is shown. */

function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
export { label };

export type NationalSuggestion = {
  id: string;
  cadence: string;
  series: string;
  direction: 'HIGHEST' | 'LOWEST';
  notable: boolean;
  headline: string;
  reason: string;
  quality: string;
  sourceLabel: string;
  windowStart: string;
  windowEnd: string;
  coverage: { available: number; expected: number; percentage: number };
  sourceSnapshot: { rows: Record<string, unknown>[] };
};

// Weekly/monthly rankings are named WEEKLY_RAIN_WATCH / MONTHLY_RAIN_WATCH by the API but create the same card type, and the
// lowest-value series (cold, dry, clean air, low flow) create the same card type with variant=LOWEST.
const NATIONAL_TYPE_BY_BASE: Record<string, string> = {
  RAIN_WATCH: 'NATIONAL_RAIN_WATCH',
  DRY_WATCH: 'NATIONAL_RAIN_WATCH',
  AIR_QUALITY_WATCH: 'NATIONAL_AIR_QUALITY_WATCH',
  CLEAN_AIR_WATCH: 'NATIONAL_AIR_QUALITY_WATCH',
  HEAT_WATCH: 'NATIONAL_HEAT_WATCH',
  COLD_WATCH: 'NATIONAL_HEAT_WATCH',
  COASTAL_WATCH: 'NATIONAL_COASTAL_WATCH',
  PERIOD_SUMMARY: 'NATIONAL_PERIOD_SUMMARY',
  RIVER_WATCH: 'NATIONAL_RIVER_WATCH',
  LOW_FLOW_WATCH: 'NATIONAL_RIVER_WATCH',
  ALERT_WATCH: 'NATIONAL_ALERT_WATCH',
};
export const nationalType = (series: string) => NATIONAL_TYPE_BY_BASE[series.replace(/^(WEEKLY|MONTHLY)_/, '')] ?? '';
/** Notable: every lowest-value card, River Watch, and a routine card whose top value reaches a hazard level. */
export const isNotable = (suggestion: { notable?: boolean }) => Boolean(suggestion.notable);
export const CADENCES = [['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']] as const;
export const num = (v: unknown, digits = 1) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('en-GB', { maximumFractionDigits: digits }));

/** Right-hand text for a suggestion row, in the same units the card shows. */
export function rowValue(series: string, row: Record<string, unknown>): string {
  if (series.endsWith('RAIN_WATCH') || series.endsWith('DRY_WATCH')) return `${num(row.rainfallMm)} mm`;
  if (series.endsWith('AIR_QUALITY_WATCH') || series.endsWith('CLEAN_AIR_WATCH')) return `${num(row.pm25 ?? row.avgPm25)} µg/m³`;
  if (series.endsWith('HEAT_WATCH') || series.endsWith('COLD_WATCH')) return `${num(row.minTemperature ?? row.apparentTemperature ?? row.avgTemperature)} °C`;
  if (series === 'RIVER_WATCH' || series === 'LOW_FLOW_WATCH') return `${num(row.ratio)}× mean`;
  if (series === 'COASTAL_WATCH') return `${num(row.waveHeightM)} m`;
  if (series === 'ALERT_WATCH') return String(row.severity ?? '');
  return '';
}

/** Plain-language lines for the period summary, which has one object rather than ranked rows. */
export function summaryLines(row: Record<string, any>): string[] {
  return [
    `${row.alerts?.issued ?? 0} alert${row.alerts?.issued === 1 ? '' : 's'} issued${row.alerts?.highestSeverity ? ` (highest: ${label(String(row.alerts.highestSeverity).toLowerCase())})` : ''}`,
    row.wettest ? `Wettest (30 d): ${row.wettest.district}, ${num(row.wettest.rainfallMm, 0)} mm` : '',
    row.hottest ? `Warmest (30 d): ${row.hottest.district}, ${num(row.hottest.avgTemperature)} °C` : '',
    row.airQuality ? `Highest PM2.5 (30 d): ${row.airQuality.district}, ${num(row.airQuality.avgPm25, 0)} µg/m³` : '',
  ].filter(Boolean);
}


export function shortDate(value: string | null) { return value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }
