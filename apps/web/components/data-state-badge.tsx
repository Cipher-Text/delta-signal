export type DataState =
  | 'observed'
  | 'forecast'
  | 'estimated'
  | 'modeled'
  | 'citizen'
  | 'verified'
  | 'unverified'
  | 'unknown';

const LABELS: Record<DataState, string> = {
  observed: 'Observed',
  forecast: 'Forecast',
  estimated: 'Estimated',
  modeled: 'Modeled',
  citizen: 'Citizen',
  verified: 'Verified',
  unverified: 'Unverified',
  unknown: 'Unknown',
};

/** Border style per state (§24): solid / dashed / dotted. */
const BORDER: Record<DataState, 'solid' | 'dashed' | 'dotted'> = {
  observed: 'solid',
  forecast: 'dashed',
  estimated: 'dotted',
  modeled: 'dotted',
  citizen: 'solid',
  verified: 'solid',
  unverified: 'dotted',
  unknown: 'dotted',
};

/**
 * Says what kind of data a value is, so forecasts, modeled values and citizen
 * reports never read as authoritative observations (§24). Text label plus
 * border style; Verified also carries a check icon.
 */
export default function DataStateBadge({ state, label }: { state: DataState; label?: string }) {
  const weak = state === 'unverified' || state === 'unknown';
  return (
    <span
      className={`ds-data-state ds-data-state--${BORDER[state]}${weak ? ' ds-data-state--weak' : ''}`}
    >
      {state === 'verified' && (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="ds-data-state-icon">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label ?? LABELS[state]}
    </span>
  );
}
