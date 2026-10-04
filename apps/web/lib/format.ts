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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** ISO timestamp -> "30 Sep 2026" in Asia/Dhaka. Fixed month names: ICU renders "Sept" in en-GB. */
export function dhakaDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + DHAKA_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** ISO timestamp -> "30 Sep 2026, 16:00 BST (UTC+6)" in Asia/Dhaka (§10A). */
export function dhakaDateTime(iso: string): string {
  return `${dhakaDate(iso)}, ${dhakaTime(iso)}`;
}

/** ISO timestamp -> "30 Sep 2026, 16:00" in Asia/Dhaka, for views that already say times are BST. */
export function dhakaDateTimeShort(iso: string): string {
  return dhakaDateTime(iso).replace(' BST (UTC+6)', '');
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Calendar-date strings (YYYY-MM-DD) -> "Mon", "5 Oct" and "Monday 5 Oct 2026". No timezone maths: they are plain dates. */
export function calendarDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const short = `${d} ${MONTHS[m - 1]}`;
  return { weekdayShort: weekday.slice(0, 3), short, long: `${weekday} ${short} ${y}` };
}

/** Today's calendar date in Asia/Dhaka as YYYY-MM-DD. */
export function dhakaToday(): string {
  return new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}
