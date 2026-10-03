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

/** "1 role" / "2 roles" — plural-aware count with thousands separators (§10A). */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

/** ISO timestamp -> "16:00 BST (UTC+6)" in Asia/Dhaka (§10A). */
export function dhakaTime(iso: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
  return `${time} BST (UTC+6)`;
}

/** ISO timestamp -> "30 Sep 2026, 16:00 BST (UTC+6)" in Asia/Dhaka (§10A). */
export function dhakaDateTime(iso: string): string {
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
  return `${date}, ${dhakaTime(iso)}`;
}
