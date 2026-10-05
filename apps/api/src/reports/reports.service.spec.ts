import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportStatus, ReportCategory } from '@prisma/client';
import { ReportsService } from './reports.service';
import type { PrismaService } from '../database/prisma.service';
import type { GamificationService } from '../gamification/gamification.service';

const USER_CITIZEN  = { sub: 'u1', email: 'a@b.c', role: 'CITIZEN'   };
const USER_MOD      = { sub: 'u2', email: 'm@b.c', role: 'MODERATOR' };
const USER_ADMIN    = { sub: 'u3', email: 'ad@b.c', role: 'ADMIN'    };

function mockPrisma() {
  const p = {
    citizenReport: {
      findUnique: jest.fn(),
      findMany:   jest.fn().mockResolvedValue([]),
      count:      jest.fn().mockResolvedValue(0),
      groupBy:    jest.fn().mockResolvedValue([]),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    reportStatusEvent: { create: jest.fn().mockResolvedValue({}) },
    reportComment: {
      findMany: jest.fn().mockResolvedValue([]),
      create:   jest.fn(),
    },
    reportMedia: {
      findMany: jest.fn().mockResolvedValue([]),
      create:   jest.fn(),
    },
    district:   { findUnique: jest.fn() },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: null as unknown as jest.Mock,
  };
  // Assign after definition so the closure captures the fully built object.
  p.$transaction = jest.fn().mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') return (arg as (tx: typeof p) => unknown)(p);
    return Promise.all(arg as Promise<unknown>[]);
  });
  return p;
}

function build() {
  const prisma = mockPrisma();
  const gamification = {
    evaluateBadges: jest.fn().mockResolvedValue(undefined),
  } as unknown as GamificationService;
  const service = new ReportsService(
    prisma as unknown as PrismaService,
    gamification,
  );
  return { service, prisma, gamification };
}

const BASE_REPORT = {
  id: 'r1',
  title: 'Test',
  description: 'desc',
  category: ReportCategory.WATER_POLLUTION,
  status: ReportStatus.SUBMITTED,
  summary: null,
  districtId: 'd1',
  upazilaId: null,
  unionId: null,
  lat: 23.8,
  lng: 90.4,
  createdAt: new Date(),
  updatedAt: new Date(),
  reporter: { id: 'u1', displayName: 'Alice' },
  district: { id: 'd1', name: 'Dhaka', division: { id: 'dv1', name: 'Dhaka Division' } },
  upazila: null,
  union: null,
};

