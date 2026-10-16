import type { AutopostContent } from './social-autopost.schedule';

/**
 * The schedule a new installation starts with (Bangladesh time, 0 = Sunday … 6 = Saturday), built for October–November
 * in Bangladesh. It is only written while nobody has configured the routine, and the master switch stays off, so
 * nothing posts until an administrator turns it on.
 *
 * Why these times and cards:
 * - Data first: the daily forecast refreshes at 06:00, the climate rollup at 07:30, marine waves at 08:00 and river
 *   flow at 09:00 (Bangladesh time, UTC server), so no morning post goes out before 09:30 and every card is fresh.
 * - People: 09:30 catches the start of the working day, 13:30 the lunch break, 20:30 the after-dinner scroll when
 *   Facebook use in Bangladesh is highest. Friday is the weekly holiday and Saturday a rest day for many, so both start
 *   later (10:00), and Friday keeps clear of the Jummah prayer window (about 12:30–14:00) with its midday post at 15:00.
 * - Season: October–November is cyclone season (a fixed coastal card on Tuesday; rough seas also surface as notable) and
 *   the air starts to worsen towards winter (air quality four days a week), while rain cards are less urgent than in the
 *   monsoon, so rain gets three slots and "Best available" fills the rest. Heat is kept on two days and the cold card
 *   appears through the notable slot once cold spells begin.
 * - Social media: two guaranteed posts a day, most with a different topic each day; the third is "Only when notable"
 *   so the page never fills with routine numbers, and as the last post of the day it only takes a card the first two
 *   did not use. The weekly summary opens Saturday, a day with time to read it.
 * Review it every season: more rain and flood cards from June to September, cold and fog from December.
 */
export const DEFAULT_SCHEDULE: Record<number, Array<{ time: string; content: AutopostContent }>> = {
  6: [{ time: '10:00', content: 'WEEKLY_SUMMARY' }, { time: '15:00', content: 'AIR_QUALITY_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Saturday
  0: [{ time: '09:30', content: 'RAIN_WATCH' }, { time: '13:30', content: 'HEAT_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Sunday
  1: [{ time: '09:30', content: 'AUTO' }, { time: '13:30', content: 'AIR_QUALITY_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Monday
  2: [{ time: '09:30', content: 'COASTAL_WATCH' }, { time: '13:30', content: 'RAIN_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Tuesday
  3: [{ time: '09:30', content: 'RAIN_WATCH' }, { time: '13:30', content: 'AIR_QUALITY_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Wednesday
  4: [{ time: '09:30', content: 'AUTO' }, { time: '13:30', content: 'HEAT_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Thursday
  5: [{ time: '10:00', content: 'AUTO' }, { time: '15:00', content: 'AIR_QUALITY_WATCH' }, { time: '20:30', content: 'NOTABLE' }], // Friday
};
