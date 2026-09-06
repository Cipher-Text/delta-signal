/**
 * Authenticated and role-gated flow e2e tests.
 *
 * Logs in as seed dev-users (citizen, researcher, moderator, admin) and
 * verifies that authenticated writes succeed, role-gated endpoints are
 * enforced, and the permission layer rejects the wrong roles.
 *
 * All test-created records (reports, observations) are deleted in afterAll.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp } from '../helpers/app';
import { loginAs, bearer } from '../helpers/auth';

describe('Protected endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let citizenToken: string;
  let researcherToken: string;
  let moderatorToken: string;
  let adminToken: string;

  const createdReportIds: string[] = [];
  const createdObservationIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    [citizenToken, researcherToken, moderatorToken, adminToken] = await Promise.all([
      loginAs(app, 'citizen@deltasignal.org').then((t) => t.accessToken),
      loginAs(app, 'researcher@deltasignal.org').then((t) => t.accessToken),
      loginAs(app, 'moderator@deltasignal.org').then((t) => t.accessToken),
      loginAs(app, 'admin@deltasignal.org').then((t) => t.accessToken),
    ]);
  });

  afterAll(async () => {
    // Remove test-created observations first (no FK from reports to observations).
    if (createdObservationIds.length) {
      await prisma.observationMeasurement.deleteMany({
        where: { observationId: { in: createdObservationIds } },
      });
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: createdObservationIds } },
      });
      await prisma.observation.deleteMany({ where: { id: { in: createdObservationIds } } });
    }

    // Remove test-created reports.
    if (createdReportIds.length) {
      await prisma.reportStatusEvent.deleteMany({
        where: { reportId: { in: createdReportIds } },
      });
      await prisma.reportMedia.deleteMany({ where: { reportId: { in: createdReportIds } } });
      await prisma.reportComment.deleteMany({ where: { reportId: { in: createdReportIds } } });
      await prisma.auditEvent.deleteMany({ where: { entityId: { in: createdReportIds } } });
      await prisma.citizenReport.deleteMany({ where: { id: { in: createdReportIds } } });
    }

    await app.close();
  });

  // ── Profile ──────────────────────────────────────────────────────────────────

  describe('GET /auth/profile', () => {
    it('returns the authenticated caller profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set(bearer(citizenToken))
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'citizen@deltasignal.org',
        role: 'CITIZEN',
        permissions: expect.any(Array),
      });
    });
  });

  // ── Reports ──────────────────────────────────────────────────────────────────

  describe('Reports', () => {
    it('CITIZEN can submit a report', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set(bearer(citizenToken))
        .send({
          title: 'E2E: air quality issue at river bank',
          category: 'AIR_POLLUTION',
          description: 'Thick black smoke from an unregistered source near the waterway.',
          lat: 23.8103,
          lng: 90.4125,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'E2E: air quality issue at river bank',
        category: 'AIR_POLLUTION',
        status: 'SUBMITTED',
        reporter: { id: expect.any(String) },
      });

      createdReportIds.push(res.body.id as string);
    });

    it('GET /reports/mine includes the submitted report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/mine')
        .set(bearer(citizenToken))
        .expect(200);

      const ids = (res.body.data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining(createdReportIds));
    });

    it('invalid payload returns 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set(bearer(citizenToken))
        .send({ title: 'too short', category: 'AIR_POLLUTION' }) // description missing
        .expect(400);
    });

    it('unauthenticated POST → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reports')
        .send({ title: 'No token', category: 'AIR_POLLUTION', description: 'x'.repeat(25) })
        .expect(401);
    });
  });

  // ── Observations ─────────────────────────────────────────────────────────────

  describe('Observations', () => {
    it('CITIZEN can log an observation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/observations')
        .set(bearer(citizenToken))
        .send({
          category: 'BIODIVERSITY',
          description: 'Spotted a Gangetic river dolphin near the confluence — healthy adult.',
          lat: 24.3636,
          lng: 88.6241,
          species: 'Platanista gangetica',
          observedAt: new Date(Date.now() - 3_600_000).toISOString(), // 1 h ago
        })
        .expect(201);

      expect(res.body).toMatchObject({
        category: 'BIODIVERSITY',
        trustLevel: 'UNVERIFIED',
        observer: { id: expect.any(String) },
      });

      createdObservationIds.push(res.body.id as string);
    });

    it('future observedAt is rejected with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/observations')
        .set(bearer(citizenToken))
        .send({
          category: 'WATER_QUALITY',
          description: 'Water sample collected from Buriganga river — pH and turbidity logged.',
          observedAt: new Date(Date.now() + 86_400_000).toISOString(), // tomorrow
        })
        .expect(400);
    });
  });

  // ── Role-gated analytics ──────────────────────────────────────────────────────

  describe('Analytics — role enforcement', () => {
    it('CITIZEN cannot access /analytics/admin → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set(bearer(citizenToken))
        .expect(403);
    });

    it('ADMIN can access /analytics/admin → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/admin')
        .set(bearer(adminToken))
        .expect(200);
    });

    it('MODERATOR can access /analytics/moderator → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/moderator')
        .set(bearer(moderatorToken))
        .expect(200);
    });

    it('ADMIN cannot access /analytics/moderator (exact role check) → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/moderator')
        .set(bearer(adminToken))
        .expect(403);
    });

    it('RESEARCHER can access /analytics/researcher → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/researcher')
        .set(bearer(researcherToken))
        .expect(200);
    });

    it('unauthenticated request → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/analytics/admin').expect(401);
    });
  });

  // ── Permission-gated endpoints ────────────────────────────────────────────────

  describe('Permission guard', () => {
    it('CITIZEN is denied report moderation (reports.moderate) → 403', async () => {
      // Need a real report ID; use the one created above (or a dummy — the
      // permission check runs before the service layer, so any ID triggers 403).
      const reportId = createdReportIds[0] ?? 'nonexistent-id';

      await request(app.getHttpServer())
        .patch(`/api/v1/reports/${reportId}/status`)
        .set(bearer(citizenToken))
        .send({ status: 'UNDER_REVIEW' })
        .expect(403);
    });
  });
});
