import type { NationalSuggestion } from '../social-content/national-ranking.service';
import { GRACE_MINUTES, buildCaption, dhakaClock, dueState, nextRunAt, pickSuggestion, rowLine, scheduledInstant, validateDaySlots } from './social-autopost.schedule';

const at = (iso: string) => new Date(iso);
const slot = (over: Partial<{ dayOfWeek: number; enabled: boolean; timeOfDay: string; lastRunOn: Date | null }> = {}) => ({ dayOfWeek: 6, enabled: true, timeOfDay: '08:00', lastRunOn: null, ...over });
const suggestion = (series: string, over: Partial<NationalSuggestion> = {}): NationalSuggestion => ({
  id: series, cadence: 'DAILY', type: 'WEATHER_FORECAST', series, direction: 'HIGHEST', notable: ['RIVER_WATCH', 'COLD_WATCH', 'LOW_FLOW_WATCH', 'CLEAN_AIR_WATCH'].includes(series), headline: `${series} headline`, reason: 'Because', quality: 'HIGH',
  generatedAt: '', windowStart: '', windowEnd: '', sourceLabel: 'Source', coverage: { available: 64, expected: 64, percentage: 100 }, sourceSnapshot: { rows: [] }, ...over,
});

describe('Bangladesh clock', () => {
  it('reads the Dhaka weekday and date, which run six hours ahead of UTC', () => {
    // Fri 16 Oct 2026 20:30 UTC is already Sat 17 Oct 02:30 in Dhaka.
    expect(dhakaClock(at('2026-10-16T20:30:00Z'))).toEqual({ dayOfWeek: 6, dateKey: '2026-10-17' });
    expect(dhakaClock(at('2026-10-16T17:59:00Z'))).toEqual({ dayOfWeek: 5, dateKey: '2026-10-16' });
  });
  it('turns a Dhaka date and time into the right instant', () => {
    expect(scheduledInstant('2026-10-17', '08:00').toISOString()).toBe('2026-10-17T02:00:00.000Z');
    expect(scheduledInstant('2026-10-17', '00:30').toISOString()).toBe('2026-10-16T18:30:00.000Z');
  });
});

describe('dueState', () => {
  const saturday8 = (hh: string) => at(`2026-10-17T${hh}:00Z`); // 08:00 Dhaka = 02:00Z
  it('is not due on another weekday or when the slot is off', () => {
    expect(dueState(slot({ dayOfWeek: 0 }), saturday8('02:00'))).toBe('NOT_TODAY');
    expect(dueState(slot({ enabled: false }), saturday8('02:00'))).toBe('NOT_TODAY');
  });
  it('waits until the time, runs inside the grace window, and skips when too late', () => {
    expect(dueState(slot(), at('2026-10-17T01:59:00Z'))).toBe('NOT_YET');
    expect(dueState(slot(), at('2026-10-17T02:00:00Z'))).toBe('DUE');
    expect(dueState(slot(), new Date(at('2026-10-17T02:00:00Z').getTime() + GRACE_MINUTES * 60_000))).toBe('DUE');
    expect(dueState(slot(), new Date(at('2026-10-17T02:00:00Z').getTime() + (GRACE_MINUTES + 1) * 60_000))).toBe('MISSED');
  });
  it('runs at most once a day', () => {
    expect(dueState(slot({ lastRunOn: new Date('2026-10-17T00:00:00Z') }), at('2026-10-17T02:05:00Z'))).toBe('DONE');
    expect(dueState(slot({ lastRunOn: new Date('2026-10-10T00:00:00Z') }), at('2026-10-17T02:05:00Z'))).toBe('DUE');
  });
});

describe('nextRunAt', () => {
  it('is null when the slot is off', () => expect(nextRunAt(slot({ enabled: false }), at('2026-10-17T00:00:00Z'))).toBeNull());
  it('is later today when the time has not come', () => {
    expect(nextRunAt(slot(), at('2026-10-17T00:00:00Z'))?.toISOString()).toBe('2026-10-17T02:00:00.000Z');
  });
  it('moves to next week once the time passed or it already ran today', () => {
    expect(nextRunAt(slot(), at('2026-10-17T03:00:00Z'))?.toISOString()).toBe('2026-10-24T02:00:00.000Z');
    expect(nextRunAt(slot({ lastRunOn: new Date('2026-10-17T00:00:00Z') }), at('2026-10-17T00:30:00Z'))?.toISOString()).toBe('2026-10-24T02:00:00.000Z');
  });
  it('finds the next occurrence on a later weekday', () => {
    // Sunday 18 Oct 08:00 Dhaka, asked on Saturday 17 Oct.
    expect(nextRunAt(slot({ dayOfWeek: 0 }), at('2026-10-17T05:00:00Z'))?.toISOString()).toBe('2026-10-18T02:00:00.000Z');
  });
});

