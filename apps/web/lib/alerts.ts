import type { StatusLevel } from '../components/status-badge';
import { titleCase } from './format';

export const SEVERITIES = ['EMERGENCY', 'WARNING', 'WATCH', 'INFO'] as const;
export type AlertSeverityKey = (typeof SEVERITIES)[number];

export const SEVERITY_LEVEL: Record<string, StatusLevel> = {
  EMERGENCY: 'critical',
  WARNING: 'warning',
  WATCH: 'watch',
  INFO: 'info',
};

export const ALERT_TYPES = [
  'FLOOD', 'FLASH_FLOOD', 'CYCLONE', 'STORM_SURGE', 'HEATWAVE', 'AIR_QUALITY',
  'WATER_POLLUTION', 'LANDSLIDE', 'DROUGHT', 'WILDFIRE', 'OTHER',
] as const;

/** Alerts without a hazard type are shown as "General". */
export const hazardLabel = (type: string | null | undefined) => (type ? titleCase(type) : 'General');

/** Display names (divisions and districts) follow DESIGN.md §28A; the seed data still uses the older spellings. */
const CANONICAL_DIVISION: Record<string, string> = {
  Barisal: 'Barishal',
  Chattagram: 'Chattogram',
  Coxsbazar: "Cox's Bazar",
};
export const canonicalDivision = (name: string) => CANONICAL_DIVISION[name] ?? name;

/** Approximate division layout (CSS grid-area: row-start / col-start / row-end / col-end). */
export const DIVISION_TILES: ReadonlyArray<readonly [string, string]> = [
  ['Rangpur', '1 / 1 / 2 / 2'],
  ['Mymensingh', '1 / 2 / 2 / 3'],
  ['Sylhet', '1 / 3 / 2 / 4'],
  ['Rajshahi', '2 / 1 / 3 / 2'],
  ['Dhaka', '2 / 2 / 3 / 3'],
  ['Chattogram', '2 / 3 / 4 / 4'],
  ['Khulna', '3 / 1 / 4 / 2'],
  ['Barishal', '3 / 2 / 4 / 3'],
];
