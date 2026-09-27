/**
 * Postgres session-level advisory locks for cron job deduplication.
 *
 * In a multi-instance deployment every @Cron handler fires on every instance.
 * `withCronLock` wraps a cron body so that only the instance that wins the
 * lock runs the job — the others log a debug message and return immediately.
 *
 * Advisory locks are connection-scoped: if the process crashes mid-job the
 * connection closes and Postgres releases the lock automatically, so there
 * is no risk of a permanent lock wedge.
 *
 * Key assignment: each cron job must have a unique integer in CRON_LOCK_KEYS.
 * Keys are arbitrary — pick any value that does not collide within this map.
 */

import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';

export const CRON_LOCK_KEYS = {
  WEATHER_CURRENT:  1_001,
  WEATHER_HOURLY:   1_002,
  WEATHER_DAILY:    1_003,
  BIODIVERSITY:     1_004,
  FLOOD:            1_005,
  LOCATION_CLIMATE: 1_006,
  RADIATION:        1_007,
  MARINE:           1_008,
  EMISSIONS:        1_009,
  SOCIAL_CONTENT_CLEANUP: 1_010,
} as const;

/**
 * Acquire a Postgres advisory lock, run `fn`, then release the lock.
 * Returns without calling `fn` if another instance already holds the lock.
 */
export async function withCronLock(
  prisma: PrismaService,
  logger: Logger,
  lockKey: number,
  fn: () => Promise<void>,
): Promise<void> {
  const key = BigInt(lockKey);

  const [row] = await prisma.$queryRaw<[{ acquired: boolean }]>(
    Prisma.sql`SELECT pg_try_advisory_lock(${key}) AS acquired`,
  );

  if (!row.acquired) {
    logger.debug(`Advisory lock ${lockKey} is held by another instance — skipping this run`);
    return;
  }

  try {
    await fn();
  } finally {
    await prisma.$queryRaw(Prisma.sql`SELECT pg_advisory_unlock(${key})`);
  }
}
