import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WorldBankClient, WORLD_BANK_INDICATORS } from './world-bank.client';

@Injectable()
export class EmissionsService {
  private readonly logger = new Logger(EmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WorldBankClient,
  ) {}

  hasReadings(): Promise<boolean> {
    return this.prisma.nationalEmissionReading
      .findFirst({
        where: { indicatorCode: WORLD_BANK_INDICATORS[0] },
        select: { id: true },
      })
      .then(Boolean);
  }

  /**
   * Fetch all pages for a single indicator from the World Bank API
   * and upsert into `NationalEmissionReading`, skipping null-value rows.
   */
  async syncIndicator(indicatorCode: string, jobId: string | null): Promise<number> {
    const records = await this.client.fetchIndicator(indicatorCode);

    const toUpsert = records.filter((r) => r.value !== null);

    await this.prisma.$transaction(
      toUpsert.map((r) =>
        this.prisma.nationalEmissionReading.upsert({
          where: {
            year_indicatorCode: {
              year: parseInt(r.date, 10),
              indicatorCode: r.indicator.id,
            },
          },
          update: {
            value: r.value,
            indicatorName: r.indicator.value,
            ingestionJobId: jobId ?? undefined,
          },
          create: {
            year: parseInt(r.date, 10),
            indicatorCode: r.indicator.id,
            indicatorName: r.indicator.value,
            value: r.value,
            ingestionJobId: jobId ?? undefined,
          },
        }),
      ),
    );

    this.logger.log(`Upserted ${toUpsert.length} rows for ${indicatorCode}`);
    return toUpsert.length;
  }

  /** Sync all configured indicators in sequence. */
  async syncAll(jobId: string | null): Promise<void> {
    let totalRows = 0;
    let totalError: unknown;

    for (const code of WORLD_BANK_INDICATORS) {
      try {
        const rows = await this.syncIndicator(code, jobId);
        if (code === WORLD_BANK_INDICATORS[0]) totalRows = rows;
      } catch (err) {
        this.logger.error(`Failed to sync indicator ${code}: ${String(err)}`);
        if (code === WORLD_BANK_INDICATORS[0]) totalError = err;
      }
    }

    if (totalError) throw totalError;
    if (totalRows === 0) {
      throw new Error(`World Bank returned no usable values for ${WORLD_BANK_INDICATORS[0]}`);
    }
  }

  // ─── Read endpoints ──────────────────────────────────────────────────────────

  /**
   * Return all readings, optionally filtered by indicator code and year range.
   * Results are ordered by year DESC then indicatorCode ASC.
   */
  getAll(indicatorCode?: string, fromYear?: number, toYear?: number) {
    return this.prisma.nationalEmissionReading.findMany({
      where: {
        ...(indicatorCode ? { indicatorCode } : {}),
        ...(fromYear !== undefined || toYear !== undefined
          ? {
              year: {
                ...(fromYear !== undefined ? { gte: fromYear } : {}),
                ...(toYear !== undefined ? { lte: toYear } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ year: 'desc' }, { indicatorCode: 'asc' }],
      select: {
        id: true,
        year: true,
        indicatorCode: true,
        indicatorName: true,
        value: true,
        unit: true,
        updatedAt: true,
      },
    });
  }

  /** Return all readings for a specific year, across all indicators. */
  async getByYear(year: number) {
    const rows = await this.prisma.nationalEmissionReading.findMany({
      where: { year },
      orderBy: { indicatorCode: 'asc' },
      select: {
        id: true,
        year: true,
        indicatorCode: true,
        indicatorName: true,
        value: true,
        unit: true,
        updatedAt: true,
      },
    });
    if (!rows.length) throw new NotFoundException(`No emission data found for year ${year}`);
    return rows;
  }

  /** Return the distinct indicator codes and names available in the DB. */
  async getIndicators() {
    const rows = await this.prisma.nationalEmissionReading.findMany({
      distinct: ['indicatorCode'],
      orderBy: { indicatorCode: 'asc' },
      select: { indicatorCode: true, indicatorName: true },
    });
    return rows;
  }
}
