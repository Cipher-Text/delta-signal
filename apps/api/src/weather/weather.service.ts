import { Injectable, Logger } from '@nestjs/common';
import { District } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { WeatherOpenMeteoClient } from './weather-openmeteo.client';

type DistrictWithCoords = District & { lat: number; lng: number };

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WeatherOpenMeteoClient,
  ) {}

  /** Districts with usable coordinates, i.e. safe to fetch weather for. */
  getFetchableDistricts(): Promise<DistrictWithCoords[]> {
    return this.prisma.district.findMany({
      where: { lat: { not: null }, lng: { not: null } },
    }) as Promise<DistrictWithCoords[]>;
  }

  async hasDailyForecasts(): Promise<boolean> {
    return (await this.prisma.dailyWeatherForecast.count()) > 0;
  }

  async syncCurrentWeather(district: DistrictWithCoords, jobId?: string | null) {
    const { lat, lng } = district;
    const response = await this.client.fetchCurrent(lat, lng);
    const current = response.current;

    await this.prisma.currentWeatherReading.upsert({
      where: {
        districtId_readingTime: { districtId: district.id, readingTime: new Date(current.time) },
      },
      update: {},
      create: {
        districtId: district.id,
        lat,
        lng,
        readingTime: new Date(current.time),
        temperature2m: current.temperature_2m,
        relativeHumidity2m: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        windSpeed10m: current.wind_speed_10m,
        windDirection10m: current.wind_direction_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        cloudCover: current.cloud_cover,
        isDay: current.is_day === 1,
        windGusts10m: current.wind_gusts_10m,
        surfacePressure: current.surface_pressure,
        ingestionJobId: jobId ?? undefined,
      },
    });
  }

  async syncHourlyWeather(district: DistrictWithCoords, jobId?: string | null) {
    const { lat, lng } = district;
    const response = await this.client.fetchHourly(lat, lng);
    const hourly = response.hourly;

    for (let i = 0; i < hourly.time.length; i++) {
      const forecastTime = new Date(hourly.time[i]);
      await this.prisma.hourlyWeatherForecast.upsert({
        where: {
          districtId_forecastTime: { districtId: district.id, forecastTime },
        },
        update: {},
        create: {
          districtId: district.id,
          lat,
          lng,
          forecastTime,
          temperature2m: hourly.temperature_2m?.[i],
          relativeHumidity2m: hourly.relative_humidity_2m?.[i],
          apparentTemperature: hourly.apparent_temperature?.[i],
          precipitationProbability: hourly.precipitation_probability?.[i],
          precipitation: hourly.precipitation?.[i],
          weatherCode: hourly.weather_code?.[i],
          windSpeed10m: hourly.wind_speed_10m?.[i],
          windDirection10m: hourly.wind_direction_10m?.[i],
          cloudCover: hourly.cloud_cover?.[i],
          windGusts10m: hourly.wind_gusts_10m?.[i],
          ingestionJobId: jobId ?? undefined,
        },
      });
    }
  }

  async syncDailyWeather(district: DistrictWithCoords, jobId?: string | null) {
    const { lat, lng } = district;
    const response = await this.client.fetchDaily(lat, lng);
    const daily = response.daily;

    for (let i = 0; i < daily.time.length; i++) {
      const forecastDate = new Date(daily.time[i]);
      await this.prisma.dailyWeatherForecast.upsert({
        where: {
          districtId_forecastDate: { districtId: district.id, forecastDate },
        },
        update: {},
        create: {
          districtId: district.id,
          lat,
          lng,
          forecastDate,
          weatherCode: daily.weather_code?.[i],
          temperature2mMax: daily.temperature_2m_max?.[i],
          temperature2mMin: daily.temperature_2m_min?.[i],
          apparentTemperatureMax: daily.apparent_temperature_max?.[i],
          apparentTemperatureMin: daily.apparent_temperature_min?.[i],
          precipitationSum: daily.precipitation_sum?.[i],
          precipitationProbabilityMax: daily.precipitation_probability_max?.[i],
          windSpeed10mMax: daily.wind_speed_10m_max?.[i],
          uvIndexMax: daily.uv_index_max?.[i],
          sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]) : undefined,
          sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]) : undefined,
          ingestionJobId: jobId ?? undefined,
        },
      });
    }
  }

  async syncAirQuality(district: DistrictWithCoords, jobId?: string | null) {
    const { lat, lng } = district;
    const response = await this.client.fetchAirQuality(lat, lng);
    const hourly = response.hourly;

    for (let i = 0; i < hourly.time.length; i++) {
      const forecastTime = new Date(hourly.time[i]);
      await this.prisma.hourlyAirQuality.upsert({
        where: {
          districtId_forecastTime: { districtId: district.id, forecastTime },
        },
        update: {},
        create: {
          districtId: district.id,
          lat,
          lng,
          forecastTime,
          pm10: hourly.pm10?.[i],
          pm25: hourly.pm2_5?.[i],
          carbonMonoxide: hourly.carbon_monoxide?.[i],
          nitrogenDioxide: hourly.nitrogen_dioxide?.[i],
          sulphurDioxide: hourly.sulphur_dioxide?.[i],
          ozone: hourly.ozone?.[i],
          uvIndex: hourly.uv_index?.[i],
          ingestionJobId: jobId ?? undefined,
        },
      });
    }
  }

  // ─── Read access ────────────────────────────────────────────────────────

  private static readonly CURRENT_WEATHER_SELECT = {
    id: true,
    districtId: true,
    lat: true,
    lng: true,
    readingTime: true,
    temperature2m: true,
    relativeHumidity2m: true,
    apparentTemperature: true,
    windSpeed10m: true,
    windDirection10m: true,
    windGusts10m: true,
    surfacePressure: true,
    precipitation: true,
    weatherCode: true,
    cloudCover: true,
    isDay: true,
  } as const;

  private static readonly AIR_QUALITY_SELECT = {
    id: true,
    districtId: true,
    lat: true,
    lng: true,
    forecastTime: true,
    pm10: true,
    pm25: true,
    carbonMonoxide: true,
    nitrogenDioxide: true,
    sulphurDioxide: true,
    ozone: true,
    uvIndex: true,
  } as const;

  getLatestCurrent(districtId: string) {
    return this.prisma.currentWeatherReading.findFirst({
      where: { districtId },
      orderBy: { readingTime: 'desc' },
      select: WeatherService.CURRENT_WEATHER_SELECT,
    });
  }

  getLatestCurrentForAllDistricts() {
    return this.prisma.currentWeatherReading.findMany({
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { readingTime: 'desc' }],
      select: {
        ...WeatherService.CURRENT_WEATHER_SELECT,
        district: { select: { id: true, name: true } },
      },
    });
  }

  getHourlyForecast(districtId: string, from: Date, to: Date) {
    return this.prisma.hourlyWeatherForecast.findMany({
      where: { districtId, forecastTime: { gte: from, lte: to } },
      orderBy: { forecastTime: 'asc' },
    });
  }

  getDailyForecast(districtId: string, from: Date, to: Date) {
    return this.prisma.dailyWeatherForecast.findMany({
      where: { districtId, forecastDate: { gte: from, lte: to } },
      orderBy: { forecastDate: 'asc' },
    });
  }

  getLatestAirQuality(districtId: string) {
    return this.prisma.hourlyAirQuality.findFirst({
      where: { districtId },
      orderBy: { forecastTime: 'desc' },
      select: WeatherService.AIR_QUALITY_SELECT,
    });
  }

  getLatestAirQualityForAllDistricts() {
    return this.prisma.hourlyAirQuality.findMany({
      distinct: ['districtId'],
      orderBy: [{ districtId: 'asc' }, { forecastTime: 'desc' }],
      select: {
        ...WeatherService.AIR_QUALITY_SELECT,
        district: { select: { id: true, name: true } },
      },
    });
  }
}
