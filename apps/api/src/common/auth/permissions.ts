import type { Permission, UserRole } from '@delta-signal/shared';

const ROLE_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
  ADMIN: ['organizations.manage'],
};

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as UserRole] ?? [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
