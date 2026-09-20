import { Injectable, Logger } from '@nestjs/common';
import { PublishParams, PublishResult, SocialPlatformPublisher } from './social-platform-publisher.interface';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Posts a card to a Facebook Page feed via the Graph API's Page Photos edge.
 * Passing `url` (the already-public rasterized PNG) instead of uploading bytes
 * directly avoids a second multipart round trip — Facebook fetches the image
 * itself. Job-level retries (BullMQ, see social-publish.processor.ts) cover
 * transient failures; this makes a single attempt per call.
 */
@Injectable()
export class FacebookPublisher implements SocialPlatformPublisher {
  private readonly logger = new Logger(FacebookPublisher.name);

  async publish(params: PublishParams): Promise<PublishResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(`${GRAPH_API_BASE}/${params.externalAccountId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: params.imageUrl,
          caption: params.caption,
          access_token: params.accessToken,
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body?.error?.message ?? `Facebook Graph API returned ${response.status}`;
        throw new Error(message);
      }
      const postId: string = body.post_id ?? body.id;
      if (!postId) throw new Error('Facebook Graph API response did not include a post id');
      // post_id on the /photos edge is "{page-id}_{post-id}" — the second half addresses the feed post.
      const feedPostId = postId.includes('_') ? postId.split('_')[1] : postId;
      return {
        externalPostId: postId,
        externalUrl: `https://www.facebook.com/${params.externalAccountId}/posts/${feedPostId}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
