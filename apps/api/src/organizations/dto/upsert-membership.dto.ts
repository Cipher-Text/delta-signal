import { IsIn, IsString } from 'class-validator';
import type { OrganizationMemberRole } from '@delta-signal/shared';

export class UpsertMembershipDto {
  @IsString()
  userId!: string;

  @IsIn(['ADMIN', 'MEMBER'])
  role!: OrganizationMemberRole;
}
