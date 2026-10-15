import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { OrganizationsService } from './organizations.service';
import { ORG_MAX_PHOTOS, cleanHttpUrl } from './organization-media.constants';

const actor = { sub: 'admin-1', email: 'a@x.org', role: 'ADMIN' };

function build() {
  const prisma: any = {
    organization: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    organizationMembership: { findUnique: jest.fn(), delete: jest.fn(), upsert: jest.fn() },
    organizationPhoto: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    organizationSocialLink: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const storage: any = { upload: jest.fn().mockResolvedValue('https://cdn.test/key.webp'), delete: jest.fn().mockResolvedValue(undefined) };
  return { service: new OrganizationsService(prisma, storage), prisma, storage };
}

async function png(): Promise<Express.Multer.File> {
  const buffer = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#2e9b66' } }).png().toBuffer();
  return { buffer, mimetype: 'image/png', size: buffer.length, originalname: 'logo.png' } as Express.Multer.File;
}

describe('cleanHttpUrl', () => {
  it('accepts http(s) addresses and rejects other schemes or junk', () => {
    expect(cleanHttpUrl(' https://facebook.com/cnrs ')).toBe('https://facebook.com/cnrs');
    expect(cleanHttpUrl('javascript:alert(1)')).toBeNull();
    expect(cleanHttpUrl('data:text/html,hi')).toBeNull();
    expect(cleanHttpUrl('facebook.com/cnrs')).toBeNull();
    expect(cleanHttpUrl('')).toBeNull();
  });
});

describe('OrganizationsService media and links', () => {
  it('stores a resized WebP logo, replaces the old object and audits', async () => {
    const { service, prisma, storage } = build();
    prisma.organization.findUnique.mockResolvedValue({ logoKey: 'organizations/o1/logo-old.webp' });
    const result = await service.setLogo(actor, 'o1', await png());
    expect(result.logoUrl).toBe('https://cdn.test/key.webp');
    expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^organizations\/o1\/logo-.+\.webp$/), expect.any(Buffer), 'image/webp');
    expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ logoUrl: 'https://cdn.test/key.webp' }) }));
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_LOGO_SET', entityId: 'o1', userId: 'admin-1' }) });
    await Promise.resolve();
    expect(storage.delete).toHaveBeenCalledWith('organizations/o1/logo-old.webp');
  });

  it('rejects non-image uploads, oversized files and a missing file before touching storage', async () => {
    const { service, prisma, storage } = build();
    prisma.organization.findUnique.mockResolvedValue({ logoKey: null });
    const pdf = { buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 1, originalname: 'a.pdf' } as Express.Multer.File;
    await expect(service.setLogo(actor, 'o1', pdf)).rejects.toThrow(BadRequestException);
    const big = { ...(await png()), size: 6 * 1024 * 1024 };
    await expect(service.setLogo(actor, 'o1', big)).rejects.toThrow(/5 MB/);
    await expect(service.setLogo(actor, 'o1', undefined)).rejects.toThrow(/required/);
    const broken = { buffer: Buffer.from('not an image'), mimetype: 'image/png', size: 12, originalname: 'a.png' } as Express.Multer.File;
    await expect(service.setLogo(actor, 'o1', broken)).rejects.toThrow(/could not be read/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('caps the gallery at the photo limit', async () => {
    const { service, prisma, storage } = build();
    prisma.organization.findUnique.mockResolvedValue({ _count: { photos: ORG_MAX_PHOTOS } });
    await expect(service.addPhoto(actor, 'o1', await png(), 'x')).rejects.toThrow(/at most/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('appends a photo with the next sort order and removes the upload if saving fails', async () => {
    const { service, prisma, storage } = build();
    prisma.organization.findUnique.mockResolvedValue({ _count: { photos: 2 } });
    prisma.organizationPhoto.findFirst.mockResolvedValue({ sortOrder: 4 });
    prisma.organizationPhoto.create.mockResolvedValueOnce({ id: 'p1', url: 'u', caption: 'Nursery' });
    await service.addPhoto(actor, 'o1', await png(), ' Nursery ');
    expect(prisma.organizationPhoto.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sortOrder: 5, caption: 'Nursery' }) }));

    prisma.organizationPhoto.create.mockRejectedValueOnce(new Error('db down'));
    await expect(service.addPhoto(actor, 'o1', await png())).rejects.toThrow('db down');
    expect(storage.delete).toHaveBeenCalled();
  });

  it('returns 404 for an unknown photo or membership', async () => {
    const { service, prisma } = build();
    prisma.organizationPhoto.findFirst.mockResolvedValue(null);
    await expect(service.removePhoto(actor, 'o1', 'nope')).rejects.toThrow(NotFoundException);
    prisma.organizationMembership.findUnique.mockResolvedValue(null);
    await expect(service.removeMembership(actor, 'o1', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('replaces links: drops blanks, normalises URLs, rejects non-http schemes', async () => {
    const { service, prisma } = build();
    prisma.organization.findUnique.mockResolvedValue({ id: 'o1', isVerified: false, memberships: [], _count: {} });
    await service.replaceLinks(actor, 'o1', [
      { platform: 'facebook', url: 'https://facebook.com/cnrs' },
      { platform: 'x', url: '   ' },
    ]);
    expect(prisma.organizationSocialLink.createMany).toHaveBeenCalledWith({ data: [{ organizationId: 'o1', platform: 'facebook', url: 'https://facebook.com/cnrs' }] });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_LINKS_SET' }) });

    prisma.$transaction.mockClear();
    await expect(service.replaceLinks(actor, 'o1', [{ platform: 'linkedin', url: 'javascript:alert(1)' }])).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('audits verification changes separately from ordinary edits', async () => {
    const { service, prisma } = build();
    prisma.organization.findUnique.mockResolvedValue({ id: 'o1', isVerified: false, memberships: [], _count: {} });
    prisma.organization.update.mockResolvedValue({ id: 'o1' });
    await service.update(actor, 'o1', { isVerified: true });
    expect(prisma.auditEvent.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_VERIFY_CHANGE' }) });
    await service.update(actor, 'o1', { name: 'New' });
    expect(prisma.auditEvent.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_UPDATE' }) });
  });

  describe('assertCanEdit', () => {
    const member = { sub: 'user-9', email: 'm@x.org', role: 'ORGANIZATION_ADMIN' };

    it('lets platform admins edit any existing organization without a membership lookup', async () => {
      const { service, prisma } = build();
      prisma.organization.findUnique.mockResolvedValue({ id: 'o1' });
      await expect(service.assertCanEdit(actor, 'o1')).resolves.toBeUndefined();
      expect(prisma.organizationMembership.findUnique).not.toHaveBeenCalled();
    });

    it('lets an organization ADMIN member edit', async () => {
      const { service, prisma } = build();
      prisma.organization.findUnique.mockResolvedValue({ id: 'o1' });
      prisma.organizationMembership.findUnique.mockResolvedValue({ role: 'ADMIN' });
      await expect(service.assertCanEdit(member, 'o1')).resolves.toBeUndefined();
      expect(prisma.organizationMembership.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId_userId: { organizationId: 'o1', userId: 'user-9' } } }));
    });

    it('refuses plain members, non-members, and other organizations', async () => {
      const { service, prisma } = build();
      prisma.organization.findUnique.mockResolvedValue({ id: 'o1' });
      prisma.organizationMembership.findUnique.mockResolvedValueOnce({ role: 'MEMBER' });
      await expect(service.assertCanEdit(member, 'o1')).rejects.toThrow(ForbiddenException);
      prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);
      await expect(service.assertCanEdit(member, 'o1')).rejects.toThrow(ForbiddenException);
    });

    it('returns 404 for an unknown organization', async () => {
      const { service, prisma } = build();
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.assertCanEdit(member, 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getById member visibility', () => {
    it('does not query member names for guests and always returns a memberships array', async () => {
      const { service, prisma } = build();
      prisma.organization.findUnique.mockResolvedValue({ id: 'o1', _count: { memberships: 3, restorationProjects: 0 } });
      const guest = await service.getById('o1', false);
      expect(prisma.organization.findUnique.mock.calls[0][0].select.memberships).toBeUndefined();
      expect(guest.memberships).toEqual([]);
      expect(guest._count.memberships).toBe(3);

      prisma.organization.findUnique.mockResolvedValue({ id: 'o1', memberships: [{ role: 'ADMIN', user: { id: 'u', displayName: 'A' } }], _count: { memberships: 1, restorationProjects: 0 } });
      const member = await service.getById('o1');
      expect(prisma.organization.findUnique.mock.calls[1][0].select.memberships).toBeDefined();
      expect(member.memberships).toHaveLength(1);
    });
  });
});
