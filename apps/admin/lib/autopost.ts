/** Auto-post routine: the shapes the API returns and the labels the page shows. */

export type AutopostSlot = {
  dayOfWeek: number;
  /** 0 = the day's first post, 1 = second, 2 = third. */
  position: number;
  enabled: boolean;
  timeOfDay: string;
  content: string;
  format: 'PORTRAIT_4_5' | 'SQUARE_1_1';
  nextRunAt: string | null;
};

export type AutopostRun = {
  id: string;
  dayOfWeek: number;
  position: number;
  scheduledFor: string;
  status: 'QUEUED' | 'SKIPPED' | 'FAILED';
  reason: string | null;
  series: string | null;
  headline: string | null;
  draftId: string | null;
  createdAt: string;
  publication: { id: string; status: 'PENDING' | 'SENT' | 'FAILED'; externalUrl: string | null; error: string | null } | null;
};

export type AutopostConfig = {
  enabled: boolean;
  runtimeActive: boolean;
  platformAccount: { id: string; displayName: string; platform: string } | null;
  accountMissing: boolean;
  accounts: Array<{ id: string; displayName: string; platform: string }>;
  captionFooter: string;
  slots: AutopostSlot[];
  nextRunAt: string | null;
  runs: AutopostRun[];
};

export type AutopostPreview =
  | { wouldPost: false; reason: string; slot: { dayOfWeek: number; position: number; content: string } }
  | { wouldPost: true; slot: { dayOfWeek: number; position: number; content: string }; series: string; headline: string; reason: string; notable: boolean; rows: Array<Record<string, unknown>>; caption: string };

/** Bangladesh week order: Saturday first. Values are JavaScript weekdays (0 = Sunday). */
export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;
export const POSITION_NAMES = ['First post', 'Second post', 'Third post'] as const;
/** Posts go out between 06:00 and 22:00 (BST) only, and posts of a day are at least four hours apart. */
export const FIRST_HOUR = 6;
export const LAST_HOUR = 21;
export const MIN_GAP_HOURS = 4;
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const CONTENT_OPTIONS = [
  ['AUTO', 'Best available', 'Picks the most useful card with complete data, avoiding repeats'],
  ['NOTABLE', 'Only when notable', 'Posts only if something crosses a hazard or threshold; otherwise skips'],
  ['RAIN_WATCH', 'Rain forecast', 'Districts with the most rain expected'],
  ['AIR_QUALITY_WATCH', 'Air quality', 'Districts with the highest modeled PM2.5'],
  ['HEAT_WATCH', 'Heat', 'Districts with the highest apparent temperature'],
  ['COASTAL_WATCH', 'Coastal waves', 'Coastal districts with the highest waves'],
  ['WEEKLY_SUMMARY', 'Weekly summary', 'Alerts issued and the climate highlights (use on one day a week)'],
] as const;

export const contentLabel = (value: string) => CONTENT_OPTIONS.find(([v]) => v === value)?.[1] ?? value;

const dhaka = (value: string | Date, opts: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', ...opts });

/** "Sat 17 Oct, 08:00 BST" */
export const formatBst = (value: string | null | undefined) =>
  value ? `${dhaka(value, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} BST` : '—';
