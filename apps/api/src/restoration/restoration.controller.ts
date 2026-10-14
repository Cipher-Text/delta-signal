import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProjectStatus, RestorationCategory } from '@prisma/client';
import { RestorationService } from './restoration.service';
import { CreateRestorationProjectDto } from './dto/create-restoration-project.dto';
import { UpdateRestorationProjectDto } from './dto/update-restoration-project.dto';
import { CreateProjectTargetDto } from './dto/create-project-target.dto';
import { CreateProjectActivityDto } from './dto/create-project-activity.dto';
import { CreateProjectMetricDto } from './dto/create-project-metric.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('restoration/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestorationController {
  constructor(private readonly restorationService: RestorationService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('districtId') districtId?: string,
    @Query('upazilaId') upazilaId?: string,
    @Query('unionId') unionId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.restorationService.list(
      category as RestorationCategory | undefined,
      status as ProjectStatus | undefined,
      districtId,
      upazilaId,
      unionId,
      Number(page ?? 1),
      Number(pageSize ?? 20),
      user?.sub,
    );
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.restorationService.getById(id);
  }

  @Permissions('restoration.create')
  @Post()
  create(@Body() dto: CreateRestorationProjectDto, @CurrentUser() user: JwtPayload) {
    return this.restorationService.create(dto, user);
  }

  @Permissions('restoration.create')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestorationProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restorationService.update(id, dto, user);
  }

  @Permissions('restoration.join')
  @Post(':id/join')
  join(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.restorationService.join(id, user);
  }

  // ─── Targets ─────────────────────────────────────────────────────────────────

  @Public()
  @Get(':id/targets')
  listTargets(@Param('id') id: string) {
    return this.restorationService.listTargets(id);
  }

  @Permissions('restoration.create')
  @Post(':id/targets')
  addTarget(
    @Param('id') id: string,
    @Body() dto: CreateProjectTargetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restorationService.addTarget(id, dto, user);
  }

  // ─── Activities ───────────────────────────────────────────────────────────────

  @Public()
  @Get(':id/activities')
  listActivities(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.restorationService.listActivities(id, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Permissions('restoration.join')
  @Post(':id/activities')
  addActivity(
    @Param('id') id: string,
    @Body() dto: CreateProjectActivityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restorationService.addActivity(id, dto, user);
  }

  // ─── Metrics ──────────────────────────────────────────────────────────────────

  @Public()
  @Get(':id/targets/:targetId/metrics')
  listMetrics(@Param('id') id: string, @Param('targetId') targetId: string) {
    return this.restorationService.listMetrics(id, targetId);
  }

  @Permissions('restoration.create')
  @Post(':id/targets/:targetId/metrics')
  addMetric(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
    @Body() dto: CreateProjectMetricDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restorationService.addMetric(id, targetId, dto, user);
  }
}
