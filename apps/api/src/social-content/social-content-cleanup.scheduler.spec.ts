import { SocialContentCleanupScheduler, SOCIAL_RETENTION_DAYS } from './social-content-cleanup.scheduler';

const NOW = new Date('2026-10-16T03:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function build(opts: { configured?: boolean; stale?: Array<{ id: string; keys: string[] }>; listed?: string[] } = {}) {
  const calls: string[] = [];
  const prisma: any = {
    socialPostDraft: {
      findMany: jest.fn().mockResolvedValue((opts.stale ?? []).map((d) => ({ id: d.id, renderedAssets: d.keys.map((storageKey) => ({ storageKey })) }))),
      deleteMany: jest.fn((args) => (calls.push('drafts'), { args })),
    },
    socialRenderedAsset: { deleteMany: jest.fn((args) => (calls.push('assets'), { args })) },
    socialPublication: { deleteMany: jest.fn((args) => (calls.push('publications'), { args })) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const storage: any = {
    isConfigured: opts.configured ?? true,
    listKeysOlderThan: jest.fn().mockResolvedValue(opts.listed ?? []),
    deleteMany: jest.fn().mockImplementation(async (keys: string[]) => keys.length),
  };
  return { scheduler: new SocialContentCleanupScheduler(prisma, storage), prisma, storage, calls };
}

describe('SocialContentCleanupScheduler.purgeExpired', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('keeps 7 days: the cutoff is exactly 7 days before now', async () => {
    const { scheduler, prisma } = build();
    await scheduler.purgeExpired(NOW);
    expect(SOCIAL_RETENTION_DAYS).toBe(7);
    expect(prisma.socialPostDraft.findMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date(NOW.getTime() - 7 * DAY));
  });

  it('does nothing, and writes nothing, when no draft is old enough', async () => {
    process.env.NODE_ENV = 'production';
    const { scheduler, prisma, storage } = build();
    await expect(scheduler.purgeExpired(NOW)).resolves.toEqual({ drafts: 0, files: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(storage.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes stale drafts of every status with their publications and assets in one transaction, then their files', async () => {
    const { scheduler, prisma, storage } = build({ stale: [{ id: 'd1', keys: ['social-cards/d1/a.png'] }, { id: 'd2', keys: ['social-cards/d2/b.png', 'social-cards/d2/c.png'] }] });
    const result = await scheduler.purgeExpired(NOW);
    expect(prisma.socialPostDraft.findMany.mock.calls[0][0].where).not.toHaveProperty('status');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.socialPublication.deleteMany).toHaveBeenCalledWith({ where: { draftId: { in: ['d1', 'd2'] } } });
    expect(prisma.socialRenderedAsset.deleteMany).toHaveBeenCalledWith({ where: { draftId: { in: ['d1', 'd2'] } } });
    expect(prisma.socialPostDraft.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d1', 'd2'] } } });
    // FK order: publications before assets before drafts
    const order = prisma.$transaction.mock.calls[0][0].map((r: any) => r.args.where);
    expect(Object.keys(order[0])).toEqual(['draftId']);
    expect(storage.deleteMany).toHaveBeenCalledWith(expect.arrayContaining(['social-cards/d1/a.png', 'social-cards/d2/b.png', 'social-cards/d2/c.png']));
    expect(result).toEqual({ drafts: 2, files: 3 });
  });

  it('sweeps untracked and orphaned files older than the cutoff in production (e.g. the published PNG copy)', async () => {
    process.env.NODE_ENV = 'production';
    const { scheduler, storage } = build({ stale: [{ id: 'd1', keys: ['social-cards/d1/a.png'] }], listed: ['social-cards/d1/a.png', 'social-cards/d1/portrait_4_5-abc.png', 'social-cards/gone/old.png'] });
    const result = await scheduler.purgeExpired(NOW);
    expect(storage.listKeysOlderThan).toHaveBeenCalledWith('social-cards/', new Date(NOW.getTime() - 7 * DAY));
    const deleted = storage.deleteMany.mock.calls[0][0];
    expect([...deleted].sort()).toEqual(['social-cards/d1/a.png', 'social-cards/d1/portrait_4_5-abc.png', 'social-cards/gone/old.png']);
    expect(result.files).toBe(3);
  });

  it('does not sweep the bucket outside production unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SOCIAL_CONTENT_STORAGE_SWEEP;
    const { scheduler, storage } = build({ stale: [{ id: 'd1', keys: ['social-cards/d1/a.png'] }], listed: ['social-cards/other/x.png'] });
    await scheduler.purgeExpired(NOW);
    expect(storage.listKeysOlderThan).not.toHaveBeenCalled();
    expect(storage.deleteMany).toHaveBeenCalledWith(['social-cards/d1/a.png']);

    process.env.SOCIAL_CONTENT_STORAGE_SWEEP = 'true';
    const second = build({ listed: ['social-cards/other/x.png'] });
    await second.scheduler.purgeExpired(NOW);
    expect(second.storage.listKeysOlderThan).toHaveBeenCalled();
  });

  it('still removes the database rows when storage is not configured or fails', async () => {
    const off = build({ configured: false, stale: [{ id: 'd1', keys: ['k'] }] });
    await expect(off.scheduler.purgeExpired(NOW)).resolves.toEqual({ drafts: 1, files: 0 });
    expect(off.prisma.$transaction).toHaveBeenCalled();
    expect(off.storage.deleteMany).not.toHaveBeenCalled();

    process.env.NODE_ENV = 'production';
    const failing = build({ stale: [{ id: 'd1', keys: ['k'] }] });
    failing.storage.deleteMany.mockRejectedValue(new Error('bucket down'));
    failing.storage.listKeysOlderThan.mockRejectedValue(new Error('list failed'));
    await expect(failing.scheduler.purgeExpired(NOW)).resolves.toEqual({ drafts: 1, files: 0 });
    expect(failing.prisma.$transaction).toHaveBeenCalled();
  });
});
