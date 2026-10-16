import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';
import { withCronLock, CRON_LOCK_KEYS } from '../common/pg-cron-lock';

/** Social content (drafts, rendered cards, publication history, stored images) is kept for this many days. */
export const SOCIAL_RETENTION_DAYS = 7;

/** Every rendered card and every published copy lives under this prefix (`social-cards/{draftId}/…`). */
const CARD_PREFIX = 'social-cards/';

/**
 * Keeps only the last SOCIAL_RETENTION_DAYS days of social content, daily at 03:00.
 *
 * 1. Deletes drafts created before the cutoff, whatever their status (APPROVED and ARCHIVED included), together
 *    with their SocialRenderedAsset and SocialPublication rows. The database is the source of truth, so this
 *    never waits on, or fails because of, object storage.
 * 2. Deletes the stored images of those drafts.
 * 3. Sweeps `social-cards/` and deletes every object older than the cutoff. This catches what the database does
 *    not track — the PNG copy the publisher uploads — and anything orphaned by an earlier failed run, so storage
 *    cannot grow unbounded. An object older than the cutoff can only belong to a draft older than the cutoff.
 *
 * The sweep is destructive on a shared bucket, so outside production it only runs when
 * SOCIAL_CONTENT_STORAGE_SWEEP=true (a developer machine pointed at the production bucket must not sweep it).
 *
 * AuditEvent rows (SOCIAL_DRAFT_*, SOCIAL_CARD_*, SOCIAL_PUBLISH_REQUEST) are a separate, permanent record and
 * are not touched.
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
    return withCronLock(this.prisma, this.logger, CRON_LOCK_KEYS.SOCIAL_CONTENT_CLEANUP, async () => {
      await this.purgeExpired();
    });
  }

  private get sweepAllowed() {
    return process.env.NODE_ENV === 'production' || process.env.SOCIAL_CONTENT_STORAGE_SWEEP === 'true';
  }

  /** One retention pass. Public so it can be run and tested without the scheduler or the lock. */
  async purgeExpired(now: Date = new Date()): Promise<{ drafts: number; files: number }> {
    const cutoff = new Date(now.getTime() - SOCIAL_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const stale = await this.prisma.socialPostDraft.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, renderedAssets: { select: { storageKey: true } } },
    });
    const draftIds = stale.map((draft) => draft.id);
    const trackedKeys = stale.flatMap((draft) => draft.renderedAssets.map((asset) => asset.storageKey));

    if (draftIds.length > 0) {
      // Delete in FK dependency order explicitly rather than relying on DB cascade:
      // SocialRenderedAsset and SocialPublication both cascade from SocialPostDraft, but
      // SocialPublication.renderedAssetId is onDelete: Restrict (checked immediately, not deferred) — if the DB
      // cascade-deleted the assets before the publications in one statement, the Restrict check would fail.
      await this.prisma.$transaction([
        this.prisma.socialPublication.deleteMany({ where: { draftId: { in: draftIds } } }),
        this.prisma.socialRenderedAsset.deleteMany({ where: { draftId: { in: draftIds } } }),
        this.prisma.socialPostDraft.deleteMany({ where: { id: { in: draftIds } } }),
      ]);
    }

    // Auto-post run history follows the same 7-day retention (the drafts and publications it points at are gone too).
    const runs = await this.prisma.socialAutopostRun.deleteMany({ where: { createdAt: { lt: cutoff } } });

    let files = 0;
    if (this.storage.isConfigured) {
      const doomed = new Set(trackedKeys);
      if (this.sweepAllowed) {
        try {
          for (const key of await this.storage.listKeysOlderThan(CARD_PREFIX, cutoff)) doomed.add(key);
        } catch (err) {
          this.logger.warn(`Could not list stored social cards for the sweep: ${String(err)}`);
        }
      }
      if (doomed.size > 0) {
        try {
          files = await this.storage.deleteMany([...doomed]);
        } catch (err) {
          // Rows are already gone; the next run's sweep removes whatever is left, by age.
          this.logger.warn(`Failed to delete ${doomed.size} stored social card file(s): ${String(err)}`);
        }
      }
    }

    if (draftIds.length > 0 || files > 0 || runs.count > 0) {
      this.logger.log(
        `Social content retention (${SOCIAL_RETENTION_DAYS} days): removed ${draftIds.length} draft(s), ${runs.count} auto-post run(s) and ${files} stored file(s)`,
      );
    }
    return { drafts: draftIds.length, files };
  }
}
