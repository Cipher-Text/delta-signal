import { BadRequestException, ForbiddenException, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { SocialAutopostRunStatus, SocialCardFormat, SocialPlatformAccountStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { NationalRankingService, type NationalCadence } from '../social-content/national-ranking.service';
import { SocialContentService } from '../social-content/social-content.service';
import { SocialPublishingService } from '../social-publishing/social-publishing.service';
import type { CreateSocialDraftDto } from '../social-content/dto/create-social-draft.dto';
import type { ToggleAutopostDto, UpdateAutopostDto } from './dto/autopost.dto';
import { DEFAULT_SCHEDULE } from './social-autopost.defaults';
import {
  AUTOPOST_CONTENT,
  DRAFT_FOR_SERIES,
  TIME_PATTERN,
  buildCaption,
  dhakaClock,
  dueState,
  nextRunAt,
  pickSuggestion,
  scheduledInstant,
  validateDaySlots,
  type AutopostContent,
} from './social-autopost.schedule';

const SETTINGS_ID = 'default';
const RETENTION_DAYS = 7;
const POSITIONS = [0, 1, 2];
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const slotId = (dayOfWeek: number, position: number) => `slot_${dayOfWeek}_${position}`;

const dateOnly = (key: string) => new Date(`${key}T00:00:00Z`);
const trim = (text: string, max = 300) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * The weekly auto-post routine. A master switch (off by default) plus three posts per weekday with a time (Bangladesh
 * time) and what to post. At each slot's time the routine takes the best suggestion that has complete data, creates
 * the card, renders it, approves it and queues it for the connected Page, exactly as an administrator would by hand.
 * Each day has up to three posts (first, second and third), at least four hours apart, never in quiet hours (22:00–06:00), and
 * a card already posted that day is never repeated, so a later post is skipped when nothing different exists.
 *
 * Safety: it only acts in production (or with SOCIAL_AUTOPOST_ENABLED=true), never posts alerts, never posts late
 * (a missed slot is skipped), posts each slot at most once per day even with several instances, and records every
 * outcome. Edits never trigger an immediate post.
 */
@Injectable()
export class SocialAutopostService implements OnModuleInit {
  private readonly logger = new Logger(SocialAutopostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ranking: NationalRankingService,
    private readonly content: SocialContentService,
    private readonly publishing: SocialPublishingService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultSchedule();
    } catch (error) {
      this.logger.warn(`Could not seed the default auto-post schedule: ${String(error)}`);
    }
  }

  /**
   * Writes DEFAULT_SCHEDULE (all posts on, master switch untouched and off) until somebody configures the routine:
   * once anyone has saved or toggled it, or a run was recorded, the schedule belongs to the administrators and is never
   * overwritten. Idempotent, so it is safe on every boot.
   */
  async seedDefaultSchedule(): Promise<boolean> {
    const { settings, slots } = await this.ensureRows();
    if (settings.enabled || settings.updatedById || (await this.prisma.socialAutopostRun.count()) > 0) return false;
    await this.prisma.$transaction(slots.map((slot) => {
      const wanted = DEFAULT_SCHEDULE[slot.dayOfWeek]?.[slot.position];
      return this.prisma.socialAutopostSlot.update({
        where: { id: slot.id },
        data: wanted ? { enabled: true, timeOfDay: wanted.time, content: wanted.content, format: SocialCardFormat.PORTRAIT_4_5 } : { enabled: false },
      });
    }));
    return true;
  }

  /** False on a developer machine: the scheduler then never posts, although the settings can still be edited. */
  get runtimeActive(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.SOCIAL_AUTOPOST_ENABLED === 'true';
  }

  private audit(action: 'SOCIAL_AUTOPOST_UPDATE' | 'SOCIAL_AUTOPOST_TOGGLE' | 'SOCIAL_AUTOPOST_RUN', userId: string | null, meta: Record<string, unknown>) {
    return this.prisma.auditEvent.create({ data: { action, userId, entityType: 'SocialAutopost', meta: meta as object } });
  }

  private async ensureRows() {
    const settings = await this.prisma.socialAutopostSettings.upsert({ where: { id: SETTINGS_ID }, update: {}, create: { id: SETTINGS_ID } });
    await this.prisma.socialAutopostSlot.createMany({
      data: DAYS.flatMap((dayOfWeek) => POSITIONS.map((position) => ({ id: slotId(dayOfWeek, position), dayOfWeek, position, timeOfDay: DEFAULT_SCHEDULE[dayOfWeek][position].time, content: DEFAULT_SCHEDULE[dayOfWeek][position].content }))),
      skipDuplicates: true,
    });
    const slots = await this.prisma.socialAutopostSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { position: 'asc' }] });
    return { settings, slots };
  }

  private async activeAccount(id: string | null | undefined) {
    if (!id) return null;
    const account = await this.prisma.socialPlatformAccount.findUnique({ where: { id }, select: { id: true, displayName: true, platform: true, status: true } });
    return account && account.status === SocialPlatformAccountStatus.ACTIVE ? account : null;
  }

  // ─── read ───────────────────────────────────────────────────────────────────

  async getConfig(now: Date = new Date()) {
    const { settings, slots } = await this.ensureRows();
    const since = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const [account, accounts, runs] = await Promise.all([
      this.activeAccount(settings.platformAccountId),
      this.publishing.list(),
      this.prisma.socialAutopostRun.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    const publicationIds = runs.map((r) => r.publicationId).filter((id): id is string => Boolean(id));
    const publications = publicationIds.length
      ? await this.prisma.socialPublication.findMany({ where: { id: { in: publicationIds } }, select: { id: true, status: true, externalUrl: true, error: true } })
      : [];
    const publicationById = new Map(publications.map((p) => [p.id, p]));

    const slotViews = slots.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      position: slot.position,
      enabled: slot.enabled,
      timeOfDay: slot.timeOfDay,
      content: slot.content,
      format: slot.format,
      nextRunAt: settings.enabled ? nextRunAt(slot, now)?.toISOString() ?? null : null,
    }));
    const upcoming = slotViews.map((s) => s.nextRunAt).filter((v): v is string => Boolean(v)).sort();
    return {
      enabled: settings.enabled,
      runtimeActive: this.runtimeActive,
      platformAccount: account,
      accountMissing: Boolean(settings.platformAccountId) && !account,
      accounts,
      captionFooter: settings.captionFooter,
      slots: slotViews,
      nextRunAt: upcoming[0] ?? null,
      runs: runs.map((run) => ({ ...run, publication: run.publicationId ? publicationById.get(run.publicationId) ?? null : null })),
    };
  }

  /** What the slot would post right now, without posting anything. */
  async preview(dayOfWeek: number, position = 0, now: Date = new Date()) {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new BadRequestException('day must be 0 (Sunday) to 6 (Saturday)');
    if (!POSITIONS.includes(position)) throw new BadRequestException('position must be 0, 1 or 2 (first, second or third post)');
    const { settings, slots } = await this.ensureRows();
    const slot = slots.find((s) => s.dayOfWeek === dayOfWeek && s.position === position)!;
    const picked = await this.choose(slot.content as AutopostContent, slot.timeOfDay, now);
    const slotInfo = { dayOfWeek, position, content: slot.content };
    if ('reason' in picked) return { slot: slotInfo, wouldPost: false as const, reason: picked.reason };
    const { suggestion } = picked;
    const rows = (suggestion.sourceSnapshot.rows ?? []) as Array<Record<string, unknown>>;
    return {
      slot: slotInfo,
      wouldPost: true as const,
      series: suggestion.series,
      headline: suggestion.headline,
      reason: suggestion.reason,
      notable: suggestion.notable,
      rows: rows.slice(0, 5),
      caption: buildCaption({ headline: suggestion.headline, reason: suggestion.reason, series: suggestion.series, rows, sourceLabel: suggestion.sourceLabel, disclaimer: null, footer: settings.captionFooter }),
    };
  }

  // ─── write ──────────────────────────────────────────────────────────────────

  async updateConfig(actor: JwtPayload, dto: UpdateAutopostDto, now: Date = new Date()) {
    const { settings, slots } = await this.ensureRows();
    const platformAccountId = dto.platformAccountId === undefined ? settings.platformAccountId : dto.platformAccountId;
    if (platformAccountId && !(await this.activeAccount(platformAccountId))) throw new BadRequestException('That connected page is not available. Connect it again first.');
    if (settings.enabled && !platformAccountId) throw new BadRequestException('Choose the page to post to, or turn auto-posting off first.');

    const seen = new Set<string>();
    for (const slot of dto.slots ?? []) {
      const key = `${slot.dayOfWeek}:${slot.position}`;
      if (seen.has(key)) throw new BadRequestException('Each post can only be listed once.');
      seen.add(key);
      if (!TIME_PATTERN.test(slot.timeOfDay)) throw new BadRequestException(`"${slot.timeOfDay}" is not a valid time.`);
      if (!AUTOPOST_CONTENT.includes(slot.content as AutopostContent)) throw new BadRequestException(`Unknown content choice "${slot.content}".`);
    }
    // Quiet hours and spacing are checked on the merged result, so a partial update cannot break a day.
    for (const day of DAYS) {
      const merged = POSITIONS.map((position) => {
        const incoming = dto.slots?.find((s) => s.dayOfWeek === day && s.position === position);
        const existing = slots.find((s) => s.dayOfWeek === day && s.position === position);
        return incoming ?? existing;
      }).filter((s): s is NonNullable<typeof s> => Boolean(s));
      const problem = validateDaySlots(merged);
      if (problem) throw new BadRequestException(`${DAY_NAMES[day]}: ${problem}`);
    }

    const clock = dhakaClock(now);
    const updates = (dto.slots ?? []).map((incoming) => {
      const existing = slots.find((s) => s.dayOfWeek === incoming.dayOfWeek && s.position === incoming.position)!;
      const changedTiming = incoming.enabled !== existing.enabled || incoming.timeOfDay !== existing.timeOfDay;
      // A change made after today's time has passed must not fire retroactively: mark today as already handled.
      const passedToday = incoming.dayOfWeek === clock.dayOfWeek && scheduledInstant(clock.dateKey, incoming.timeOfDay) <= now;
      return this.prisma.socialAutopostSlot.update({
        where: { id: existing.id },
        data: {
          enabled: incoming.enabled, timeOfDay: incoming.timeOfDay, content: incoming.content, format: incoming.format as SocialCardFormat,
          ...(changedTiming && incoming.enabled && passedToday ? { lastRunOn: dateOnly(clock.dateKey) } : {}),
        },
      });
    });
    await this.prisma.$transaction([
      this.prisma.socialAutopostSettings.update({
        where: { id: SETTINGS_ID },
        data: { platformAccountId, ...(dto.captionFooter !== undefined ? { captionFooter: dto.captionFooter.trim() } : {}), updatedById: actor.sub },
      }),
      ...updates,
    ]);
    await this.audit('SOCIAL_AUTOPOST_UPDATE', actor.sub, { platformAccountId, slots: dto.slots?.map((s) => ({ day: s.dayOfWeek, position: s.position, enabled: s.enabled, time: s.timeOfDay, content: s.content })) });
    return this.getConfig(now);
  }

  async setEnabled(actor: JwtPayload, dto: ToggleAutopostDto, now: Date = new Date()) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Only an administrator can turn automatic posting on or off.');
    const { settings, slots } = await this.ensureRows();
    const platformAccountId = dto.enabled && dto.platformAccountId ? dto.platformAccountId : settings.platformAccountId;
    if (dto.enabled) {
      if (!dto.acknowledged) throw new BadRequestException('Confirm that posts will be published without review.');
      if (!platformAccountId) throw new BadRequestException('Choose the page to post to first.');
      if (!(await this.activeAccount(platformAccountId))) throw new BadRequestException('The chosen page is not active. Reconnect it in Social Content, then choose it again.');
      if (!slots.some((s) => s.enabled)) throw new BadRequestException('Turn on at least one post first.');
    }
    await this.prisma.socialAutopostSettings.update({
      where: { id: SETTINGS_ID },
      data: dto.enabled ? { enabled: true, platformAccountId, enabledById: actor.sub, updatedById: actor.sub } : { enabled: false, updatedById: actor.sub },
    });
    // Turning on must never fire for a time that already passed today.
    if (dto.enabled) {
      const clock = dhakaClock(now);
      for (const today of slots.filter((s) => s.dayOfWeek === clock.dayOfWeek && s.enabled)) {
        if (scheduledInstant(clock.dateKey, today.timeOfDay) <= now) {
          await this.prisma.socialAutopostSlot.update({ where: { id: today.id }, data: { lastRunOn: dateOnly(clock.dateKey) } });
        }
      }
    }
    await this.audit('SOCIAL_AUTOPOST_TOGGLE', actor.sub, { enabled: dto.enabled, platformAccountId: dto.enabled ? platformAccountId : undefined });
    return this.getConfig(now);
  }

  // ─── running ────────────────────────────────────────────────────────────────

  /** Series already posted today and recently (today and yesterday), from the run history. */
  private async history(now: Date) {
    const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const runs = await this.prisma.socialAutopostRun.findMany({
      where: { status: SocialAutopostRunStatus.QUEUED, series: { not: null }, scheduledFor: { gte: since } }, orderBy: { scheduledFor: 'desc' }, select: { series: true, scheduledFor: true },
    });
    const today = dhakaClock(now).dateKey;
    return {
      postedToday: runs.filter((r) => dhakaClock(r.scheduledFor).dateKey === today).map((r) => r.series as string),
      recentSeries: runs.map((r) => r.series as string),
    };
  }

  private async choose(content: AutopostContent, timeOfDay: string, now: Date) {
    const cadence: NationalCadence = content === 'WEEKLY_SUMMARY' ? 'WEEKLY' : 'DAILY';
    const suggestions = await this.ranking.getSuggestions(cadence);
    const { postedToday, recentSeries } = await this.history(now);
    return pickSuggestion(content, suggestions, { postedToday, recentSeries, hour: Number(timeOfDay.slice(0, 2)) });
  }

  /** Called every minute by the scheduler. Each due slot is claimed on its own, so a slot posts once. */
  async runDue(now: Date = new Date()): Promise<{ ran: boolean }> {
    if (!this.runtimeActive) return { ran: false };
    const settings = await this.prisma.socialAutopostSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings?.enabled) return { ran: false };

    const clock = dhakaClock(now);
    const todays = await this.prisma.socialAutopostSlot.findMany({ where: { dayOfWeek: clock.dayOfWeek, enabled: true }, orderBy: { timeOfDay: 'asc' } });
    let ran = false;
    for (const slot of todays) {
      const state = dueState(slot, now);
      if (state !== 'DUE' && state !== 'MISSED') continue;

      // Claim today's run: only one caller (instance or retry) gets count 1, so a slot never posts twice.
      const claimed = await this.prisma.socialAutopostSlot.updateMany({
        where: { id: slot.id, OR: [{ lastRunOn: null }, { lastRunOn: { lt: dateOnly(clock.dateKey) } }] },
        data: { lastRunOn: dateOnly(clock.dateKey) },
      });
      if (claimed.count !== 1) continue;
      ran = true;

      const scheduledFor = scheduledInstant(clock.dateKey, slot.timeOfDay);
      if (state === 'MISSED') {
        await this.record({ dayOfWeek: slot.dayOfWeek, position: slot.position, scheduledFor, status: 'SKIPPED', reason: `Missed: the server was not running at ${slot.timeOfDay}`, userId: settings.enabledById });
        continue;
      }
      await this.execute(slot, settings, scheduledFor, now);
    }
    return { ran };
  }

  private record(input: { dayOfWeek: number; position: number; scheduledFor: Date; status: SocialAutopostRunStatus | 'SKIPPED' | 'FAILED' | 'QUEUED'; reason?: string; series?: string; headline?: string; draftId?: string; publicationId?: string; userId: string | null }) {
    const { userId, ...data } = input;
    return this.prisma.socialAutopostRun
      .create({ data: { ...data, status: data.status as SocialAutopostRunStatus, reason: data.reason ? trim(data.reason) : undefined } })
      .then(async (run) => {
        await this.audit('SOCIAL_AUTOPOST_RUN', userId, { runId: run.id, day: data.dayOfWeek, position: data.position, status: data.status, series: data.series, reason: data.reason });
        return run;
      });
  }

  private async execute(slot: { dayOfWeek: number; position: number; timeOfDay: string; content: string; format: SocialCardFormat }, settings: { platformAccountId: string | null; enabledById: string | null; captionFooter: string }, scheduledFor: Date, now: Date) {
    const base = { dayOfWeek: slot.dayOfWeek, position: slot.position, scheduledFor, userId: settings.enabledById };
    let series: string | undefined;
    let headline: string | undefined;
    let draftId: string | undefined;
    try {
      const account = await this.activeAccount(settings.platformAccountId);
      if (!account) return void (await this.record({ ...base, status: 'FAILED', reason: 'The connected page is no longer available. Connect it again and choose it.' }));
      if (!settings.enabledById) return void (await this.record({ ...base, status: 'FAILED', reason: 'No administrator is on record for this routine. Turn it off and on again.' }));
      const actor: JwtPayload = { sub: settings.enabledById, email: 'autopost@system', role: 'ADMIN' };

      const picked = await this.choose(slot.content as AutopostContent, slot.timeOfDay, now);
      if ('reason' in picked) return void (await this.record({ ...base, status: 'SKIPPED', reason: picked.reason }));
      const { suggestion } = picked;
      series = suggestion.series;
      headline = suggestion.headline;
      const draftSpec = DRAFT_FOR_SERIES[suggestion.series];
      if (!draftSpec) return void (await this.record({ ...base, status: 'SKIPPED', reason: `${suggestion.series} cannot be posted automatically`, series, headline }));

      const created = await this.content.create({
        type: draftSpec.type, cadence: draftSpec.cadence ?? suggestion.cadence, variant: draftSpec.variant, format: slot.format,
      } as CreateSocialDraftDto, actor);
      draftId = created.id;
      const rows = (suggestion.sourceSnapshot.rows ?? []) as Array<Record<string, unknown>>;
      await this.content.update(created.id, {
        caption: buildCaption({ headline: created.headline, reason: suggestion.reason, series: suggestion.series, rows, sourceLabel: created.sourceLabel, disclaimer: created.disclaimer, footer: settings.captionFooter }),
      }, actor);
      await this.content.render(created.id, actor);
      await this.content.approve(created.id, actor);
      const publication = await this.publishing.requestPublish(created.id, account.id, actor);
      await this.record({ ...base, status: 'QUEUED', series, headline, draftId, publicationId: publication.id });
    } catch (error) {
      this.logger.error(`Auto-post for day ${slot.dayOfWeek} failed: ${String(error)}`);
      await this.record({ ...base, status: 'FAILED', reason: error instanceof Error ? error.message : String(error), series, headline, draftId });
    }
  }
}

