import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';
import { withCronLock, CRON_LOCK_KEYS } from '../common/pg-cron-lock';

const RETENTION_DAYS = 7;

/**
 * Deletes social content drafts older than RETENTION_DAYS, regardless of
 * status — this includes APPROVED/ARCHIVED drafts and any SocialPublication
 * history attached to them. AuditEvent rows (SOCIAL_DRAFT_*, SOCIAL_CARD_*,
 * SOCIAL_PUBLISH_REQUEST) are a separate, permanent record and are not
 * touched by this cleanup.
 */
@Injectable()
export class SocialContentCleanupScheduler {
  private readonly logger = new Logger(SocialContentCleanupScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  cleanupOldDrafts() {
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.SOCIAL_CONTENT_CLEANUP, () =>
      this.run(),
    );
  }

  private async run() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const stale = await this.prisma.socialPostDraft.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, renderedAssets: { select: { storageKey: true } } },
    });
    if (stale.length === 0) return;

    const draftIds = stale.map((draft) => draft.id);
    const storageKeys = stale.flatMap((draft) => draft.renderedAssets.map((asset) => asset.storageKey));

    if (this.storage.isConfigured) {
      for (const key of storageKeys) {
        try {
          await this.storage.delete(key);
        } catch (err) {
          this.logger.warn(`Failed to delete stale social card ${key}: ${String(err)}`);
        }
      }
    }

    // Delete in FK dependency order explicitly rather than relying on DB
    // cascade: SocialRenderedAsset and SocialPublication both cascade from
    // SocialPostDraft, but SocialPublication.renderedAssetId is onDelete:
    // Restrict (checked immediately, not deferred) — if the DB happened to
    // cascade-delete SocialRenderedAsset rows before SocialPublication rows
    // in the same statement, the Restrict check would fail.
    await this.prisma.$transaction([
      this.prisma.socialPublication.deleteMany({ where: { draftId: { in: draftIds } } }),
      this.prisma.socialRenderedAsset.deleteMany({ where: { draftId: { in: draftIds } } }),
      this.prisma.socialPostDraft.deleteMany({ where: { id: { in: draftIds } } }),
    ]);

    this.logger.log(
      `Cleaned up ${draftIds.length} social content draft(s) older than ${RETENTION_DAYS} days ` +
      `(${storageKeys.length} rendered asset file(s))`,
    );
  }
}
