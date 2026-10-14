import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ObservationTrustLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EcoBriefQueryDto } from './dto/ecobrief-query.dto';

const TOPICS = ['climate', 'biodiversity', 'emissions', 'observations'] as const;
type Topic = (typeof TOPICS)[number];

const EMISSION_TOTAL = 'EN.GHG.ALL.MT.CE.AR5';
const EMISSION_INDICATORS = [
  { code: EMISSION_TOTAL, key: 'total', label: 'Total greenhouse gases' },
  { code: 'EN.GHG.CO2.MT.CE.AR5', key: 'co2', label: 'Carbon dioxide (CO₂)' },
  { code: 'EN.GHG.CH4.MT.CE.AR5', key: 'ch4', label: 'Methane (CH₄)' },
  { code: 'EN.GHG.N2O.MT.CE.AR5', key: 'n2o', label: 'Nitrous oxide (N₂O)' },
] as const;

/** Sources with the licence under which each provider publishes its data. Shown in every brief's Methods and References. */
const SOURCES = {
  climate: {
    name: 'Open-Meteo',
    description: 'Open-Meteo weather and air-quality models, aggregated to 30-day rolling district values by Delta Signal',
    licence: 'CC BY 4.0',
    url: 'https://open-meteo.com/',
  },
  biodiversity: {
    name: 'GBIF',
    description: 'Global Biodiversity Information Facility occurrence records mapped to Bangladesh districts',
    licence: 'CC0, CC BY or CC BY-NC per record (see GBIF)',
    url: 'https://www.gbif.org/',
  },
  emissions: {
    name: 'World Bank Climate Change Knowledge Portal',
    description: 'National greenhouse gas emissions estimates (AR5 global warming potentials), Mt CO₂e',
    licence: 'CC BY 4.0',
    url: 'https://data.worldbank.org/',
  },
  observations: {
    name: 'Delta Signal community observations',
    description: 'Field observations submitted by citizens and researchers, labelled by review level',
    licence: 'Platform terms of use',
    url: null,
  },
} as const;

type ClimateStat = { mean: number | null; min: number | null; max: number | null; n: number };

