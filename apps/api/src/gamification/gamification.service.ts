import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ObservationCategory, ObservationTrustLevel, ReportStatus, ReportCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GAMIFICATION_QUEUE, type EvaluateBadgesJobData } from './gamification.constants';
import {
  BADGE_DEFS,
  BadgeCategory,
  earnedKeysForCategory,
  computeLevel,
} from './badge.definitions';
import type { GamificationSummaryDto, BadgeSummaryDto, MissingFieldDto } from './dto/gamification-summary.dto';

// ── Completeness field definitions ────────────────────────────────────────────

interface CompletenessCheck {
  key:     string;
  label:   string;
  hint:    string;
  weight:  number;
  href:    string;
  check:   (ctx: CompletenessCtx) => boolean;
}

interface CompletenessCtx {
  profile:         { bio?: string | null; phone?: string | null; occupation?: string | null; institution?: string | null; education?: string | null; locationDistrict?: string | null; expertise: string[]; researchInterests: string[] } | null;
  hasSocialLink:   boolean;
  hasOrganization: boolean;
  hasContribution: boolean;
}

const COMPLETENESS_CHECKS: CompletenessCheck[] = [
  { key: 'locationDistrict', weight: 20, label: 'Set your primary district',      hint: 'Unlock localised flood alerts, air quality data, and weather summaries.',  href: '/profile?tab=location', check: (c) => !!c.profile?.locationDistrict },
  { key: 'organization',     weight: 15, label: 'Join an organisation',            hint: 'Collaborate with verified NGOs, agencies, and research groups.',            href: '/profile?tab=location', check: (c) => c.hasOrganization },
  { key: 'bio',              weight: 15, label: 'Write a biography',               hint: 'Tell the community about your environmental work and goals.',                href: '/profile?tab=personal', check: (c) => !!c.profile?.bio?.trim() },
  { key: 'phone',            weight: 10, label: 'Add your phone number',           hint: 'Enables direct contact for urgent environmental alerts.',                   href: '/profile?tab=personal', check: (c) => !!c.profile?.phone?.trim() },
  { key: 'occupation',       weight: 10, label: 'Add your occupation',             hint: 'Helps researchers and NGOs find and collaborate with you.',                 href: '/profile?tab=personal', check: (c) => !!c.profile?.occupation?.trim() },
  { key: 'expertise',        weight: 10, label: 'Add expertise tags',              hint: 'Tag your environmental specialisation areas for discoverability.',          href: '/profile?tab=personal', check: (c) => (c.profile?.expertise?.length ?? 0) > 0 },
  { key: 'contribution',     weight: 10, label: 'Submit your first contribution',  hint: 'File a citizen report or log an environmental observation.',                href: '/reports',              check: (c) => c.hasContribution },
  { key: 'institution',      weight: 5,  label: 'Add your institution',            hint: 'Show which university or employer you represent.',                          href: '/profile?tab=personal', check: (c) => !!c.profile?.institution?.trim() || !!c.profile?.education?.trim() },
  { key: 'researchInterests',weight: 5,  label: 'Add research interests',          hint: 'Help collaborators understand your focus areas.',                          href: '/profile?tab=personal', check: (c) => (c.profile?.researchInterests?.length ?? 0) > 0 },
  { key: 'socialLinks',      weight: 5,  label: 'Add a professional link',         hint: 'Link your academic, professional, or social profile.',                      href: '/profile?tab=personal', check: (c) => c.hasSocialLink },
];

// ── Badge count queries (run in parallel) ─────────────────────────────────────

