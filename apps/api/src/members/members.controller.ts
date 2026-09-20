import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  private parseRole(role?: string): UserRole | undefined {
    if (!role) return undefined;
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException('Invalid role');
    }
    return role as UserRole;
  }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: string,
    @Query('district') district?: string,
    @Query('search') search?: string,
  ) {
    return this.membersService.list(Number(page ?? 1), Number(pageSize ?? 20), {
      role: this.parseRole(role),
      district,
      search,
    });
  }

  @Get('districts')
  listDistricts() {
    return this.membersService.listDistricts();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.membersService.getById(id);
  }
}
