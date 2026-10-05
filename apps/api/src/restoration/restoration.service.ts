import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, RestorationCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateRestorationProjectDto } from './dto/create-restoration-project.dto';
import { UpdateRestorationProjectDto } from './dto/update-restoration-project.dto';
import { CreateProjectTargetDto } from './dto/create-project-target.dto';
import { CreateProjectActivityDto } from './dto/create-project-activity.dto';
import { CreateProjectMetricDto } from './dto/create-project-metric.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';
import { resolveGeoHierarchy } from '../common/validate-district';
import { GamificationService } from '../gamification/gamification.service';

const GEO_SELECT = {
  district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } },
  upazila:  { select: { id: true, name: true } },
  union:    { select: { id: true, name: true } },
} as const;

// Lightweight select used for list endpoints.
const PROJECT_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  status: true,
  organizationId: true,
  districtId: true,
  upazilaId: true,
  unionId: true,
  startDate: true,
  endDate: true,
  impactSummary: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true } },
  ...GEO_SELECT,
  _count: { select: { participants: true } },
} as const;

// Enriched select used by getById — includes targets (with latest metric) and recent activities.
const PROJECT_DETAIL_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  status: true,
  organizationId: true,
  districtId: true,
  upazilaId: true,
  unionId: true,
  startDate: true,
  endDate: true,
  impactSummary: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true } },
  ...GEO_SELECT,
  _count: { select: { participants: true } },
  targets: {
    select: {
      id: true,
      metric: true,
      targetValue: true,
      unit: true,
      deadline: true,
      createdAt: true,
      measurements: {
        select: { id: true, measuredAt: true, value: true, notes: true },
        orderBy: { measuredAt: 'desc' as const },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  activities: {
    select: {
      id: true,
      title: true,
      description: true,
      activityDate: true,
      volunteersCount: true,
      areaAffectedHa: true,
      createdAt: true,
      recordedBy: { select: { id: true, displayName: true } },
    },
    orderBy: { activityDate: 'desc' as const },
    take: 5,
  },
} as const;

const TARGET_SELECT = {
  id: true,
  metric: true,
  targetValue: true,
  unit: true,
  deadline: true,
  createdAt: true,
  measurements: {
    select: { id: true, measuredAt: true, value: true, notes: true },
    orderBy: { measuredAt: 'desc' as const },
    take: 1,
  },
} as const;

const ACTIVITY_SELECT = {
  id: true,
  title: true,
  description: true,
  activityDate: true,
  volunteersCount: true,
  areaAffectedHa: true,
  createdAt: true,
  recordedBy: { select: { id: true, displayName: true } },
} as const;

const METRIC_SELECT = {
  id: true,
  measuredAt: true,
  value: true,
  notes: true,
  createdAt: true,
  measuredBy: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class RestorationService {
  private readonly logger = new Logger(RestorationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // ─── Project CRUD ─────────────────────────────────────────────────────────────

  async create(dto: CreateRestorationProjectDto, user: JwtPayload) {
    const geo = await resolveGeoHierarchy(this.prisma, dto);
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true } });
      if (!org) throw new BadRequestException('Organization not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.restorationProject.create({
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          organizationId: dto.organizationId,
          districtId: geo.districtId,
          upazilaId: geo.upazilaId,
          unionId: geo.unionId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          impactSummary: dto.impactSummary,
          createdById: user.sub,
        },
        select: PROJECT_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: 'RESTORATION_PROJECT_CREATE',
          userId: user.sub,
          entityType: 'RestorationProject',
          entityId: project.id,
        },
      });

      return project;
    });
  }

  /**
   * Active projects first, then planned, paused, completed (newest first within each).
   * `stats` is platform-wide; `categoryCounts` respects the status/district filters but not the category itself,
   * so each category segment keeps its own total. `joinedByMe` needs the caller's id.
   */
  async list(
    category?: RestorationCategory,
    status?: ProjectStatus,
    districtId?: string,
    upazilaId?: string,
    unionId?: string,
    rawPage = 1,
    rawPageSize = 20,
    userId?: string,
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const scope = {
      ...(status ? { status } : {}),
      ...(upazilaId ? { upazilaId } : {}),
      ...(unionId ? { unionId } : {}),
      ...(districtId ? { districtId } : {}),
    };
    const where = { ...scope, ...(category ? { category } : {}) };

    const conds = [
      category ? Prisma.sql`"category"::text = ${category}` : null,
      status ? Prisma.sql`"status"::text = ${status}` : null,
      districtId ? Prisma.sql`"districtId" = ${districtId}` : null,
      upazilaId ? Prisma.sql`"upazilaId" = ${upazilaId}` : null,
      unionId ? Prisma.sql`"unionId" = ${unionId}` : null,
    ].filter((c): c is Prisma.Sql => c !== null);
    const whereSql = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;

    const [idRows, total, byStatus, byCategory, participants] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "RestorationProject" ${whereSql}
        ORDER BY CASE "status"::text WHEN 'ACTIVE' THEN 0 WHEN 'PLANNED' THEN 1 WHEN 'PAUSED' THEN 2 ELSE 3 END,
                 "createdAt" DESC, "id"
        LIMIT ${pageSize} OFFSET ${skip}`,
      this.prisma.restorationProject.count({ where }),
      this.prisma.restorationProject.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.restorationProject.groupBy({ by: ['category'], where: scope, _count: { _all: true } }),
      this.prisma.restorationParticipant.count(),
    ]);

    const ids = idRows.map((r) => r.id);
    const [rows, joined] = await Promise.all([
      this.prisma.restorationProject.findMany({ where: { id: { in: ids } }, select: PROJECT_SELECT }),
      userId && ids.length
        ? this.prisma.restorationParticipant.findMany({ where: { userId, projectId: { in: ids } }, select: { projectId: true } })
        : Promise.resolve([] as { projectId: string }[]),
    ]);
    const order = new Map(ids.map((id, i) => [id, i]));
    const joinedSet = new Set(joined.map((j) => j.projectId));
    const data = rows
      .sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0))
      .map((r) => ({ ...r, joinedByMe: joinedSet.has(r.id) }));

    const count = (st: ProjectStatus) => byStatus.find((g) => g.status === st)?._count._all ?? 0;
    return {
      data,
      total,
      page,
      pageSize,
      stats: {
        active: count('ACTIVE'),
        planned: count('PLANNED'),
        paused: count('PAUSED'),
        completed: count('COMPLETED'),
        participants,
      },
      categoryCounts: Object.fromEntries(byCategory.map((g) => [g.category, g._count._all])) as Partial<
        Record<RestorationCategory, number>
      >,
    };
  }

  async getById(id: string) {
    const project = await this.prisma.restorationProject.findUnique({
      where: { id },
      select: PROJECT_DETAIL_SELECT,
    });
    if (!project) throw new NotFoundException('Restoration project not found');
    return project;
  }

  async update(id: string, dto: UpdateRestorationProjectDto, actor: JwtPayload) {
    const project = await this.prisma.restorationProject.findUnique({ where: { id }, select: { createdById: true } });
    if (!project) throw new NotFoundException('Restoration project not found');
    if (project.createdById !== actor.sub && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only the project creator or an admin can update this project');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.restorationProject.update({
        where: { id },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.impactSummary !== undefined ? { impactSummary: dto.impactSummary } : {}),
          ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        },
        select: PROJECT_SELECT,
      }),
      this.prisma.auditEvent.create({
        data: {
          action: 'RESTORATION_PROJECT_UPDATE',
          userId: actor.sub,
          entityType: 'RestorationProject',
          entityId: id,
          meta: { ...dto },
        },
      }),
    ]);

    return updated;
  }

  async join(id: string, user: JwtPayload) {
    await this.getById(id);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.restorationParticipant.create({
          data: { projectId: id, userId: user.sub },
        });
        await tx.auditEvent.create({
          data: {
            action: 'RESTORATION_PROJECT_JOIN',
            userId: user.sub,
            entityType: 'RestorationProject',
            entityId: id,
          },
        });
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
        throw err;
      }
      // Already joined — idempotent no-op.
    }

    // Award restoration_pioneer badges without blocking the response.
    this.gamification
      .evaluateBadges(user.sub)
      .catch((err: unknown) => this.logger.warn(`Badge evaluation failed: ${String(err)}`));

    return this.getById(id);
  }

  // ─── Targets ─────────────────────────────────────────────────────────────────

  private async requireProjectAccess(projectId: string, actor: JwtPayload) {
    const project = await this.prisma.restorationProject.findUnique({
      where: { id: projectId },
      select: { id: true, createdById: true },
    });
    if (!project) throw new NotFoundException('Restoration project not found');
    if (project.createdById !== actor.sub && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only the project creator or an admin can perform this action');
    }
    return project;
  }

  async addTarget(projectId: string, dto: CreateProjectTargetDto, actor: JwtPayload) {
    await this.requireProjectAccess(projectId, actor);

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.projectTarget.create({
        data: {
          projectId,
          metric: dto.metric,
          targetValue: dto.targetValue,
          unit: dto.unit,
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        },
        select: TARGET_SELECT,
      });
      await tx.auditEvent.create({
        data: {
          action: 'RESTORATION_TARGET_ADD',
          userId: actor.sub,
          entityType: 'ProjectTarget',
          entityId: target.id,
          meta: { projectId, metric: dto.metric, targetValue: dto.targetValue },
        },
      });
      return target;
    });
  }

  async listTargets(projectId: string) {
    const project = await this.prisma.restorationProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Restoration project not found');

    return this.prisma.projectTarget.findMany({
      where: { projectId },
      select: TARGET_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Activities ───────────────────────────────────────────────────────────────

  async addActivity(projectId: string, dto: CreateProjectActivityDto, actor: JwtPayload) {
    // Participants and creators can log activity; ADMIN always allowed.
    const project = await this.prisma.restorationProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        createdById: true,
        participants: { where: { userId: actor.sub }, select: { userId: true }, take: 1 },
      },
    });
    if (!project) throw new NotFoundException('Restoration project not found');

    const isParticipant = project.participants.length > 0;
    const isCreator = project.createdById === actor.sub;
    if (!isCreator && !isParticipant && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only project participants, the creator, or an admin can log activities');
    }

    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.projectActivity.create({
        data: {
          projectId,
          title: dto.title,
          description: dto.description,
          activityDate: new Date(dto.activityDate),
          volunteersCount: dto.volunteersCount,
          areaAffectedHa: dto.areaAffectedHa,
          recordedById: actor.sub,
        },
        select: ACTIVITY_SELECT,
      });
      await tx.auditEvent.create({
        data: {
          action: 'RESTORATION_ACTIVITY_ADD',
          userId: actor.sub,
          entityType: 'ProjectActivity',
          entityId: activity.id,
          meta: { projectId },
        },
      });
      return activity;
    });
  }

  async listActivities(projectId: string, rawPage = 1, rawPageSize = 20) {
    const project = await this.prisma.restorationProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Restoration project not found');

    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const [data, total] = await Promise.all([
      this.prisma.projectActivity.findMany({
        where: { projectId },
        select: ACTIVITY_SELECT,
        orderBy: { activityDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projectActivity.count({ where: { projectId } }),
    ]);
    return { data, total, page, pageSize };
  }

  // ─── Metrics ──────────────────────────────────────────────────────────────────

  async addMetric(projectId: string, targetId: string, dto: CreateProjectMetricDto, actor: JwtPayload) {
    await this.requireProjectAccess(projectId, actor);

    // Confirm the target belongs to this project.
    const target = await this.prisma.projectTarget.findFirst({
      where: { id: targetId, projectId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Target not found on this project');

    return this.prisma.$transaction(async (tx) => {
      const metric = await tx.projectMetric.create({
        data: {
          targetId,
          measuredAt: new Date(dto.measuredAt),
          value: dto.value,
          notes: dto.notes,
          measuredById: actor.sub,
        },
        select: METRIC_SELECT,
      });
      await tx.auditEvent.create({
        data: {
          action: 'RESTORATION_METRIC_ADD',
          userId: actor.sub,
          entityType: 'ProjectMetric',
          entityId: metric.id,
          meta: { projectId, targetId, value: dto.value },
        },
      });
      return metric;
    });
  }

  async listMetrics(projectId: string, targetId: string) {
    // Confirm target belongs to the project.
    const target = await this.prisma.projectTarget.findFirst({
      where: { id: targetId, projectId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Target not found on this project');

    return this.prisma.projectMetric.findMany({
      where: { targetId },
      select: METRIC_SELECT,
      orderBy: { measuredAt: 'desc' },
    });
  }
}
