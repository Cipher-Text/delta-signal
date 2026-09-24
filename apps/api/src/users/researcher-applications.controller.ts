import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResearcherApplicationsService } from './researcher-applications.service';

@Controller('researcher-applications')
@UseGuards(JwtAuthGuard)
export class ResearcherApplicationsController {
  constructor(private readonly applications: ResearcherApplicationsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: JwtPayload) {
    return this.applications.getMine(user.sub);
  }

  @Post()
  submit(@CurrentUser() user: JwtPayload) {
    return this.applications.submit(user);
  }
}
