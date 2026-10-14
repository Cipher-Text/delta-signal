/** SNAKE_CASE enum value -> "Title Case" display label. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** ISO timestamp -> short relative time, e.g. "2h ago". */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * ISO timestamp -> Bangladesh time in the DESIGN.md §10A format,
 * e.g. "30 Sep 2026, 16:00 BST (UTC+6)". Dhaka has no DST, so UTC+6 is fixed.
 */
export function formatDhakaDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} BST (UTC+6)`;
}

/**
 * ISO timestamp -> compact Bangladesh time per DESIGN.md §10A,
 * e.g. "4 Oct, 09:00" (current year) or "4 Oct 2025, 09:00" (other years).
 * Pair with {@link formatDhakaDateTime} as the tooltip, which carries "BST (UTC+6)".
 */
export function formatDhakaCompact(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const thisYear = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(new Date());
  const year = get('year') === thisYear ? '' : ` ${get('year')}`;
  return `${get('day')} ${get('month')}${year}, ${get('hour')}:${get('minute')}`;
}
