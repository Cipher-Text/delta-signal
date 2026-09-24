import { IsIn } from 'class-validator';
import type { UserRole } from '@delta-signal/shared';

const ASSIGNABLE_ROLES: UserRole[] = [
  'CITIZEN',
  'ORGANIZATION_ADMIN',
  'GOVERNMENT',
  'MODERATOR',
];

export class UpdateRoleDto {
  @IsIn(ASSIGNABLE_ROLES, { message: 'Invalid or non-assignable role' })
  role!: UserRole;
}
