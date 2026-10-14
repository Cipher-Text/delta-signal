import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatasetCategory } from '@prisma/client';
import { EmissionsService } from './emissions.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { WORLD_BANK_PROVIDER_NAME } from '../providers/providers.service';
import { PrismaService } from '../database/prisma.service';
import { withCronLock, CRON_LOCK_KEYS } from '../common/pg-cron-lock';

@Injectable()
export class EmissionsScheduler implements OnModuleInit {
  private readonly logger = new Logger(EmissionsScheduler.name);

  constructor(
    private readonly emissionsService: EmissionsService,
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (await this.emissionsService.hasReadings()) return;
    this.logger.log('No emission readings found; starting initial World Bank sync');
    void this.syncEmissions();
  }

  /** Retry an incomplete initial load daily until total emissions are stored. */
  @Cron('0 0 4 * * *')
  async retryInitialSync() {
    if (await this.emissionsService.hasReadings()) return;
    this.logger.warn('No total emission readings found; retrying initial World Bank sync');
    return this.syncEmissions();
  }

  /** Run weekly on Sunday at 3am — World Bank data updates annually. */
  @Cron('0 0 3 * * 0')
  syncEmissions() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.EMISSIONS, async () => {
      const providerId = await this.ingestionService.findProviderIdByName(WORLD_BANK_PROVIDER_NAME);
      const jobId = providerId ? await this.ingestionService.startJob(providerId) : null;
      try {
        await this.emissionsService.syncAll(jobId);
        if (jobId) await this.ingestionService.completeJob(jobId, [DatasetCategory.MONITORING]);
      } catch (err) {
        if (jobId) await this.ingestionService.failJob(jobId, String(err));
        this.logger.error(`World Bank emissions sync failed: ${String(err)}`);
      }
    });
  }
}
