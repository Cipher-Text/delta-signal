import { GamificationService } from './gamification.service';
import { earnedKeysForCategory, computeLevel } from './badge.definitions';
import type { PrismaService } from '../database/prisma.service';
import type { Queue } from 'bullmq';

function mockPrisma() {
  return {
    userProfile: {
      findUnique: jest.fn(),
      update:     jest.fn().mockResolvedValue({}),
    },
    userSocialLink:         { count: jest.fn().mockResolvedValue(0) },
    organizationMembership: { count: jest.fn().mockResolvedValue(0) },
    citizenReport:          { count: jest.fn().mockResolvedValue(0) },
    observation:            { count: jest.fn().mockResolvedValue(0) },
    restorationParticipant: { count: jest.fn().mockResolvedValue(0) },
    communityPost:          { count: jest.fn().mockResolvedValue(0) },
    postComment:            { count: jest.fn().mockResolvedValue(0) },
  };
}

function build() {
  const prisma = mockPrisma();
  const gamificationQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  } as unknown as Queue;
  const service = new GamificationService(
    prisma as unknown as PrismaService,
    gamificationQueue,
  );
  return { service, prisma, gamificationQueue };
}

// ── Pure function tests ────────────────────────────────────────────────────────

describe('earnedKeysForCategory', () => {
  it('returns no keys when count is 0', () => {
    expect(earnedKeysForCategory('civic_guardian', 0)).toHaveLength(0);
  });

  it('returns bronze key at threshold 1', () => {
    const keys = earnedKeysForCategory('civic_guardian', 1);
    expect(keys).toContain('civic_guardian_bronze');
    expect(keys).not.toContain('civic_guardian_silver');
  });

  it('returns bronze + silver at threshold 5', () => {
    const keys = earnedKeysForCategory('civic_guardian', 5);
    expect(keys).toContain('civic_guardian_bronze');
    expect(keys).toContain('civic_guardian_silver');
    expect(keys).not.toContain('civic_guardian_gold');
  });

  it('returns all 4 tiers at threshold 30', () => {
    const keys = earnedKeysForCategory('civic_guardian', 30);
    expect(keys).toHaveLength(4);
  });

  it('uses correct restoration_pioneer thresholds (1, 3, 8, 20)', () => {
    expect(earnedKeysForCategory('restoration_pioneer', 0)).toHaveLength(0);
    expect(earnedKeysForCategory('restoration_pioneer', 1)).toHaveLength(1);
    expect(earnedKeysForCategory('restoration_pioneer', 3)).toHaveLength(2);
    expect(earnedKeysForCategory('restoration_pioneer', 8)).toHaveLength(3);
    expect(earnedKeysForCategory('restoration_pioneer', 20)).toHaveLength(4);
  });
});

describe('computeLevel', () => {
  it.each([
    [0,    1, 'Newcomer',                100],
    [99,   1, 'Newcomer',                100],
    [100,  2, 'Contributor',              400],
    [400,  3, 'Advocate',                 900],
    [900,  4, 'Champion',                1800],
    [1800, 5, 'Environmental Leader',    3500],
    [3500, 6, 'Guardian of Bangladesh',    -1],
    [9999, 6, 'Guardian of Bangladesh',    -1],
  ])('%d points → level %d (%s)', (points, level, label, nextLevelPoints) => {
    expect(computeLevel(points)).toEqual({ level, label, nextLevelPoints });
  });
});

// ── GamificationService.evaluateBadges ────────────────────────────────────────

describe('GamificationService.evaluateBadges', () => {
  it('enqueues a job with the correct name and userId', async () => {
    const { service, gamificationQueue } = build();

    await service.evaluateBadges('u1');

    expect(gamificationQueue.add).toHaveBeenCalledWith(
      'evaluate-badges',
      { userId: 'u1' },
      expect.objectContaining({ jobId: 'badge-eval:u1' }),
    );
  });

  it('deduplicates: uses the same jobId for the same user', async () => {
    const { service, gamificationQueue } = build();

    await service.evaluateBadges('u1');
    await service.evaluateBadges('u1');

    // Both calls use the same jobId — BullMQ will deduplicate at the queue level
    const calls = (gamificationQueue.add as jest.Mock).mock.calls;
    expect(calls[0][2]).toMatchObject({ jobId: 'badge-eval:u1' });
    expect(calls[1][2]).toMatchObject({ jobId: 'badge-eval:u1' });
  });
});

// ── GamificationService.performEvaluation ─────────────────────────────────────

describe('GamificationService.performEvaluation', () => {
  it('returns early without a DB write if user has no profile', async () => {
    const { service, prisma } = build();
    prisma.userProfile.findUnique.mockResolvedValue(null);

    await service.performEvaluation('u1');

    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  // Helper: citizenReport.count is called twice in fetchBadgeCounts — once for
  // civicGuardian (no category filter) and once for airReports (category=AIR_POLLUTION).
  // We need airReports to return 0 so only civic_guardian badges/points are earned.
  function mockCitizenReportCount(prisma: ReturnType<typeof mockPrisma>, civicCount: number) {
    (prisma.citizenReport.count as jest.Mock).mockImplementation((args: any) =>
      Promise.resolve(args?.where?.category ? 0 : civicCount),
    );
  }

  it('skips DB write when badges and points are unchanged', async () => {
    const { service, prisma } = build();
    // User has civic_guardian_bronze (1 verified report) and 25 pts
    prisma.userProfile.findUnique.mockResolvedValue({
      id: 'prof1',
      earnedBadges: ['civic_guardian_bronze'],
      contributionPoints: 25,
    });
    mockCitizenReportCount(prisma, 1); // 1 verified report → civic_guardian_bronze

    await service.performEvaluation('u1');

    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('writes to DB when a new badge is earned', async () => {
    const { service, prisma } = build();
    prisma.userProfile.findUnique.mockResolvedValue({
      id: 'prof1',
      earnedBadges: [], // no badges yet
      contributionPoints: 0,
    });
    mockCitizenReportCount(prisma, 1); // now has 1 verified report → bronze

    await service.performEvaluation('u1');

    expect(prisma.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          earnedBadges: expect.arrayContaining(['civic_guardian_bronze']),
          contributionPoints: 25,
        }),
      }),
    );
  });

  it('writes to DB when points change without new badge keys', async () => {
    // Edge case: badge key set same but points differ (shouldn't happen in
    // normal flow, but guards against stale data)
    const { service, prisma } = build();
    prisma.userProfile.findUnique.mockResolvedValue({
      id: 'prof1',
      earnedBadges: ['civic_guardian_bronze'],
      contributionPoints: 0, // stale — should be 25
    });
    mockCitizenReportCount(prisma, 1);

    await service.performEvaluation('u1');

    expect(prisma.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contributionPoints: 25 }),
      }),
    );
  });
});
