import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'node:crypto';
import { SocialPlatform, SocialPublicationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';
import { TokenCipherService } from './token-cipher.service';
import { ImageRasterizerService } from './image-rasterizer.service';
import { FacebookPublisher } from './platforms/facebook.publisher';
import { SOCIAL_PUBLISH_QUEUE, PublishJobData } from './social-publish.constants';

@Processor(SOCIAL_PUBLISH_QUEUE)
export class SocialPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(SocialPublishProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly tokenCipher: TokenCipherService,
    private readonly rasterizer: ImageRasterizerService,
    private readonly facebook: FacebookPublisher,
  ) {
    super();
  }

  async process(job: Job<PublishJobData>): Promise<void> {
    const publication = await this.prisma.socialPublication.findUnique({
      where: { id: job.data.socialPublicationId },
      include: { draft: true, renderedAsset: true, platformAccount: true },
    });
    // Idempotency guard — a retried job after a partial success (post sent, DB
    // update failed) must not post the same card twice.
    if (!publication || publication.status === SocialPublicationStatus.SENT) return;

    try {
      const svgResponse = await fetch(publication.renderedAsset.publicUrl);
      if (!svgResponse.ok) throw new Error(`Failed to fetch rendered card (${svgResponse.status})`);
      const svg = await svgResponse.text();

      const png = await this.rasterizer.svgToPng(svg, publication.renderedAsset.width, publication.renderedAsset.height);
      const pngHash = createHash('sha256').update(png).digest('hex').slice(0, 16);
      const pngKey = `social-cards/${publication.draftId}/${publication.renderedAsset.format.toLowerCase()}-${pngHash}.png`;
      const pngUrl = await this.storage.upload(pngKey, png, 'image/png', 'inline');

      const accessToken = this.tokenCipher.decrypt(publication.platformAccount.accessTokenCipher);
      const publisher = this.publisherFor(publication.platformAccount.platform);
      const result = await publisher.publish({
        accessToken,
        externalAccountId: publication.platformAccount.externalAccountId,
        imageUrl: pngUrl,
        caption: publication.draft.caption ?? publication.draft.headline,
      });

      await this.prisma.socialPublication.update({
        where: { id: publication.id },
        data: { status: SocialPublicationStatus.SENT, externalPostId: result.externalPostId, externalUrl: result.externalUrl },
      });
    } catch (err) {
      const error = String(err instanceof Error ? err.message : err);
      this.logger.error(`Publish ${publication.id} failed: ${error}`);
      await this.prisma.socialPublication.update({
        where: { id: publication.id },
        data: { status: SocialPublicationStatus.FAILED, error },
      });
      // Re-throw so BullMQ retries the job with exponential backoff.
      throw err;
    }
  }

  private publisherFor(platform: SocialPlatform) {
    switch (platform) {
      case SocialPlatform.FACEBOOK:
        return this.facebook;
      default:
        throw new Error(`No publisher registered for platform ${platform}`);
    }
  }
}
