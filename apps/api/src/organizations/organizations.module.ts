import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationManagementController } from './organization-management.controller';

@Module({
  imports: [MediaModule],
  controllers: [OrganizationsController, OrganizationManagementController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
