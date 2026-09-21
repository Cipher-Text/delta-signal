/**
 * Auth flow e2e tests.
 *
 * Registers a unique test user per run, exercises the full register → login →
 * profile → refresh → logout cycle, then cleans up the created user in afterAll.
 * Seed dev-users (citizen@, admin@, …) are unaffected.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp } from '../helpers/app';

describe('Auth flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Unique per test run so parallel runs don't collide.
  const testEmail = `e2e.auth.${Date.now()}@test.deltasignal.org`;
  const testPassword = 'E2eTestPassword123!';
  const testDisplayName = 'E2E Auth User';

  let registeredUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Best-effort cleanup — delete the test user and every record that FK-references it.
    if (registeredUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: registeredUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: registeredUserId } });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: registeredUserId } });
      await prisma.auditEvent.deleteMany({ where: { userId: registeredUserId } });
      await prisma.userProfile.deleteMany({ where: { userId: registeredUserId } });
      await prisma.user.delete({ where: { id: registeredUserId } }).catch(() => {
        // Ignore if already deleted.
      });
    }
    if (app) {
      await app.close();
    }
  });

  // ── Registration ─────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('creates a new CITIZEN user and returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: testEmail, displayName: testDisplayName, password: testPassword })
        .expect(201);

      expect(res.body).toMatchObject({
        user: {
          email: testEmail.toLowerCase(),
          displayName: testDisplayName,
          role: 'CITIZEN',
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      registeredUserId = res.body.user.id as string;
    });

    it('returns 409 when the email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: testEmail, displayName: 'Another', password: testPassword })
        .expect(409);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: testEmail })
        .expect(400);
    });

    it('returns 400 when the password is too short', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: `other.${Date.now()}@test.com`, displayName: 'Test', password: 'short' })
        .expect(400);
    });
  });

  // ── Login ────────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toMatchObject({
        user: { email: testEmail.toLowerCase(), role: 'CITIZEN' },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      accessToken = res.body.accessToken as string;
      refreshToken = res.body.refreshToken as string;
    });

    it('returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword999!' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: testPassword })
        .expect(401);
    });
  });

  // ── Profile ──────────────────────────────────────────────────────────────────

  describe('GET /auth/profile', () => {
    it('returns the caller profile with a valid JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: registeredUserId,
        email: testEmail.toLowerCase(),
        role: 'CITIZEN',
      });
    });

    it('returns 401 with no token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
    });

    it('returns 401 with a malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });
  });

  // ── Token rotation ───────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('issues new tokens and invalidates the old refresh token', async () => {
      const oldRefreshToken = refreshToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      accessToken = res.body.accessToken as string;
      refreshToken = res.body.refreshToken as string;

      // Old refresh token is revoked — a second use must fail.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  // ── Logout ───────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('revokes the refresh token so it cannot be reused', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200)
        .then((res) => {
          expect(res.body.success).toBe(true);
        });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('is idempotent — succeeds even with an already-revoked token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'stale-or-nonexistent-token' })
        .expect(200);
    });
  });
});
