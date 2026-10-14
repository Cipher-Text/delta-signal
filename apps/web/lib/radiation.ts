/** Daily shortwave radiation classes in MJ/m² (sequential solar ramp, Web UI Reference). */
export const SOLAR_BINS = [
  { level: 1, max: 10, label: '< 10' },
  { level: 2, max: 15, label: '10–14.9' },
  { level: 3, max: 18, label: '15–17.9' },
  { level: 4, max: Infinity, label: '≥ 18 MJ/m²' },
] as const;

export const solarLevel = (v: number) => SOLAR_BINS.find((b) => v < b.max)!.level;

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** 1 MJ/m² ≈ 0.2778 kWh/m². */
export const MJ_TO_KWH = 0.2778;