describe('validateDaySlots', () => {
  const day = (...times: string[]) => times.map((timeOfDay) => ({ enabled: true, timeOfDay }));
  it('accepts up to three posts in daytime hours at least four hours apart', () => {
    expect(validateDaySlots(day('07:30', '18:00'))).toBeNull();
    expect(validateDaySlots(day('08:30', '13:00', '19:30'))).toBeNull();
    expect(validateDaySlots(day('19:30', '08:30', '13:00'))).toBeNull();
    expect(validateDaySlots(day('06:00', '10:00'))).toBeNull();
    expect(validateDaySlots(day('21:59'))).toBeNull();
  });
  it('refuses quiet hours, 22:00 up to 06:00', () => {
    expect(validateDaySlots(day('22:00'))).toMatch(/quiet hours/);
    expect(validateDaySlots(day('05:59'))).toMatch(/quiet hours/);
    expect(validateDaySlots(day('00:30'))).toMatch(/quiet hours/);
  });
  it('refuses posts closer than four hours, in any pair, and more than three posts', () => {
    expect(validateDaySlots(day('08:00', '11:59'))).toMatch(/4 hours/);
    expect(validateDaySlots(day('08:30', '13:00', '16:00'))).toMatch(/4 hours/);
    expect(validateDaySlots(day('08:00', '12:00', '16:00', '20:00'))).toMatch(/At most 3/);
  });
  it('ignores posts that are switched off', () => {
    expect(validateDaySlots([{ enabled: false, timeOfDay: '03:00' }, { enabled: true, timeOfDay: '09:00' }])).toBeNull();
  });
});

