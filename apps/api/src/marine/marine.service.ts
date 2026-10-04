import { Injectable, Logger } from '@nestjs/common';
import { District } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MarineOpenMeteoClient } from './marine-openmeteo.client';

/** Coastal districts with proper ocean/port/estuary coordinates set by seedCoastalMetadata(). */
type CoastalDistrict = District & { coastLat: number; coastLng: number };

@Injectable()
export class MarineService {
  private readonly logger = new Logger(MarineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MarineOpenMeteoClient,
  ) {}

  getFetchableDistricts(): Promise<CoastalDistrict[]> {
    return this.prisma.district.findMany({
      where: { isCoastal: true, coastLat: { not: null }, coastLng: { not: null } },
    }) as Promise<CoastalDistrict[]>;
  }

  async hasForecasts(): Promise<boolean> {
    return (await this.prisma.marineForecast.count()) > 0;
  }

  async syncDistrict(district: CoastalDistrict, jobId?: string | null): Promise<void> {
    // Use coastal monitoring coordinates, not the inland district centroid
    const response = await this.client.fetch(district.coastLat, district.coastLng);
    const daily = response.daily;
    if (!daily?.time?.length) return;

    // API returns the actual marine grid-cell coordinates snapped from the coastal point
    const lat = response.latitude ?? district.coastLat;
    const lng = response.longitude ?? district.coastLng;

    await this.prisma.$transaction(
      daily.time.map((dateStr, i) =>
        this.prisma.marineForecast.upsert({
          where: {
            districtId_forecastDate: {
              districtId: district.id,
              forecastDate: new Date(dateStr),
            },
          },
          update: {
            lat,
            lng,
            waveHeightMax: daily.wave_height_max?.[i] ?? null,
            waveDirectionDominant: daily.wave_direction_dominant?.[i] ?? null,
            wavePeriodMax: daily.wave_period_max?.[i] ?? null,
            windWaveHeightMax: daily.wind_wave_height_max?.[i] ?? null,
            windWaveDirectionDominant: daily.wind_wave_direction_dominant?.[i] ?? null,
            windWavePeriodMax: daily.wind_wave_period_max?.[i] ?? null,
            windWavePeakPeriodMax: daily.wind_wave_peak_period_max?.[i] ?? null,
            swellWaveHeightMax: daily.swell_wave_height_max?.[i] ?? null,
            swellWaveDirectionDominant: daily.swell_wave_direction_dominant?.[i] ?? null,
            swellWavePeriodMax: daily.swell_wave_period_max?.[i] ?? null,
            swellWavePeakPeriodMax: daily.swell_wave_peak_period_max?.[i] ?? null,
            seaSurfaceTemp: daily.sea_surface_temperature?.[i] ?? null,
            ingestionJobId: jobId ?? undefined,
          },
          create: {
            districtId: district.id,
            lat,
            lng,
            forecastDate: new Date(dateStr),
            waveHeightMax: daily.wave_height_max?.[i] ?? null,
            waveDirectionDominant: daily.wave_direction_dominant?.[i] ?? null,
            wavePeriodMax: daily.wave_period_max?.[i] ?? null,
            windWaveHeightMax: daily.wind_wave_height_max?.[i] ?? null,
            windWaveDirectionDominant: daily.wind_wave_direction_dominant?.[i] ?? null,
            windWavePeriodMax: daily.wind_wave_period_max?.[i] ?? null,
            windWavePeakPeriodMax: daily.wind_wave_peak_period_max?.[i] ?? null,
            swellWaveHeightMax: daily.swell_wave_height_max?.[i] ?? null,
            swellWaveDirectionDominant: daily.swell_wave_direction_dominant?.[i] ?? null,
            swellWavePeriodMax: daily.swell_wave_period_max?.[i] ?? null,
            swellWavePeakPeriodMax: daily.swell_wave_peak_period_max?.[i] ?? null,
            seaSurfaceTemp: daily.sea_surface_temperature?.[i] ?? null,
            ingestionJobId: jobId ?? undefined,
          },
        }),
      ),
    );
  }

  getLatestForAllDistricts() {
    return this.prisma.marineForecast.findMany({
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { forecastDate: 'desc' }],
      include: { district: { select: { id: true, name: true } } },
    });
  }

  /** All coastal districts for one forecast day (YYYY-MM-DD, stored as UTC midnight). */
  getForDate(date: string) {
    return this.prisma.marineForecast.findMany({
      where: { forecastDate: new Date(`${date}T00:00:00.000Z`) },
      include: { district: { select: { id: true, name: true } } },
      orderBy: { district: { name: 'asc' } },
    });
  }

  /** Forecast days available from today (Asia/Dhaka calendar) onward, as YYYY-MM-DD, ascending. */
  async getForecastDays(): Promise<string[]> {
    const dhakaToday = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await this.prisma.marineForecast.findMany({
      where: { forecastDate: { gte: new Date(`${dhakaToday}T00:00:00.000Z`) } },
      distinct: ['forecastDate'],
      select: { forecastDate: true },
      orderBy: { forecastDate: 'asc' },
    });
    return rows.map((r) => r.forecastDate.toISOString().slice(0, 10));
  }

  getForecast(districtId: string, from: Date, to: Date) {
    return this.prisma.marineForecast.findMany({
      where: { districtId, forecastDate: { gte: from, lte: to } },
      orderBy: { forecastDate: 'asc' },
    });
  }
}
