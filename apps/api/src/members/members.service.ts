import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { clampPagination } from '../common/pagination';

const MEMBER_SELECT = {
  id: true,
  displayName: true,
  role: true,
  createdAt: true,
  profile: {
    select: {
      avatarUrl: true,
      occupation: true,
      bio: true,
      institution: true,
      locationDistrict: true,
      locationCountry: true,
      earnedBadges: true,
      contributionPoints: true,
    },
  },
} satisfies Prisma.UserSelect;

export interface MemberListFilters {
  role?: UserRole;
  district?: string;
  search?: string;
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  list(rawPage = 1, rawPageSize = 20, filters: MemberListFilters = {}) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;

    // A user with no profile row yet (never opened the profile editor) has
    // no explicit choice on record, so they default to visible — only an
    // *explicit* PRIVATE selection removes someone from the directory.
    const where: Prisma.UserWhereInput = {
      isActive: true,
      NOT: { profile: { is: { profileVisibility: 'PRIVATE' } } },
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.district ? { profile: { is: { locationDistrict: filters.district } } } : {}),
      ...(filters.search ? { displayName: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        select: MEMBER_SELECT,
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  /** Distinct districts currently represented in the directory, for the filter dropdown. */
  async listDistricts(): Promise<string[]> {
    const rows = await this.prisma.userProfile.findMany({
      where: { locationDistrict: { not: null }, profileVisibility: { not: 'PRIVATE' } },
      select: { locationDistrict: true },
      distinct: ['locationDistrict'],
      orderBy: { locationDistrict: 'asc' },
    });
    return rows.map((r) => r.locationDistrict).filter((d): d is string => !!d);
  }
}
