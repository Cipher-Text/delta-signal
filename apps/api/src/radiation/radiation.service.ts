import { Injectable, Logger } from '@nestjs/common';
import { District } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RadiationOpenMeteoClient } from './radiation-openmeteo.client';

type DistrictWithCoords = District & { lat: number; lng: number };

@Injectable()
export class RadiationService {
  private readonly logger = new Logger(RadiationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: RadiationOpenMeteoClient,
  ) {}

  getFetchableDistricts(): Promise<DistrictWithCoords[]> {
    return this.prisma.district.findMany({
      where: { lat: { not: null }, lng: { not: null } },
    }) as Promise<DistrictWithCoords[]>;
  }

  async hasReadings(): Promise<boolean> {
    return (await this.prisma.satelliteRadiationReading.count()) > 0;
  }

  async syncDistrict(district: DistrictWithCoords, jobId?: string | null): Promise<void> {
    const response = await this.client.fetch(district.lat, district.lng);
    const daily = response.daily;
    if (!daily?.time?.length) return;

    const lat = response.latitude ?? district.lat;
    const lng = response.longitude ?? district.lng;

    await this.prisma.$transaction(
      daily.time.map((dateStr, i) =>
        this.prisma.satelliteRadiationReading.upsert({
          where: {
            districtId_readingDate: {
              districtId: district.id,
              readingDate: new Date(dateStr),
            },
          },
          update: {
            lat,
            lng,
            shortwaveRadiationSum: daily.shortwave_radiation_sum?.[i] ?? null,
            ingestionJobId: jobId ?? undefined,
          },
          create: {
            districtId: district.id,
            lat,
            lng,
            readingDate: new Date(dateStr),
            shortwaveRadiationSum: daily.shortwave_radiation_sum?.[i] ?? null,
            ingestionJobId: jobId ?? undefined,
          },
        }),
      ),
    );
  }

  getLatestForAllDistricts() {
    return this.prisma.satelliteRadiationReading.findMany({
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { readingDate: 'desc' }],
      include: { district: { select: { id: true, name: true } } },
    });
  }

  /** Every district for one day (YYYY-MM-DD, stored as UTC midnight), with its division. */
  getForDate(date: string) {
    return this.prisma.satelliteRadiationReading.findMany({
      where: { readingDate: new Date(`${date}T00:00:00.000Z`) },
      include: { district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } } },
      orderBy: { district: { name: 'asc' } },
    });
  }

  /** Days that have readings, newest first (YYYY-MM-DD). Satellite data arrives with a delay and can have gaps. */
  async getDays(limit = 31): Promise<string[]> {
    const rows = await this.prisma.satelliteRadiationReading.findMany({
      distinct: ['readingDate'],
      select: { readingDate: true },
      orderBy: { readingDate: 'desc' },
      take: limit,
    });
    return rows.map((r) => r.readingDate.toISOString().slice(0, 10));
  }

  getReadings(districtId: string, from: Date, to: Date) {
    return this.prisma.satelliteRadiationReading.findMany({
      where: { districtId, readingDate: { gte: from, lte: to } },
      orderBy: { readingDate: 'asc' },
    });
  }
}
