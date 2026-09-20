import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type NationalCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type NationalSuggestion = {
  id: string;
  cadence: NationalCadence;
  type: 'WEATHER_FORECAST' | 'CURRENT_WEATHER' | 'RIVER_SIGNAL' | 'ENVIRONMENTAL_ALERT' | 'BIODIVERSITY_OBSERVATION';
  series: string;
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

const percent = (available: number, expected: number) => expected === 0 ? 0 : Math.round((available / expected) * 100);

const QUALITY_RANK: Record<NationalSuggestion['quality'], number> = { HIGH: 0, REVIEW: 1, UNAVAILABLE: 2 };

@Injectable()
export class NationalRankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(cadence: NationalCadence = 'DAILY'): Promise<NationalSuggestion[]> {
    const now = new Date();
    const districtCount = await this.prisma.district.count();
    const [rain, air, heat, rivers, alerts, reports, species] = cadence === 'DAILY'
      ? await Promise.all([
        this.rainSuggestion(now, districtCount, cadence),
        this.airSuggestion(now, districtCount, cadence),
        this.heatSuggestion(now, districtCount, cadence),
        this.riverSuggestion(now, cadence),
        this.alertSuggestion(now, cadence),
        this.reportSuggestion(now, cadence),
        this.biodiversitySuggestion(now, cadence),
      ])
      : await Promise.all([
        this.climateSummarySuggestion(now, districtCount, cadence),
        this.climateAirSummarySuggestion(now, districtCount, cadence),
        this.climateHeatSummarySuggestion(now, districtCount, cadence),
        null,
        this.alertSuggestion(now, cadence),
        this.reportSuggestion(now, cadence),
        this.biodiversitySuggestion(now, cadence),
      ]);

    return [rain, air, heat, rivers, alerts, reports, species]
      .filter((suggestion): suggestion is NationalSuggestion => suggestion !== null)
      .sort((a, b) => QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality]);
  }

  private async climateSummarySuggestion(now: Date, expected: number, cadence: NationalCadence) {
    if (cadence === 'MONTHLY') {
      const rows = await this.prisma.district.findMany({ where: { totalPrecip30d: { not: null } }, select: { id: true, name: true, bnName: true, totalPrecip30d: true, climateUpdatedAt: true }, orderBy: { totalPrecip30d: 'desc' }, take: 5 });
      return this.suggestion('MONTHLY_RAIN_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by 30-day rainfall`, `Highest rolling 30-day precipitation totals`, 'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, rows.length, expected, rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, rainfallMm: row.totalPrecip30d, updatedAt: row.climateUpdatedAt })));
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
    const ranked = [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion('WEEKLY_RAIN_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 wettest districts this week`, `Highest aggregated rainfall across the last 7 days`, 'Union daily climate aggregates', windowStart, now, totals.size, expected, ranked.map(({ district, total }) => ({ districtId: district.id, district: district.name, districtBn: district.bnName, rainfallMm: Number(total.toFixed(1)) })));
  }

  private async climateAirSummarySuggestion(now: Date, expected: number, cadence: NationalCadence) {
    if (cadence === 'MONTHLY') {
      const rows = await this.prisma.district.findMany({ where: { avgPm25_30d: { not: null } }, select: { id: true, name: true, bnName: true, avgPm25_30d: true, climateUpdatedAt: true }, orderBy: { avgPm25_30d: 'desc' }, take: 5 });
      return this.suggestion('MONTHLY_AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by 30-day modeled PM2.5`, `Highest rolling 30-day modeled PM2.5 averages`, 'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, rows.length, expected, rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, avgPm25: row.avgPm25_30d, updatedAt: row.climateUpdatedAt })));
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
    const ranked = [...totals.values()].map((item) => ({ ...item, average: item.sum / item.count })).sort((a, b) => b.average - a.average).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion('WEEKLY_AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by weekly modeled PM2.5`, `Highest average modeled PM2.5 across the last 7 days`, 'Union daily climate aggregates', windowStart, now, totals.size, expected, ranked.map(({ district, average }) => ({ districtId: district.id, district: district.name, districtBn: district.bnName, avgPm25: Number(average.toFixed(1)) })));
  }

  private async climateHeatSummarySuggestion(now: Date, expected: number, cadence: NationalCadence) {
    if (cadence === 'MONTHLY') {
      const rows = await this.prisma.district.findMany({ where: { avgTemp30d: { not: null } }, select: { id: true, name: true, bnName: true, avgTemp30d: true, climateUpdatedAt: true }, orderBy: { avgTemp30d: 'desc' }, take: 5 });
      return this.suggestion('MONTHLY_HEAT_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by 30-day average temperature`, `Highest rolling 30-day average temperatures`, 'Delta Signal 30-day climate rollup', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now, rows.length, expected, rows.map((row) => ({ districtId: row.id, district: row.name, districtBn: row.bnName, avgTemperature: row.avgTemp30d, updatedAt: row.climateUpdatedAt })));
    }
    return null;
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
    return this.suggestion('RAIN_WATCH', 'WEATHER_FORECAST', cadence, `Top 5 districts by rain forecast`, `Highest forecast rainfall over the next ${cadence === 'DAILY' ? '24' : '48'} hours`, 'Open-Meteo daily forecast', startOfDhakaDay(now), windowEnd, available, expected, ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, rainfallMm: row.precipitationSum, forecastDate: row.forecastDate })));
  }

  private async airSuggestion(now: Date, expected: number, cadence: NationalCadence) {
    const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const rows = await this.prisma.hourlyAirQuality.findMany({
      where: { forecastTime: { gte: windowStart, lte: now }, pm25: { not: null } },
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { forecastTime: 'desc' }],
      include: { district: { select: { id: true, name: true, bnName: true } } },
    });
    const ranked = rows.filter((row) => row.pm25 != null).sort((a, b) => (b.pm25 ?? 0) - (a.pm25 ?? 0)).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion('AIR_QUALITY_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 modeled PM2.5 districts`, `Highest modeled PM2.5 values in the latest comparable data window`, 'Open-Meteo air-quality model', windowStart, now, rows.length, expected, ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, pm25: row.pm25, forecastTime: row.forecastTime })));
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
    return this.suggestion('HEAT_WATCH', 'CURRENT_WEATHER', cadence, `Top 5 districts by apparent temperature`, `Highest recent model-based apparent temperature readings`, 'Open-Meteo current weather', new Date(now.getTime() - 3 * 60 * 60 * 1000), now, rows.length, expected, ranked.map((row) => ({ districtId: row.districtId, district: row.district.name, districtBn: row.district.bnName, apparentTemperature: row.apparentTemperature, readingTime: row.readingTime })));
  }

  private async riverSuggestion(now: Date, cadence: NationalCadence) {
    const rows = await this.prisma.stationFloodForecast.findMany({
      where: { forecastDate: { gte: startOfDay(now), lt: new Date(now.getTime() + 48 * 60 * 60 * 1000) }, riverDischarge: { not: null } },
      distinct: ['stationId'],
      orderBy: [{ stationId: 'asc' }, { forecastDate: 'asc' }],
      include: { station: { select: { id: true, name: true, riverName: true, district: { select: { name: true } } } } },
    });
    const ranked = rows.map((row) => ({ row, ratio: row.riverDischargeMean && row.riverDischargeMean > 0 ? (row.riverDischarge ?? 0) / row.riverDischargeMean : 0 }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 5);
    if (ranked.length === 0) return null;
    return this.suggestion('RIVER_WATCH', 'RIVER_SIGNAL', cadence, `Top 5 river forecast signals`, `Stations with the highest forecast discharge relative to their modeled mean`, 'Open-Meteo/GloFAS discharge forecast', startOfDay(now), new Date(now.getTime() + 48 * 60 * 60 * 1000), rows.length, rows.length, ranked.map(({ row, ratio }) => ({ stationId: row.stationId, station: row.station.name, river: row.station.riverName, district: row.station.district?.name, discharge: row.riverDischarge, historicalMean: row.riverDischargeMean, ratio: Number(ratio.toFixed(2)), forecastDate: row.forecastDate })));
  }

  private async alertSuggestion(now: Date, cadence: NationalCadence) {
    const rows = await this.prisma.alert.findMany({ where: { status: 'ACTIVE' }, include: { areas: { include: { district: { select: { name: true } } } } }, orderBy: { issuedAt: 'desc' }, take: 5 });
    if (rows.length === 0) return null;
    return this.suggestion('ALERT_WATCH', 'ENVIRONMENTAL_ALERT', cadence, `Bangladesh alert watch`, `${rows.length} active environmental alert${rows.length === 1 ? '' : 's'} require editorial review`, 'Delta Signal active alerts', rows.reduce((earliest, row) => row.issuedAt < earliest ? row.issuedAt : earliest, now), now, rows.length, rows.length, rows.map((row) => ({ alertId: row.id, title: row.title, severity: row.severity, issuedAt: row.issuedAt, expiresAt: row.expiresAt, districts: row.areas.map((area) => area.district?.name).filter(Boolean) })));
  }

  private async reportSuggestion(now: Date, cadence: NationalCadence) {
    const windowStart = new Date(now.getTime() - (cadence === 'MONTHLY' ? 30 : 7) * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.citizenReport.findMany({ where: { status: { in: ['VERIFIED', 'RESOLVED'] }, createdAt: { gte: windowStart } }, include: { district: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 });
    if (rows.length === 0) return null;
    return this.suggestion('COMMUNITY_SIGNALS', 'ENVIRONMENTAL_ALERT', cadence, `Verified community environmental signals`, `${rows.length} verified or resolved reports were recorded in the last ${cadence === 'MONTHLY' ? '30 days' : '7 days'}`, 'Delta Signal verified citizen reports', windowStart, now, rows.length, 1, rows.slice(0, 5).map((row) => ({ reportId: row.id, category: row.category, district: row.district?.name, reportedAt: row.createdAt })));
  }

  private async biodiversitySuggestion(now: Date, cadence: NationalCadence) {
    const windowStart = new Date(now.getTime() - (cadence === 'MONTHLY' ? 30 : 7) * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.occurrence.findMany({ where: { observedAt: { gte: windowStart } }, include: { species: { select: { canonicalName: true, vernacularName: true, imageUrl: true } }, district: { select: { name: true } } }, orderBy: { observedAt: 'desc' }, take: 5 });
    if (rows.length === 0) return null;
    return this.suggestion('WILD_BANGLADESH', 'BIODIVERSITY_OBSERVATION', cadence, `Recent biodiversity observations`, `${rows.length} recent GBIF occurrence record${rows.length === 1 ? '' : 's'} are available for editorial review`, 'GBIF biodiversity occurrences', windowStart, now, rows.length, 1, rows.map((row) => ({ occurrenceId: row.id, species: row.species.canonicalName, commonName: row.species.vernacularName, district: row.district?.name, observedAt: row.observedAt, imageUrl: row.species.imageUrl })));
  }

  private suggestion(series: string, type: NationalSuggestion['type'], cadence: NationalCadence, headline: string, reason: string, sourceLabel: string, windowStart: Date, windowEnd: Date, available: number, expected: number, rows: unknown[]): NationalSuggestion {
    const coverage = { available, expected, percentage: percent(available, expected) };
    return {
      id: `${series.toLowerCase()}-${cadence.toLowerCase()}-${windowEnd.toISOString().slice(0, 10)}`,
      cadence,
      type,
      series,
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
