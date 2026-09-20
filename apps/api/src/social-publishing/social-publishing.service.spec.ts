import { ConflictException, NotFoundException } from '@nestjs/common';
import { SocialDraftStatus, SocialPlatformAccountStatus } from '@prisma/client';
import { SocialPublishingService } from './social-publishing.service';
import type { PrismaService } from '../database/prisma.service';
import type { TokenCipherService } from './token-cipher.service';

const ACTOR = { sub: 'admin-1', email: 'a@b.c', role: 'ADMIN' };

function mockPrisma() {
  return {
    socialPostDraft: { findUnique: jest.fn() },
    socialPlatformAccount: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    socialPublication: { create: jest.fn() },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
  };
}

function build() {
  const prisma = mockPrisma();
  const config = { get: jest.fn().mockReturnValue(undefined) } as any;
  const jwt = { sign: jest.fn(), verify: jest.fn() } as any;
  const tokenCipher = { isConfigured: true, encrypt: jest.fn(), decrypt: jest.fn() } as unknown as TokenCipherService;
  const queue = { add: jest.fn().mockResolvedValue({}) } as any;
  const service = new SocialPublishingService(prisma as unknown as PrismaService, config, jwt, tokenCipher, queue);
  return { service, prisma, queue };
}

const APPROVED_DRAFT = {
  id: 'draft-1',
  status: SocialDraftStatus.APPROVED,
  renderedAssets: [{ id: 'asset-1' }],
};

const ACTIVE_ACCOUNT = { id: 'account-1', status: SocialPlatformAccountStatus.ACTIVE };

describe('SocialPublishingService.requestPublish', () => {
  it('throws NotFoundException when the draft does not exist', async () => {
    const { service, prisma } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue(null);

    await expect(service.requestPublish('missing', 'account-1', ACTOR)).rejects.toThrow(NotFoundException);
  });

  it('rejects a draft that is not APPROVED', async () => {
    const { service, prisma } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue({ ...APPROVED_DRAFT, status: SocialDraftStatus.RENDERED });

    await expect(service.requestPublish('draft-1', 'account-1', ACTOR)).rejects.toThrow(ConflictException);
  });

  it('rejects an approved draft with no rendered asset', async () => {
    const { service, prisma } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue({ ...APPROVED_DRAFT, renderedAssets: [] });

    await expect(service.requestPublish('draft-1', 'account-1', ACTOR)).rejects.toThrow(NotFoundException);
  });

  it('rejects when the platform account is missing', async () => {
    const { service, prisma } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue(APPROVED_DRAFT);
    prisma.socialPlatformAccount.findUnique.mockResolvedValue(null);

    await expect(service.requestPublish('draft-1', 'account-1', ACTOR)).rejects.toThrow(NotFoundException);
  });

  it('rejects when the platform account is revoked', async () => {
    const { service, prisma } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue(APPROVED_DRAFT);
    prisma.socialPlatformAccount.findUnique.mockResolvedValue({ ...ACTIVE_ACCOUNT, status: SocialPlatformAccountStatus.REVOKED });

    await expect(service.requestPublish('draft-1', 'account-1', ACTOR)).rejects.toThrow(NotFoundException);
  });

  it('creates a PENDING publication, enqueues a de-duplicated job, and writes an audit event', async () => {
    const { service, prisma, queue } = build();
    prisma.socialPostDraft.findUnique.mockResolvedValue(APPROVED_DRAFT);
    prisma.socialPlatformAccount.findUnique.mockResolvedValue(ACTIVE_ACCOUNT);
    prisma.socialPublication.create.mockResolvedValue({ id: 'pub-1' });

    const result = await service.requestPublish('draft-1', 'account-1', ACTOR);

    expect(prisma.socialPublication.create).toHaveBeenCalledWith({
      data: { draftId: 'draft-1', platformAccountId: 'account-1', renderedAssetId: 'asset-1', requestedById: ACTOR.sub },
    });
    expect(queue.add).toHaveBeenCalledWith(
      'publish',
      { socialPublicationId: 'pub-1' },
      expect.objectContaining({ jobId: 'publish:pub-1' }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'SOCIAL_PUBLISH_REQUEST', userId: ACTOR.sub }),
    }));
    expect(result).toEqual({ id: 'pub-1' });
  });
});
