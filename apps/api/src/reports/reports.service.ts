import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus, ReportCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AddMediaDto } from './dto/add-media.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';
import { resolveGeoHierarchy } from '../common/validate-district';
import { GamificationService } from '../gamification/gamification.service';

export interface NearbyReportRow {
  id: string; title: string; category: string; status: string;
  summary: string | null; lat: number | null; lng: number | null;
  districtId: string | null; createdAt: Date; distance_m: number;
}

/** Allowed status transitions per role. */
const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  SUBMITTED:    ['UNDER_REVIEW'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED:     ['RESOLVED'],
  REJECTED:     [],
  RESOLVED:     [],
};

const REPORT_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  status: true,
  summary: true,
  districtId: true,
  upazilaId: true,
  unionId: true,
  lat: true,
  lng: true,
  createdAt: true,
  updatedAt: true,
  reporter: { select: { id: true, displayName: true } },
  district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } },
  upazila: { select: { id: true, name: true } },
  union:   { select: { id: true, name: true } },
} as const;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async create(dto: CreateReportDto, user: JwtPayload) {
    const geo = await resolveGeoHierarchy(this.prisma, dto);

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.citizenReport.create({
        data: {
          title: dto.title,
          category: dto.category,
          description: dto.description,
          districtId: geo.districtId,
          upazilaId: geo.upazilaId,
          unionId: geo.unionId,
          lat: dto.lat,
          lng: dto.lng,
          reporterId: user.sub,
          statusHistory: {
            create: { status: ReportStatus.SUBMITTED },
          },
        },
        select: REPORT_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: 'REPORT_SUBMIT',
          userId: user.sub,
          entityType: 'CitizenReport',
          entityId: report.id,
        },
      });

      return report;
    });
  }

  listMine(userId: string, rawPage = 1, rawPageSize = 10) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.citizenReport.findMany({
        where: { reporterId: userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: REPORT_SELECT,
      }),
      this.prisma.citizenReport.count({ where: { reporterId: userId } }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  /**
   * Public list: verified/resolved only, most recently updated first. `counts` ignores the status filter
   * (but respects category and place) so the Verified / Resolved / All segments each keep their own total.
   */
  async list(
    status?: ReportStatus,
    category?: ReportCategory,
    districtId?: string,
    upazilaId?: string,
    unionId?: string,
    rawPage = 1,
    rawPageSize = 20,
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const publicStatuses = [ReportStatus.VERIFIED, ReportStatus.RESOLVED];
    const scope = {
      ...(category ? { category } : {}),
      ...(districtId ? { districtId } : {}),
      ...(upazilaId ? { upazilaId } : {}),
      ...(unionId ? { unionId } : {}),
    };
    const where = { ...scope, status: status ? status : { in: publicStatuses } };

    const [rows, total, grouped] = await Promise.all([
      this.prisma.citizenReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: { ...REPORT_SELECT, _count: { select: { media: true } } },
      }),
      this.prisma.citizenReport.count({ where }),
      this.prisma.citizenReport.groupBy({
        by: ['status'],
        where: { ...scope, status: { in: publicStatuses } },
        _count: { _all: true },
      }),
    ]);

    const n = (st: ReportStatus) => grouped.find((g) => g.status === st)?._count._all ?? 0;
    return {
      data: rows.map(({ _count, ...r }) => ({ ...r, mediaCount: _count.media })),
      total,
      page,
      pageSize,
      counts: { verified: n(ReportStatus.VERIFIED), resolved: n(ReportStatus.RESOLVED), all: n(ReportStatus.VERIFIED) + n(ReportStatus.RESOLVED) },
    };
  }

  async getById(id: string) {
    const report = await this.prisma.citizenReport.findUnique({
      where: { id },
      select: {
        ...REPORT_SELECT,
        // Detail endpoint additionally exposes the status audit trail.
        // Not part of the list contract but useful for the detail view.
        statusHistory: {
          select: { id: true, status: true, note: true, createdAt: true },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async listComments(id: string, includeInternal: boolean) {
    await this.getById(id);
    return this.prisma.reportComment.findMany({
      where: {
        reportId: id,
        ...(includeInternal ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        body: true,
        isInternal: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  async addComment(id: string, dto: CreateCommentDto, actor: JwtPayload) {
    await this.getById(id);
    const canMarkInternal = actor.role === 'MODERATOR' || actor.role === 'ADMIN';
    const isInternal = canMarkInternal ? (dto.isInternal ?? false) : false;

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.reportComment.create({
        data: {
          reportId: id,
          authorId: actor.sub,
          body: dto.body,
          isInternal,
        },
        select: {
          id: true,
          body: true,
          isInternal: true,
          createdAt: true,
          author: { select: { id: true, displayName: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          action: 'REPORT_COMMENT_ADD',
          userId: actor.sub,
          entityType: 'CitizenReport',
          entityId: id,
          meta: { commentId: comment.id, isInternal },
        },
      });

      return comment;
    });
  }

  async listMedia(id: string) {
    await this.getById(id);
    return this.prisma.reportMedia.findMany({
      where: { reportId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        url: true,
        mimeType: true,
        fileSize: true,
        caption: true,
        createdAt: true,
        uploadedBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async addMedia(id: string, dto: AddMediaDto, actor: JwtPayload) {
    await this.getById(id);

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.reportMedia.create({
        data: {
          reportId: id,
          uploadedById: actor.sub,
          url: dto.url,
          mimeType: dto.mimeType,
          fileSize: dto.fileSize,
          caption: dto.caption,
        },
        select: {
          id: true,
          url: true,
          mimeType: true,
          fileSize: true,
          caption: true,
          createdAt: true,
          uploadedBy: { select: { id: true, displayName: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          action: 'REPORT_MEDIA_ADD',
          userId: actor.sub,
          entityType: 'CitizenReport',
          entityId: id,
          meta: { mediaId: media.id, mimeType: dto.mimeType ?? null },
        },
      });

      return media;
    });
  }

  async updateStatus(id: string, dto: UpdateReportStatusDto, actor: JwtPayload) {
    const report = await this.getById(id);
    const allowed = STATUS_TRANSITIONS[report.status];
    if (!allowed.includes(dto.status)) {
      throw new ForbiddenException(
        `Cannot transition from ${report.status} to ${dto.status}`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.citizenReport.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === ReportStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
        },
        select: REPORT_SELECT,
      }),
      this.prisma.reportStatusEvent.create({
        data: { reportId: id, status: dto.status, note: dto.note },
      }),
      this.prisma.auditEvent.create({
        data: {
          action: 'REPORT_STATUS_CHANGE',
          userId: actor.sub,
          entityType: 'CitizenReport',
          entityId: id,
          meta: { from: report.status, to: dto.status },
        },
      }),
    ]);
    // Award civic_guardian / clean_air_defender badges when a report is verified or resolved.
    if (
      (dto.status === ReportStatus.VERIFIED || dto.status === ReportStatus.RESOLVED) &&
      report.reporter?.id
    ) {
      this.gamification
        .evaluateBadges(report.reporter.id)
        .catch((err: unknown) => this.logger.warn(`Badge evaluation failed: ${String(err)}`));
    }

    return updated;
  }

  // ─── Spatial proximity search ──────────────────────────────────────────────

  async findNearby(lat: number, lng: number, radiusKm: number, rawPage = 1, rawPageSize = 20) {
    if (!isFinite(lat) || lat < -90 || lat > 90) throw new BadRequestException('lat must be between -90 and 90');
    if (!isFinite(lng) || lng < -180 || lng > 180) throw new BadRequestException('lng must be between -180 and 180');
    if (!isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) throw new BadRequestException('radiusKm must be between 0 and 500');

    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const radiusM = radiusKm * 1000;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<NearbyReportRow[]>(Prisma.sql`
        SELECT
          r.id,
          r.title,
          r.category,
          r.status,
          r.summary,
          r.lat,
          r.lng,
          r."districtId",
          r."createdAt",
          ST_Distance(
            r.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          )::float8 AS distance_m
        FROM "CitizenReport" r
        WHERE r.geom IS NOT NULL
          AND ST_DWithin(
            r.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusM}
          )
          AND r.status IN ('VERIFIED', 'RESOLVED')
        ORDER BY distance_m ASC
        LIMIT ${pageSize} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<[{ total: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "CitizenReport" r
        WHERE r.geom IS NOT NULL
          AND ST_DWithin(
            r.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusM}
          )
          AND r.status IN ('VERIFIED', 'RESOLVED')
      `),
    ]);

    return { data: rows, total: Number(countRows[0]?.total ?? 0), page, pageSize, radiusKm };
  }
}
