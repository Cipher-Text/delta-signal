import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type NationalCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type NationalSuggestion = {
  id: string;
  cadence: NationalCadence;
  type: 'WEATHER_FORECAST' | 'CURRENT_WEATHER' | 'RIVER_SIGNAL' | 'ENVIRONMENTAL_ALERT' | 'BIODIVERSITY_OBSERVATION';
  series: string;
  /** HIGHEST rankings are hazards/extremes at the top; LOWEST ones (cold, dry, clean air, low flow) only appear when notable. */
  direction: 'HIGHEST' | 'LOWEST';
  /** True when the data crosses a hazard or threshold (see NOTABLE). Lowest-value cards and River Watch exist only when notable. */
  notable: boolean;
  headline: string;
  reason: string;
  quality: 'HIGH' | 'REVIEW' | 'UNAVAILABLE';
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  sourceLabel: string;
  coverage: { available: number; expected: number; percentage: number };
  sourceSnapshot: Record<string, unknown>;
};

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * Open-Meteo daily/aggregate rows are fetched with `timezone=auto`, so each row's
 * date column is Dhaka's local calendar date parsed as UTC midnight of that date
 * string (see weather.service.ts). Comparing against the server's own UTC calendar
 * day is wrong for ~6 hours every day (18:00-23:59 UTC, once Dhaka has already
 * rolled into tomorrow) — these mirror that same "UTC midnight of the Dhaka date
 * label" convention so window bounds line up with the stored labels.
 */
const startOfDhakaDay = (date: Date) => {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
};

const endOfDhakaDay = (date: Date) => {
  const value = startOfDhakaDay(date);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
};

/**
 * When a card is "notable". Lowest-value cards (coolest, driest, cleanest air, low river flow) and River Watch only
 * appear when the data crosses their lines, so the list never fills with routine numbers. Rain, heat, air quality
 * and coastal highest-value cards are always offered, and are flagged `notable` when their top value reaches a hazard
 * level (heat 35 °C apparent, PM2.5 Unhealthy, heavy rain, rough seas) — that flag drives the auto-post routine.
 */
export const NOTABLE = {
  /** Routine cards become notable when their top value reaches a hazard level. */
  heat: { apparentC: 35 },
  /** EPA "Unhealthy" for fine particles (hourly values). */
  air: { pm25: 55.5 },
  /** Heavy rain in a day (BMD: 44 mm and above). */
  rain: { heavyMm: 44 },
  /** Rough seas on the coast. */
  coastal: { roughM: 2.5 },
  /** River discharge relative to the station's modeled mean. */
  river: { high: 1.5, low: 0.5 },
  /** Coolest districts: forecast minimum temperature today (Bangladesh mild cold wave is ≤ 10 °C); 30-day mean for monthly. */
  cold: { dailyMinC: 10, monthlyAvgC: 15 },
  /** Driest districts: total rainfall over the window. */
  dry: { weeklyMm: 5, monthlyMm: 20 },
  /** Cleanest air: modeled PM2.5 at the EPA "Good" level, and at least this many districts at it (daily); lowest mean (weekly/monthly). */
  cleanAir: { pm25: 9.0, minDistricts: 3 },
} as const;

type Direction = 'HIGHEST' | 'LOWEST';

const percent = (available: number, expected: number) => expected === 0 ? 0 : Math.round((available / expected) * 100);

const QUALITY_RANK: Record<NationalSuggestion['quality'], number> = { HIGH: 0, REVIEW: 1, UNAVAILABLE: 2 };

@Injectable()
export class NationalRankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(cadence: NationalCadence = 'DAILY'): Promise<NationalSuggestion[]> {
    const now = new Date();
    const districtCount = await this.prisma.district.count();
    const tasks = cadence === 'DAILY'
      ? [
        this.rainSuggestion(now, districtCount, cadence),
        this.airSuggestion(now, districtCount, cadence, 'HIGHEST'),
        this.heatSuggestion(now, districtCount, cadence),
        this.riverSuggestion(now, cadence, 'HIGHEST'),
        this.coldSuggestion(now, districtCount, cadence),
        this.airSuggestion(now, districtCount, cadence, 'LOWEST'),
        this.riverSuggestion(now, cadence, 'LOWEST'),
        this.alertSuggestion(now, cadence),
        this.coastalSuggestion(now, cadence),
      ]
      : [
        this.climateSummarySuggestion(now, districtCount, cadence, 'HIGHEST'),
        this.climateAirSummarySuggestion(now, districtCount, cadence, 'HIGHEST'),
        this.climateHeatSummarySuggestion(now, districtCount, cadence, 'HIGHEST'),
        this.climateSummarySuggestion(now, districtCount, cadence, 'LOWEST'),
        this.climateAirSummarySuggestion(now, districtCount, cadence, 'LOWEST'),
        this.climateHeatSummarySuggestion(now, districtCount, cadence, 'LOWEST'),
        this.alertSuggestion(now, cadence),
        this.periodSummarySuggestion(now, districtCount, cadence),
      ];

