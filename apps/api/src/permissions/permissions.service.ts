import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface CacheEntry {
  keys: string[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

const ALL_PERMISSIONS: { key: string; description: string }[] = [
  { key: 'reports.create',      description: 'Submit citizen reports' },
  { key: 'reports.moderate',    description: 'Verify, reject, and resolve citizen reports' },
  { key: 'alerts.manage',       description: 'Create, update, and cancel environmental alerts' },
  { key: 'restoration.create',  description: 'Register restoration projects' },
  { key: 'restoration.join',    description: 'Join restoration projects as a participant' },
  { key: 'observations.create', description: 'Log wildlife and environmental observations' },
  { key: 'observations.verify', description: 'Change trust level on observations' },
  { key: 'observations.delete', description: 'Permanently delete observations' },
  { key: 'organizations.access', description: 'View own organization memberships' },
  { key: 'organizations.manage', description: 'Full organization CRUD in admin console' },
  { key: 'users.manage',        description: 'Manage user roles and deactivate accounts' },
];

// Default grants seeded on first boot. ADMIN is excluded from the DB rows —
// the guard always bypasses the check for ADMIN regardless of DB state.
const DEFAULT_GRANTS: { role: string; key: string }[] = [
  { role: 'CITIZEN',            key: 'reports.create' },
  { role: 'CITIZEN',            key: 'restoration.join' },
  { role: 'CITIZEN',            key: 'observations.create' },
  { role: 'RESEARCHER',         key: 'reports.create' },
  { role: 'RESEARCHER',         key: 'restoration.join' },
  { role: 'RESEARCHER',         key: 'observations.create' },
  { role: 'RESEARCHER',         key: 'observations.verify' },
  { role: 'ORGANIZATION_ADMIN', key: 'reports.create' },
  { role: 'ORGANIZATION_ADMIN', key: 'restoration.create' },
  { role: 'ORGANIZATION_ADMIN', key: 'restoration.join' },
  { role: 'ORGANIZATION_ADMIN', key: 'observations.create' },
  { role: 'ORGANIZATION_ADMIN', key: 'organizations.access' },
  { role: 'GOVERNMENT',         key: 'reports.create' },
  { role: 'GOVERNMENT',         key: 'alerts.manage' },
  { role: 'GOVERNMENT',         key: 'restoration.join' },
  { role: 'GOVERNMENT',         key: 'observations.create' },
  { role: 'MODERATOR',          key: 'reports.create' },
  { role: 'MODERATOR',          key: 'reports.moderate' },
  { role: 'MODERATOR',          key: 'alerts.manage' },
  { role: 'MODERATOR',          key: 'restoration.join' },
  { role: 'MODERATOR',          key: 'observations.delete' },
];

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Upsert all permission definitions (idempotent — safe to run on every boot).
    for (const p of ALL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: p.key },
        create: p,
        update: { description: p.description },
      });
    }

    // Seed default role grants. Only inserts rows that don't already exist.
    for (const { role, key } of DEFAULT_GRANTS) {
      const permission = await this.prisma.permission.findUnique({ where: { key } });
      if (!permission) continue;
      await this.prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as UserRole, permissionId: permission.id } },
        create: { role: role as UserRole, permissionId: permission.id },
        update: {},
      });
    }
  }

  /** Returns the permission keys granted to a role. Results are cached for 5 minutes.
   *  ADMIN always receives every known permission key — mirroring the guard bypass. */
  async getPermissionsForRole(role: string): Promise<string[]> {
    if (role === 'ADMIN') {
      return ALL_PERMISSIONS.map((p) => p.key);
    }

    const cached = this.cache.get(role);
    if (cached && cached.expiresAt > Date.now()) return cached.keys;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role: role as UserRole },
      select: { permission: { select: { key: true } } },
    });
    const keys = rows.map((r) => r.permission.key);
    this.cache.set(role, { keys, expiresAt: Date.now() + CACHE_TTL_MS });
    return keys;
  }

  /** Returns every permission with the roles currently assigned to it — for the admin matrix. */
  async getAllWithAssignments() {
    const permissions = await this.prisma.permission.findMany({
      include: { rolePermissions: { select: { role: true } } },
      orderBy: { key: 'asc' },
    });
    return permissions.map((p) => ({
      id: p.id,
      key: p.key,
      description: p.description,
      roles: p.rolePermissions.map((rp) => rp.role as string),
    }));
  }

  /** Grants a permission to a role; clears the cache entry for that role. */
  async grant(role: string, permissionId: string, actorId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.rolePermission.upsert({
      where: { role_permissionId: { role: role as UserRole, permissionId } },
      create: { role: role as UserRole, permissionId },
      update: {},
    });
    await this.prisma.auditEvent.create({
      data: {
        action: 'PERMISSION_GRANT',
        userId: actorId,
        entityType: 'Permission',
        entityId: permissionId,
        meta: { role, permissionKey: permission.key },
      },
    });
    this.cache.delete(role);
  }

  /** Revokes a permission from a role; clears the cache entry for that role. */
  async revoke(role: string, permissionId: string, actorId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.rolePermission.deleteMany({
      where: { role: role as UserRole, permissionId },
    });
    await this.prisma.auditEvent.create({
      data: {
        action: 'PERMISSION_REVOKE',
        userId: actorId,
        entityType: 'Permission',
        entityId: permissionId,
        meta: { role, permissionKey: permission.key },
      },
    });
    this.cache.delete(role);
  }
}
