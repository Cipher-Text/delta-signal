import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { CRON_LOCK_KEYS, withCronLock } from '../common/pg-cron-lock';
import { SocialAutopostService } from './social-autopost.service';

/** Checks every minute whether a weekly slot is due. Cheap: it returns at once while auto-posting is off. */
@Injectable()
export class SocialAutopostScheduler {
  private readonly logger = new Logger(SocialAutopostScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly autopost: SocialAutopostService,
  ) {}

  @Cron('0 * * * * *')
  tick() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.SOCIAL_AUTOPOST, async () => {
      await this.autopost.runDue();
    });
  }
}
