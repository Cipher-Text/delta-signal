import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SocialDraftStatus, SocialPlatform, SocialPlatformAccountStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { TokenCipherService } from './token-cipher.service';
import { SOCIAL_PUBLISH_QUEUE } from './social-publish.constants';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const OAUTH_STATE_TTL = '5m';

const PUBLISH_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 3_000 },
};

@Injectable()
export class SocialPublishingService {
  private readonly logger = new Logger(SocialPublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly tokenCipher: TokenCipherService,
    @InjectQueue(SOCIAL_PUBLISH_QUEUE) private readonly queue: Queue,
  ) {}

  list() {
    return this.prisma.socialPlatformAccount.findMany({
      where: { status: SocialPlatformAccountStatus.ACTIVE },
      select: { id: true, platform: true, externalAccountId: true, displayName: true, status: true, createdAt: true, connectedBy: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * `state` is a short-lived, self-verifying JWT carrying the connecting
   * admin's id — Facebook's redirect back to our callback is a plain browser
   * navigation with no Authorization header, so this is how the (unauthenticated)
   * callback recovers who initiated the connect.
   */
  buildFacebookAuthorizeUrl(actor: JwtPayload): string {
    const appId = this.assertFacebookConfigured();
    const redirectUri = this.config.get<string>('FACEBOOK_OAUTH_REDIRECT_URI')!;
    const state = this.jwt.sign({ sub: actor.sub, purpose: 'facebook-connect' }, { expiresIn: OAUTH_STATE_TTL });
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async connectFacebook(code: string, state: string) {
    const connectedById = this.verifyConnectState(state);
    const appId = this.assertFacebookConfigured();
    const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET')!;
    const redirectUri = this.config.get<string>('FACEBOOK_OAUTH_REDIRECT_URI')!;

    const shortLivedToken = await this.exchangeCodeForUserToken(code, appId, appSecret, redirectUri);
    const longLivedToken = await this.exchangeForLongLivedUserToken(shortLivedToken, appId, appSecret);
    const pages = await this.fetchManagedPages(longLivedToken);
    if (pages.length === 0) {
      throw new BadRequestException('This Facebook account does not manage any Pages. Add it as an Admin on the target Page and try again.');
    }

    const connected = await Promise.all(pages.map((page) => this.prisma.socialPlatformAccount.upsert({
      where: { platform_externalAccountId: { platform: SocialPlatform.FACEBOOK, externalAccountId: page.id } },
      update: { displayName: page.name, accessTokenCipher: this.tokenCipher.encrypt(page.access_token), status: SocialPlatformAccountStatus.ACTIVE },
      create: { platform: SocialPlatform.FACEBOOK, externalAccountId: page.id, displayName: page.name, accessTokenCipher: this.tokenCipher.encrypt(page.access_token), connectedById },
    })));

    await this.prisma.auditEvent.create({
      data: { action: 'SOCIAL_PLATFORM_CONNECT', userId: connectedById, entityType: 'SocialPlatformAccount', meta: { platform: 'FACEBOOK', pages: pages.map((p) => ({ id: p.id, name: p.name })) } },
    });
    return connected.map((account) => ({ id: account.id, platform: account.platform, displayName: account.displayName }));
  }

  private verifyConnectState(state: string): string {
    try {
      const payload = this.jwt.verify<{ sub: string; purpose: string }>(state);
      if (payload.purpose !== 'facebook-connect') throw new Error('wrong purpose');
      return payload.sub;
    } catch {
      throw new BadRequestException('This connect link has expired or is invalid — start again from the admin console.');
    }
  }

  async disconnect(id: string, actor: JwtPayload) {
    const account = await this.prisma.socialPlatformAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Connected account not found');
    await this.prisma.socialPlatformAccount.update({ where: { id }, data: { status: SocialPlatformAccountStatus.REVOKED } });
    await this.prisma.auditEvent.create({
      data: { action: 'SOCIAL_PLATFORM_DISCONNECT', userId: actor.sub, entityType: 'SocialPlatformAccount', entityId: id, meta: { platform: account.platform, displayName: account.displayName } },
    });
  }

  async requestPublish(draftId: string, platformAccountId: string, actor: JwtPayload) {
    const draft = await this.prisma.socialPostDraft.findUnique({ where: { id: draftId }, include: { renderedAssets: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!draft) throw new NotFoundException('Social draft not found');
    if (draft.status !== SocialDraftStatus.APPROVED) throw new ConflictException('Only approved cards can be published');
    const asset = draft.renderedAssets[0];
    if (!asset) throw new NotFoundException('Rendered asset not found');

    const platformAccount = await this.prisma.socialPlatformAccount.findUnique({ where: { id: platformAccountId } });
    if (!platformAccount || platformAccount.status !== SocialPlatformAccountStatus.ACTIVE) {
      throw new NotFoundException('Connected platform account not found or inactive');
    }

    const publication = await this.prisma.socialPublication.create({
      data: { draftId, platformAccountId, renderedAssetId: asset.id, requestedById: actor.sub },
    });
    await this.queue.add('publish', { socialPublicationId: publication.id }, { ...PUBLISH_JOB_OPTIONS, jobId: `publish:${publication.id}` });
    await this.prisma.auditEvent.create({
      data: { action: 'SOCIAL_PUBLISH_REQUEST', userId: actor.sub, entityType: 'SocialPostDraft', entityId: draftId, meta: { platformAccountId, publicationId: publication.id } },
    });
    return publication;
  }

  private assertFacebookConfigured(): string {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET');
    const redirectUri = this.config.get<string>('FACEBOOK_OAUTH_REDIRECT_URI');
    if (!appId || !appSecret || !redirectUri || !this.tokenCipher.isConfigured) {
      throw new ServiceUnavailableException(
        'Facebook publishing is not configured. Set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_OAUTH_REDIRECT_URI, and SOCIAL_TOKEN_ENCRYPTION_KEY.',
      );
    }
    return appId;
  }

  private async exchangeCodeForUserToken(code: string, appId: string, appSecret: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code });
    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new BadRequestException(body?.error?.message ?? 'Facebook code exchange failed');
    return body.access_token;
  }

  private async exchangeForLongLivedUserToken(shortLivedToken: string, appId: string, appSecret: string): Promise<string> {
    const params = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortLivedToken });
    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new BadRequestException(body?.error?.message ?? 'Facebook long-lived token exchange failed');
    return body.access_token;
  }

  private async fetchManagedPages(userToken: string): Promise<Array<{ id: string; name: string; access_token: string }>> {
    const response = await fetch(`${GRAPH_API_BASE}/me/accounts?access_token=${encodeURIComponent(userToken)}`);
    const body = await response.json();
    if (!response.ok) throw new BadRequestException(body?.error?.message ?? 'Failed to list managed Facebook Pages');
    return body.data ?? [];
  }
}
