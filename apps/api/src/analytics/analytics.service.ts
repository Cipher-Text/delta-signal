import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

function classifyFloodRisk(
  discharge: number | null,
  historicalMean: number | null,
  p75: number | null,
): 'HIGH' | 'ELEVATED' | null {
  if (discharge == null || historicalMean == null || historicalMean === 0) {
    return null;
  }

  const ratio = discharge / historicalMean;

  if (ratio >= 2 || (p75 != null && discharge > p75 * 1.5)) return 'HIGH';
  if (ratio >= 1.5 || (p75 != null && discharge > p75)) return 'ELEVATED';

  return null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Group an array of dates by YYYY-MM-DD label and return a trend array
function groupByDay(dates: Date[]): Array<{ day: string; count: number }> {
  const map = new Map<string, number>();
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function thresholdStatus(waterLevel: number | null, warning: number | null, danger: number | null) {
  if (waterLevel == null) return 'UNKNOWN' as const;
  if (danger != null && waterLevel >= danger) return 'DANGER' as const;
  if (warning != null && waterLevel >= warning) return 'WARNING' as const;
  return 'NORMAL' as const;
}

const SOURCE_FRESHNESS_WINDOWS_MS: Record<string, number> = {
  OpenMeteo: 48 * 60 * 60 * 1000,
  GBIF: 72 * 60 * 60 * 1000,
  'World Bank': 14 * 24 * 60 * 60 * 1000,
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDashboardMeta(providerNames = Object.keys(SOURCE_FRESHNESS_WINDOWS_MS)) {
    const generatedAt = new Date();
    if (providerNames.length === 0) {
      return { generatedAt: generatedAt.toISOString(), sources: [] };
    }

    try {
      const providers = await this.prisma.provider.findMany({
        where: { name: { in: providerNames } },
        select: {
          name: true,
          ingestionJobs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { status: true, endedAt: true, createdAt: true },
          },
        },
      });

      const providerByName = new Map(providers.map((provider) => [provider.name, provider]));
      return {
        generatedAt: generatedAt.toISOString(),
        sources: providerNames.map((name) => {
          const provider = providerByName.get(name);
          const lastSuccessfulJob = provider?.ingestionJobs.find((job) => job.status === 'SUCCEEDED');
          const lastSuccessfulSync = lastSuccessfulJob
            ? (lastSuccessfulJob.endedAt ?? lastSuccessfulJob.createdAt)
            : null;
          const status = lastSuccessfulSync
            ? generatedAt.getTime() - lastSuccessfulSync.getTime() <= SOURCE_FRESHNESS_WINDOWS_MS[name]
              ? ('FRESH' as const)
              : ('STALE' as const)
            : ('UNKNOWN' as const);

          return {
            name,
            status,
            lastSuccessfulSync: lastSuccessfulSync?.toISOString() ?? null,
          };
        }),
      };
    } catch {
      // Analytics remains available if provider/job metadata is unavailable.
      return {
        generatedAt: generatedAt.toISOString(),
        sources: providerNames.map((name) => ({
          name,
          status: 'UNKNOWN' as const,
          lastSuccessfulSync: null,
        })),
      };
    }
  }

  // ── Citizen ────────────────────────────────────────────────────────────────

  async getCitizenDashboard(userId: string) {
    const [reportsByStatus, observationsByCategory, joinedProjects, communityPosts] = await Promise.all([
      this.prisma.citizenReport.groupBy({
        by: ['status'],
        where: { reporterId: userId },
        _count: { id: true },
      }),
      this.prisma.observation.groupBy({
        by: ['category'],
        where: { observerId: userId },
        _count: { id: true },
      }),
      this.prisma.restorationParticipant.count({ where: { userId } }),
      this.prisma.communityPost.count({ where: { authorId: userId } }),
    ]);

    return {
      meta: await this.getDashboardMeta([]),
      reports: {
        total: reportsByStatus.reduce((total, row) => total + row._count.id, 0),
        byStatus: reportsByStatus.map((row) => ({ status: row.status, count: row._count.id })),
      },
      observations: {
        total: observationsByCategory.reduce((total, row) => total + row._count.id, 0),
        byCategory: observationsByCategory.map((row) => ({ category: row.category, count: row._count.id })),
      },
      restoration: { joinedProjects },
      community: { posts: communityPosts },
    };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getAdminDashboard() {
    const [
      usersByRole,
      reportsByStatus,
      activeAlertsBySeverity,
      pendingReports,
      auditEventsToday,
      totalOrganizations,
      observationsThisMonth,
      totalSpecies,
      totalDatasets,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      this.prisma.citizenReport.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
      this.prisma.citizenReport.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
      this.prisma.auditEvent.count({
        where: { createdAt: { gte: startOfToday() } },
      }),
      this.prisma.organization.count(),
      this.prisma.observation.count({
        where: { createdAt: { gte: startOfMonth() } },
      }),
      this.prisma.species.count(),
      this.prisma.dataset.count({ where: { isPublished: true } }),
    ]);

    const totalUsers = usersByRole.reduce((s, r) => s + r._count.id, 0);
    const meta = await this.getDashboardMeta();

    return {
      meta,
      users: {
        total: totalUsers,
        byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
      },
      reports: {
        pendingReview: pendingReports,
        byStatus: reportsByStatus.map((r) => ({
          status: r.status,
          count: r._count.id,
        })),
      },
      alerts: {
        activeBySeverity: activeAlertsBySeverity.map((a) => ({
          severity: a.severity,
          count: a._count.id,
        })),
      },
      platform: {
        organizations: totalOrganizations,
        publishedDatasets: totalDatasets,
        speciesRecorded: totalSpecies,
        observationsThisMonth,
        auditEventsToday,
      },
    };
  }

  // ── Moderator ──────────────────────────────────────────────────────────────

  async getModeratorDashboard() {
    const [
      reportsByStatus,
      reportsByCategory,
      reviewedToday,
      recentReports,
    ] = await Promise.all([
      this.prisma.citizenReport.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.citizenReport.groupBy({ by: ['category'], _count: { id: true } }),
      this.prisma.citizenReport.count({
        where: {
          status: { in: ['VERIFIED', 'REJECTED', 'RESOLVED'] },
          updatedAt: { gte: startOfToday() },
        },
      }),
      this.prisma.citizenReport.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        select: { createdAt: true },
      }),
    ]);

    const pending = reportsByStatus.find((r) => r.status === 'SUBMITTED')?._count.id ?? 0;
    const underReview = reportsByStatus.find((r) => r.status === 'UNDER_REVIEW')?._count.id ?? 0;
    const meta = await this.getDashboardMeta([]);

    return {
      meta,
      queue: {
        pending,
        underReview,
        totalPending: pending + underReview,
        reviewedToday,
      },
      byStatus: reportsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      byCategory: reportsByCategory.map((r) => ({ category: r.category, count: r._count.id })),
      submissionTrend: groupByDay(recentReports.map((r) => r.createdAt)),
    };
  }

  // ── Government ─────────────────────────────────────────────────────────────

  async getGovernmentDashboard() {
    const thirtyDaysAgo = daysAgo(30);

    const [
      activeAlertsBySeverity,
      totalActiveAlerts,
      verifiedReportsByCategory,
      alertsWithAreas,
      topDistrictsByReports,
      divisionsClimate,
      totalFloodStations,
      floodRows,
    ] = await Promise.all([
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
      this.prisma.alert.count({ where: { status: 'ACTIVE' } }),
      this.prisma.citizenReport.groupBy({
        by: ['category'],
        where: { status: 'VERIFIED', createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Active alerts with canonical multi-area coverage for geographic grouping.
      // The legacy Alert.districtId is retained for notification compatibility,
      // but AlertArea is the source of truth for dashboard geography.
      this.prisma.alert.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          district: { select: { name: true, division: { select: { name: true } } } },
          areas: {
            select: {
              district: { select: { name: true, division: { select: { name: true } } } },
              upazila: {
                select: {
                  district: { select: { name: true, division: { select: { name: true } } } },
                },
              },
              union: {
                select: {
                  upazila: {
                    select: {
                      district: { select: { name: true, division: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Top districts by verified report count (last 30 days) — raw SQL for JOIN+GROUP
      this.prisma.$queryRaw<Array<{ districtName: string; divisionName: string; count: bigint }>>(
        Prisma.sql`
          SELECT d.name AS "districtName", d2.name AS "divisionName", COUNT(r.id)::bigint AS count
          FROM "CitizenReport" r
          JOIN "District" d ON r."districtId" = d.id
          JOIN "Division" d2 ON d."divisionId" = d2.id
          WHERE r.status = 'VERIFIED'
            AND r."createdAt" >= ${thirtyDaysAgo}
          GROUP BY d.id, d.name, d2.name
          ORDER BY count DESC
          LIMIT 8
        `,
      ),
      // All divisions with their 30-day climate averages
      this.prisma.division.findMany({
        select: {
          name: true,
          avgTemp30d: true,
          avgPm25_30d: true,
          totalPrecip30d: true,
          avgHumidity30d: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.waterLevelStation.count(),
      this.prisma.$queryRaw<Array<{
        stationId: string;
        stationName: string;
        riverName: string | null;
        districtName: string | null;
        dangerLevel: number | null;
        warningLevel: number | null;
        forecastDate: Date | null;
        discharge: number | null;
        historicalMean: number | null;
        p75: number | null;
        waterLevel: number | null;
        readingAt: Date | null;
        trend: 'RISING' | 'FALLING' | 'STEADY' | null;
      }>>(Prisma.sql`
        SELECT s.id AS "stationId", s.name AS "stationName", s."riverName",
          d.name AS "districtName", s."dangerLevel", s."warningLevel",
          f."forecastDate", f."riverDischarge" AS discharge,
          f."riverDischargeMean" AS "historicalMean", f."riverDischargeP75" AS p75,
          r."waterLevel", r."readingAt", r.trend
        FROM "WaterLevelStation" s
        LEFT JOIN LATERAL (
          SELECT f."forecastDate", f."riverDischarge", f."riverDischargeMean", f."riverDischargeP75"
          FROM "StationFloodForecast" f
          WHERE f."stationId" = s.id
          ORDER BY f."forecastDate" DESC
          LIMIT 1
        ) f ON true
        LEFT JOIN LATERAL (
          SELECT r."waterLevel", r."readingAt", r.trend
          FROM "WaterLevelReading" r
          WHERE r."stationId" = s.id
          ORDER BY r."readingAt" DESC
          LIMIT 1
        ) r ON true
        LEFT JOIN "District" d ON d.id = s."districtId"
        WHERE f."forecastDate" IS NOT NULL OR r."readingAt" IS NOT NULL
      `),
    ]);

    // Aggregate each alert once per affected division. An alert can cover
    // multiple districts, upazilas, or unions, so counting rows directly
    // would overcount multi-area alerts.
    const alertsByDivision = new Map<string, number>();
    for (const alert of alertsWithAreas) {
      const divisions = new Set<string>();
      if (alert.district?.division?.name) {
        divisions.add(alert.district.division.name);
      }
      for (const area of alert.areas) {
        const division =
          area.district?.division?.name ??
          area.upazila?.district?.division?.name ??
          area.union?.upazila?.district?.division?.name;
        if (division) divisions.add(division);
      }

      if (divisions.size === 0) divisions.add('Nationwide');
      for (const division of divisions) {
        alertsByDivision.set(division, (alertsByDivision.get(division) ?? 0) + 1);
      }
    }

    const meta = await this.getDashboardMeta(['OpenMeteo']);
    const floodSignals = floodRows.map((row) => ({
      ...row,
      risk: classifyFloodRisk(row.discharge, row.historicalMean, row.p75),
      ratio: row.discharge != null && row.historicalMean ? row.discharge / row.historicalMean : null,
    }));
    const highestRisk = floodSignals
      .filter((row): row is typeof row & { risk: 'HIGH' | 'ELEVATED' } => row.risk !== null)
      .sort((a, b) => (a.risk === b.risk ? (b.ratio ?? 0) - (a.ratio ?? 0) : a.risk === 'HIGH' ? -1 : 1))
      .slice(0, 6)
      .map((row) => ({
        stationId: row.stationId,
        stationName: row.stationName,
        riverName: row.riverName,
        district: row.districtName,
        discharge: row.discharge,
        historicalMean: row.historicalMean,
        ratio: row.ratio,
        risk: row.risk,
        waterLevel: row.waterLevel,
        thresholdStatus: thresholdStatus(row.waterLevel, row.warningLevel, row.dangerLevel),
        trend: row.trend,
        forecastDate: row.forecastDate!.toISOString(),
      }));

    return {
      meta,
      alerts: {
        total: totalActiveAlerts,
        bySeverity: activeAlertsBySeverity.map((a) => ({
          severity: a.severity,
          count: a._count.id,
        })),
        byDivision: Array.from(alertsByDivision.entries())
          .map(([division, count]) => ({ division, count }))
          .sort((a, b) => b.count - a.count),
      },
      reports: {
        verifiedLast30d: verifiedReportsByCategory.reduce((s, r) => s + r._count.id, 0),
        byCategory: verifiedReportsByCategory.map((r) => ({
          category: r.category,
          count: r._count.id,
        })),
        topDistricts: topDistrictsByReports.map((row) => ({
          district: row.districtName,
          division: row.divisionName,
          count: Number(row.count),
        })),
      },
      climate: {
        divisions: divisionsClimate.map((d) => ({
          name: d.name,
          avgTemp: d.avgTemp30d,
          avgPm25: d.avgPm25_30d,
          totalPrecip: d.totalPrecip30d,
          avgHumidity: d.avgHumidity30d,
        })),
      },
      flood: {
        totalStations: totalFloodStations,
        stationsWithForecast: floodRows.filter((row) => row.forecastDate != null).length,
        highRiskStations: floodSignals.filter((row) => row.risk === 'HIGH').length,
        elevatedRiskStations: floodSignals.filter((row) => row.risk === 'ELEVATED').length,
        risingStations: floodRows.filter((row) => row.trend === 'RISING').length,
        latestReadingAt: floodRows.reduce<Date | null>((latest, row) => row.readingAt && (!latest || row.readingAt > latest) ? row.readingAt : latest, null)?.toISOString() ?? null,
        highestRisk,
      },
    };
  }

  // ── Researcher ─────────────────────────────────────────────────────────────

  async getResearcherDashboard() {
    const sixMonthsAgo = monthsAgo(6);

    const [
      totalSpecies,
      totalOccurrences,
      researchGradeObs,
      observationsByCategory,
      observationsByTrust,
      topSpecies,
      recentOccurrences,
    ] = await Promise.all([
      this.prisma.species.count(),
      this.prisma.occurrence.count(),
      this.prisma.observation.count({ where: { trustLevel: 'RESEARCH_GRADE' } }),
      this.prisma.observation.groupBy({ by: ['category'], _count: { id: true } }),
      this.prisma.observation.groupBy({ by: ['trustLevel'], _count: { id: true } }),
      // Top 10 species by occurrence count
      this.prisma.$queryRaw<Array<{ speciesId: string; name: string; occurrences: bigint }>>(
        Prisma.sql`
          SELECT s.id AS "speciesId", s."canonicalName" AS name, COUNT(o.id)::bigint AS occurrences
          FROM "Species" s
          JOIN "Occurrence" o ON o."speciesId" = s.id
          GROUP BY s.id, s."canonicalName"
          ORDER BY occurrences DESC
          LIMIT 10
        `,
      ),
      // Monthly occurrence trend — last 6 months
      this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>(
        Prisma.sql`
          SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
          FROM "Occurrence"
          WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY 1
          ORDER BY 1
        `,
      ),
    ]);

    const totalObservations = observationsByTrust.reduce((s, r) => s + r._count.id, 0);
    const meta = await this.getDashboardMeta(['GBIF']);

    return {
      meta,
      biodiversity: {
        totalSpecies,
        totalOccurrences,
        topSpecies: topSpecies.map((s) => ({
          name: s.name,
          occurrences: Number(s.occurrences),
        })),
        monthlyTrend: recentOccurrences.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
      },
      observations: {
        total: totalObservations,
        researchGrade: researchGradeObs,
        researchGradePct:
          totalObservations > 0
            ? Math.round((researchGradeObs / totalObservations) * 100)
            : 0,
        byCategory: observationsByCategory.map((r) => ({
          category: r.category,
          count: r._count.id,
        })),
        byTrust: observationsByTrust.map((r) => ({
          trustLevel: r.trustLevel,
          count: r._count.id,
        })),
      },
    };
  }

  // ── OrgAdmin ───────────────────────────────────────────────────────────────

  async getOrgAdminDashboard(userId: string) {
    const thirtyDaysAgo = daysAgo(30);

    // Organization admins may belong to more than one organization. The
    // dashboard is scoped to organizations they administer, never to every
    // restoration project in the platform.
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, role: 'ADMIN' },
      select: { organizationId: true },
    });
    const organizationIds = memberships.map((membership) => membership.organizationId);
    if (organizationIds.length === 0) {
      const meta = await this.getDashboardMeta([]);
      return {
        meta,
        projects: {
          total: 0,
          active: 0,
          newLast30d: 0,
          byStatus: [],
          byCategory: [],
        },
        engagement: {
          totalParticipants: 0,
          avgParticipantsPerProject: 0,
          topProjects: [],
        },
      };
    }
    const projectScope = { organizationId: { in: organizationIds } };

    const [
      projectsByStatus,
      projectsByCategory,
      recentProjects,
      topProjects,
      totalParticipants,
    ] = await Promise.all([
      this.prisma.restorationProject.groupBy({
        by: ['status'],
        where: projectScope,
        _count: { id: true },
      }),
      this.prisma.restorationProject.groupBy({
        by: ['category'],
        where: projectScope,
        _count: { id: true },
      }),
      this.prisma.restorationProject.count({
        where: { ...projectScope, createdAt: { gte: thirtyDaysAgo } },
      }),
      // Top 5 projects by participant count
      this.prisma.$queryRaw<Array<{ id: string; title: string; participants: bigint }>>(
        Prisma.sql`
          SELECT p.id, p.title, COUNT(rp."userId")::bigint AS participants
          FROM "RestorationProject" p
          LEFT JOIN "RestorationParticipant" rp ON rp."projectId" = p.id
          WHERE p."organizationId" IN (${Prisma.join(organizationIds)})
          GROUP BY p.id, p.title
          ORDER BY participants DESC
          LIMIT 5
        `,
      ),
      this.prisma.restorationParticipant.count({
        where: { project: projectScope },
      }),
    ]);

    const totalProjects = projectsByStatus.reduce((s, r) => s + r._count.id, 0);
    const activeProjects =
      (projectsByStatus.find((r) => r.status === 'ACTIVE')?._count.id ?? 0) +
      (projectsByStatus.find((r) => r.status === 'PLANNED')?._count.id ?? 0);
    const meta = await this.getDashboardMeta([]);

    return {
      meta,
      projects: {
        total: totalProjects,
        active: activeProjects,
        newLast30d: recentProjects,
        byStatus: projectsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
        byCategory: projectsByCategory.map((r) => ({
          category: r.category,
          count: r._count.id,
        })),
      },
      engagement: {
        totalParticipants,
        avgParticipantsPerProject:
          totalProjects > 0 ? Math.round(totalParticipants / totalProjects) : 0,
        topProjects: topProjects.map((p) => ({
          id: p.id,
          title: p.title,
          participants: Number(p.participants),
        })),
      },
    };
  }
}