describe('ReportsService', () => {
  describe('updateStatus', () => {
    it.each([
      ['SUBMITTED → UNDER_REVIEW (valid)',   ReportStatus.SUBMITTED,    ReportStatus.UNDER_REVIEW, false],
      ['UNDER_REVIEW → VERIFIED (valid)',    ReportStatus.UNDER_REVIEW, ReportStatus.VERIFIED,     false],
      ['UNDER_REVIEW → REJECTED (valid)',    ReportStatus.UNDER_REVIEW, ReportStatus.REJECTED,     false],
      ['VERIFIED → RESOLVED (valid)',        ReportStatus.VERIFIED,     ReportStatus.RESOLVED,      false],
      ['REJECTED → anything (invalid)',      ReportStatus.REJECTED,     ReportStatus.SUBMITTED,     true],
      ['RESOLVED → anything (invalid)',      ReportStatus.RESOLVED,     ReportStatus.VERIFIED,      true],
      ['SUBMITTED → VERIFIED (skip step)',   ReportStatus.SUBMITTED,    ReportStatus.VERIFIED,      true],
    ])('%s', async (_label, from, to, shouldThrow) => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue({ ...BASE_REPORT, status: from });
      prisma.citizenReport.update.mockResolvedValue({ ...BASE_REPORT, status: to });

      if (shouldThrow) {
        await expect(
          service.updateStatus('r1', { status: to }, USER_MOD),
        ).rejects.toThrow(ForbiddenException);
      } else {
        await expect(
          service.updateStatus('r1', { status: to }, USER_MOD),
        ).resolves.toBeDefined();
      }
    });

    it('sets resolvedAt when transitioning to RESOLVED', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.VERIFIED });
      prisma.citizenReport.update.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.RESOLVED });

      await service.updateStatus('r1', { status: ReportStatus.RESOLVED }, USER_MOD);

      expect(prisma.citizenReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it('triggers badge evaluation when report reaches VERIFIED', async () => {
      const { service, prisma, gamification } = build();
      prisma.citizenReport.findUnique.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.UNDER_REVIEW });
      prisma.citizenReport.update.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.VERIFIED });

      await service.updateStatus('r1', { status: ReportStatus.VERIFIED }, USER_MOD);

      expect(gamification.evaluateBadges).toHaveBeenCalledWith('u1');
    });

    it('does not trigger badge evaluation when rejecting a report', async () => {
      const { service, prisma, gamification } = build();
      prisma.citizenReport.findUnique.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.UNDER_REVIEW });
      prisma.citizenReport.update.mockResolvedValue({ ...BASE_REPORT, status: ReportStatus.REJECTED });

      await service.updateStatus('r1', { status: ReportStatus.REJECTED }, USER_MOD);

      expect(gamification.evaluateBadges).not.toHaveBeenCalled();
    });
  });

  describe('list — public visibility', () => {
    it('defaults to only VERIFIED and RESOLVED reports', async () => {
      const { service, prisma } = build();
      await service.list(undefined, undefined, undefined);

      expect(prisma.citizenReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] },
          }),
        }),
      );
    });

    it('accepts an explicit status filter (e.g. moderator queue)', async () => {
      const { service, prisma } = build();
      await service.list(ReportStatus.SUBMITTED, undefined, undefined);

      expect(prisma.citizenReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ReportStatus.SUBMITTED }),
        }),
      );
    });
  });

  describe('list — counts and photos', () => {
    it('returns per-status counts that ignore the status filter, and a photo count per report', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findMany.mockResolvedValue([{ ...BASE_REPORT, _count: { media: 2 } }]);
      prisma.citizenReport.groupBy.mockResolvedValue([
        { status: ReportStatus.VERIFIED, _count: { _all: 3 } },
        { status: ReportStatus.RESOLVED, _count: { _all: 1 } },
      ]);

      const res = await service.list(ReportStatus.RESOLVED, ReportCategory.FLOODING);

      expect(res.counts).toEqual({ verified: 3, resolved: 1, all: 4 });
      expect(res.data[0].mediaCount).toBe(2);
      expect(prisma.citizenReport.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: ReportCategory.FLOODING, status: { in: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] } },
        }),
      );
    });

    it('orders by most recently updated', async () => {
      const { service, prisma } = build();
      await service.list();
      expect(prisma.citizenReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] }),
      );
    });
  });

  describe('listMine', () => {
    it('shows all statuses for the owner (no status filter)', async () => {
      const { service, prisma } = build();
      await service.listMine('u1');

      expect(prisma.citizenReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { reporterId: 'u1' } }),
      );
    });
  });

  describe('addComment', () => {
    it('forces isInternal=false for non-moderator users', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue(BASE_REPORT);
      prisma.reportComment.create.mockResolvedValue({
        id: 'c1', body: 'hi', isInternal: false, createdAt: new Date(),
        author: { id: 'u1', displayName: 'Alice' },
      });

      await service.addComment('r1', { body: 'hi', isInternal: true }, USER_CITIZEN);

      expect(prisma.reportComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isInternal: false }) }),
      );
    });

    it('allows isInternal=true for MODERATOR', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue(BASE_REPORT);
      prisma.reportComment.create.mockResolvedValue({
        id: 'c1', body: 'internal note', isInternal: true, createdAt: new Date(),
        author: { id: 'u2', displayName: 'Mod' },
      });

      await service.addComment('r1', { body: 'internal note', isInternal: true }, USER_MOD);

      expect(prisma.reportComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isInternal: true }) }),
      );
    });

    it('allows isInternal=true for ADMIN', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue(BASE_REPORT);
      prisma.reportComment.create.mockResolvedValue({
        id: 'c1', body: 'admin note', isInternal: true, createdAt: new Date(),
        author: { id: 'u3', displayName: 'Admin' },
      });

      await service.addComment('r1', { body: 'admin note', isInternal: true }, USER_ADMIN);

      expect(prisma.reportComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isInternal: true }) }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when report does not exist', async () => {
      const { service, prisma } = build();
      prisma.citizenReport.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
