import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { hashRefreshToken } from './refresh-token.util';
import type { PrismaService } from '../database/prisma.service';
import type { PermissionsService } from '../permissions/permissions.service';
import type { GamificationService } from '../gamification/gamification.service';
import type { EmailService } from '../notifications/email.service';
import type { StorageService } from '../media/storage.service';

/** In-memory Prisma double — only the calls AuthService makes. */
function mockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    auditEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    userProfile: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    userSocialLink: {
      deleteMany: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
    },
    organizationMembership: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function build() {
  const prisma = mockPrisma();
  const jwt = { sign: jest.fn().mockReturnValue('signed.access.token') };
  // Minimal stubs for the two injected-but-not-called-in-these-tests services.
  const permissions = {
    getPermissionsForRole: jest.fn().mockResolvedValue([]),
  } as unknown as PermissionsService;
  const gamification = {
    evaluateBadges: jest.fn().mockResolvedValue(undefined),
  } as unknown as GamificationService;
  const email = {
    queuePasswordReset: jest.fn().mockResolvedValue(undefined),
    queueVerification: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
  const storage = {} as StorageService;
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    permissions,
    gamification,
    email,
    config,
    storage,
  );
  return { service, prisma, jwt };
}

const REGISTER = { email: 'a@b.c', displayName: 'A B', password: 'TestPass123!' };
const CREATED = { id: 'u1', email: 'a@b.c', displayName: 'A B', role: 'CITIZEN' as const };

describe('AuthService', () => {
  describe('register', () => {
    it('rejects an email that already exists', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(REGISTER)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('stores a bcrypt hash, never the raw password', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(CREATED);

      await service.register(REGISTER);

      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(stored).not.toBe(REGISTER.password);
      expect(stored).toMatch(/^\$2[aby]\$/);
      await expect(bcrypt.compare(REGISTER.password, stored)).resolves.toBe(true);
    });

    it('issues an access token and an opaque refresh token', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(CREATED);

      const result = await service.register(REGISTER);

      expect(result.accessToken).toBe('signed.access.token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{96}$/);
      expect(result.refreshToken).not.toContain('.');
    });

    it('persists only the hash of the refresh token', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(CREATED);

      const { refreshToken } = await service.register(REGISTER);

      const row = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(row.tokenHash).toBe(hashRefreshToken(refreshToken));
      expect(JSON.stringify(row)).not.toContain(refreshToken);
    });

    it('writes a USER_REGISTER audit event with the caller IP', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(CREATED);

      await service.register(REGISTER, { ipAddress: '203.0.113.7' });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: {
          action: 'USER_REGISTER',
          userId: 'u1',
          entityType: 'User',
          entityId: 'u1',
          ipAddress: '203.0.113.7',
        },
      });
    });
  });

  describe('login', () => {
    const stored = async () => ({
      ...CREATED,
      isActive: true,
      passwordHash: await bcrypt.hash(REGISTER.password, 4),
    });

    it('rejects an unknown email', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'x@y.z', password: 'p' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(await stored());

      await expect(
        service.login({ email: REGISTER.email, password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated user even with the correct password', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({ ...(await stored()), isActive: false });

      await expect(
        service.login({ email: REGISTER.email, password: REGISTER.password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Failed logins are audited as of 2026-08-21 so brute-force attempts leave
    // a trail. The HTTP response stays a generic 401 in both branches — only
    // the audit meta distinguishes an unknown email from a bad password.
    it('audits a wrong password against the known user', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(await stored());

      await expect(
        service.login({ email: REGISTER.email, password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: {
          action: 'USER_LOGIN_FAILED',
          userId: 'u1',
          entityType: 'User',
          entityId: 'u1',
          meta: { email: REGISTER.email, reason: 'bad_password_or_inactive' },
          ipAddress: undefined,
        },
      });
    });

    it('audits an unknown email with no user attribution', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@nowhere.test', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: {
          action: 'USER_LOGIN_FAILED',
          userId: null,
          entityType: 'User',
          entityId: null,
          meta: { email: 'ghost@nowhere.test', reason: 'unknown_email' },
          ipAddress: undefined,
        },
      });
    });

    it('audits a deactivated user as a failed login', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({ ...(await stored()), isActive: false });

      await expect(
        service.login({ email: REGISTER.email, password: REGISTER.password }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'USER_LOGIN_FAILED', userId: 'u1' }),
        }),
      );
    });

    it('records the caller IP on a failed attempt', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@nowhere.test', password: 'x' }, { ipAddress: '198.51.100.9' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: '198.51.100.9' }),
        }),
      );
    });

    it('does not write USER_LOGIN on a failed attempt', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(await stored());

      await expect(
        service.login({ email: REGISTER.email, password: 'WrongPass1!' }),
      ).rejects.toThrow();

      const actions = prisma.auditEvent.create.mock.calls.map((c) => c[0].data.action);
      expect(actions).not.toContain('USER_LOGIN');
      expect(actions).toEqual(['USER_LOGIN_FAILED']);
    });

    it('signs the token with the role from the database, not the request', async () => {
      const { service, prisma, jwt } = build();
      prisma.user.findUnique.mockResolvedValue({ ...(await stored()), role: 'MODERATOR' });

      await service.login({ email: REGISTER.email, password: REGISTER.password });

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'u1', email: REGISTER.email, role: 'MODERATOR' },
        { expiresIn: '15m' },
      );
    });

    it('records lastLoginAt and a USER_LOGIN audit event', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(await stored());

      await service.login({ email: REGISTER.email, password: REGISTER.password });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'USER_LOGIN' }) }),
      );
    });
  });

  describe('refresh', () => {
    it('rejects an unknown token', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('nope')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an already-revoked token', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('used')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.refresh('stale')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token belonging to a deactivated user', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({ ...CREATED, isActive: false });

      await expect(service.refresh('valid')).rejects.toThrow(UnauthorizedException);
    });

    // A second, concurrent replay of the same token must lose the race: the
    // conditional updateMany only ever flips revokedAt for one caller.
    it('rejects a concurrent replay of the same token (count 0)', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh('raced-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    // Rotation is what limits the damage from a stolen refresh token: the old
    // row is revoked the moment the legitimate client refreshes.
    it('revokes the old token and issues a different one', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({ ...CREATED, isActive: true });

      const result = await service.refresh('old-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: hashRefreshToken('old-token'),
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.refreshToken).not.toBe('old-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{96}$/);
    });
  });

  describe('logout', () => {
    it('revokes only the matching, still-live token', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashRefreshToken('raw-token'), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('audits a real revocation once', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('raw-token');

      expect(prisma.auditEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'USER_LOGOUT', userId: 'u1' }),
        }),
      );
    });

    // The endpoint is idempotent by design: a repeat logout still returns
    // success, but must not log a second event.
    it('succeeds without auditing when the token was already revoked', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('raw-token')).resolves.toBeUndefined();
      expect(prisma.auditEvent.create).not.toHaveBeenCalled();
    });

    it('succeeds without auditing for a token that never existed', async () => {
      const { service, prisma } = build();
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('garbage')).resolves.toBeUndefined();
      expect(prisma.auditEvent.create).not.toHaveBeenCalled();
    });
  });
});
