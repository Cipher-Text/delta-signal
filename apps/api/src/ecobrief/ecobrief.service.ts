import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ObservationTrustLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EcoBriefQueryDto } from './dto/ecobrief-query.dto';

const TOPICS = ['climate', 'biodiversity', 'emissions', 'observations'] as const;
type Topic = (typeof TOPICS)[number];

const EMISSION_TOTAL = 'EN.GHG.ALL.MT.CE.AR5';

type ClimateRow = {
  id: string;
  name: string;
  avgTemp30d: number | null;
  minTemp30d: number | null;
  maxTemp30d: number | null;
  totalPrecip30d: number | null;
  avgHumidity30d: number | null;
  avgPm25_30d: number | null;
  climateUpdatedAt: Date | null;
};

function mean(rows: ClimateRow[], key: keyof ClimateRow): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

@Injectable()
export class EcoBriefService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(query: EcoBriefQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (from > to) throw new BadRequestException('from must be before or equal to to');
    if (to.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('to cannot be in the future');
    }

    const topics = this.parseTopics(query.topics);
    const area = await this.resolveArea(query.areaType, query.areaId);
    const toExclusive = new Date(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const period = { from: from.toISOString(), to: to.toISOString() };
    const sections: Record<string, unknown> = {};

    if (topics.includes('climate')) sections.climate = await this.climate(area.districtIds);
    if (topics.includes('biodiversity')) {
      sections.biodiversity = await this.biodiversity(area, from, toExclusive);
    }
    if (topics.includes('emissions')) {
      sections.emissions = await this.emissions(area.type, from.getUTCFullYear(), to.getUTCFullYear());
    }
    if (topics.includes('observations')) {
      sections.observations = await this.observations(area.districtIds, from, toExclusive);
    }

    const summary: string[] = [];
    const climateSection = sections.climate as Awaited<ReturnType<EcoBriefService['climate']>> | undefined;
    if (climateSection?.available) {
      summary.push(`Climate values summarize the latest rolling 30-day window across ${climateSection.coverage.reportingDistricts} reporting districts.`);
    }
    const biodiversitySection = sections.biodiversity as Awaited<ReturnType<EcoBriefService['biodiversity']>> | undefined;
    if (biodiversitySection?.coverage.occurrenceRecords) {
      summary.push(`GBIF recorded ${biodiversitySection.coverage.occurrenceRecords} dated occurrence records across ${biodiversitySection.coverage.speciesRecorded} species during the selected period.`);
    }
    const emissionsSection = sections.emissions as Awaited<ReturnType<EcoBriefService['emissions']>> | undefined;
    if (emissionsSection?.points.length) {
      const first = emissionsSection.points[0];
      const last = emissionsSection.points[emissionsSection.points.length - 1];
      if (first.year !== last.year && first.value !== 0) {
        const change = ((last.value - first.value) / Math.abs(first.value)) * 100;
        summary.push(`The reported national emissions estimate changed ${change >= 0 ? 'by +' : 'by '}${change.toFixed(1)}% from ${first.year} to ${last.year}.`);
      } else {
        summary.push(`The latest available national emissions estimate is ${last.value.toFixed(1)} ${last.unit} for ${last.year}.`);
      }
    }
    const observationSection = sections.observations as Awaited<ReturnType<EcoBriefService['observations']>> | undefined;
    if (observationSection) {
      summary.push(`${observationSection.coverage.observations} non-flagged community observation records fall within the selected period.`);
    }
    if (!summary.length) summary.push('No records were found for the selected topics and period.');

    return {
      title: `${area.name} environmental data brief`,
      summary,
      generatedAt: new Date().toISOString(),
      area: { type: area.type, id: area.id, name: area.name },
      period,
      topics,
      sections,
    };
  }

  private parseTopics(value?: string): Topic[] {
    if (!value) return [...TOPICS];
    const requested = [...new Set(value.split(',').map((topic) => topic.trim()).filter(Boolean))];
    const invalid = requested.filter((topic) => !TOPICS.includes(topic as Topic));
    if (invalid.length) throw new BadRequestException(`Unsupported topics: ${invalid.join(', ')}`);
    if (!requested.length) throw new BadRequestException('Select at least one topic');
    return requested as Topic[];
  }

  private async resolveArea(type: EcoBriefQueryDto['areaType'], id?: string) {
    if (type === 'COUNTRY') {
      const rows = await this.prisma.district.findMany({ select: { id: true } });
      return { type, id: null, name: 'Bangladesh', districtIds: rows.map((row) => row.id) };
    }
    if (type === 'DIVISION') {
      const division = await this.prisma.division.findUnique({
        where: { id },
        select: { id: true, name: true, districts: { select: { id: true } } },
      });
      if (!division) throw new NotFoundException('Division not found');
      return {
        type,
        id: division.id,
        name: division.name,
        districtIds: division.districts.map((district) => district.id),
      };
    }
    const district = await this.prisma.district.findUnique({
      where: { id },
      select: { id: true, name: true, division: { select: { name: true } } },
    });
    if (!district) throw new NotFoundException('District not found');
    return {
      type,
      id: district.id,
      name: `${district.name}, ${district.division.name}`,
      districtIds: [district.id],
    };
  }

  private async climate(districtIds: string[]) {
    const rows = await this.prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: {
        id: true,
        name: true,
        avgTemp30d: true,
        minTemp30d: true,
        maxTemp30d: true,
        totalPrecip30d: true,
        avgHumidity30d: true,
        avgPm25_30d: true,
        climateUpdatedAt: true,
      },
    }) as ClimateRow[];
    const updatedAt = rows
      .map((row) => row.climateUpdatedAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const reportingRows = rows.filter((row) => row.climateUpdatedAt != null);

    return {
      available: reportingRows.length > 0,
      source: 'Open-Meteo 30-day rolling climate aggregates',
      periodLabel: 'Latest rolling 30 days',
      coverage: { reportingDistricts: reportingRows.length, totalDistricts: rows.length },
      updatedAt: updatedAt?.toISOString() ?? null,
      metrics: [
        { key: 'temperature', label: 'Mean temperature', value: mean(reportingRows, 'avgTemp30d'), unit: '°C' },
        { key: 'rainfall', label: 'Mean district precipitation total', value: mean(reportingRows, 'totalPrecip30d'), unit: 'mm / 30 days' },
        { key: 'humidity', label: 'Mean relative humidity', value: mean(reportingRows, 'avgHumidity30d'), unit: '%' },
        { key: 'pm25', label: 'Mean PM2.5', value: mean(reportingRows, 'avgPm25_30d'), unit: 'µg/m³' },
      ],
      note: 'These are the latest 30-day rolling averages and are not filtered by the selected report dates. Regional values are unweighted means of reporting district values.',
    };
  }

  private async biodiversity(
    area: { type: string; districtIds: string[] },
    from: Date,
    toExclusive: Date,
  ) {
    const where = {
      districtId: { in: area.districtIds },
      observedAt: { gte: from, lt: toExclusive },
    };
    const [count, grouped] = await Promise.all([
      this.prisma.occurrence.count({ where }),
      this.prisma.occurrence.groupBy({ by: ['speciesId'], where, _count: { _all: true } }),
    ]);
    const top = grouped.sort((a, b) => b._count._all - a._count._all).slice(0, 5);
    const species = top.length
      ? await this.prisma.species.findMany({
          where: { id: { in: top.map((row) => row.speciesId) } },
          select: { id: true, canonicalName: true, vernacularName: true },
        })
      : [];
    const byId = new Map(species.map((item) => [item.id, item]));
    return {
      available: true,
      source: 'GBIF occurrence records',
      periodLabel: 'Observation date within selected period',
      coverage: { occurrenceRecords: count, speciesRecorded: grouped.length },
      topSpecies: top.map((row) => ({
        scientificName: byId.get(row.speciesId)?.canonicalName ?? 'Unknown species',
        commonName: byId.get(row.speciesId)?.vernacularName ?? null,
        records: row._count._all,
      })),
      note: 'Occurrence counts reflect recorded sightings and sampling effort; they do not estimate population size or abundance. Records without a district assignment or observation date are excluded from this geographic period.',
    };
  }

  private async emissions(areaType: string, fromYear: number, toYear: number) {
    if (areaType !== 'COUNTRY') {
      return {
        available: false,
        source: 'World Bank Climate Change data',
        periodLabel: 'Annual national estimates',
        coverage: null,
        points: [],
        note: 'Emissions data is available at Bangladesh national level only; it cannot be attributed to this subnational area.',
      };
    }
    const rows = await this.prisma.nationalEmissionReading.findMany({
      where: { indicatorCode: EMISSION_TOTAL, year: { gte: fromYear, lte: toYear } },
      orderBy: { year: 'asc' },
      select: { year: true, value: true, unit: true, updatedAt: true },
    });
    const points = rows.filter((row) => row.value != null).map((row) => ({
      year: row.year,
      value: row.value as number,
      unit: row.unit,
    }));
    return {
      available: points.length > 0,
      source: 'World Bank Climate Change data',
      indicator: 'Total greenhouse gas emissions',
      periodLabel: 'Annual national estimates',
      coverage: { yearsWithData: points.length },
      points,
      updatedAt: rows.map((row) => row.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
      note: 'National estimates in Mt CO₂e; these values are not available at division or district level.',
    };
  }

  private async observations(districtIds: string[], from: Date, toExclusive: Date) {
    const where = {
      districtId: { in: districtIds },
      observedAt: { gte: from, lt: toExclusive },
      trustLevel: { not: ObservationTrustLevel.FLAGGED },
    };
    const [count, byCategory, byTrust] = await Promise.all([
      this.prisma.observation.count({ where }),
      this.prisma.observation.groupBy({ by: ['category'], where, _count: { _all: true } }),
      this.prisma.observation.groupBy({ by: ['trustLevel'], where, _count: { _all: true } }),
    ]);
    return {
      available: true,
      source: 'Delta Signal community observations',
      periodLabel: 'Observation date within selected period',
      coverage: { observations: count },
      byCategory: byCategory.map((row) => ({ category: row.category, count: row._count._all })),
      byTrustLevel: byTrust.map((row) => ({ trustLevel: row.trustLevel, count: row._count._all })),
      note: 'Flagged records and records without a district assignment or observation date are excluded. Community submissions have different verification levels; review the trust-level breakdown before drawing conclusions.',
    };
  }
}
