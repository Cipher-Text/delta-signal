import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AlertStatus, AlertSeverity, AlertType } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';

/** Parse an optional query value as a Prisma enum member; 400 instead of a 500 from Prisma. */
function parseEnum<T extends Record<string, string>>(name: string, values: T, raw?: string): T[keyof T] | undefined {
  if (!raw) return undefined;
  if (!Object.values(values).includes(raw)) {
    throw new BadRequestException(`Invalid ${name}: ${raw}`);
  }
  return raw as T[keyof T];
}

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Public()
  @Get()
  list(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('alertType') alertType?: string,
    @Query('districtId') districtId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.alertsService.list(
      parseEnum('status', AlertStatus, status),
      parseEnum('severity', AlertSeverity, severity),
      parseEnum('alertType', AlertType, alertType),
      districtId,
      Number(page ?? 1),
      Number(pageSize ?? 20),
    );
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.alertsService.getById(id);
  }

  @Permissions('alerts.manage')
  @Post()
  create(@Body() dto: CreateAlertDto, @CurrentUser() user: JwtPayload) {
    return this.alertsService.create(dto, user);
  }

  @Permissions('alerts.manage')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.update(id, dto, user);
  }
}
