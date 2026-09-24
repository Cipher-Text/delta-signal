import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ResearcherApplicationsService } from './researcher-applications.service';
import { ReviewResearcherApplicationDto } from './dto/review-researcher-application.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly researcherApplications: ResearcherApplicationsService) {}

  @Get('researcher-applications')
  listResearcherApplications(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.researcherApplications.list(Number(page ?? 1), Number(pageSize ?? 20), status);
  }

  @Patch('researcher-applications/:id/review')
  reviewResearcherApplication(
    @Param('id') id: string,
    @Body() dto: ReviewResearcherApplicationDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.researcherApplications.review(id, dto, actor);
  }

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.usersService.list(Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get('audit-events')
  listAuditEvents(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.usersService.listAuditEvents(
      Number(page ?? 1),
      Number(pageSize ?? 50),
      { action, userId, entityType },
    );
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.updateRole(id, dto.role as UserRole, actor);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.usersService.deactivate(id, actor);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.usersService.reactivate(id, actor);
  }
}
