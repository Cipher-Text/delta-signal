/**
 * Public endpoint e2e tests — every request in this file is unauthenticated.
 * Verifies that public routes are accessible and return the expected shapes,
 * and that protected routes correctly reject unauthenticated requests.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/app';

describe('Public endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ── Health ───────────────────────────────────────────────────────────────────

  it('GET /health → 200', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  // ── Locations ────────────────────────────────────────────────────────────────

  describe('Locations', () => {
    it('GET /locations/divisions returns all 8 divisions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/divisions')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(8);
      expect(res.body[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    });

    it('GET /locations/districts returns all 64 districts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/districts')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(64);
    });

    it('GET /locations/districts?divisionId filters by division', async () => {
      // Fetch a real division ID first.
      const divRes = await request(app.getHttpServer())
        .get('/api/v1/locations/divisions')
        .expect(200);
      const divisionId = divRes.body[0].id as string;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/locations/districts?divisionId=${divisionId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.length).toBeLessThan(64);
    });

    it('GET /locations/upazilas returns upazilas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/upazilas')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── Reports ──────────────────────────────────────────────────────────────────

  describe('Reports', () => {
    it('GET /reports returns a paginated response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports').expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
      });
    });

    it('GET /reports/nearby returns a paginated response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/nearby?lat=23.8103&lng=90.4125&radiusKm=50')
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  // ── Alerts ───────────────────────────────────────────────────────────────────

  describe('Alerts', () => {
    it('GET /alerts returns a paginated response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/alerts').expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  // ── Observations ─────────────────────────────────────────────────────────────

  describe('Observations', () => {
    it('GET /observations returns a paginated response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/observations').expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  // ── Biodiversity ─────────────────────────────────────────────────────────────

  describe('Biodiversity', () => {
    it('GET /biodiversity/species returns a response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/biodiversity/species')
        .expect(200);

      // May be empty on a fresh DB — just check the shape.
      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  // ── Datasets ─────────────────────────────────────────────────────────────────

  describe('Datasets', () => {
    it('GET /datasets returns a paginated response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/datasets').expect(200);

      expect(res.body).toMatchObject({ data: expect.any(Array) });
    });
  });

  // ── Metrics ──────────────────────────────────────────────────────────────────

  describe('Metrics', () => {
    it('GET /metrics/platform returns a response', async () => {
      await request(app.getHttpServer()).get('/api/v1/metrics/platform').expect(200);
    });
  });

  // ── Auth boundary ────────────────────────────────────────────────────────────

  describe('Auth boundary', () => {
    it('GET /auth/profile without a token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
    });

    it('GET /reports/mine without a token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/reports/mine').expect(401);
    });

    it('GET /observations/mine without a token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/observations/mine').expect(401);
    });

    it('POST /reports without a token → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reports')
        .send({ title: 'No auth', category: 'AIR_POLLUTION', description: 'x'.repeat(25) })
        .expect(401);
    });
  });
});
