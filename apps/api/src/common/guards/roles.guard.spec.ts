import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@delta-signal/shared';
import { RolesGuard } from './roles.guard';

/** Minimal ExecutionContext double — the guard only touches these members. */
function contextWith(user: unknown): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles: UserRole[] | undefined) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  describe('routes with no @Roles metadata', () => {
    it('allows through when metadata is absent', () => {
      expect(guardRequiring(undefined).canActivate(contextWith({ role: 'CITIZEN' }))).toBe(true);
    });

    it('allows through when @Roles() was called with no arguments', () => {
      expect(guardRequiring([]).canActivate(contextWith({ role: 'CITIZEN' }))).toBe(true);
    });
  });

  describe('role matching', () => {
    it('allows a user whose role is the required one', () => {
      const guard = guardRequiring(['ADMIN']);
      expect(guard.canActivate(contextWith({ role: 'ADMIN' }))).toBe(true);
    });

    it('allows a user whose role is one of several accepted', () => {
      const guard = guardRequiring(['GOVERNMENT', 'MODERATOR', 'ADMIN']);
      expect(guard.canActivate(contextWith({ role: 'MODERATOR' }))).toBe(true);
    });

    it('rejects a user whose role is not accepted', () => {
      const guard = guardRequiring(['ADMIN']);
      expect(() => guard.canActivate(contextWith({ role: 'CITIZEN' }))).toThrow(ForbiddenException);
    });

    it('rejects an unauthenticated request', () => {
      const guard = guardRequiring(['ADMIN']);
      expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
    });
  });

  // Regression: role comparison is case-sensitive, and the guard is fed
  // `request.user.role`, which comes straight from the Prisma `UserRole` enum
  // (always uppercase). A lowercase value anywhere in the chain — a hand-written
  // @Roles('admin'), or a JWT minted with a lowercase role — silently matches
  // nothing. That shipped once and rejected every user including admins.
  // See docs/progress.md "Critical RBAC Fix".
  describe('case sensitivity (regression)', () => {
    it('does not let a lowercase user role satisfy an uppercase requirement', () => {
      const guard = guardRequiring(['ADMIN']);
      expect(() => guard.canActivate(contextWith({ role: 'admin' }))).toThrow(ForbiddenException);
    });

    it('does not let an uppercase user role satisfy a lowercase requirement', () => {
      const guard = guardRequiring(['admin' as UserRole]);
      expect(() => guard.canActivate(contextWith({ role: 'ADMIN' }))).toThrow(ForbiddenException);
    });

    it('rejects every real Prisma role against a lowercase requirement', () => {
      const guard = guardRequiring(['admin' as UserRole]);
      const prismaRoles = [
        'CITIZEN',
        'RESEARCHER',
        'ORGANIZATION_ADMIN',
        'GOVERNMENT',
        'MODERATOR',
        'ADMIN',
      ];
      for (const role of prismaRoles) {
        expect(() => guard.canActivate(contextWith({ role }))).toThrow(ForbiddenException);
      }
    });
  });
});