interface BadgeCounts {
  // civic_guardian split: Bronze unlocks on first SUBMITTED report;
  // Silver and above require VERIFIED/RESOLVED reports.
  civicGuardianSubmitted: number;
  civicGuardianVerified:  number;
  communityVoice:          number; // posts + comments authored
  waterSentinel:           number; // WATER_QUALITY observations
  cleanAirDefender:        number; // AIR_QUALITY obs + verified AIR_POLLUTION reports
  biodiversityExplorer:    number; // BIODIVERSITY obs at RESEARCH_GRADE trust
  restorationPioneer:      number; // restoration project participations
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(GAMIFICATION_QUEUE) private readonly gamificationQueue: Queue,
  ) {}

  // ── Public: full data for the profile page ──────────────────────────────────

  async getMyGameData(userId: string): Promise<GamificationSummaryDto> {
    const [
      profile,
      socialLinkCount,
      orgCount,
      reportCount,
      observationCount,
      badgeCounts,
    ] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userSocialLink.count({ where: { userId } }),
      this.prisma.organizationMembership.count({ where: { userId } }),
      this.prisma.citizenReport.count({ where: { reporterId: userId } }),
      this.prisma.observation.count({ where: { observerId: userId } }),
      this.fetchBadgeCounts(userId),
    ]);

    const ctx: CompletenessCtx = {
      profile,
      hasSocialLink:   socialLinkCount > 0,
      hasOrganization: orgCount > 0,
      hasContribution: reportCount + observationCount > 0,
    };

    // Completeness
    const { completeness, missingFields } = this.computeCompleteness(ctx);

    // Badges
    const earnedKeys = new Set(profile?.earnedBadges ?? []);
    const badges     = this.buildBadgeSummaries(badgeCounts, earnedKeys);

    // Points & level
    const points = profile?.contributionPoints ?? 0;
    const { level, label: levelLabel, nextLevelPoints } = computeLevel(points);

    return { completeness, missingFields, badges, points, level, levelLabel, nextLevelPoints };
  }

  // ── Public: enqueue badge + points refresh ──────────────────────────────────
  // Call after any action that may unlock a badge. Callers may await or
  // fire-and-forget — adding to the queue is fast and does not do DB work.
  // BullMQ deduplication (jobId) ensures at most one pending job per user,
  // preventing duplicate evaluations when multiple contributions arrive quickly.

  async evaluateBadges(userId: string): Promise<void> {
    await this.gamificationQueue.add(
      'evaluate-badges',
      { userId } satisfies EvaluateBadgesJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: true,
        // One pending evaluation per user is sufficient — deduplicate by userId.
        // BullMQ rejects custom jobIds containing ':' unless they split into
        // exactly 3 parts (reserved for repeatable-job ids), so use '-'.
        jobId: `badge-eval-${userId}`,
      },
    );
  }

  // ── Called by GamificationProcessor — not for direct use in request handlers ─

  async performEvaluation(userId: string): Promise<void> {
    const [profile, badgeCounts] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where:  { userId },
        select: { id: true, earnedBadges: true, contributionPoints: true },
      }),
      this.fetchBadgeCounts(userId),
    ]);

    if (!profile) return; // profile not created yet — nothing to update

    const earnedKeys = this.computeEarnedKeys(badgeCounts);
    const points     = BADGE_DEFS
      .filter((b) => earnedKeys.has(b.key))
      .reduce((sum, b) => sum + b.points, 0);

    const prev = new Set(profile.earnedBadges);
    const unchanged =
      earnedKeys.size === prev.size && [...earnedKeys].every((k) => prev.has(k));

    if (unchanged && points === profile.contributionPoints) return;

    await this.prisma.userProfile.update({
      where: { userId },
      data:  { earnedBadges: [...earnedKeys], contributionPoints: points },
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchBadgeCounts(userId: string): Promise<BadgeCounts> {
    const [
      civicGuardianSubmitted,
      civicGuardianVerified,
      communityPosts,
      communityComments,
      waterSentinel,
      airObs,
      airReports,
      biodiversityExplorer,
      restorationPioneer,
    ] = await Promise.all([
      // 🛡️ All submitted reports — unlocks Civic Guardian Bronze immediately
      this.prisma.citizenReport.count({ where: { reporterId: userId } }),
      // 🛡️ Verified/resolved reports — unlocks Silver and above
      this.prisma.citizenReport.count({
        where: {
          reporterId: userId,
          status: { in: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] },
        },
      }),
      // 💬 Community posts authored
      this.prisma.communityPost.count({ where: { authorId: userId } }),
      // 💬 Post comments authored
      this.prisma.postComment.count({ where: { authorId: userId } }),
      // 🌊 Water quality observations (all trust levels)
      this.prisma.observation.count({
        where: { observerId: userId, category: ObservationCategory.WATER_QUALITY },
      }),
      // 🌬️ Air quality observations (all trust levels)
      this.prisma.observation.count({
        where: { observerId: userId, category: ObservationCategory.AIR_QUALITY },
      }),
      // 🌬️ Verified air pollution reports (contributes to Clean Air Defender)
      this.prisma.citizenReport.count({
        where: {
          reporterId: userId,
          category:   ReportCategory.AIR_POLLUTION,
          status:     { in: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] },
        },
      }),
      // 🌿 Research-grade biodiversity observations
      this.prisma.observation.count({
        where: {
          observerId: userId,
          category:   ObservationCategory.BIODIVERSITY,
          trustLevel: ObservationTrustLevel.RESEARCH_GRADE,
        },
      }),
      // 🌳 Restoration project participations
      this.prisma.restorationParticipant.count({ where: { userId } }),
    ]);

    return {
      civicGuardianSubmitted,
      civicGuardianVerified,
      communityVoice: communityPosts + communityComments,
      waterSentinel,
      cleanAirDefender: airObs + airReports,
      biodiversityExplorer,
      restorationPioneer,
    };
  }

  private computeEarnedKeys(counts: BadgeCounts): Set<string> {
    const keys = new Set<string>();

    // civic_guardian: Bronze uses submitted count; Silver–Platinum use verified count.
    if (counts.civicGuardianSubmitted >= 1) keys.add('civic_guardian_bronze');
    for (const key of earnedKeysForCategory('civic_guardian', counts.civicGuardianVerified)) {
      if (key !== 'civic_guardian_bronze') keys.add(key);
    }

    // All other categories use a single count.
    const simple: Array<[BadgeCategory, number]> = [
      ['community_voice',       counts.communityVoice],
      ['water_sentinel',        counts.waterSentinel],
      ['clean_air_defender',    counts.cleanAirDefender],
      ['biodiversity_explorer', counts.biodiversityExplorer],
      ['restoration_pioneer',   counts.restorationPioneer],
    ];
    for (const [cat, count] of simple) {
      for (const key of earnedKeysForCategory(cat, count)) {
        keys.add(key);
      }
    }

    return keys;
  }

  private buildBadgeSummaries(
    counts: BadgeCounts,
    earnedKeys: Set<string>,
  ): BadgeSummaryDto[] {
    // For progress display, civic_guardian Bronze shows submitted count;
    // Silver–Platinum show the verified count.
    const progressCount = (def: { category: BadgeCategory; tier: string }): number => {
      if (def.category === 'civic_guardian') {
        return def.tier === 'BRONZE' ? counts.civicGuardianSubmitted : counts.civicGuardianVerified;
      }
      const map: Record<BadgeCategory, number> = {
        civic_guardian:        counts.civicGuardianVerified,
        community_voice:       counts.communityVoice,
        water_sentinel:        counts.waterSentinel,
        clean_air_defender:    counts.cleanAirDefender,
        biodiversity_explorer: counts.biodiversityExplorer,
        restoration_pioneer:   counts.restorationPioneer,
      };
      return map[def.category];
    };

    return BADGE_DEFS.map((def) => ({
      key:         def.key,
      category:    def.category,
      tier:        def.tier,
      label:       def.label,
      tierLabel:   def.tierLabel,
      emoji:       def.emoji,
      description: def.description,
      earned:      earnedKeys.has(def.key),
      current:     Math.min(progressCount(def), def.threshold),
      threshold:   def.threshold,
      points:      def.points,
    }));
  }

  private computeCompleteness(ctx: CompletenessCtx): {
    completeness: number;
    missingFields: MissingFieldDto[];
  } {
    let completeness = 0;
    const missingFields: MissingFieldDto[] = [];

    for (const field of COMPLETENESS_CHECKS) {
      if (field.check(ctx)) {
        completeness += field.weight;
      } else {
        missingFields.push({
          key:    field.key,
          label:  field.label,
          hint:   field.hint,
          weight: field.weight,
          href:   field.href,
        });
      }
    }

    return { completeness, missingFields };
  }
}
