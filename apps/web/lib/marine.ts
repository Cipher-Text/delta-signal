/** Sea-state classes: WMO code 3700 applied to maximum wave height in metres (DESIGN.md §21A water ramp). */
export const SEA_STATES = [
  { level: 0, label: 'Calm (glassy)' },
  { level: 1, label: 'Calm (rippled)' },
  { level: 2, label: 'Smooth' },
  { level: 3, label: 'Slight' },
  { level: 4, label: 'Moderate' },
  { level: 5, label: 'Rough or higher' },
] as const;

/** Classify the value as displayed: callers pass the wave height already rounded to one decimal. */
export function seaState(wave: number) {
  if (wave === 0) return SEA_STATES[0];
  if (wave <= 0.1) return SEA_STATES[1];
  if (wave <= 0.5) return SEA_STATES[2];
  if (wave <= 1.25) return SEA_STATES[3];
  if (wave <= 2.5) return SEA_STATES[4];
  return SEA_STATES[5];
}

export const SEA_LEGEND = [
  { level: 1, label: 'Calm ≤ 0.1 m' },
  { level: 2, label: 'Smooth ≤ 0.5 m' },
  { level: 3, label: 'Slight ≤ 1.25 m' },
  { level: 4, label: 'Moderate ≤ 2.5 m' },
] as const;

/** Coastal districts west to east (Satkhira to Cox's Bazar). Unknown names sort after. */
export const COAST_ORDER = [
  'Satkhira', 'Khulna', 'Bagerhat', 'Pirojpur', 'Barguna', 'Patuakhali', 'Barishal', 'Bhola',
  'Lakshmipur', 'Chandpur', 'Noakhali', 'Feni', 'Chattogram', "Cox's Bazar",
];

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const COMPASS_NAME: Record<(typeof COMPASS)[number], string> = {
  N: 'north', NE: 'northeast', E: 'east', SE: 'southeast', S: 'south', SW: 'southwest', W: 'west', NW: 'northwest',
};

/**
 * Open-Meteo gives the direction waves come FROM; the arrow points where they travel TOWARD.
 * Returns the arrow rotation in degrees and the compass point it faces.
 */
export function travelDirection(fromDegrees: number | null | undefined, noun: 'Waves' | 'Swell') {
  if (fromDegrees == null) return null;
  const toward = (fromDegrees + 180) % 360;
  const point = COMPASS[Math.round(toward / 45) % 8];
  return { rotation: toward, point, label: `${noun} travel toward the ${COMPASS_NAME[point]}` };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
