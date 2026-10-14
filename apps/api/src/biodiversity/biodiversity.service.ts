import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GbifClient } from './gbif.client';
import { GbifOccurrenceRecord } from './dto/gbif-response.dto';
import { clampPagination } from '../common/pagination';

const MAX_RECORDS_PER_SYNC = 1000;

function parseGbifEventDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const SPECIES_SELECT = {
  id: true,
  gbifKey: true,
  canonicalName: true,
  vernacularName: true,
  kingdom: true,
  phylum: true,
  class: true,
  order: true,
  family: true,
  genus: true,
  iucnStatus: true,
  imageUrl: true,
  _count: { select: { occurrences: true } },
} as const;

const OCCURRENCE_SELECT = {
  id: true,
  speciesId: true,
  districtId: true,
  lat: true,
  lng: true,
  observedAt: true,
  recordedBy: true,
  basisOfRecord: true,
  createdAt: true,
  species: { select: SPECIES_SELECT },
  district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class BiodiversityService {
  private readonly logger = new Logger(BiodiversityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gbifClient: GbifClient,
  ) {}

  /** Nearest-centroid approximation — no polygon boundaries exist yet (see PostGIS open item). */
  private nearestDistrictId(
    lat: number,
    lng: number,
    districts: { id: string; lat: number; lng: number }[],
  ): string | undefined {
    let closest: { id: string; distSq: number } | undefined;
    for (const d of districts) {
      const distSq = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
      if (!closest || distSq < closest.distSq) {
        closest = { id: d.id, distSq };
      }
    }
    return closest?.id;
  }

  async syncFromGbif(): Promise<{ speciesUpserted: number; occurrencesUpserted: number }> {
    const districts = await this.prisma.district.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { id: true, lat: true, lng: true },
    });
    const districtCentroids = districts as { id: string; lat: number; lng: number }[];

    // Incremental sync: only fetch records GBIF re-interpreted in the last 48 hours.
    // On first run (empty DB) skip the date filter to bootstrap with recent records.
    const hasExisting = (await this.prisma.occurrence.count()) > 0;
    const sinceDate = hasExisting
      ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10)
      : undefined;

    if (sinceDate) {
      this.logger.log(`GBIF incremental sync — fetching records modified since ${sinceDate}`);
    } else {
      this.logger.log('GBIF initial bootstrap — fetching without date filter');
    }

    let offset = 0;
    let fetched = 0;
    let speciesUpserted = 0;
    let occurrencesUpserted = 0;
    let endOfRecords = false;

    while (fetched < MAX_RECORDS_PER_SYNC && !endOfRecords) {
      const page = await this.gbifClient.fetchOccurrencePage(offset, sinceDate);
      endOfRecords = page.endOfRecords;
      offset += page.results.length;

      for (const record of page.results) {
        if (fetched >= MAX_RECORDS_PER_SYNC) break;
        fetched++;

        if (record.decimalLatitude == null || record.decimalLongitude == null) continue;

        const districtId = this.nearestDistrictId(
          record.decimalLatitude,
          record.decimalLongitude,
          districtCentroids,
        );

        // Wrap the species upsert and occurrence upsert in a single transaction so
        // a mid-loop failure can never leave a species row without its occurrence.
        const upserted = await this.prisma.$transaction(async (tx) => {
          const speciesId = await this.upsertSpecies(tx, record);
          if (!speciesId) return null;

          await tx.occurrence.upsert({
            where: { gbifOccurrenceKey: BigInt(record.key) },
            create: {
              gbifOccurrenceKey: BigInt(record.key),
              speciesId,
              districtId,
              lat: record.decimalLatitude!,
              lng: record.decimalLongitude!,
              observedAt: parseGbifEventDate(record.eventDate),
              recordedBy: record.recordedBy,
              basisOfRecord: record.basisOfRecord,
            },
            update: {
              districtId,
              lat: record.decimalLatitude!,
              lng: record.decimalLongitude!,
            },
          });

          return speciesId;
        });

        if (upserted) {
          speciesUpserted++;
          occurrencesUpserted++;
        }
      }

      if (page.results.length === 0) break;
    }

    this.logger.log(`GBIF sync: ${speciesUpserted} species, ${occurrencesUpserted} occurrences upserted`);
    return { speciesUpserted, occurrencesUpserted };
  }

  private async upsertSpecies(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    record: GbifOccurrenceRecord,
  ): Promise<string | undefined> {
    if (!record.taxonKey) return undefined;
    const canonicalName = record.species ?? record.scientificName;
    if (!canonicalName) return undefined;

    const species = await tx.species.upsert({
      where: { gbifKey: record.taxonKey },
      create: {
        gbifKey: record.taxonKey,
        canonicalName,
        vernacularName: record.vernacularName,
        kingdom: record.kingdom,
        phylum: record.phylum,
        class: record.class,
        order: record.order,
        family: record.family,
        genus: record.genus,
        imageUrl: record.media?.[0]?.identifier,
      },
      update: {
        vernacularName: record.vernacularName,
        imageUrl: record.media?.[0]?.identifier,
      },
      select: { id: true },
    });
    return species.id;
  }

  list(search: string | undefined, rawPage = 1, rawPageSize = 20, sortBy?: string) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = search
      ? {
          OR: [
            { canonicalName: { contains: search, mode: 'insensitive' as const } },
            { vernacularName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const orderBy =
      sortBy === 'occurrences'
        ? { occurrences: { _count: 'desc' as const } }
        : { canonicalName: 'asc' as const };
    return Promise.all([
      this.prisma.species.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: SPECIES_SELECT,
      }),
      this.prisma.species.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async getSpeciesById(id: string) {
    const species = await this.prisma.species.findUnique({
      where: { id },
      select: SPECIES_SELECT,
    });
    if (!species) throw new NotFoundException('Species not found');
    return species;
  }

  listOccurrences(speciesId: string | undefined, districtId: string | undefined, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = {
      ...(speciesId ? { speciesId } : {}),
      ...(districtId ? { districtId } : {}),
    };
    return Promise.all([
      this.prisma.occurrence.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { observedAt: 'desc' },
        select: OCCURRENCE_SELECT,
      }),
      this.prisma.occurrence.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }
}