    return (await Promise.all(tasks))
      .filter((suggestion): suggestion is NationalSuggestion => suggestion !== null)
      .sort((a, b) => QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality]);
  }

  /** Rolling windows: weekly from union daily climate, monthly from the 30-day district columns. */
  private async climateSummarySuggestion(now: Date, expected: number, cadence: NationalCadence, direction: Direction) {
    const lowest = direction === 'LOWEST';
    const order = lowest ? 'asc' : 'desc';
    if (cadence === 'MONTHLY') {
      const rows = await this.prisma.district.findMany({ where: { totalPrecip30d: { not: null } }, select: { id: true, name: true, bnName: true, totalPrecip30d: true, climateUpdatedAt: true }, orderBy: { totalPrecip30d: order }, take: 5 });
      if (rows.length === 0) return null;
      if (lowest && (rows[0].totalPrecip30d ?? Infinity) > NOTABLE.dry.monthlyMm) return null;
      const available = await this.prisma.district.count({ where: { totalPrecip30d: { not: null } } });
      return this.suggestion(lowest ? 'MONTHLY_DRY_WATCH' : 'MONTHLY_RAIN_WATCH', 'CURRENT_WEATHER', cadence,
        lowest ? 'Top 5 driest districts over 30 days' : 'Top 5 districts by 30-day rainfall',
        lowest ? 'Lowest rolling 30-day precipitation totals' : 'Highest rolling 30-day precipitation totals',
        'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, available, expected,
        rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, rainfallMm: row.totalPrecip30d, updatedAt: row.climateUpdatedAt })), direction);
    }
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.unionDailyClimate.findMany({ where: { date: { gte: startOfDhakaDay(windowStart), lt: endOfDhakaDay(now) }, totalPrecip: { not: null } }, select: { date: true, totalPrecip: true, union: { select: { upazila: { select: { district: { select: { id: true, name: true, bnName: true } } } } } } } });
    const totals = new Map<string, { district: { id: string; name: string; bnName: string | null }; total: number }>();
    for (const row of rows) {
      const district = row.union.upazila.district;
      const current = totals.get(district.id) ?? { district, total: 0 };
      current.total += row.totalPrecip ?? 0;
      totals.set(district.id, current);
    }
    const ranked = [...totals.values()].sort((a, b) => (lowest ? a.total - b.total : b.total - a.total)).slice(0, 5);
    if (ranked.length === 0) return null;
    if (lowest && ranked[0].total > NOTABLE.dry.weeklyMm) return null;
    return this.suggestion(lowest ? 'WEEKLY_DRY_WATCH' : 'WEEKLY_RAIN_WATCH', 'CURRENT_WEATHER', cadence,
      lowest ? 'Top 5 driest districts this week' : 'Top 5 wettest districts this week',
      lowest ? 'Lowest aggregated rainfall across the last 7 days' : 'Highest aggregated rainfall across the last 7 days',
      'Union daily climate aggregates', windowStart, now, totals.size, expected,
      ranked.map(({ district, total }) => ({ districtId: district.id, district: district.name, districtBn: district.bnName, rainfallMm: Number(total.toFixed(1)) })), direction);
  }

  private async climateAirSummarySuggestion(now: Date, expected: number, cadence: NationalCadence, direction: Direction) {
    const lowest = direction === 'LOWEST';
    const order = lowest ? 'asc' : 'desc';
    if (cadence === 'MONTHLY') {
      const rows = await this.prisma.district.findMany({ where: { avgPm25_30d: { not: null } }, select: { id: true, name: true, bnName: true, avgPm25_30d: true, climateUpdatedAt: true }, orderBy: { avgPm25_30d: order }, take: 5 });
      if (rows.length === 0) return null;
      if (lowest && (rows[0].avgPm25_30d ?? Infinity) > NOTABLE.cleanAir.pm25) return null;
      const available = await this.prisma.district.count({ where: { avgPm25_30d: { not: null } } });
      return this.suggestion(lowest ? 'MONTHLY_CLEAN_AIR_WATCH' : 'MONTHLY_AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence,
        lowest ? 'Top 5 districts with the cleanest air over 30 days' : 'Top 5 districts by 30-day modeled PM2.5',
        lowest ? 'Lowest rolling 30-day modeled PM2.5 averages' : 'Highest rolling 30-day modeled PM2.5 averages',
        'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, available, expected,
        rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, avgPm25: row.avgPm25_30d, updatedAt: row.climateUpdatedAt })), direction);
    }
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.unionDailyClimate.findMany({ where: { date: { gte: startOfDhakaDay(windowStart), lt: endOfDhakaDay(now) }, avgPm25: { not: null } }, select: { avgPm25: true, union: { select: { upazila: { select: { district: { select: { id: true, name: true, bnName: true } } } } } } } });
    const totals = new Map<string, { district: { id: string; name: string; bnName: string | null }; sum: number; count: number }>();
    for (const row of rows) {
      const district = row.union.upazila.district;
      const current = totals.get(district.id) ?? { district, sum: 0, count: 0 };
      current.sum += row.avgPm25 ?? 0;
      current.count += 1;
      totals.set(district.id, current);
    }
    const ranked = [...totals.values()].map((item) => ({ ...item, average: item.sum / item.count })).sort((a, b) => (lowest ? a.average - b.average : b.average - a.average)).slice(0, 5);
    if (ranked.length === 0) return null;
    if (lowest && ranked[0].average > NOTABLE.cleanAir.pm25) return null;
    return this.suggestion(lowest ? 'WEEKLY_CLEAN_AIR_WATCH' : 'WEEKLY_AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence,
      lowest ? 'Top 5 districts with the cleanest air this week' : 'Top 5 districts by weekly modeled PM2.5',
      lowest ? 'Lowest average modeled PM2.5 across the last 7 days' : 'Highest average modeled PM2.5 across the last 7 days',
      'Union daily climate aggregates', windowStart, now, totals.size, expected,
      ranked.map(({ district, average }) => ({ districtId: district.id, district: district.name, districtBn: district.bnName, avgPm25: Number(average.toFixed(1)) })), direction);
  }

  private async climateHeatSummarySuggestion(now: Date, expected: number, cadence: NationalCadence, direction: Direction) {
    // Only the monthly 30-day mean exists for temperature; there is no weekly temperature aggregate.
    if (cadence !== 'MONTHLY') return null;
    const lowest = direction === 'LOWEST';
    const rows = await this.prisma.district.findMany({ where: { avgTemp30d: { not: null } }, select: { id: true, name: true, bnName: true, avgTemp30d: true, climateUpdatedAt: true }, orderBy: { avgTemp30d: lowest ? 'asc' : 'desc' }, take: 5 });
    if (rows.length === 0) return null;
    if (lowest && (rows[0].avgTemp30d ?? Infinity) > NOTABLE.cold.monthlyAvgC) return null;
    const available = await this.prisma.district.count({ where: { avgTemp30d: { not: null } } });
    return this.suggestion(lowest ? 'MONTHLY_COLD_WATCH' : 'MONTHLY_HEAT_WATCH', 'CURRENT_WEATHER', cadence,
      lowest ? 'Top 5 coolest districts over 30 days' : 'Top 5 districts by 30-day average temperature',
      lowest ? 'Lowest rolling 30-day average temperatures' : 'Highest rolling 30-day average temperatures',
      'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, available, expected,
      rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, avgTemperature: row.avgTemp30d, updatedAt: row.climateUpdatedAt })), direction);
  }

  private async rainSuggestion(now: Date, expected: number, cadence: NationalCadence) {
    const windowEnd = cadence === 'DAILY' ? endOfDhakaDay(now) : new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const rows = await this.prisma.dailyWeatherForecast.findMany({
      where: { forecastDate: { gte: startOfDhakaDay(now), lt: windowEnd }, precipitationSum: { not: null } },
      orderBy: [{ forecastDate: 'asc' }, { precipitationSum: 'desc' }],
      include: { district: { select: { id: true, name: true, bnName: true } } },
    });
    const byDistrict = new Map<string, typeof rows[number]>();
    for (const row of rows) if (!byDistrict.has(row.districtId)) byDistrict.set(row.districtId, row);
    const ranked = [...byDistrict.values()].sort((a, b) => (b.precipitationSum ?? 0) - (a.precipitationSum ?? 0)).slice(0, 5);
    if (ranked.length === 0) return null;
    const available = byDistrict.size;
    return this.suggestion('RAIN_WATCH', 'WEATHER_FORECAST', cadence, `Top 5 districts by rain forecast`, `Highest forecast rainfall over the next ${cadence === 'DAILY' ? '24' : '48'} hours`, 'Open-Meteo daily forecast', startOfDhakaDay(now), windowEnd, available, expected, ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, rainfallMm: row.precipitationSum, forecastDate: row.forecastDate })), 'HIGHEST', (ranked[0].precipitationSum ?? 0) >= NOTABLE.rain.heavyMm);
  }

  /** PM2.5 now: highest always offered; cleanest only when at least a few districts are at the EPA "Good" level. */
  private async airSuggestion(now: Date, expected: number, cadence: NationalCadence, direction: Direction) {
    const lowest = direction === 'LOWEST';
    const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const rows = await this.prisma.hourlyAirQuality.findMany({
      where: { forecastTime: { gte: windowStart, lte: now }, pm25: { not: null } },
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { forecastTime: 'desc' }],
      include: { district: { select: { id: true, name: true, bnName: true } } },
    });
    const valid = rows.filter((row) => row.pm25 != null);
    const ranked = [...valid].sort((a, b) => (lowest ? (a.pm25 ?? 0) - (b.pm25 ?? 0) : (b.pm25 ?? 0) - (a.pm25 ?? 0))).slice(0, 5);
    if (ranked.length === 0) return null;
    if (lowest && valid.filter((row) => (row.pm25 ?? Infinity) <= NOTABLE.cleanAir.pm25).length < NOTABLE.cleanAir.minDistricts) return null;
    return this.suggestion(lowest ? 'CLEAN_AIR_WATCH' : 'AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence,
      lowest ? 'Top 5 districts with the cleanest air' : 'Top 5 modeled PM2.5 districts',
      lowest ? 'Lowest modeled PM2.5 values in the latest comparable data window' : 'Highest modeled PM2.5 values in the latest comparable data window',
      'Open-Meteo air-quality model', windowStart, now, rows.length, expected,
      ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, pm25: row.pm25, forecastTime: row.forecastTime })), direction, lowest || (ranked[0].pm25 ?? 0) >= NOTABLE.air.pm25);
  }

  private async heatSuggestion(now: Date, expected: number, cadence: NationalCadence) {
    const rows = await this.prisma.currentWeatherReading.findMany({
      where: { readingTime: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) }, apparentTemperature: { not: null } },
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { readingTime: 'desc' }],
      include: { district: { select: { id: true, name: true, bnName: true } } },
    });
    const ranked = rows.filter((row) => row.apparentTemperature != null).sort((a, b) => (b.apparentTemperature ?? 0) - (a.apparentTemperature ?? 0)).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion('HEAT_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by apparent temperature`, `Highest recent model-based apparent temperature readings`, 'Open-Meteo current weather', new Date(now.getTime() - 3 * 60 * 60 * 1000), now, rows.length, expected, ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, apparentTemperature: row.apparentTemperature, readingTime: row.readingTime })), 'HIGHEST', (ranked[0].apparentTemperature ?? 0) >= NOTABLE.heat.apparentC);
  }

  /** Coolest districts by today's forecast minimum temperature; offered only during a cold spell. */
  private async coldSuggestion(now: Date, expected: number, cadence: NationalCadence) {
    const from = startOfDhakaDay(now);
    const to = endOfDhakaDay(now);
    const rows = await this.prisma.dailyWeatherForecast.findMany({
      where: { forecastDate: { gte: from, lt: to }, temperature2mMin: { not: null } },
      orderBy: [{ forecastDate: 'asc' }],
      include: { district: { select: { id: true, name: true, bnName: true } } },
    });
    const byDistrict = new Map<string, typeof rows[number]>();
    for (const row of rows) if (!byDistrict.has(row.districtId)) byDistrict.set(row.districtId, row);
    const ranked = [...byDistrict.values()].sort((a, b) => (a.temperature2mMin ?? 0) - (b.temperature2mMin ?? 0)).slice(0, 5);
    if (ranked.length === 0) return null;
    if ((ranked[0].temperature2mMin ?? Infinity) > NOTABLE.cold.dailyMinC) return null;
    return this.suggestion('COLD_WATCH', 'WEATHER_FORECAST', cadence, `Top 5 coolest districts`, `Lowest forecast minimum temperatures today`, 'Open-Meteo daily forecast', from, to, byDistrict.size, expected,
      ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, minTemperature: row.temperature2mMin, forecastDate: row.forecastDate })), 'LOWEST');
  }

  /** River discharge against each station's modeled mean: well above (flood signal) or well below (low flow). Only when notable. */
  private async riverSuggestion(now: Date, cadence: NationalCadence, direction: Direction) {
    const lowest = direction === 'LOWEST';
    const rows = await this.prisma.stationFloodForecast.findMany({
      where: { forecastDate: { gte: startOfDay(now), lt: new Date(now.getTime() + 48 * 60 * 60 * 1000) }, riverDischarge: { not: null } },
      distinct: ['stationId'],
      orderBy: [{ stationId: 'asc' }, { forecastDate: 'asc' }],
      include: { station: { select: { id: true, name: true, riverName: true, district: { select: { name: true } } } } },
    });
    // A station without a usable mean has no meaningful ratio, so it can appear in neither direction.
    const measured = rows.filter((row) => row.riverDischargeMean != null && row.riverDischargeMean > 0)
      .map((row) => ({ row, ratio: (row.riverDischarge ?? 0) / (row.riverDischargeMean as number) }));
    const ranked = measured.sort((a, b) => (lowest ? a.ratio - b.ratio : b.ratio - a.ratio)).slice(0, 5);
    if (ranked.length === 0) return null;
    if (lowest ? ranked[0].ratio > NOTABLE.river.low : ranked[0].ratio < NOTABLE.river.high) return null;
    return this.suggestion(lowest ? 'LOW_FLOW_WATCH' : 'RIVER_WATCH', 'RIVER_SIGNAL', cadence,
      lowest ? 'Top 5 river low-flow signals' : 'Top 5 river forecast signals',
      lowest ? 'Stations with the lowest forecast discharge relative to their modeled mean' : 'Stations with the highest forecast discharge relative to their modeled mean',
      'Open-Meteo/GloFAS discharge forecast', startOfDay(now), new Date(now.getTime() + 48 * 60 * 60 * 1000), rows.length, rows.length,
      ranked.map(({ row, ratio }) => ({ stationId: row.stationId, station: row.station.name, river: row.station.riverName, district: row.station.district?.name, discharge: row.riverDischarge, historicalMean: row.riverDischargeMean, ratio: Number(ratio.toFixed(2)), forecastDate: row.forecastDate })), direction, true);
  }

  private async alertSuggestion(now: Date, cadence: NationalCadence) {
    const rows = await this.prisma.alert.findMany({ where: { status: 'ACTIVE' }, include: { areas: { include: { district: { select: { name: true } } } } }, orderBy: { issuedAt: 'desc' }, take: 5 });
    if (rows.length === 0) return null;
    return this.suggestion('ALERT_WATCH', 'ENVIRONMENTAL_ALERT', cadence, `Bangladesh alert watch`, `${rows.length} active environmental alert${rows.length === 1 ? '' : 's'} require editorial review`, 'Delta Signal active alerts', rows.reduce((earliest, row) => row.issuedAt < earliest ? row.issuedAt : earliest, now), now, rows.length, rows.length, rows.map((row) => ({ alertId: row.id, title: row.title, severity: row.severity, issuedAt: row.issuedAt, expiresAt: row.expiresAt, districts: row.areas.map((area) => area.district?.name).filter(Boolean) })));
  }

  /** Coastal districts ranked by forecast wave height for the next Dhaka day with data (marine forecast). */
  private async coastalSuggestion(now: Date, cadence: NationalCadence) {
    const from = startOfDhakaDay(now);
    const to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);
    const [rows, expected] = await Promise.all([
      this.prisma.marineForecast.findMany({
        where: { forecastDate: { gte: from, lt: to }, waveHeightMax: { not: null } },
        orderBy: [{ districtId: 'asc' }, { forecastDate: 'asc' }],
        distinct: ['districtId'],
        include: { district: { select: { id: true, name: true, bnName: true } } },
      }),
      this.prisma.district.count({ where: { isCoastal: true } }),
    ]);
    const ranked = rows.sort((a, b) => (b.waveHeightMax ?? 0) - (a.waveHeightMax ?? 0)).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion(
      'COASTAL_WATCH',
      'WEATHER_FORECAST',
      cadence,
      `Top 5 coastal districts by wave height`,
      `Highest forecast maximum wave height along the coast`,
      'Open-Meteo marine forecast',
      from,
      to,
      rows.length,
      expected,
      ranked.map((row) => ({
        districtId: row.districtId,
        district: row.district.name,
        districtBn: row.district.bnName,
        waveHeightM: row.waveHeightMax,
        swellHeightM: row.swellWaveHeightMax,
        wavePeriodS: row.wavePeriodMax,
        seaSurfaceTemp: row.seaSurfaceTemp,
        forecastDate: row.forecastDate,
      })),
      'HIGHEST',
      (ranked[0].waveHeightMax ?? 0) >= NOTABLE.coastal.roughM,
    );
  }

  /**
   * "This week / this month in Bangladesh": alerts issued inside the window plus the latest 30-day climate extremes.
   * Suggested posts are built from environmental data and alerts only; citizen reports and observations are
   * deliberately not read. The climate lines are always the 30-day rollup, because daily climate history is not
   * retained, and the card labels them that way.
   */
  private async periodSummarySuggestion(now: Date, expected: number, cadence: NationalCadence) {
    const days = cadence === 'MONTHLY' ? 30 : 7;
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const [alerts, wettest, hottest, smokiest, withClimate] = await Promise.all([
      this.prisma.alert.findMany({ where: { issuedAt: { gte: windowStart } }, select: { severity: true } }),
      this.prisma.district.findFirst({ where: { totalPrecip30d: { not: null } }, orderBy: { totalPrecip30d: 'desc' }, select: { name: true, totalPrecip30d: true, climateUpdatedAt: true } }),
      this.prisma.district.findFirst({ where: { avgTemp30d: { not: null } }, orderBy: { avgTemp30d: 'desc' }, select: { name: true, avgTemp30d: true } }),
      this.prisma.district.findFirst({ where: { avgPm25_30d: { not: null } }, orderBy: { avgPm25_30d: 'desc' }, select: { name: true, avgPm25_30d: true } }),
      this.prisma.district.count({ where: { totalPrecip30d: { not: null } } }),
    ]);
    const order = ['EMERGENCY', 'WARNING', 'WATCH', 'INFO'];
    const highest = order.find((level) => alerts.some((a) => a.severity === level)) ?? null;
    const summary = {
      days,
      alerts: { issued: alerts.length, highestSeverity: highest },
      wettest: wettest ? { district: wettest.name, rainfallMm: wettest.totalPrecip30d } : null,
      hottest: hottest ? { district: hottest.name, avgTemperature: hottest.avgTemp30d } : null,
      airQuality: smokiest ? { district: smokiest.name, avgPm25: smokiest.avgPm25_30d } : null,
    };
    return this.suggestion(
      'PERIOD_SUMMARY',
      'CURRENT_WEATHER',
      cadence,
      cadence === 'MONTHLY' ? 'Bangladesh this month' : 'Bangladesh this week',
      `Alerts issued over the last ${days} days and the latest 30-day climate highlights`,
      'Delta Signal alerts and 30-day climate rollup',
      windowStart,
      now,
      withClimate,
      expected,
      [summary],
    );
  }

  private suggestion(series: string, type: NationalSuggestion['type'], cadence: NationalCadence, headline: string, reason: string, sourceLabel: string, windowStart: Date, windowEnd: Date, available: number, expected: number, rows: unknown[], direction: Direction = 'HIGHEST', notable: boolean = direction === 'LOWEST'): NationalSuggestion {
    const coverage = { available, expected, percentage: percent(available, expected) };
    return {
      id: `${series.toLowerCase()}-${cadence.toLowerCase()}-${windowEnd.toISOString().slice(0, 10)}`,
      cadence,
      type,
      series,
      direction,
      notable,
      headline,
      reason,
      quality: coverage.percentage >= 80 ? 'HIGH' : coverage.percentage >= 50 ? 'REVIEW' : 'UNAVAILABLE',
      generatedAt: new Date().toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      sourceLabel,
      coverage,
      sourceSnapshot: { rows },
    };
  }
}