describe('pickSuggestion', () => {
  const all = [suggestion('HEAT_WATCH'), suggestion('RAIN_WATCH'), suggestion('AIR_QUALITY_WATCH'), suggestion('COASTAL_WATCH'), suggestion('ALERT_WATCH'), suggestion('RIVER_WATCH')];
  const routine = all.filter((s) => s.series !== 'RIVER_WATCH');
  const series = (r: ReturnType<typeof pickSuggestion>) => ('suggestion' in r ? r.suggestion.series : r.reason);
  const ctx = (over: Partial<{ postedToday: string[]; recentSeries: string[]; hour: number }> = {}) => ({ postedToday: [], recentSeries: [], hour: 8, ...over });

  it('AUTO prefers a notable card, then routine ones, and never an alert', () => {
    expect(series(pickSuggestion('AUTO', all, ctx()))).toBe('RIVER_WATCH');
    expect(series(pickSuggestion('AUTO', routine, ctx()))).toBe('RAIN_WATCH');
    expect(series(pickSuggestion('AUTO', [suggestion('ALERT_WATCH')], ctx()))).toMatch(/complete data/);
  });
  it('a routine card that crosses a hazard level counts as notable', () => {
    const hot = [suggestion('RAIN_WATCH'), suggestion('HEAT_WATCH', { notable: true })];
    expect(series(pickSuggestion('AUTO', hot, ctx()))).toBe('HEAT_WATCH');
    expect(series(pickSuggestion('NOTABLE', hot, ctx()))).toBe('HEAT_WATCH');
    expect(series(pickSuggestion('NOTABLE', routine, ctx()))).toMatch(/Nothing notable/);
  });
  it('Best available leans on forecasts before noon and air quality from noon', () => {
    expect(series(pickSuggestion('AUTO', routine, ctx({ hour: 7 })))).toBe('RAIN_WATCH');
    expect(series(pickSuggestion('AUTO', routine, ctx({ hour: 18 })))).toBe('AIR_QUALITY_WATCH');
  });
  it('a named card ignores the morning or evening lean', () => {
    expect(series(pickSuggestion('RAIN_WATCH', routine, ctx({ hour: 18 })))).toBe('RAIN_WATCH');
  });
  it('avoids recent posts but falls back to them when nothing else exists', () => {
    expect(series(pickSuggestion('AUTO', all, ctx({ recentSeries: ['RIVER_WATCH', 'RAIN_WATCH'] })))).toBe('HEAT_WATCH');
    expect(series(pickSuggestion('AUTO', [suggestion('HEAT_WATCH')], ctx({ recentSeries: ['HEAT_WATCH'] })))).toBe('HEAT_WATCH');
  });
  it('never repeats a card already posted today, and skips when nothing different is left', () => {
    expect(series(pickSuggestion('AUTO', routine, ctx({ hour: 18, postedToday: ['AIR_QUALITY_WATCH'] })))).toBe('HEAT_WATCH');
    expect(series(pickSuggestion('AUTO', [suggestion('HEAT_WATCH')], ctx({ postedToday: ['HEAT_WATCH'], recentSeries: ['HEAT_WATCH'] })))).toMatch(/already posted today/);
    expect(series(pickSuggestion('NOTABLE', all, ctx({ postedToday: ['RIVER_WATCH'] })))).toMatch(/already posted today|Nothing notable/);
    expect(series(pickSuggestion('RAIN_WATCH', all, ctx({ postedToday: ['RAIN_WATCH'] })))).toBe('Rain Watch was already posted today');
  });
  it('only posts suggestions with complete data', () => {
    expect(series(pickSuggestion('AUTO', [suggestion('HEAT_WATCH', { quality: 'REVIEW' })], ctx()))).toMatch(/complete data/);
  });
  it('NOTABLE skips when only routine cards exist and posts a lowest-value card', () => {
    expect(series(pickSuggestion('NOTABLE', [suggestion('HEAT_WATCH'), suggestion('COLD_WATCH', { direction: 'LOWEST' })], ctx()))).toBe('COLD_WATCH');
  });
  it('a named card posts that card or skips with a clear reason', () => {
    expect(series(pickSuggestion('COASTAL_WATCH', [suggestion('HEAT_WATCH')], ctx()))).toBe('Coastal Watch is not available today');
  });
  it('the weekly summary comes from the weekly list', () => {
    expect(series(pickSuggestion('WEEKLY_SUMMARY', [suggestion('PERIOD_SUMMARY', { cadence: 'WEEKLY' })], ctx()))).toBe('PERIOD_SUMMARY');
    expect(series(pickSuggestion('WEEKLY_SUMMARY', [], ctx()))).toMatch(/weekly summary/i);
  });
});

describe('caption', () => {
  it('formats ranking rows in their units', () => {
    expect(rowLine('RAIN_WATCH', { district: 'Patuakhali', rainfallMm: 15 })).toBe('Patuakhali — 15 mm');
    expect(rowLine('COLD_WATCH', { district: 'Bhola', minTemperature: 7 })).toBe('Bhola — 7 °C');
    expect(rowLine('RIVER_WATCH', { station: 'Bamna', ratio: 1.8 })).toBe('Bamna — 1.8× its usual flow');
    expect(rowLine('ALERT_WATCH', { title: 'x' })).toBeNull();
  });
  it('builds headline, reason, top three, source, disclaimer and footer', () => {
    const caption = buildCaption({ headline: 'Top 5 districts by rain forecast', reason: 'Highest forecast rainfall', series: 'RAIN_WATCH', rows: [{ district: 'A', rainfallMm: 15 }, { district: 'B', rainfallMm: 5 }, { district: 'C', rainfallMm: 4 }, { district: 'D', rainfallMm: 3 }], sourceLabel: 'Open-Meteo daily forecast', disclaimer: 'Forecasts can change.', footer: ' #DeltaSignal ' });
    expect(caption).toBe('Top 5 districts by rain forecast\n\nHighest forecast rainfall.\n\n1. A — 15 mm\n2. B — 5 mm\n3. C — 4 mm\n\nSource: Open-Meteo daily forecast.\n\nForecasts can change.\n\n#DeltaSignal');
  });
  it('leaves out empty parts', () => {
    expect(buildCaption({ headline: 'H', reason: 'R.', series: 'PERIOD_SUMMARY', rows: [], sourceLabel: 'S', disclaimer: null, footer: '' })).toBe('H\n\nR.\n\nSource: S.');
  });
});
