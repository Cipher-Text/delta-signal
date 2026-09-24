import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ResearcherApplicationsController } from './researcher-applications.controller';
import { ResearcherApplicationsService } from './researcher-applications.service';

@Module({
  controllers: [UsersController, ResearcherApplicationsController],
  providers: [UsersService, ResearcherApplicationsService],
  exports: [UsersService, ResearcherApplicationsService],
})
export class UsersModule {}
