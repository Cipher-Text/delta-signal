import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SocialDraftStatus } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateSocialDraftDto } from './dto/create-social-draft.dto';
import { MarkPublishedDto } from './dto/mark-published.dto';
import { UpdateSocialDraftDto } from './dto/update-social-draft.dto';
import { SocialContentService } from './social-content.service';

@Controller('social-content')
export class SocialContentController {
  constructor(private readonly service: SocialContentService) {}

  @Get('drafts')
  @Permissions('social_content.create')
  list(@Query('status') status?: string) { return this.service.list(status as SocialDraftStatus | undefined); }

  @Get('drafts/:id')
  @Permissions('social_content.create')
  get(@Param('id') id: string) { return this.service.getById(id); }

  @Post('drafts')
  @Permissions('social_content.create')
  create(@Body() dto: CreateSocialDraftDto, @CurrentUser() actor: JwtPayload) { return this.service.create(dto, actor); }

  @Patch('drafts/:id')
  @Permissions('social_content.edit')
  update(@Param('id') id: string, @Body() dto: UpdateSocialDraftDto, @CurrentUser() actor: JwtPayload) { return this.service.update(id, dto, actor); }

  @Post('drafts/:id/render')
  @Permissions('social_content.render')
  render(@Param('id') id: string, @CurrentUser() actor: JwtPayload) { return this.service.render(id, actor); }

  @Post('drafts/:id/approve')
  @Permissions('social_content.approve')
  approve(@Param('id') id: string, @CurrentUser() actor: JwtPayload) { return this.service.approve(id, actor); }

  @Post('drafts/:id/archive')
  @Permissions('social_content.edit')
  archive(@Param('id') id: string, @CurrentUser() actor: JwtPayload) { return this.service.archive(id, actor); }

  @Post('drafts/:id/mark-published')
  @Permissions('social_content.approve')
  markPublished(@Param('id') id: string, @Body() dto: MarkPublishedDto, @CurrentUser() actor: JwtPayload) { return this.service.markPublished(id, dto, actor); }

  @Get('drafts/:id/download')
  @Permissions('social_content.download')
  download(@Param('id') id: string, @CurrentUser() actor: JwtPayload) { return this.service.download(id, actor); }
}
