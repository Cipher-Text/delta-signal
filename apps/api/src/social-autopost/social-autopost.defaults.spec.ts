import { DEFAULT_SCHEDULE } from './social-autopost.defaults';
import { AUTOPOST_CONTENT, MAX_POSTS_PER_DAY, validateDaySlots } from './social-autopost.schedule';

describe('DEFAULT_SCHEDULE', () => {
  const days = [0, 1, 2, 3, 4, 5, 6];

  it('covers every weekday with three posts', () => {
    for (const day of days) expect(DEFAULT_SCHEDULE[day]).toHaveLength(MAX_POSTS_PER_DAY);
  });
  it.each(days)('day %i obeys the quiet hours and four-hour spacing, and is in time order', (day) => {
    const posts = DEFAULT_SCHEDULE[day];
    expect(validateDaySlots(posts.map((p) => ({ enabled: true, timeOfDay: p.time })))).toBeNull();
    expect(posts.map((p) => p.time)).toEqual([...posts.map((p) => p.time)].sort());
  });
  it('only uses known content choices and never repeats a named card in a day', () => {
    for (const day of days) {
      const named = DEFAULT_SCHEDULE[day].map((p) => p.content).filter((c) => !['AUTO', 'NOTABLE'].includes(c));
      for (const post of DEFAULT_SCHEDULE[day]) expect(AUTOPOST_CONTENT).toContain(post.content);
      expect(new Set(named).size).toBe(named.length);
    }
  });
  it('keeps the flexible post last, posts the weekly summary once a week, and no morning post before data is fresh (09:30)', () => {
    for (const day of days) expect(DEFAULT_SCHEDULE[day][2].content).toBe('NOTABLE');
    expect(days.flatMap((d) => DEFAULT_SCHEDULE[d]).filter((p) => p.content === 'WEEKLY_SUMMARY')).toHaveLength(1);
    for (const day of days) expect(DEFAULT_SCHEDULE[day][0].time >= '09:30').toBe(true);
  });
  it('keeps Friday clear of the Jummah prayer window', () => {
    for (const post of DEFAULT_SCHEDULE[5]) expect(post.time < '12:30' || post.time >= '14:00').toBe(true);
  });
});
