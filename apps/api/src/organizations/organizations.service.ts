import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AuditAction, OrganizationMemberRole, OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { clampPagination } from '../common/pagination';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { StorageService } from '../media/storage.service';
import { isValidSlug, slugify, SLUG_MAX } from './organization-slug';
import {
  ORG_IMAGE_MAX_BYTES,
  ORG_IMAGE_MIME_TYPES,
  ORG_LOGO_MAX_PX,
  ORG_MAX_PHOTOS,
  ORG_PHOTO_MAX_PX,
  cleanHttpUrl,
} from './organization-media.constants';

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  type: true,
  description: true,
  website: true,
  country: true,
  isVerified: true,
  logoUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private audit(actor: JwtPayload, action: AuditAction, entityId: string, meta?: Record<string, unknown>) {
    return this.prisma.auditEvent.create({
      data: { action, userId: actor.sub, entityType: 'Organization', entityId, ...(meta ? { meta: meta as object } : {}) },
    });
  }

  /** A free slug derived from `base`: `base`, then `base-2`, `base-3`, … */
  private async uniqueSlug(base: string): Promise<string> {
    for (let n = 1; n < 1000; n++) {
      const suffix = n === 1 ? '' : `-${n}`;
      const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`;
      const taken = await this.prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!taken) return candidate;
    }
    throw new ConflictException('Could not generate a unique slug; please choose one.');
  }

  /** Validates an explicitly chosen slug and makes sure no other organization owns it. */
  private async assertSlugAvailable(slug: string, exceptId?: string) {
    if (!isValidSlug(slug)) throw new BadRequestException('Slug must be 3–80 lowercase letters, digits or single hyphens, and not a reserved word.');
    const owner = await this.prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (owner && owner.id !== exceptId) throw new ConflictException(`The slug "${slug}" is already used by another organization.`);
  }

  private async removeObjects(keys: Array<string | null | undefined>) {
    await Promise.all(
      keys.filter((key): key is string => Boolean(key)).map((key) =>
        this.storage.delete(key).catch((error: unknown) => this.logger.warn(`Failed to remove ${key}: ${String(error)}`)),
      ),
    );
  }

  /** Validates, orients and shrinks an uploaded image; stored as WebP so file sizes stay small. */
  private async prepareImage(file: Express.Multer.File | undefined, maxPx: number) {
    if (!file) throw new BadRequestException('An image file is required');
    if (!ORG_IMAGE_MIME_TYPES.includes(file.mimetype as (typeof ORG_IMAGE_MIME_TYPES)[number])) {
      throw new BadRequestException('Images must be JPG, PNG or WebP.');
    }
    if (file.size > ORG_IMAGE_MAX_BYTES) throw new BadRequestException('Images must be 5 MB or smaller.');
    try {
      return await sharp(file.buffer)
        .rotate()
        .resize({ width: maxPx, height: maxPx, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      throw new BadRequestException('That file could not be read as an image.');
    }
  }

  manageList() {
    return this.prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, displayName: true, email: true, isActive: true } } },
        },
        photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, url: true, caption: true } },
        socialLinks: { select: { platform: true, url: true } },
      },
    });
  }

  manageUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, displayName: true, email: true, isActive: true },
      orderBy: { displayName: 'asc' },
    });
  }

  async create(actor: JwtPayload, dto: { name: string; slug?: string; type: OrganizationType; description?: string; website?: string; country?: string }) {
    let slug: string;
    if (dto.slug) {
      await this.assertSlugAvailable(dto.slug);
      slug = dto.slug;
    } else {
      slug = await this.uniqueSlug(slugify(dto.name));
    }
    const created = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        type: dto.type,
        description: dto.description,
        website: dto.website,
        country: dto.country ?? 'Bangladesh',
      },
    });
    await this.audit(actor, 'ORGANIZATION_CREATE', created.id, { name: created.name, slug });
    return created;
  }

  async upsertMembership(actor: JwtPayload, organizationId: string, dto: { userId: string; role: OrganizationMemberRole }) {
    const [organization, user] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } }),
    ]);
    if (!organization) throw new BadRequestException('Organization not found');
    if (!user) throw new BadRequestException('User not found');

    const membership = await this.prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId: dto.userId } },
      create: { organizationId, userId: dto.userId, role: dto.role },
      update: { role: dto.role },
      include: { user: { select: { id: true, displayName: true, email: true, isActive: true } } },
    });
    await this.audit(actor, 'ORGANIZATION_MEMBER_SET', organizationId, { userId: dto.userId, role: dto.role });
    return membership;
  }

  async removeMembership(actor: JwtPayload, organizationId: string, userId: string) {
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Membership not found');
    const removed = await this.prisma.organizationMembership.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
    await this.audit(actor, 'ORGANIZATION_MEMBER_REMOVE', organizationId, { userId });
    return removed;
  }

  /** Organizations the caller administers (org-level ADMIN membership); platform admins manage all from the console. */
  mine(actor: JwtPayload) {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId: actor.sub, role: OrganizationMemberRole.ADMIN } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  /** Platform admins, or members holding the organization-level ADMIN role, may edit an organization's own profile. */
  async assertCanEdit(actor: JwtPayload, organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!org) throw new NotFoundException('Organization not found');
    if (actor.role === 'ADMIN') return;
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actor.sub } },
      select: { role: true },
    });
    if (membership?.role !== OrganizationMemberRole.ADMIN) throw new ForbiddenException('Only an administrator of this organization can edit its profile');
  }

  /** Public: returns only the total count (optionally filtered by type). */
  count(type?: OrganizationType) {
    return this.prisma.organization
      .count({ where: type ? { type } : undefined })
      .then((total) => ({ total }));
  }

  /** Authenticated: returns the full paginated list. */
  list(type?: OrganizationType, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.organization.findMany({
        where: type ? { type } : undefined,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: ORG_SELECT,
      }),
      this.prisma.organization.count({ where: type ? { type } : undefined }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  /** `includeMembers` is false for guests: the team list is for signed-in users, guests only get the count. */
  async getById(idOrSlug: string, includeMembers = true) {
    // Public URLs use the slug; ids keep working so older links and internal callers are unaffected.
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        ...ORG_SELECT,
        providers: { select: { id: true, name: true, type: true, isActive: true } },
        photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, url: true, caption: true } },
        socialLinks: { orderBy: { platform: 'asc' }, select: { platform: true, url: true } },
        ...(includeMembers && {
          memberships: {
            orderBy: { createdAt: 'asc' as const },
            select: {
              role: true,
              user: { select: { id: true, displayName: true } },
            },
          },
        }),
        restorationProjects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            startDate: true,
            endDate: true,
            impactSummary: true,
            district: { select: { id: true, name: true } },
            upazila: { select: { id: true, name: true } },
            _count: { select: { participants: true, targets: true, activities: true } },
            activities: { orderBy: { activityDate: 'desc' }, take: 1, select: { title: true, activityDate: true } },
          },
        },
        _count: { select: { memberships: true, restorationProjects: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return { ...org, memberships: org.memberships ?? [] };
  }

  async update(actor: JwtPayload, id: string, dto: UpdateOrganizationDto) {
    const before = await this.getById(id);
    if (dto.slug !== undefined && dto.slug !== before.slug) await this.assertSlugAvailable(dto.slug, before.id);
    const updated = await this.prisma.organization
      .update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
      },
      select: ORG_SELECT,
    })
      .catch((error: unknown) => {
        // Two admins claiming the same slug at once: the unique index decides.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('That slug is already used by another organization.');
        throw error;
      });
    await this.audit(actor, dto.isVerified !== undefined && dto.isVerified !== before.isVerified ? 'ORGANIZATION_VERIFY_CHANGE' : 'ORGANIZATION_UPDATE', id, {
      fields: Object.keys(dto),
      ...(dto.slug !== undefined && dto.slug !== before.slug ? { slugFrom: before.slug, slugTo: dto.slug } : {}),
      ...(dto.isVerified !== undefined ? { isVerified: dto.isVerified } : {}),
    });
    return updated;
  }

  async delete(actor: JwtPayload, id: string) {
    await this.getById(id);
    const media = await this.prisma.organization.findUnique({
      where: { id },
      select: { name: true, logoKey: true, photos: { select: { storageKey: true } } },
    });
    await this.prisma.organization.delete({ where: { id } });
    await this.audit(actor, 'ORGANIZATION_DELETE', id, { name: media?.name });
    await this.removeObjects([media?.logoKey, ...(media?.photos.map((p) => p.storageKey) ?? [])]);
  }

  // ─── Logo, photos and links ──────────────────────────────────────────────────

  async setLogo(actor: JwtPayload, id: string, file: Express.Multer.File | undefined) {
    const current = await this.prisma.organization.findUnique({ where: { id }, select: { logoKey: true } });
    if (!current) throw new NotFoundException('Organization not found');
    const buffer = await this.prepareImage(file, ORG_LOGO_MAX_PX);
    const key = `organizations/${id}/logo-${randomUUID()}.webp`;
    const logoUrl = await this.storage.upload(key, buffer, 'image/webp');
    try {
      await this.prisma.organization.update({ where: { id }, data: { logoUrl, logoKey: key } });
    } catch (error) {
      await this.removeObjects([key]);
      throw error;
    }
    await this.audit(actor, 'ORGANIZATION_LOGO_SET', id);
    void this.removeObjects([current.logoKey]);
    return { logoUrl };
  }

  async removeLogo(actor: JwtPayload, id: string) {
    const current = await this.prisma.organization.findUnique({ where: { id }, select: { logoKey: true } });
    if (!current) throw new NotFoundException('Organization not found');
    await this.prisma.organization.update({ where: { id }, data: { logoUrl: null, logoKey: null } });
    await this.audit(actor, 'ORGANIZATION_LOGO_REMOVE', id);
    await this.removeObjects([current.logoKey]);
  }

  async addPhoto(actor: JwtPayload, id: string, file: Express.Multer.File | undefined, caption?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id }, select: { _count: { select: { photos: true } } } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org._count.photos >= ORG_MAX_PHOTOS) throw new BadRequestException(`An organization can have at most ${ORG_MAX_PHOTOS} photos.`);
    const buffer = await this.prepareImage(file, ORG_PHOTO_MAX_PX);
    const key = `organizations/${id}/photo-${randomUUID()}.webp`;
    const url = await this.storage.upload(key, buffer, 'image/webp');
    try {
      const last = await this.prisma.organizationPhoto.findFirst({ where: { organizationId: id }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
      const photo = await this.prisma.organizationPhoto.create({
        data: { organizationId: id, url, storageKey: key, caption: caption?.trim() || null, sortOrder: (last?.sortOrder ?? -1) + 1 },
        select: { id: true, url: true, caption: true },
      });
      await this.audit(actor, 'ORGANIZATION_PHOTO_ADD', id, { photoId: photo.id });
      return photo;
    } catch (error) {
      await this.removeObjects([key]);
      throw error;
    }
  }

  async removePhoto(actor: JwtPayload, id: string, photoId: string) {
    const photo = await this.prisma.organizationPhoto.findFirst({ where: { id: photoId, organizationId: id }, select: { storageKey: true } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.organizationPhoto.delete({ where: { id: photoId } });
    await this.audit(actor, 'ORGANIZATION_PHOTO_REMOVE', id, { photoId });
    await this.removeObjects([photo.storageKey]);
  }

  /** Replaces the whole link list. Blank URLs drop a platform; non-http(s) URLs are rejected. */
  async replaceLinks(actor: JwtPayload, id: string, links: Array<{ platform: string; url: string }>) {
    await this.getById(id);
    const byPlatform = new Map<string, string>();
    for (const link of links) {
      if (!link.url.trim()) continue;
      const url = cleanHttpUrl(link.url);
      if (!url) throw new BadRequestException(`"${link.platform}" needs a full web address starting with https://`);
      byPlatform.set(link.platform, url);
    }
    await this.prisma.$transaction([
      this.prisma.organizationSocialLink.deleteMany({ where: { organizationId: id } }),
      this.prisma.organizationSocialLink.createMany({
        data: [...byPlatform].map(([platform, url]) => ({ organizationId: id, platform, url })),
      }),
    ]);
    await this.audit(actor, 'ORGANIZATION_LINKS_SET', id, { platforms: [...byPlatform.keys()] });
    return this.prisma.organizationSocialLink.findMany({ where: { organizationId: id }, orderBy: { platform: 'asc' }, select: { platform: true, url: true } });
  }
}
