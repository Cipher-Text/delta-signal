import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ToggleAutopostDto, UpdateAutopostDto } from './dto/autopost.dto';
import { SocialAutopostService } from './social-autopost.service';

/** Automatic posting publishes to a live public Page, so every route needs the administrator-only publish permission. */
@Controller('social-content/autopost')
@Permissions('social_content.publish')
export class SocialAutopostController {
  constructor(private readonly service: SocialAutopostService) {}

  @Get('config')
  config() { return this.service.getConfig(); }

  @Put('config')
  update(@CurrentUser() actor: JwtPayload, @Body() dto: UpdateAutopostDto) { return this.service.updateConfig(actor, dto); }

  @Post('toggle')
  toggle(@CurrentUser() actor: JwtPayload, @Body() dto: ToggleAutopostDto) { return this.service.setEnabled(actor, dto); }

  @Get('preview')
  preview(@Query('day') day: string, @Query('position') position?: string) { return this.service.preview(Number(day), position === undefined ? 0 : Number(position)); }
}
