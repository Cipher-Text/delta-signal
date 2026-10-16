import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SocialAutopostService } from './social-autopost.service';

const admin = { sub: 'admin-1', email: 'a@x.org', role: 'ADMIN' };
const moderator = { sub: 'mod-1', email: 'm@x.org', role: 'MODERATOR' };
// Saturday 17 Oct 2026, 08:00 in Dhaka.
const SAT_8 = new Date('2026-10-17T02:00:00Z');

function suggestion(series: string) {
  return { id: series, cadence: 'DAILY', series, direction: 'HIGHEST', headline: `${series} head`, reason: 'Reason', quality: 'HIGH', sourceLabel: 'Src', coverage: {}, sourceSnapshot: { rows: [{ district: 'A', rainfallMm: 9 }] } };
}

function build(over: { settings?: Record<string, unknown>; slot?: Record<string, unknown>; slots?: Array<Record<string, unknown>>; runs?: unknown[]; suggestions?: unknown[]; claim?: number; account?: unknown } = {}) {
  const calls: string[] = [];
  const settings = { id: 'default', enabled: true, platformAccountId: 'acc-1', captionFooter: '#DS', enabledById: 'admin-1', ...over.settings };
  const slotRow = { id: 'slot_6_0', dayOfWeek: 6, position: 0, enabled: true, timeOfDay: '08:00', content: 'AUTO', format: 'PORTRAIT_4_5', lastRunOn: null, ...over.slot };
  const prisma: any = {
    socialAutopostSettings: { findUnique: jest.fn().mockResolvedValue(settings), upsert: jest.fn().mockResolvedValue(settings), update: jest.fn().mockResolvedValue(settings) },
    socialAutopostSlot: {
      findMany: jest.fn(async (args: any = {}) => {
        const rows = [...(over.slots ?? [slotRow])];
        for (const d of [0, 1, 2, 3, 4, 5, 6]) for (const position of [0, 1, 2]) {
          if (!rows.some((r: any) => r.dayOfWeek === d && r.position === position)) rows.push({ ...slotRow, id: `slot_${d}_${position}`, dayOfWeek: d, position, enabled: false, timeOfDay: ['08:30', '13:00', '19:30'][position] });
        }
        const where = args.where ?? {};
        return rows.filter((r: any) => (where.dayOfWeek === undefined || r.dayOfWeek === where.dayOfWeek) && (where.enabled === undefined || r.enabled === where.enabled))
          .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek || a.position - b.position);
      }),
      createMany: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: over.claim ?? 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    socialAutopostRun: { count: jest.fn().mockResolvedValue(0), create: jest.fn(async ({ data }: any) => ({ id: 'run-1', ...data })), findMany: jest.fn().mockResolvedValue(over.runs ?? []) },
    socialPlatformAccount: { findUnique: jest.fn().mockResolvedValue('account' in over ? over.account : { id: 'acc-1', displayName: 'Delta Signal Page', platform: 'FACEBOOK', status: 'ACTIVE' }) },
    socialPublication: { findMany: jest.fn().mockResolvedValue([]) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const ranking: any = { getSuggestions: jest.fn().mockResolvedValue(over.suggestions ?? [suggestion('HEAT_WATCH')]) };
  const content: any = {
    create: jest.fn(async () => (calls.push('create'), { id: 'draft-1', headline: 'HEAT head', sourceLabel: 'Src', disclaimer: 'Disc' })),
    update: jest.fn(async () => (calls.push('update'), {})),
    render: jest.fn(async () => (calls.push('render'), {})),
    approve: jest.fn(async () => (calls.push('approve'), {})),
  };
  const publishing: any = { requestPublish: jest.fn(async () => (calls.push('publish'), { id: 'pub-1' })), list: jest.fn().mockResolvedValue([{ id: 'acc-1', displayName: 'Delta Signal Page' }]) };
  return { service: new SocialAutopostService(prisma, ranking, content, publishing), prisma, ranking, content, publishing, calls };
}

describe('SocialAutopostService', () => {
  const env = { ...process.env };
  beforeEach(() => { process.env.SOCIAL_AUTOPOST_ENABLED = 'true'; });
  afterEach(() => { process.env = { ...env }; });

  describe('runDue', () => {
    it('does nothing outside production unless explicitly enabled, and nothing while the master switch is off', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SOCIAL_AUTOPOST_ENABLED;
      const dev = build();
      expect(await dev.service.runDue(SAT_8)).toEqual({ ran: false });
      expect(dev.prisma.socialAutopostSettings.findUnique).not.toHaveBeenCalled();

      process.env.SOCIAL_AUTOPOST_ENABLED = 'true';
      const off = build({ settings: { enabled: false } });
      expect(await off.service.runDue(SAT_8)).toEqual({ ran: false });
      expect(off.content.create).not.toHaveBeenCalled();
    });

    it('waits for the time, and does not run twice in a day', async () => {
      const early = build();
      expect(await early.service.runDue(new Date('2026-10-17T01:59:00Z'))).toEqual({ ran: false });
      const done = build({ slot: { lastRunOn: new Date('2026-10-17T00:00:00Z') } });
      expect(await done.service.runDue(new Date('2026-10-17T02:05:00Z'))).toEqual({ ran: false });
      expect(done.prisma.socialAutopostSlot.updateMany).not.toHaveBeenCalled();
    });

    it('creates, captions, renders, approves and queues the post, in that order, and records it', async () => {
      const { service, calls, prisma, publishing, content } = build();
      expect(await service.runDue(SAT_8)).toEqual({ ran: true });
      expect(calls).toEqual(['create', 'update', 'render', 'approve', 'publish']);
      expect(content.create.mock.calls[0][0]).toMatchObject({ type: 'NATIONAL_HEAT_WATCH', cadence: 'DAILY', format: 'PORTRAIT_4_5' });
      expect(content.update.mock.calls[0][1].caption).toContain('HEAT head');
      expect(content.update.mock.calls[0][1].caption).toContain('#DS');
      expect(publishing.requestPublish).toHaveBeenCalledWith('draft-1', 'acc-1', expect.objectContaining({ sub: 'admin-1' }));
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ status: 'QUEUED', series: 'HEAT_WATCH', draftId: 'draft-1', publicationId: 'pub-1' });
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SOCIAL_AUTOPOST_RUN', userId: 'admin-1' }) });
    });

    it('claims the day first, so a slot that another instance already took never posts', async () => {
      const { service, prisma, content } = build({ claim: 0 });
      expect(await service.runDue(SAT_8)).toEqual({ ran: false });
      expect(prisma.socialAutopostSlot.updateMany).toHaveBeenCalled();
      expect(content.create).not.toHaveBeenCalled();
    });

    it('skips, never posts late, when the slot was missed', async () => {
      const { service, prisma, content } = build();
      expect(await service.runDue(new Date('2026-10-17T03:00:00Z'))).toEqual({ ran: true });
      expect(content.create).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ status: 'SKIPPED' });
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data.reason).toMatch(/Missed/);
    });

    it('skips with the reason when nothing suitable is available', async () => {
      const { service, prisma, content } = build({ suggestions: [suggestion('ALERT_WATCH')] });
      await service.runDue(SAT_8);
      expect(content.create).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ status: 'SKIPPED' });
    });

    it('records a failure with the message, and does not publish, when a step throws', async () => {
      const { service, prisma, content, publishing } = build();
      content.render.mockRejectedValue(new Error('storage unavailable'));
      await service.runDue(SAT_8);
      expect(publishing.requestPublish).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ status: 'FAILED', reason: 'storage unavailable', draftId: 'draft-1' });
    });

    it('fails clearly when the connected page is gone, without creating anything', async () => {
      const { service, prisma, content } = build({ account: { id: 'acc-1', status: 'REVOKED' } });
      await service.runDue(SAT_8);
      expect(content.create).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ status: 'FAILED' });
    });
  });

  describe('setEnabled', () => {
    it('is administrator only', async () => {
      await expect(build().service.setEnabled(moderator, { enabled: true, acknowledged: true })).rejects.toThrow(ForbiddenException);
    });
    it('needs the confirmation, a connected page and at least one enabled day', async () => {
      await expect(build().service.setEnabled(admin, { enabled: true })).rejects.toThrow(/Confirm/);
      await expect(build({ settings: { platformAccountId: null } }).service.setEnabled(admin, { enabled: true, acknowledged: true })).rejects.toThrow(/connected page/);
      await expect(build({ slot: { enabled: false } }).service.setEnabled(admin, { enabled: true, acknowledged: true })).rejects.toThrow(/at least one day/);
    });
    it('turns on as the administrator, audits it, and never fires for a time already passed today', async () => {
      const { service, prisma } = build();
      await service.setEnabled(admin, { enabled: true, acknowledged: true }, new Date('2026-10-17T03:00:00Z'));
      expect(prisma.socialAutopostSettings.update).toHaveBeenCalledWith({ where: { id: 'default' }, data: { enabled: true, enabledById: 'admin-1', updatedById: 'admin-1' } });
      expect(prisma.socialAutopostSlot.update).toHaveBeenCalledWith({ where: { id: 'slot_6_0' }, data: { lastRunOn: new Date('2026-10-17T00:00:00Z') } });
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SOCIAL_AUTOPOST_TOGGLE', meta: { enabled: true } }) });
    });
    it('turns off without conditions', async () => {
      const { service, prisma } = build();
      await service.setEnabled(admin, { enabled: false });
      expect(prisma.socialAutopostSettings.update).toHaveBeenCalledWith({ where: { id: 'default' }, data: { enabled: false, updatedById: 'admin-1' } });
    });
  });

  describe('updateConfig', () => {
    const slot = (over = {}) => ({ dayOfWeek: 6, position: 0, enabled: true, timeOfDay: '09:30', content: 'AUTO', format: 'PORTRAIT_4_5', ...over }) as any;

    it('rejects an unavailable page, a repeated post and a master-on config without a page', async () => {
      await expect(build({ account: null }).service.updateConfig(admin, { platformAccountId: 'acc-9' })).rejects.toThrow(BadRequestException);
      await expect(build().service.updateConfig(admin, { slots: [slot(), slot()] })).rejects.toThrow(/once/);
      await expect(build({ settings: { platformAccountId: null } }).service.updateConfig(admin, { slots: [slot()] })).rejects.toThrow(/Choose the page/);
    });
    it('refuses quiet hours, posts closer than four hours, and a day with more than two posts', async () => {
      await expect(build().service.updateConfig(admin, { slots: [slot({ timeOfDay: '22:30' })] })).rejects.toThrow(/quiet hours/);
      await expect(build().service.updateConfig(admin, { slots: [slot({ timeOfDay: '03:00' })] })).rejects.toThrow(/Saturday.*quiet hours/);
      await expect(build().service.updateConfig(admin, { slots: [slot({ timeOfDay: '15:00' }), slot({ position: 1, timeOfDay: '17:00' })] })).rejects.toThrow(/4 hours/);
    });
    it('accepts a second post that keeps the spacing', async () => {
      const { service, prisma } = build();
      await service.updateConfig(admin, { slots: [slot({ timeOfDay: '07:30' }), slot({ position: 1, timeOfDay: '18:00' })] }, new Date('2026-10-16T00:00:00Z'));
      expect(prisma.socialAutopostSlot.update).toHaveBeenCalledTimes(2);
      expect(prisma.socialAutopostSlot.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'slot_6_1' } }));
    });
    it('saves the slots and audits the change', async () => {
      const { service, prisma } = build();
      await service.updateConfig(admin, { captionFooter: ' #A ', slots: [slot({ content: 'RAIN_WATCH' })] }, new Date('2026-10-17T00:00:00Z'));
      expect(prisma.socialAutopostSlot.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'slot_6_0' }, data: expect.objectContaining({ timeOfDay: '09:30', content: 'RAIN_WATCH' }) }));
      expect(prisma.socialAutopostSettings.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ captionFooter: '#A' }) }));
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SOCIAL_AUTOPOST_UPDATE' }) });
    });
    it('moving a slot to a time that has already passed today does not make it fire', async () => {
      const { service, prisma } = build({ slot: { enabled: true, timeOfDay: '12:00' } });
      await service.updateConfig(admin, { slots: [slot({ timeOfDay: '07:00' })] }, SAT_8);
      expect(prisma.socialAutopostSlot.update.mock.calls[0][0].data.lastRunOn).toEqual(new Date('2026-10-17T00:00:00Z'));
    });
    it('a time still ahead today is left to run', async () => {
      const { service, prisma } = build({ slot: { enabled: true, timeOfDay: '07:00' } });
      await service.updateConfig(admin, { slots: [slot({ timeOfDay: '18:00' })] }, SAT_8);
      expect(prisma.socialAutopostSlot.update.mock.calls[0][0].data).not.toHaveProperty('lastRunOn');
    });
  });

  describe('two posts a day', () => {
    const second = { id: 'slot_6_1', dayOfWeek: 6, position: 1, enabled: true, timeOfDay: '18:00', content: 'AUTO', format: 'PORTRAIT_4_5', lastRunOn: null };
    const first = { id: 'slot_6_0', dayOfWeek: 6, position: 0, enabled: true, timeOfDay: '07:30', content: 'AUTO', format: 'PORTRAIT_4_5', lastRunOn: null };
    const SAT_730 = new Date('2026-10-17T01:30:00Z');
    const SAT_1800 = new Date('2026-10-17T12:00:00Z');

    it('claims each slot on its own and records which post it was', async () => {
      const { service, prisma } = build({ slots: [first, second] });
      expect(await service.runDue(SAT_730)).toEqual({ ran: true });
      expect(prisma.socialAutopostSlot.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'slot_6_0' });
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ position: 0, status: 'QUEUED' });
      const later = build({ slots: [{ ...first, lastRunOn: new Date('2026-10-17T00:00:00Z') }, second] });
      expect(await later.service.runDue(SAT_1800)).toEqual({ ran: true });
      expect(later.prisma.socialAutopostSlot.updateMany.mock.calls).toHaveLength(1);
      expect(later.prisma.socialAutopostSlot.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'slot_6_1' });
    });
    it('the second post never repeats the first, and is skipped with a reason when nothing else exists', async () => {
      const posted = [{ series: 'HEAT_WATCH', scheduledFor: new Date('2026-10-17T01:30:00Z') }];
      const { service, prisma, content } = build({ slots: [{ ...first, lastRunOn: new Date('2026-10-17T00:00:00Z') }, second], runs: posted, suggestions: [suggestion('HEAT_WATCH')] });
      await service.runDue(SAT_1800);
      expect(content.create).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ position: 1, status: 'SKIPPED' });
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data.reason).toMatch(/already posted today/);
    });
    it('the second post picks a different card when one exists', async () => {
      const posted = [{ series: 'HEAT_WATCH', scheduledFor: new Date('2026-10-17T01:30:00Z') }];
      const { service, content } = build({ slots: [{ ...first, lastRunOn: new Date('2026-10-17T00:00:00Z') }, second], runs: posted, suggestions: [suggestion('HEAT_WATCH'), suggestion('AIR_QUALITY_WATCH')] });
      await service.runDue(SAT_1800);
      expect(content.create.mock.calls[0][0]).toMatchObject({ type: 'NATIONAL_AIR_QUALITY_WATCH' });
    });
    it('turning on never fires a post whose time already passed, but leaves a later one', async () => {
      const { service, prisma } = build({ slots: [first, second] });
      await service.setEnabled(admin, { enabled: true, acknowledged: true }, new Date('2026-10-17T05:00:00Z'));
      const marked = prisma.socialAutopostSlot.update.mock.calls.map((c: any) => c[0].where.id);
      expect(marked).toEqual(['slot_6_0']);
    });
    it('previews the second post separately', async () => {
      const { service } = build({ slots: [first, { ...second, content: 'RAIN_WATCH' }], suggestions: [suggestion('HEAT_WATCH'), suggestion('RAIN_WATCH')] });
      expect(await service.preview(6, 1)).toMatchObject({ slot: { position: 1, content: 'RAIN_WATCH' }, series: 'RAIN_WATCH' });
      await expect(service.preview(6, 3)).rejects.toThrow(BadRequestException);
    });
  });

  describe('a third post', () => {
    const slots = [
      { id: 'slot_6_0', dayOfWeek: 6, position: 0, enabled: true, timeOfDay: '08:30', content: 'RAIN_WATCH', format: 'PORTRAIT_4_5', lastRunOn: new Date('2026-10-17T00:00:00Z') },
      { id: 'slot_6_1', dayOfWeek: 6, position: 1, enabled: true, timeOfDay: '13:00', content: 'AIR_QUALITY_WATCH', format: 'PORTRAIT_4_5', lastRunOn: new Date('2026-10-17T00:00:00Z') },
      { id: 'slot_6_2', dayOfWeek: 6, position: 2, enabled: true, timeOfDay: '19:30', content: 'NOTABLE', format: 'PORTRAIT_4_5', lastRunOn: null },
    ];
    const SAT_1930 = new Date('2026-10-17T13:30:00Z');
    const earlier = [
      { series: 'RAIN_WATCH', scheduledFor: new Date('2026-10-17T02:30:00Z') },
      { series: 'AIR_QUALITY_WATCH', scheduledFor: new Date('2026-10-17T07:00:00Z') },
    ];
    const notable = (series: string) => ({ ...suggestion(series), notable: true });

    it('the flexible third post only takes a notable card the first two did not use', async () => {
      const { service, content, prisma } = build({ slots, runs: earlier, suggestions: [notable('AIR_QUALITY_WATCH'), notable('HEAT_WATCH'), suggestion('RAIN_WATCH')] });
      await service.runDue(SAT_1930);
      expect(prisma.socialAutopostSlot.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'slot_6_2' });
      expect(content.create.mock.calls[0][0]).toMatchObject({ type: 'NATIONAL_HEAT_WATCH' });
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ position: 2, status: 'QUEUED' });
    });
    it('is skipped when the only notable card was already posted that day', async () => {
      const { service, content, prisma } = build({ slots, runs: earlier, suggestions: [notable('AIR_QUALITY_WATCH'), suggestion('HEAT_WATCH')] });
      await service.runDue(SAT_1930);
      expect(content.create).not.toHaveBeenCalled();
      expect(prisma.socialAutopostRun.create.mock.calls[0][0].data).toMatchObject({ position: 2, status: 'SKIPPED' });
    });
    it('accepts three spaced posts and refuses a third that is too close', async () => {
      const { service, prisma } = build();
      const s = (position: number, timeOfDay: string) => ({ dayOfWeek: 6, position, enabled: true, timeOfDay, content: 'AUTO', format: 'PORTRAIT_4_5' }) as any;
      await service.updateConfig(admin, { slots: [s(0, '08:30'), s(1, '13:00'), s(2, '19:30')] }, new Date('2026-10-16T00:00:00Z'));
      expect(prisma.socialAutopostSlot.update).toHaveBeenCalledTimes(3);
      await expect(build().service.updateConfig(admin, { slots: [s(0, '08:30'), s(1, '13:00'), s(2, '15:00')] })).rejects.toThrow(/4 hours/);
    });
  });

  describe('seedDefaultSchedule', () => {
    it('writes the default schedule, all posts on, while nobody has configured the routine', async () => {
      const { service, prisma } = build({ settings: { enabled: false, updatedById: null } });
      expect(await service.seedDefaultSchedule()).toBe(true);
      const calls = prisma.$transaction.mock.calls[0][0];
      expect(calls).toHaveLength(21);
      const saturdayFirst = prisma.socialAutopostSlot.update.mock.calls.find((c: any) => c[0].where.id === 'slot_6_0')[0];
      expect(saturdayFirst.data).toMatchObject({ enabled: true, timeOfDay: '10:00', content: 'WEEKLY_SUMMARY' });
      const tuesdayFirst = prisma.socialAutopostSlot.update.mock.calls.find((c: any) => c[0].where.id === 'slot_2_0')[0];
      expect(tuesdayFirst.data).toMatchObject({ timeOfDay: '09:30', content: 'COASTAL_WATCH' });
    });
    it('never overwrites a schedule an administrator has saved, switched on, or that has already run', async () => {
      for (const over of [{ updatedById: 'admin-1' }, { enabled: true, updatedById: null }]) {
        const { service, prisma } = build({ settings: over });
        expect(await service.seedDefaultSchedule()).toBe(false);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      }
      const ran = build({ settings: { enabled: false, updatedById: null } });
      ran.prisma.socialAutopostRun.count = jest.fn().mockResolvedValue(3);
      expect(await ran.service.seedDefaultSchedule()).toBe(false);
    });
    it('a seeding failure on boot is logged and never stops the app', async () => {
      const { service, prisma } = build({ settings: { enabled: false, updatedById: null } });
      prisma.socialAutopostSettings.upsert.mockRejectedValue(new Error('db down'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('preview and config', () => {
    it('previews what would post without posting', async () => {
      const { service, content } = build();
      const result = await service.preview(6);
      expect(result).toMatchObject({ wouldPost: true, series: 'HEAT_WATCH' });
      expect(content.create).not.toHaveBeenCalled();
      await expect(service.preview(9)).rejects.toThrow(BadRequestException);
    });
    it('reports the next run only while the routine is on, and marks a missing page', async () => {
      const on = await build().service.getConfig(new Date('2026-10-17T00:00:00Z'));
      expect(on.slots.find((s) => s.dayOfWeek === 6)?.nextRunAt).toBe('2026-10-17T02:00:00.000Z');
      expect(on.nextRunAt).toBe('2026-10-17T02:00:00.000Z');
      const off = await build({ settings: { enabled: false } }).service.getConfig(new Date('2026-10-17T00:00:00Z'));
      expect(off.nextRunAt).toBeNull();
      const gone = await build({ account: null }).service.getConfig();
      expect(gone.accountMissing).toBe(true);
    });
  });
});
