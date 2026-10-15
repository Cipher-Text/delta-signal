import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AddPhotoDto } from './dto/add-photo.dto';
import { ReplaceLinksDto } from './dto/replace-links.dto';
import { UpdateOwnOrganizationDto } from './dto/update-own-organization.dto';
import { orgImageUpload } from './organization-upload';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  private parseType(type?: string): OrganizationType | undefined {
    if (!type) return undefined;
    if (!Object.values(OrganizationType).includes(type as OrganizationType)) {
      throw new BadRequestException('Invalid organization type');
    }
    return type as OrganizationType;
  }

  /** Public: only the total count, optionally filtered by type. */
  @Public()
  @Get('count')
  count(@Query('type') type?: string) {
    return this.organizationsService.count(this.parseType(type));
  }

  /** Public directory; membership details remain authenticated elsewhere. */
  @Public()
  @Get()
  list(@Query('type') type?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.organizationsService.list(
      this.parseType(type),
      Number(page ?? 1),
      Number(pageSize ?? 20),
    );
  }

  /** Organizations the signed-in user administers. */
  @Get('mine')
  mine(@CurrentUser() actor: JwtPayload) {
    return this.organizationsService.mine(actor);
  }

  /** Public: single org detail. Member names are only included when the caller is signed in. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() actor?: JwtPayload) {
    return this.organizationsService.getById(id, Boolean(actor));
  }

  // ─── Self-service profile editing (organization ADMIN members and platform admins) ───

  @Patch(':id')
  async updateOwn(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateOwnOrganizationDto) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.update(actor, id, dto);
  }

  @Post(':id/logo')
  @UseInterceptors(orgImageUpload())
  async setLogo(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.setLogo(actor, id, file);
  }

  @Delete(':id/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLogo(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.removeLogo(actor, id);
  }

  @Post(':id/photos')
  @UseInterceptors(orgImageUpload())
  async addPhoto(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AddPhotoDto, @UploadedFile() file?: Express.Multer.File) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.addPhoto(actor, id, file, dto.caption);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhoto(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Param('photoId') photoId: string) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.removePhoto(actor, id, photoId);
  }

  @Put(':id/links')
  async replaceLinks(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: ReplaceLinksDto) {
    await this.organizationsService.assertCanEdit(actor, id);
    return this.organizationsService.replaceLinks(actor, id, dto.links);
  }
}
