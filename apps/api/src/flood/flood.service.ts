import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { WaterLevelStation } from '@prisma/client';
import type { WaterLevelThresholdStatus } from '@delta-signal/shared';
import { PrismaService } from '../database/prisma.service';
import { FloodOpenMeteoClient } from './flood-openmeteo.client';
import { clampPagination } from '../common/pagination';

const STATION_SELECT = {
  id: true,
  serial: true,
  stationCode: true,
  name: true,
  riverName: true,
  tidalStatus: true,
  latitude: true,
  longitude: true,
  dangerLevel: true,
  warningLevel: true,
  normalLevel: true,
  districtId: true,
  district: { select: { id: true, name: true } },
} as const;

const READING_SELECT = {
  id: true,
  stationId: true,
  readingAt: true,
  waterLevel: true,
  discharge: true,
  trend: true,
  createdAt: true,
} as const;

@Injectable()
export class FloodService {
  private readonly logger = new Logger(FloodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: FloodOpenMeteoClient,
  ) {}

  getFetchableStations(): Promise<WaterLevelStation[]> {
    return this.prisma.waterLevelStation.findMany({ orderBy: { serial: 'asc' } });
  }

  async hasForecasts(): Promise<boolean> {
    return (await this.prisma.stationFloodForecast.count()) > 0;
  }

  async syncStation(station: WaterLevelStation, jobId?: string | null) {
    const response = await this.client.fetch(station.latitude, station.longitude);
    const daily = response.daily;
    if (!daily?.time?.length) return;

    const lat = response.latitude ?? station.latitude;
    const lng = response.longitude ?? station.longitude;

    await this.prisma.$transaction(
      daily.time.map((dateStr, i) =>
        this.prisma.stationFloodForecast.upsert({
          where: {
            stationId_forecastDate: {
              stationId: station.id,
              forecastDate: new Date(dateStr),
            },
          },
          update: {
            lat,
            lng,
            riverDischarge: daily.river_discharge?.[i],
            riverDischargeMean: daily.river_discharge_mean?.[i],
            riverDischargeMedian: daily.river_discharge_median?.[i],
            riverDischargeMax: daily.river_discharge_max?.[i],
            riverDischargeMin: daily.river_discharge_min?.[i],
            riverDischargeP25: daily.river_discharge_p25?.[i],
            riverDischargeP75: daily.river_discharge_p75?.[i],
            riverDischargeP10: daily.river_discharge_p10?.[i],
            riverDischargeP90: daily.river_discharge_p90?.[i],
            ingestionJobId: jobId ?? undefined,
          },
          create: {
            stationId: station.id,
            lat,
            lng,
            forecastDate: new Date(dateStr),
            riverDischarge: daily.river_discharge?.[i],
            riverDischargeMean: daily.river_discharge_mean?.[i],
            riverDischargeMedian: daily.river_discharge_median?.[i],
            riverDischargeMax: daily.river_discharge_max?.[i],
            riverDischargeMin: daily.river_discharge_min?.[i],
            riverDischargeP25: daily.river_discharge_p25?.[i],
            riverDischargeP75: daily.river_discharge_p75?.[i],
            riverDischargeP10: daily.river_discharge_p10?.[i],
            riverDischargeP90: daily.river_discharge_p90?.[i],
            ingestionJobId: jobId ?? undefined,
          },
        }),
      ),
    );
  }

  /** Latest forecast row per station, ordered by station serial. */
  getLatestForAllStations() {
    return this.prisma.stationFloodForecast.findMany({
      distinct: ['stationId'],
      orderBy: [{ stationId: 'asc' }, { forecastDate: 'desc' }],
      include: {
        station: {
          select: {
            id: true,
            serial: true,
            stationCode: true,
            name: true,
            riverName: true,
            tidalStatus: true,
            districtId: true,
            district: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  getForecastByStation(stationId: string, from: Date, to: Date) {
    return this.prisma.stationFloodForecast.findMany({
      where: { stationId, forecastDate: { gte: from, lte: to } },
      orderBy: { forecastDate: 'asc' },
      include: {
        station: {
          select: {
            id: true,
            serial: true,
            stationCode: true,
            name: true,
            riverName: true,
            tidalStatus: true,
            districtId: true,
            district: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /** All station forecasts for a district, grouped and ordered by station. */
  getForecastByDistrict(districtId: string, from: Date, to: Date) {
    return this.prisma.stationFloodForecast.findMany({
      where: {
        station: { districtId },
        forecastDate: { gte: from, lte: to },
      },
      orderBy: [{ station: { serial: 'asc' } }, { forecastDate: 'asc' }],
      include: {
        station: {
          select: {
            id: true,
            serial: true,
            stationCode: true,
            name: true,
            riverName: true,
            tidalStatus: true,
          },
        },
      },
    });
  }

  // ─── Water level readings ────────────────────────────────────────────────────

  private async findStationOrThrow(stationId: string) {
    const station = await this.prisma.waterLevelStation.findUnique({
      where: { id: stationId },
      select: STATION_SELECT,
    });
    if (!station) throw new NotFoundException('Water level station not found');
    return station;
  }

  private computeThresholdStatus(
    waterLevel: number,
    station: Pick<WaterLevelStation, 'dangerLevel' | 'warningLevel'>,
  ): WaterLevelThresholdStatus {
    if (station.dangerLevel !== null && station.dangerLevel !== undefined && waterLevel >= station.dangerLevel) {
      return 'DANGER';
    }
    if (station.warningLevel !== null && station.warningLevel !== undefined && waterLevel >= station.warningLevel) {
      return 'WARNING';
    }
    return 'NORMAL';
  }

  async getStationReadings(stationId: string, from?: Date, to?: Date, rawPage = 1, rawPageSize = 100) {
    await this.findStationOrThrow(stationId);
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = {
      stationId,
      ...(from || to ? { readingAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.waterLevelReading.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { readingAt: 'desc' },
        select: READING_SELECT,
      }),
      this.prisma.waterLevelReading.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getLatestReading(stationId: string) {
    const station = await this.findStationOrThrow(stationId);
    const reading = await this.prisma.waterLevelReading.findFirst({
      where: { stationId },
      orderBy: { readingAt: 'desc' },
      select: READING_SELECT,
    });
    const thresholdStatus = reading
      ? this.computeThresholdStatus(reading.waterLevel, station)
      : null;
    return { station, latestReading: reading ?? null, thresholdStatus };
  }
}
