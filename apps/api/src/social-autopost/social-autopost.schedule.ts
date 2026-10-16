/**
 * Pure helpers for the weekly auto-post routine: Bangladesh time, "is this slot due", the next run, which
 * suggestion to post and what the Facebook caption says. No database, no clock reads: everything takes `now`.
 */
import type { NationalSuggestion } from '../social-content/national-ranking.service';

/** Bangladesh has no daylight saving, so a fixed UTC+6 offset is exact. */
export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** A run more than this late is skipped instead of posted, so a restarted server never posts hours after its slot. */
export const GRACE_MINUTES = 30;

export const AUTOPOST_CONTENT = ['AUTO', 'NOTABLE', 'RAIN_WATCH', 'AIR_QUALITY_WATCH', 'HEAT_WATCH', 'COASTAL_WATCH', 'WEEKLY_SUMMARY'] as const;
export type AutopostContent = (typeof AUTOPOST_CONTENT)[number];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface DhakaClock {
  /** 0 = Sunday … 6 = Saturday in Bangladesh. */
  dayOfWeek: number;
  /** YYYY-MM-DD, the Dhaka calendar date. */
  dateKey: string;
}

export function dhakaClock(now: Date): DhakaClock {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return { dayOfWeek: shifted.getUTCDay(), dateKey: shifted.toISOString().slice(0, 10) };
}

/** The instant a slot fires on the given Dhaka calendar date. */
export function scheduledInstant(dateKey: string, timeOfDay: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeOfDay.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - DHAKA_OFFSET_MS);
}

export interface SlotLike {
  dayOfWeek: number;
  enabled: boolean;
  timeOfDay: string;
  lastRunOn: Date | null;
}

const dateKeyOf = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export type DueState = 'NOT_TODAY' | 'DONE' | 'NOT_YET' | 'DUE' | 'MISSED';

export function dueState(slot: SlotLike, now: Date): DueState {
  const clock = dhakaClock(now);
  if (!slot.enabled || slot.dayOfWeek !== clock.dayOfWeek) return 'NOT_TODAY';
  if (dateKeyOf(slot.lastRunOn) === clock.dateKey) return 'DONE';
  const scheduled = scheduledInstant(clock.dateKey, slot.timeOfDay);
  if (now < scheduled) return 'NOT_YET';
  return now.getTime() - scheduled.getTime() > GRACE_MINUTES * 60_000 ? 'MISSED' : 'DUE';
}

