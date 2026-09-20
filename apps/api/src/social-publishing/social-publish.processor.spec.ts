import { SocialPlatform, SocialPublicationStatus } from '@prisma/client';
import { SocialPublishProcessor } from './social-publish.processor';
import type { PrismaService } from '../database/prisma.service';
import type { StorageService } from '../media/storage.service';
import type { TokenCipherService } from './token-cipher.service';
import type { ImageRasterizerService } from './image-rasterizer.service';
import type { FacebookPublisher } from './platforms/facebook.publisher';

const PUBLICATION = {
  id: 'pub-1',
  status: SocialPublicationStatus.PENDING,
  draftId: 'draft-1',
  draft: { headline: 'Headline', caption: 'A caption' },
  renderedAsset: { publicUrl: 'https://cdn.example.com/card.svg', width: 1080, height: 1350, format: 'PORTRAIT_4_5' },
  platformAccount: { platform: SocialPlatform.FACEBOOK, externalAccountId: 'page-1', accessTokenCipher: 'cipher' },
};

function build() {
  const prisma = { socialPublication: { findUnique: jest.fn(), update: jest.fn() } };
  const storage = { upload: jest.fn().mockResolvedValue('https://cdn.example.com/card.png') };
  const tokenCipher = { decrypt: jest.fn().mockReturnValue('decrypted-token') };
  const rasterizer = { svgToPng: jest.fn().mockResolvedValue(Buffer.from('png-bytes')) };
  const facebook = { publish: jest.fn() };
  const processor = new SocialPublishProcessor(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    tokenCipher as unknown as TokenCipherService,
    rasterizer as unknown as ImageRasterizerService,
    facebook as unknown as FacebookPublisher,
  );
  return { processor, prisma, storage, tokenCipher, rasterizer, facebook };
}

describe('SocialPublishProcessor', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<svg></svg>') }) as any;
  });
  afterAll(() => { global.fetch = originalFetch; });

  it('skips work when the publication no longer exists', async () => {
    const { processor, prisma, facebook } = build();
    prisma.socialPublication.findUnique.mockResolvedValue(null);

    await processor.process({ data: { socialPublicationId: 'pub-1' } } as any);

    expect(facebook.publish).not.toHaveBeenCalled();
  });

  it('is idempotent — skips a publication already marked SENT', async () => {
    const { processor, prisma, facebook } = build();
    prisma.socialPublication.findUnique.mockResolvedValue({ ...PUBLICATION, status: SocialPublicationStatus.SENT });

    await processor.process({ data: { socialPublicationId: 'pub-1' } } as any);

    expect(facebook.publish).not.toHaveBeenCalled();
  });

  it('rasterizes, uploads, publishes, and marks the publication SENT on success', async () => {
    const { processor, prisma, storage, rasterizer, facebook } = build();
    prisma.socialPublication.findUnique.mockResolvedValue(PUBLICATION);
    facebook.publish.mockResolvedValue({ externalPostId: 'ext-1', externalUrl: 'https://facebook.com/page-1/posts/ext-1' });

    await processor.process({ data: { socialPublicationId: 'pub-1' } } as any);

    expect(rasterizer.svgToPng).toHaveBeenCalledWith('<svg></svg>', 1080, 1350);
    expect(storage.upload).toHaveBeenCalledWith(expect.stringContaining('draft-1'), expect.any(Buffer), 'image/png', 'inline');
    expect(facebook.publish).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'decrypted-token',
      externalAccountId: 'page-1',
      imageUrl: 'https://cdn.example.com/card.png',
      caption: 'A caption',
    }));
    expect(prisma.socialPublication.update).toHaveBeenCalledWith({
      where: { id: 'pub-1' },
      data: { status: SocialPublicationStatus.SENT, externalPostId: 'ext-1', externalUrl: 'https://facebook.com/page-1/posts/ext-1' },
    });
  });

  it('marks the publication FAILED and re-throws when publishing fails', async () => {
    const { processor, prisma, facebook } = build();
    prisma.socialPublication.findUnique.mockResolvedValue(PUBLICATION);
    facebook.publish.mockRejectedValue(new Error('Graph API error'));

    await expect(processor.process({ data: { socialPublicationId: 'pub-1' } } as any)).rejects.toThrow('Graph API error');

    expect(prisma.socialPublication.update).toHaveBeenCalledWith({
      where: { id: 'pub-1' },
      data: { status: SocialPublicationStatus.FAILED, error: 'Graph API error' },
    });
  });
});