function stat(values: Array<number | null>): ClimateStat {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return { mean: null, min: null, max: null, n: 0 };
  return { mean: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v), n: v.length };
}

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
    const trust = query.trust === 'research' ? 'research' : 'all';
    const area = await this.resolveArea(query.areaType, query.areaId);
    const toExclusive = new Date(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const period = { from: from.toISOString(), to: to.toISOString() };
    const sections: Record<string, unknown> = {};

    if (topics.includes('climate')) sections.climate = await this.climate(area.districtIds, area.districtNames);
    if (topics.includes('biodiversity')) {
      sections.biodiversity = await this.biodiversity(area, from, toExclusive);
    }
    if (topics.includes('emissions')) {
      sections.emissions = await this.emissions(area.type, from.getUTCFullYear(), to.getUTCFullYear());
    }
    if (topics.includes('observations')) {
      sections.observations = await this.observations(area.districtIds, from, toExclusive, trust);
    }

    const summary: string[] = [];
    const climateSection = sections.climate as Awaited<ReturnType<EcoBriefService['climate']>> | undefined;
    if (climateSection?.available) {
      summary.push(
        `Climate values are the latest rolling 30-day snapshot across ${climateSection.coverage.reportingDistricts} reporting ${climateSection.coverage.reportingDistricts === 1 ? 'district' : 'districts'} and do not vary with the selected dates.`,
      );
    }
    const biodiversitySection = sections.biodiversity as Awaited<ReturnType<EcoBriefService['biodiversity']>> | undefined;
    if (biodiversitySection?.coverage.occurrenceRecords) {
      summary.push(`GBIF recorded ${biodiversitySection.coverage.occurrenceRecords.toLocaleString('en-GB')} dated occurrence records across ${biodiversitySection.coverage.speciesRecorded.toLocaleString('en-GB')} species during the selected period.`);
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
      const label = trust === 'research' ? 'research-grade observation records' : 'non-flagged community observation records';
      summary.push(`${observationSection.coverage.observations.toLocaleString('en-GB')} ${label} fall within the selected period.`);
    }
    if (!summary.length) summary.push('No records were found for the selected topics and period.');

    const generatedAt = new Date();
    const queryEcho = {
      areaType: area.type,
      areaId: area.id,
      from: query.from.slice(0, 10),
      to: query.to.slice(0, 10),
      topics,
      trust,
    };
    // Same query + same stored data = same ID, so two people can confirm they are reading the same brief.
    const reportId = `EB-${createHash('sha256').update(JSON.stringify(queryEcho)).digest('hex').slice(0, 8).toUpperCase()}`;

    const methods = this.methods(topics, { climateSection, biodiversitySection, emissionsSection, observationSection });
    const limitations = this.limitations(sections, trust);

    return {
      title: `${area.name} environmental data brief`,
      summary,
      generatedAt: generatedAt.toISOString(),
      reportId,
      query: queryEcho,
      area: { type: area.type, id: area.id, name: area.name },
      period,
      topics,
      sections,
      methods,
      limitations,
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
      const rows = await this.prisma.district.findMany({ select: { id: true, name: true } });
      return {
        type,
        id: null,
        name: 'Bangladesh',
        districtIds: rows.map((row) => row.id),
        districtNames: new Map(rows.map((row) => [row.id, row.name])),
      };
    }
    if (type === 'DIVISION') {
      const division = await this.prisma.division.findUnique({
        where: { id },
        select: { id: true, name: true, districts: { select: { id: true, name: true } } },
      });
      if (!division) throw new NotFoundException('Division not found');
      return {
        type,
        id: division.id,
        name: division.name,
        districtIds: division.districts.map((district) => district.id),
        districtNames: new Map(division.districts.map((district) => [district.id, district.name])),
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
      districtNames: new Map([[district.id, district.name]]),
    };
  }

  private async climate(districtIds: string[], names: Map<string, string>) {
    const rows = (await this.prisma.district.findMany({
      where: { id: { in: districtIds } },
      orderBy: { name: 'asc' },
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
    })) as ClimateRow[];
    const updatedAt = rows
      .map((row) => row.climateUpdatedAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const reportingRows = rows.filter((row) => row.climateUpdatedAt != null);

    const statsOf = (key: keyof ClimateRow) => stat(reportingRows.map((row) => row[key] as number | null));
    const defs = [
      { key: 'temperature', label: 'Mean temperature', unit: '°C', field: 'avgTemp30d' as const },
      { key: 'rainfall', label: 'Mean district precipitation total', unit: 'mm / 30 days', field: 'totalPrecip30d' as const },
      { key: 'humidity', label: 'Mean relative humidity', unit: '%', field: 'avgHumidity30d' as const },
      { key: 'pm25', label: 'Mean PM2.5', unit: 'µg/m³', field: 'avgPm25_30d' as const },
    ];

    return {
      available: reportingRows.length > 0,
      source: 'Open-Meteo 30-day rolling climate aggregates',
      periodLabel: 'Latest rolling 30 days',
      /** The values are a current snapshot and do not follow the selected report dates. */
      periodAligned: false,
      coverage: { reportingDistricts: reportingRows.length, totalDistricts: rows.length },
      updatedAt: updatedAt?.toISOString() ?? null,
      metrics: defs.map((d) => ({ key: d.key, label: d.label, value: statsOf(d.field).mean, unit: d.unit })),
      /** Spread across reporting districts: n districts, with the lowest and highest district value. */
      statistics: defs.map((d) => ({ key: d.key, label: d.label, unit: d.unit, ...statsOf(d.field) })),
      districts: reportingRows.map((row) => ({
        id: row.id,
        name: names.get(row.id) ?? row.name,
        temperature: row.avgTemp30d,
        temperatureMin: row.minTemp30d,
        temperatureMax: row.maxTemp30d,
        rainfall: row.totalPrecip30d,
        humidity: row.avgHumidity30d,
        pm25: row.avgPm25_30d,
      })),
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
    const [count, grouped, undated, unmapped] = await Promise.all([
      this.prisma.occurrence.count({ where }),
      this.prisma.occurrence.groupBy({
        by: ['speciesId'],
        where,
        _count: { _all: true },
        _min: { observedAt: true },
        _max: { observedAt: true },
      }),
      this.prisma.occurrence.count({ where: { districtId: { in: area.districtIds }, observedAt: null } }),
      area.type === 'COUNTRY' ? this.prisma.occurrence.count({ where: { districtId: null } }) : Promise.resolve(null),
    ]);
    const ranked = grouped.sort((a, b) => b._count._all - a._count._all);
    const species = ranked.length
      ? await this.prisma.species.findMany({
          where: { id: { in: ranked.map((row) => row.speciesId) } },
          select: { id: true, canonicalName: true, vernacularName: true, kingdom: true, family: true, iucnStatus: true },
        })
      : [];
    const byId = new Map(species.map((item) => [item.id, item]));
    // GBIF can hold several taxon rows under one scientific name (synonyms, subspecies), so fold by name:
    // a researcher counting "species" wants each name once, with all of its records.
    const byName = new Map<
      string,
      { scientificName: string; commonName: string | null; kingdom: string | null; family: string | null; iucnStatus: string | null; records: number; firstObserved: string | null; lastObserved: string | null }
    >();
    for (const row of ranked) {
      const sp = byId.get(row.speciesId);
      const name = sp?.canonicalName ?? 'Unknown species';
      const first = row._min.observedAt?.toISOString().slice(0, 10) ?? null;
      const last = row._max.observedAt?.toISOString().slice(0, 10) ?? null;
      const cur = byName.get(name);
      if (!cur) {
        byName.set(name, {
          scientificName: name,
          commonName: sp?.vernacularName ?? null,
          kingdom: sp?.kingdom ?? null,
          family: sp?.family ?? null,
          iucnStatus: sp?.iucnStatus ?? null,
          records: row._count._all,
          firstObserved: first,
          lastObserved: last,
        });
      } else {
        cur.records += row._count._all;
        cur.commonName = cur.commonName ?? sp?.vernacularName ?? null;
        cur.kingdom = cur.kingdom ?? sp?.kingdom ?? null;
        cur.family = cur.family ?? sp?.family ?? null;
        cur.iucnStatus = cur.iucnStatus ?? sp?.iucnStatus ?? null;
        if (first && (!cur.firstObserved || first < cur.firstObserved)) cur.firstObserved = first;
        if (last && (!cur.lastObserved || last > cur.lastObserved)) cur.lastObserved = last;
      }
    }
    const rows = [...byName.values()].sort((a, b) => b.records - a.records || a.scientificName.localeCompare(b.scientificName));
    // Kingdom totals use every species, not just the rows listed below.
    const kingdoms = new Map<string, { species: number; records: number }>();
    for (const row of rows) {
      const key = row.kingdom ?? 'Unassigned';
      const cur = kingdoms.get(key) ?? { species: 0, records: 0 };
      kingdoms.set(key, { species: cur.species + 1, records: cur.records + row.records });
    }
    const LIST_CAP = 300;
    return {
      available: true,
      source: 'GBIF occurrence records',
      periodLabel: 'Observation date within selected period',
      coverage: { occurrenceRecords: count, speciesRecorded: rows.length },
      topSpecies: rows.slice(0, 5).map((r) => ({ scientificName: r.scientificName, commonName: r.commonName, records: r.records })),
      /** Species with records in the period, most-recorded first (capped at 300 rows). */
      species: rows.slice(0, LIST_CAP),
      speciesListTruncated: rows.length > LIST_CAP,
      byKingdom: [...kingdoms.entries()]
        .map(([kingdom, v]) => ({ kingdom, species: v.species, records: v.records }))
        .sort((a, b) => b.records - a.records),
      excluded: { undatedInArea: undated, unmappedNationwide: unmapped },
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
        series: [],
        note: 'Emissions data is available at Bangladesh national level only; it cannot be attributed to this subnational area.',
      };
    }
    const rows = await this.prisma.nationalEmissionReading.findMany({
      where: { indicatorCode: { in: EMISSION_INDICATORS.map((i) => i.code) }, year: { gte: fromYear, lte: toYear } },
      orderBy: { year: 'asc' },
      select: { indicatorCode: true, year: true, value: true, unit: true, updatedAt: true },
    });
    const pointsFor = (code: string) =>
      rows
        .filter((row) => row.indicatorCode === code && row.value != null)
        .map((row) => ({ year: row.year, value: row.value as number, unit: row.unit }));
    const points = pointsFor(EMISSION_TOTAL);
    return {
      available: points.length > 0,
      source: 'World Bank Climate Change data',
      indicator: 'Total greenhouse gas emissions',
      periodLabel: 'Annual national estimates',
      coverage: { yearsWithData: points.length },
      points,
      /** Total plus each gas, annual, in Mt CO₂e. */
      series: EMISSION_INDICATORS.map((i) => ({ key: i.key, label: i.label, indicatorCode: i.code, points: pointsFor(i.code) })),
      updatedAt: rows.map((row) => row.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
      note: 'National estimates in Mt CO₂e; these values are not available at division or district level.',
    };
  }

  private async observations(districtIds: string[], from: Date, toExclusive: Date, trust: 'all' | 'research') {
    const base = {
      districtId: { in: districtIds },
      observedAt: { gte: from, lt: toExclusive },
      trustLevel: { not: ObservationTrustLevel.FLAGGED },
    };
    const where = trust === 'research' ? { ...base, trustLevel: ObservationTrustLevel.RESEARCH_GRADE } : base;
    const [count, byCategory, byTrust, unverified] = await Promise.all([
      this.prisma.observation.count({ where }),
      this.prisma.observation.groupBy({ by: ['category'], where, _count: { _all: true } }),
      this.prisma.observation.groupBy({ by: ['trustLevel'], where: base, _count: { _all: true } }),
      this.prisma.observation.count({ where: { ...base, trustLevel: ObservationTrustLevel.UNVERIFIED } }),
    ]);
    return {
      available: true,
      source: 'Delta Signal community observations',
      periodLabel: 'Observation date within selected period',
      trustFilter: trust,
      coverage: { observations: count },
      byCategory: byCategory.map((row) => ({ category: row.category, count: row._count._all })),
      /** Always the full review-level breakdown of the period, whatever the filter, so the filter's effect is visible. */
      byTrustLevel: byTrust.map((row) => ({ trustLevel: row.trustLevel, count: row._count._all })),
      unverifiedInPeriod: unverified,
      note: 'Flagged records and records without a district assignment or observation date are excluded. Community submissions have different verification levels; review the trust-level breakdown before drawing conclusions.',
    };
  }

  private methods(
    topics: Topic[],
    s: {
      climateSection?: { updatedAt: string | null; coverage: { reportingDistricts: number; totalDistricts: number } };
      biodiversitySection?: unknown;
      emissionsSection?: { updatedAt?: string | null };
      observationSection?: unknown;
    },
  ) {
    return {
      retrievedAt: new Date().toISOString(),
      sources: topics.map((topic) => ({
        topic,
        ...SOURCES[topic],
        dataUpdatedAt:
          topic === 'climate' ? s.climateSection?.updatedAt ?? null : topic === 'emissions' ? s.emissionsSection?.updatedAt ?? null : null,
      })),
      notes: [
        'Summary statements are computed directly from the selected records. No causes are inferred.',
        'Dates are interpreted as calendar dates in UTC; display times elsewhere in Delta Signal use Bangladesh time (UTC+6).',
      ],
    };
  }

  private limitations(sections: Record<string, unknown>, trust: 'all' | 'research'): string[] {
    const out: string[] = [];
    const climate = sections.climate as { note: string; coverage: { reportingDistricts: number; totalDistricts: number } } | undefined;
    if (climate) {
      out.push(climate.note);
      if (climate.coverage.reportingDistricts < climate.coverage.totalDistricts) {
        out.push(`Climate coverage is partial: ${climate.coverage.reportingDistricts} of ${climate.coverage.totalDistricts} districts reported.`);
      }
    }
    const bio = sections.biodiversity as { note: string; excluded: { undatedInArea: number; unmappedNationwide: number | null } } | undefined;
    if (bio) {
      out.push(bio.note);
      if (bio.excluded.undatedInArea > 0) out.push(`${bio.excluded.undatedInArea} occurrence records in this area have no observation date and are excluded.`);
      if (bio.excluded.unmappedNationwide) out.push(`${bio.excluded.unmappedNationwide} occurrence records have no district assignment and cannot be placed in any area.`);
    }
    const em = sections.emissions as { note: string } | undefined;
    if (em) out.push(em.note);
    const obs = sections.observations as { note: string } | undefined;
    if (obs) {
      out.push(obs.note);
      if (trust === 'research') out.push('Observation counts are restricted to research-grade records; lower review levels are listed in the review-level table for context only.');
    }
    return out;
  }
}
