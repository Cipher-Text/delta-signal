import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObservationCategory, ObservationTrustLevel } from '@prisma/client';
import { ObservationsService } from './observations.service';
import type { PrismaService } from '../database/prisma.service';
import type { GamificationService } from '../gamification/gamification.service';

const USER = { sub: 'u1', email: 'a@b.c', role: 'CITIZEN' };
const MOD  = { sub: 'u2', email: 'm@b.c', role: 'MODERATOR' };

function mockPrisma() {
  const tx = {
    observation:            { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    observationMeasurement: { create: jest.fn(), delete: jest.fn() },
    auditEvent:             { create: jest.fn().mockResolvedValue({}) },
  };
  return {
    observation: {
      findUnique: jest.fn(),
      findMany:   jest.fn().mockResolvedValue([]),
      count:      jest.fn().mockResolvedValue(0),
      groupBy:    jest.fn().mockResolvedValue([]),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
    observationMeasurement: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
    },
    district:   { findUnique: jest.fn() },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: any) => unknown)(tx);
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
}

function build() {
  const prisma = mockPrisma();
  const gamification = {
    evaluateBadges: jest.fn().mockResolvedValue(undefined),
  } as unknown as GamificationService;
  const service = new ObservationsService(
    prisma as unknown as PrismaService,
    gamification,
  );
  return { service, prisma, gamification };
}

const BASE_OBS = {
  id: 'obs1',
  category: ObservationCategory.WATER_QUALITY,
  trustLevel: ObservationTrustLevel.UNVERIFIED,
  description: 'murky water',
  districtId: 'd1',
  upazilaId: null,
  unionId: null,
  lat: 23.8,
  lng: 90.4,
  species: null,
  observedAt: new Date('2026-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
  observer: { id: 'u1', displayName: 'Alice' },
  district: { id: 'd1', name: 'Dhaka', division: { id: 'dv1', name: 'Dhaka Division' } },
  upazila: null,
  union: null,
  measurements: [],
};

describe('ObservationsService', () => {
  describe('create', () => {
    it('rejects observedAt in the future', async () => {
      const { service } = build();
      const future = new Date(Date.now() + 86_400_000).toISOString();

      await expect(
        service.create(
          { category: ObservationCategory.WATER_QUALITY, observedAt: future } as any,
          USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts observedAt in the past', async () => {
      const { service, prisma } = build();
      const tx = {
        observation: { create: jest.fn().mockResolvedValue(BASE_OBS) },
        auditEvent:  { create: jest.fn().mockResolvedValue({}) },
      };
      (prisma.$transaction as jest.Mock).mockImplementation((fn: Function) => fn(tx));

      const past = '2020-06-01T12:00:00Z';
      await expect(
        service.create(
          { category: ObservationCategory.WATER_QUALITY, observedAt: past } as any,
          USER,
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('list — public visibility', () => {
    it('excludes FLAGGED observations by default', async () => {
      const { service, prisma } = build();
      await service.list(undefined, undefined, undefined);

      expect(prisma.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trustLevel: { not: ObservationTrustLevel.FLAGGED },
          }),
        }),
      );
    });

    it('uses the caller-supplied trustLevel when provided', async () => {
      const { service, prisma } = build();
      await service.list(undefined, ObservationTrustLevel.RESEARCH_GRADE, undefined);

      expect(prisma.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trustLevel: ObservationTrustLevel.RESEARCH_GRADE,
          }),
        }),
      );
    });
  });

  describe('list — counts', () => {
    it('counts per trust level ignoring the trust filter, never including FLAGGED', async () => {
      const { service, prisma } = build();
      prisma.observation.groupBy.mockResolvedValue([
        { trustLevel: ObservationTrustLevel.RESEARCH_GRADE, _count: { _all: 2 } },
        { trustLevel: ObservationTrustLevel.UNVERIFIED, _count: { _all: 5 } },
      ]);

      const res = await service.list(ObservationCategory.BIODIVERSITY, ObservationTrustLevel.UNVERIFIED);

      expect(res.counts).toEqual({ researchGrade: 2, community: 0, unverified: 5, all: 7 });
      expect(prisma.observation.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: ObservationCategory.BIODIVERSITY, trustLevel: { not: ObservationTrustLevel.FLAGGED } },
        }),
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when caller is not the owner', async () => {
      const { service, prisma } = build();
      prisma.observation.findUnique.mockResolvedValue({
        ...BASE_OBS,
        observer: { id: 'other-user', displayName: 'Bob' },
      });

      await expect(
        service.update('obs1', { description: 'changed' }, USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when observation is not UNVERIFIED', async () => {
      const { service, prisma } = build();
      prisma.observation.findUnique.mockResolvedValue({
        ...BASE_OBS,
        trustLevel: ObservationTrustLevel.RESEARCH_GRADE,
      });

      await expect(
        service.update('obs1', { description: 'changed' }, USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a future observedAt in update', async () => {
      const { service, prisma } = build();
      prisma.observation.findUnique.mockResolvedValue(BASE_OBS);
      const future = new Date(Date.now() + 86_400_000).toISOString();

      await expect(
        service.update('obs1', { observedAt: future }, USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTrust', () => {
    it('enqueues badge evaluation when trust reaches RESEARCH_GRADE', async () => {
      const { service, prisma, gamification } = build();
      prisma.observation.findUnique.mockResolvedValue(BASE_OBS);
      prisma.observation.update.mockResolvedValue({
        ...BASE_OBS,
        trustLevel: ObservationTrustLevel.RESEARCH_GRADE,
      });

      await service.updateTrust(
        'obs1',
        { trustLevel: ObservationTrustLevel.RESEARCH_GRADE },
        MOD,
      );

      // evaluateBadges is called fire-and-forget — allow microtasks to flush
      await new Promise(process.nextTick);
      expect(gamification.evaluateBadges).toHaveBeenCalledWith('u1');
    });

    it('does not enqueue badge evaluation for other trust changes', async () => {
      const { service, prisma, gamification } = build();
      prisma.observation.findUnique.mockResolvedValue(BASE_OBS);
      prisma.observation.update.mockResolvedValue({
        ...BASE_OBS,
        trustLevel: ObservationTrustLevel.FLAGGED,
      });

      await service.updateTrust(
        'obs1',
        { trustLevel: ObservationTrustLevel.FLAGGED },
        MOD,
      );

      await new Promise(process.nextTick);
      expect(gamification.evaluateBadges).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when observation does not exist', async () => {
      const { service, prisma } = build();
      prisma.observation.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
