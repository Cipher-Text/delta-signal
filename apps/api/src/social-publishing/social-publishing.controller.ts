import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PublishDraftDto } from './dto/publish-draft.dto';
import { SocialPublishingService } from './social-publishing.service';

@Controller('social-content/platforms')
export class SocialPublishingController {
  constructor(
    private readonly service: SocialPublishingService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Permissions('social_content.manage')
  list() {
    return this.service.list();
  }

  @Get('facebook/connect')
  @Permissions('social_content.manage')
  connect(@CurrentUser() actor: JwtPayload) {
    return { authorizeUrl: this.service.buildFacebookAuthorizeUrl(actor) };
  }

  /**
   * Facebook redirects the browser here after consent — no Authorization
   * header is present on this request, so `state` (signed in `connect()`
   * above) is what proves an authorized admin started this flow.
   */
  @Public()
  @Get('facebook/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const adminUrl = this.config.get<string>('ADMIN_APP_URL') ?? 'http://localhost:3002';
    try {
      await this.service.connectFacebook(code, state);
      return res.redirect(`${adminUrl}/social-content?connected=facebook`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facebook connect failed';
      return res.redirect(`${adminUrl}/social-content?error=${encodeURIComponent(message)}`);
    }
  }

  @Delete(':id')
  @Permissions('social_content.manage')
  disconnect(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.service.disconnect(id, actor);
  }
}

/**
 * Separate controller (same module) so this lands at
 * `social-content/drafts/:draftId/publish`, alongside the existing
 * `SocialContentController`'s draft routes, instead of nesting under
 * `social-content/platforms`.
 */
@Controller('social-content/drafts')
export class SocialDraftPublishController {
  constructor(private readonly service: SocialPublishingService) {}

  @Post(':draftId/publish')
  @Permissions('social_content.publish')
  publish(@Param('draftId') draftId: string, @Body() dto: PublishDraftDto, @CurrentUser() actor: JwtPayload) {
    return this.service.requestPublish(draftId, dto.platformAccountId, actor);
  }
}
