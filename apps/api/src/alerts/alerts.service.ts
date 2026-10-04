import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, AlertSeverity, AlertType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';
import { assertDistrictExists } from '../common/validate-district';

const AREA_SELECT = {
  id: true,
  districtId: true,
  upazilaId: true,
  unionId: true,
  district: { select: { id: true, name: true } },
  upazila: { select: { id: true, name: true } },
  union: { select: { id: true, name: true } },
} as const;

const ALERT_SELECT = {
  id: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  alertType: true,
  instructions: true,
  issuedAt: true,
  expiresAt: true,
  createdAt: true,
  district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } },
  areas: { select: AREA_SELECT },
} as const;

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(
    status?: AlertStatus,
    severity?: AlertSeverity,
    alertType?: AlertType,
    districtId?: string,
    rawPage = 1,
    rawPageSize = 20,
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const effectiveStatus = status ?? AlertStatus.ACTIVE;
    const and: Record<string, unknown>[] = [];

    // An active alert past its expiry is not active, even before the scheduler marks it EXPIRED.
    if (effectiveStatus === AlertStatus.ACTIVE) {
      and.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
    }
    if (districtId) {
      and.push({ OR: [{ districtId }, { areas: { some: { districtId } } }] });
    }

    const where: Record<string, unknown> = {
      status: effectiveStatus,
      ...(severity ? { severity } : {}),
      ...(alertType ? { alertType } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    return Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ severity: 'desc' }, { issuedAt: 'desc' }],
        select: ALERT_SELECT,
      }),
      this.prisma.alert.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async getById(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      select: ALERT_SELECT,
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async create(dto: CreateAlertDto, actor: JwtPayload) {
    // Validate legacy single-district field if provided without areas.
    if (dto.districtId && !dto.areas?.length) {
      await assertDistrictExists(this.prisma, dto.districtId);
    }

    // Determine the districtId for backward-compat notification fan-out:
    // prefer the first district-level area, fall back to dto.districtId.
    const firstAreaDistrictId = dto.areas?.find((a) => a.districtId)?.districtId;
    const legacyDistrictId = firstAreaDistrictId ?? dto.districtId;

    const alert = await this.prisma.$transaction(async (tx) => {
      const created = await tx.alert.create({
        data: {
          title: dto.title,
          severity: dto.severity,
          description: dto.description,
          instructions: dto.instructions,
          alertType: dto.alertType,
          districtId: legacyDistrictId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          status: AlertStatus.ACTIVE,
        },
        select: ALERT_SELECT,
      });

      if (dto.areas?.length) {
        await tx.alertArea.createMany({
          data: dto.areas.map((area) => ({
            alertId: created.id,
            districtId: area.districtId,
            upazilaId: area.upazilaId,
            unionId: area.unionId,
          })),
        });
      }

      await tx.auditEvent.create({
        data: {
          action: 'ALERT_CREATE',
          userId: actor.sub,
          entityType: 'Alert',
          entityId: created.id,
          meta: {
            ...(dto.alertType ? { alertType: dto.alertType } : {}),
            ...(dto.areas?.length ? { areaCount: dto.areas.length } : {}),
          },
        },
      });

      return created;
    });

    // Re-fetch to include any created AlertArea rows.
    const full = await this.prisma.alert.findUniqueOrThrow({
      where: { id: alert.id },
      select: ALERT_SELECT,
    });

    // Dispatch is fire-and-forget: delivery failures must not fail the HTTP response.
    this.notifications.dispatchForAlert(full.id);
    return full;
  }

  async update(id: string, dto: UpdateAlertDto, actor: JwtPayload) {
    const existing = await this.getById(id);
    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.instructions ? { instructions: dto.instructions } : {}),
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
      select: ALERT_SELECT,
    });

    await this.prisma.auditEvent.create({
      data: {
        action: 'ALERT_STATUS_CHANGE',
        userId: actor.sub,
        entityType: 'Alert',
        entityId: id,
        meta: {
          ...(dto.status ? { from: existing.status, to: dto.status } : {}),
          ...(dto.instructions ? { instructionsUpdated: true } : {}),
          ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}),
        },
      },
    });

    // Dispatch when a DRAFT alert is manually activated.
    if (dto.status === AlertStatus.ACTIVE) {
      this.notifications.dispatchForAlert(id);
    }
    return updated;
  }
}
