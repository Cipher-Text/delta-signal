import { IsIn } from 'class-validator';
import type { OrganizationMemberRole } from '@delta-signal/shared';

export class UpdateMembershipDto {
  @IsIn(['ADMIN', 'MEMBER'])
  role!: OrganizationMemberRole;
}
