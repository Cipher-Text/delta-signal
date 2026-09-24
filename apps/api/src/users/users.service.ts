import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.user.findMany({ skip, take: pageSize, select: USER_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(id: string, role: UserRole, actor: JwtPayload) {
    if (role === UserRole.RESEARCHER) {
      throw new BadRequestException('Researcher role can only be granted through an approved application');
    }
    const user = await this.getById(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { role }, select: USER_SELECT }),
      this.prisma.auditEvent.create({
        data: {
          action: 'USER_ROLE_CHANGE',
          userId: actor.sub,
          entityType: 'User',
          entityId: id,
          meta: { from: user.role, to: role },
        },
      }),
    ]);
    return updated;
  }

  async deactivate(id: string, actor: JwtPayload) {
    if (id === actor.sub) throw new BadRequestException('Cannot deactivate yourself');
    await this.getById(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { isActive: false }, select: USER_SELECT }),
      this.prisma.auditEvent.create({
        data: {
          action: 'USER_DEACTIVATE',
          userId: actor.sub,
          entityType: 'User',
          entityId: id,
          meta: { action: 'deactivate' },
        },
      }),
    ]);
    return updated;
  }

  async reactivate(id: string, actor: JwtPayload) {
    await this.getById(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { isActive: true }, select: USER_SELECT }),
      this.prisma.auditEvent.create({
        data: {
          action: 'USER_DEACTIVATE', // closest existing enum value for the lifecycle event
          userId: actor.sub,
          entityType: 'User',
          entityId: id,
          meta: { action: 'reactivate' },
        },
      }),
    ]);
    return updated;
  }

  async listAuditEvents(
    rawPage = 1,
    rawPageSize = 50,
    filters: { action?: string; userId?: string; entityType?: string } = {},
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.action ? { action: filters.action as never } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          userId: true,
          entityType: true,
          entityId: true,
          meta: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { displayName: true, email: true, role: true } },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