/** The next time an enabled slot will fire, or null when it is off. A slot that already ran today waits for next week. */
export function nextRunAt(slot: SlotLike, now: Date): Date | null {
  if (!slot.enabled) return null;
  const clock = dhakaClock(now);
  let daysAhead = (slot.dayOfWeek - clock.dayOfWeek + 7) % 7;
  if (daysAhead === 0) {
    const todayAt = scheduledInstant(clock.dateKey, slot.timeOfDay);
    if (dateKeyOf(slot.lastRunOn) === clock.dateKey || todayAt <= now) daysAhead = 7;
  }
  const target = new Date(`${clock.dateKey}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() + daysAhead);
  return scheduledInstant(target.toISOString().slice(0, 10), slot.timeOfDay);
}

// ─── daily limits ────────────────────────────────────────────────────────────

export const MAX_POSTS_PER_DAY = 3;
/** Posts are never scheduled in the night: from QUIET_END_HOUR (inclusive) up to QUIET_START_HOUR (exclusive) only. */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 6;
export const MIN_GAP_MINUTES = 240;

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export const inQuietHours = (time: string) => {
  const minutes = minutesOf(time);
  return minutes < QUIET_END_HOUR * 60 || minutes >= QUIET_START_HOUR * 60;
};

/** An error message when the enabled posts of one day break the quiet-hours or spacing rules, otherwise null. */
export function validateDaySlots(slots: Array<{ enabled: boolean; timeOfDay: string }>): string | null {
  const active = slots.filter((slot) => slot.enabled);
  if (active.length > MAX_POSTS_PER_DAY) return `At most ${MAX_POSTS_PER_DAY} posts a day.`;
  const quiet = active.find((slot) => inQuietHours(slot.timeOfDay));
  if (quiet) return `${quiet.timeOfDay} is in quiet hours. Choose a time between ${String(QUIET_END_HOUR).padStart(2, '0')}:00 and ${QUIET_START_HOUR}:00.`;
  const times = active.map((slot) => minutesOf(slot.timeOfDay)).sort((x, y) => x - y);
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < MIN_GAP_MINUTES) return `Keep posts at least ${MIN_GAP_MINUTES / 60} hours apart.`;
  }
  return null;
}

// ─── choosing what to post ───────────────────────────────────────────────────

/** Cards that only exist when the data is notable (see NOTABLE in national-ranking.service.ts). */
const NOTABLE_SERIES = ['RIVER_WATCH', 'LOW_FLOW_WATCH', 'COLD_WATCH', 'CLEAN_AIR_WATCH'];
/** Routine cards in the order "Best available" prefers them: forecasts in the morning, air and heat from noon. */
const MORNING_ROUTINE = ['RAIN_WATCH', 'HEAT_WATCH', 'COASTAL_WATCH', 'AIR_QUALITY_WATCH'];
const EVENING_ROUTINE = ['AIR_QUALITY_WATCH', 'HEAT_WATCH', 'RAIN_WATCH', 'COASTAL_WATCH'];

/** Never posted automatically: alerts need human judgement, and the daily list has no summary. */
export const NEVER_AUTOPOST = ['ALERT_WATCH', 'PERIOD_SUMMARY'];

export type PickResult = { suggestion: NationalSuggestion } | { reason: string };

export interface PickContext {
  /** Series already posted today (Dhaka date): never posted again that day. */
  postedToday: string[];
  /** Series posted earlier today and yesterday: avoided when another choice exists. */
  recentSeries: string[];
  /** The slot's scheduled hour (0–23): before noon prefers forecasts, from noon prefers air quality. */
  hour: number;
}

/**
 * AUTO: a notable card (a hazard level, or a lowest-value card) first, otherwise a routine one in morning or evening
 * order; a series from `recentSeries` is only chosen when nothing else is left. NOTABLE: only notable cards, else skip.
 * A named series: that card, or skip. A series already posted today is never repeated, so a second post of the day
 * is skipped when nothing different exists. Only fully covered (quality HIGH) suggestions are ever posted.
 */
export function pickSuggestion(content: AutopostContent, suggestions: NationalSuggestion[], ctx: PickContext): PickResult {
  const ready = suggestions.filter((s) => s.quality === 'HIGH' && !NEVER_AUTOPOST.includes(s.series));
  if (content === 'WEEKLY_SUMMARY') {
    const summary = suggestions.find((s) => s.series === 'PERIOD_SUMMARY' && s.quality === 'HIGH');
    return summary ? { suggestion: summary } : { reason: 'The weekly summary has no complete data yet' };
  }
  const available = ready.filter((s) => !ctx.postedToday.includes(s.series));
  if (content === 'AUTO' || content === 'NOTABLE') {
    const routine = ctx.hour < 12 ? MORNING_ROUTINE : EVENING_ROUTINE;
    const order = [...NOTABLE_SERIES, ...routine];
    const byOrder = (a: NationalSuggestion, b: NationalSuggestion) => order.indexOf(a.series) - order.indexOf(b.series);
    const notable = available.filter((s) => s.notable).sort(byOrder);
    const plain = content === 'AUTO' ? available.filter((s) => !s.notable).sort(byOrder) : [];
    const candidates = [...notable, ...plain];
    if (candidates.length === 0) {
      if (ready.length > 0 && available.length === 0) return { reason: 'Everything available was already posted today' };
      return { reason: content === 'NOTABLE' ? 'Nothing notable today, so nothing was posted' : 'No suggestion has complete data today' };
    }
    return { suggestion: candidates.find((s) => !ctx.recentSeries.includes(s.series)) ?? candidates[0] };
  }
  if (ctx.postedToday.includes(content)) return { reason: `${labelOfSeries(content)} was already posted today` };
  const named = available.find((s) => s.series === content);
  return named ? { suggestion: named } : { reason: `${labelOfSeries(content)} is not available today` };
}

export function labelOfSeries(series: string): string {
  return series.replace(/^(WEEKLY|MONTHLY)_/, '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The draft type and variant a suggestion series is created with. */
export const DRAFT_FOR_SERIES: Record<string, { type: string; variant?: 'LOWEST'; cadence?: 'WEEKLY' }> = {
  RAIN_WATCH: { type: 'NATIONAL_RAIN_WATCH' },
  AIR_QUALITY_WATCH: { type: 'NATIONAL_AIR_QUALITY_WATCH' },
  HEAT_WATCH: { type: 'NATIONAL_HEAT_WATCH' },
  COASTAL_WATCH: { type: 'NATIONAL_COASTAL_WATCH' },
  RIVER_WATCH: { type: 'NATIONAL_RIVER_WATCH' },
  LOW_FLOW_WATCH: { type: 'NATIONAL_RIVER_WATCH', variant: 'LOWEST' },
  COLD_WATCH: { type: 'NATIONAL_HEAT_WATCH', variant: 'LOWEST' },
  CLEAN_AIR_WATCH: { type: 'NATIONAL_AIR_QUALITY_WATCH', variant: 'LOWEST' },
  PERIOD_SUMMARY: { type: 'NATIONAL_PERIOD_SUMMARY', cadence: 'WEEKLY' },
};

// ─── caption ─────────────────────────────────────────────────────────────────

const num = (value: unknown, digits = 1) => {
  const n = Number(value);
  return value == null || Number.isNaN(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits });
};

/** "Patuakhali — 15 mm" for one ranking row, in the units the card shows. */
export function rowLine(series: string, row: Record<string, unknown>): string | null {
  const name = String(row.district ?? row.station ?? '');
  if (!name) return null;
  const base = series.replace(/^(WEEKLY|MONTHLY)_/, '');
  let value: string | null = null;
  if (base === 'RAIN_WATCH' || base === 'DRY_WATCH') value = `${num(row.rainfallMm)} mm`;
  else if (base === 'AIR_QUALITY_WATCH' || base === 'CLEAN_AIR_WATCH') value = `${num(row.pm25 ?? row.avgPm25)} µg/m³`;
  else if (base === 'HEAT_WATCH' || base === 'COLD_WATCH') value = `${num(row.minTemperature ?? row.apparentTemperature ?? row.avgTemperature)} °C`;
  else if (base === 'RIVER_WATCH' || base === 'LOW_FLOW_WATCH') value = `${num(row.ratio)}× its usual flow`;
  else if (base === 'COASTAL_WATCH') value = `${num(row.waveHeightM)} m waves`;
  return value ? `${name} — ${value}` : null;
}

export function buildCaption(input: { headline: string; reason: string; series: string; rows: Array<Record<string, unknown>>; sourceLabel: string; disclaimer: string | null; footer: string }): string {
  const top = input.rows.slice(0, 3).map((row, i) => {
    const line = rowLine(input.series, row);
    return line ? `${i + 1}. ${line}` : null;
  }).filter(Boolean);
  const parts = [
    input.headline,
    input.reason.replace(/\.*$/, '.'),
    top.length ? top.join('\n') : null,
    `Source: ${input.sourceLabel}.`,
    input.disclaimer,
    input.footer.trim() || null,
  ].filter((part): part is string => Boolean(part));
  return parts.join('\n\n');
}
