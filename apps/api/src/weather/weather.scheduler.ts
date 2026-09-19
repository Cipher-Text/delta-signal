import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeatherService } from './weather.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { OPENMETEO_PROVIDER_NAME } from '../providers/providers.service';
import { PrismaService } from '../database/prisma.service';
import { withCronLock, CRON_LOCK_KEYS } from '../common/pg-cron-lock';

@Injectable()
export class WeatherScheduler {
  private readonly logger = new Logger(WeatherScheduler.name);

  constructor(
    private readonly weatherService: WeatherService,
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  /** Open-Meteo current values are hourly-scale; avoid spending quota on 15-minute duplicates. */
  @Cron('0 5 * * * *')
  syncCurrentWeather() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.WEATHER_CURRENT, async () => {
      const providerId = await this.ingestionService.findProviderIdByName(OPENMETEO_PROVIDER_NAME);
      const jobId = providerId ? await this.ingestionService.startJob(providerId) : null;
      try {
        const districts = await this.weatherService.getFetchableDistricts();
        this.logger.log(`Syncing current weather for ${districts.length} districts`);
        for (const district of districts) {
          try {
            await this.weatherService.syncCurrentWeather(district, jobId);
          } catch (err) {
            this.logger.error(`Current weather fetch failed for ${district.name}: ${String(err)}`);
          }
        }
        if (jobId) await this.ingestionService.completeJob(jobId, ['WEATHER']);
      } catch (err) {
        if (jobId) await this.ingestionService.failJob(jobId, String(err));
        this.logger.error(`Current weather sync failed: ${String(err)}`);
      }
    });
  }

  @Cron('0 0 */2 * * *')
  syncHourlyWeatherAndAirQuality() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.WEATHER_HOURLY, async () => {
      const providerId = await this.ingestionService.findProviderIdByName(OPENMETEO_PROVIDER_NAME);
      const jobId = providerId ? await this.ingestionService.startJob(providerId) : null;
      try {
        const districts = await this.weatherService.getFetchableDistricts();
        this.logger.log(`Syncing hourly weather + air quality for ${districts.length} districts`);
        for (const district of districts) {
          try {
            await this.weatherService.syncHourlyWeather(district, jobId);
          } catch (err) {
            this.logger.error(`Hourly weather fetch failed for ${district.name}: ${String(err)}`);
          }
          try {
            await this.weatherService.syncAirQuality(district, jobId);
          } catch (err) {
            this.logger.error(`Air quality fetch failed for ${district.name}: ${String(err)}`);
          }
        }
        if (jobId) await this.ingestionService.completeJob(jobId, ['WEATHER', 'AIR_QUALITY']);
      } catch (err) {
        if (jobId) await this.ingestionService.failJob(jobId, String(err));
        this.logger.error(`Hourly weather sync failed: ${String(err)}`);
      }
    });
  }

  @Cron('0 0 */12 * * *')
  syncDailyWeather() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.WEATHER_DAILY, async () => {
      const providerId = await this.ingestionService.findProviderIdByName(OPENMETEO_PROVIDER_NAME);
      const jobId = providerId ? await this.ingestionService.startJob(providerId) : null;
      try {
        const districts = await this.weatherService.getFetchableDistricts();
        this.logger.log(`Syncing daily weather for ${districts.length} districts`);
        for (const district of districts) {
          try {
            await this.weatherService.syncDailyWeather(district, jobId);
          } catch (err) {
            this.logger.error(`Daily weather fetch failed for ${district.name}: ${String(err)}`);
          }
        }
        if (jobId) await this.ingestionService.completeJob(jobId, ['WEATHER']);
      } catch (err) {
        if (jobId) await this.ingestionService.failJob(jobId, String(err));
        this.logger.error(`Daily weather sync failed: ${String(err)}`);
      }
    });
  }
}
