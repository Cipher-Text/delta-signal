import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResearcherApplicationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';
import { ReviewResearcherApplicationDto } from './dto/review-researcher-application.dto';

const RESEARCH_PROFILE_PLATFORMS = ['googleScholar', 'researchGate', 'orcid'];
function isWebUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
const APPLICATION_SELECT = {
  id: true, status: true, reviewerNote: true, reviewedAt: true, createdAt: true, updatedAt: true,
} as const;

@Injectable()
export class ResearcherApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    return this.prisma.researcherApplication.findFirst({
      where: { userId }, orderBy: { createdAt: 'desc' }, select: APPLICATION_SELECT,
    });
  }

  async submit(user: JwtPayload) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, socialLinks: { where: { platform: { in: RESEARCH_PROFILE_PLATFORMS } }, select: { platform: true, url: true } } },
    });
    if (!account) throw new NotFoundException('User not found');
    if (account.role !== UserRole.CITIZEN) throw new BadRequestException('Only citizen accounts can apply to become a researcher');
    if (!account.socialLinks.some((link) => isWebUrl(link.url))) {
      throw new BadRequestException('Please add a Google Scholar, ResearchGate, or ORCID profile link to your profile before applying');
    }

    const existing = await this.getMine(user.sub);
    if (existing?.status === ResearcherApplicationStatus.PENDING || existing?.status === ResearcherApplicationStatus.APPROVED) {
      throw new BadRequestException(existing.status === 'APPROVED' ? 'Your researcher application is already approved' : 'Your application is already under review');
    }

    const data = {
      status: ResearcherApplicationStatus.PENDING,
      reviewerId: null,
      reviewerNote: null,
      reviewedAt: null,
    };

    const application = existing
      ? await this.prisma.researcherApplication.update({ where: { id: existing.id }, data, select: APPLICATION_SELECT })
      : await this.prisma.researcherApplication.create({ data: { ...data, userId: user.sub }, select: APPLICATION_SELECT });

    await this.prisma.auditEvent.create({
      data: { action: 'RESEARCHER_APPLICATION_SUBMIT', userId: user.sub, entityType: 'ResearcherApplication', entityId: application.id, meta: { status: application.status } },
    });
    return application;
  }

  async list(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const where = status && Object.values(ResearcherApplicationStatus).includes(status as ResearcherApplicationStatus)
      ? { status: status as ResearcherApplicationStatus }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.researcherApplication.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'asc' },
        select: {
          ...APPLICATION_SELECT,
          user: {
            select: {
              id: true, email: true, displayName: true, role: true, isEmailVerified: true,
              socialLinks: { where: { platform: { in: RESEARCH_PROFILE_PLATFORMS } }, select: { platform: true, url: true } },
            },
          },
        },
      }),
      this.prisma.researcherApplication.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async review(id: string, dto: ReviewResearcherApplicationDto, actor: JwtPayload) {
    const current = await this.prisma.researcherApplication.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Researcher application not found');
    if (current.status !== ResearcherApplicationStatus.PENDING && current.status !== ResearcherApplicationStatus.NEEDS_INFORMATION) {
      throw new BadRequestException('This application has already received a final decision');
    }
    if (dto.status === 'NEEDS_INFORMATION' && !dto.reviewerNote?.trim()) {
      throw new BadRequestException('Add a note explaining what information is needed');
    }
    if (dto.status === 'DECLINED' && !dto.reviewerNote?.trim()) {
      throw new BadRequestException('Add a reason for declining the application');
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.researcherApplication.update({
        where: { id },
        data: { status: dto.status, reviewerId: actor.sub, reviewerNote: dto.reviewerNote?.trim() || null, reviewedAt: new Date() },
        select: {
          ...APPLICATION_SELECT,
          user: {
            select: {
              id: true, email: true, displayName: true, role: true,
              socialLinks: { where: { platform: { in: RESEARCH_PROFILE_PLATFORMS } }, select: { platform: true, url: true } },
            },
          },
        },
      });
      if (dto.status === 'APPROVED') {
        const applicant = await tx.user.findUnique({ where: { id: current.userId }, select: { role: true } });
        if (!applicant || applicant.role !== UserRole.CITIZEN) {
          throw new BadRequestException('Only a citizen applicant can be granted researcher access');
        }
        await tx.user.update({ where: { id: current.userId }, data: { role: UserRole.RESEARCHER } });
        await tx.auditEvent.create({ data: { action: 'USER_ROLE_CHANGE', userId: actor.sub, entityType: 'User', entityId: current.userId, meta: { from: 'CITIZEN', to: 'RESEARCHER', applicationId: id } } });
      }
      await tx.auditEvent.create({
        data: { action: 'RESEARCHER_APPLICATION_REVIEW', userId: actor.sub, entityType: 'ResearcherApplication', entityId: id, meta: { from: current.status, to: dto.status, note: dto.reviewerNote?.trim() || null } },
      });
      return application;
    });
  }
}
