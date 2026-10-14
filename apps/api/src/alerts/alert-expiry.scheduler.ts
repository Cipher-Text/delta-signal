import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { withCronLock, CRON_LOCK_KEYS } from '../common/pg-cron-lock';

/**
 * Moves ACTIVE alerts whose expiresAt has passed to EXPIRED so they leave the
 * public active list and appear in alert history. AlertsService.list() also
 * excludes them at query time, so the gap between runs is never visible.
 */
@Injectable()
export class AlertExpiryScheduler {
  private readonly logger = new Logger(AlertExpiryScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  expireAlerts() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.ALERT_EXPIRY, () => this.run());
  }

  private async run() {
    const { count } = await this.prisma.alert.updateMany({
      where: { status: AlertStatus.ACTIVE, expiresAt: { lte: new Date() } },
      data: { status: AlertStatus.EXPIRED },
    });
    if (count > 0) this.logger.log(`Expired ${count} alert(s) past their expiresAt`);
  }
}
