import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { OrganizationMemberRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpsertMembershipDto } from './dto/upsert-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AddPhotoDto } from './dto/add-photo.dto';
import { ReplaceLinksDto } from './dto/replace-links.dto';
import { orgImageUpload } from './organization-upload';

@Controller('admin/organizations')
@Permissions('organizations.manage')
export class OrganizationManagementController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('users')
  users() {
    return this.organizationsService.manageUsers();
  }

  @Get()
  list() {
    return this.organizationsService.manageList();
  }

  @Post()
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(actor, dto);
  }

  @Patch(':id')
  update(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.organizationsService.delete(actor, id);
  }

  @Post(':id/members')
  addMember(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpsertMembershipDto) {
    return this.organizationsService.upsertMembership(actor, id, dto);
  }

  @Patch(':id/members/:userId')
  updateMember(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.organizationsService.upsertMembership(actor, id, {
      userId,
      role: dto.role as OrganizationMemberRole,
    });
  }

  @Delete(':id/members/:userId')
  removeMember(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Param('userId') userId: string) {
    return this.organizationsService.removeMembership(actor, id, userId);
  }

  @Post(':id/logo')
  @UseInterceptors(orgImageUpload())
  setLogo(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.organizationsService.setLogo(actor, id, file);
  }

  @Delete(':id/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLogo(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.organizationsService.removeLogo(actor, id);
  }

  @Post(':id/photos')
  @UseInterceptors(orgImageUpload())
  addPhoto(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AddPhotoDto, @UploadedFile() file?: Express.Multer.File) {
    return this.organizationsService.addPhoto(actor, id, file, dto.caption);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Param('photoId') photoId: string) {
    return this.organizationsService.removePhoto(actor, id, photoId);
  }

  @Put(':id/links')
  replaceLinks(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: ReplaceLinksDto) {
    return this.organizationsService.replaceLinks(actor, id, dto.links);
  }
}
