import { BadRequestException } from '@nestjs/common';
import { AlertSeverity, AlertStatus } from '@prisma/client';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertExpiryScheduler } from './alert-expiry.scheduler';

function makeService() {
  const prisma = {
    alert: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };
  const service = new AlertsService(prisma as never, {} as never);
  return { prisma, service };
}

describe('AlertsService.list', () => {
  it('excludes active alerts past their expiry', async () => {
    const { prisma, service } = makeService();
    await service.list();
    const where = prisma.alert.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(AlertStatus.ACTIVE);
    expect(where.AND).toEqual([
      { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
    ]);
  });

  it('does not apply the expiry filter when listing EXPIRED alerts', async () => {
    const { prisma, service } = makeService();
    await service.list(AlertStatus.EXPIRED);
    const where = prisma.alert.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(AlertStatus.EXPIRED);
    expect(where.AND).toBeUndefined();
  });

  it('combines the expiry and district filters instead of overwriting one', async () => {
    const { prisma, service } = makeService();
    await service.list(undefined, AlertSeverity.WARNING, undefined, 'd1');
    const where = prisma.alert.findMany.mock.calls[0][0].where;
    expect(where.severity).toBe(AlertSeverity.WARNING);
    expect(where.AND).toHaveLength(2);
    expect(where.AND[1]).toEqual({ OR: [{ districtId: 'd1' }, { areas: { some: { districtId: 'd1' } } }] });
  });
});

describe('AlertsController.list validation', () => {
  const controller = new AlertsController({ list: jest.fn() } as never);

  it.each([
    ['status', { status: 'bogus' }],
    ['severity', { severity: 'foo' }],
    ['alertType', { alertType: 'nope' }],
  ])('rejects an invalid %s with 400', (_name, q: Record<string, string>) => {
    expect(() => controller.list(q.status, q.severity, q.alertType)).toThrow(BadRequestException);
  });

  it('accepts valid enum values', () => {
    expect(() => controller.list('ACTIVE', 'WARNING', 'FLOOD')).not.toThrow();
  });
});

describe('AlertExpiryScheduler', () => {
  it('marks only ACTIVE alerts past expiresAt as EXPIRED', async () => {
    const { prisma } = makeService();
    const prismaWithLock = Object.assign(prisma, {
      $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
    });
    const scheduler = new AlertExpiryScheduler(prismaWithLock as never);
    await scheduler.expireAlerts();
    expect(prisma.alert.updateMany).toHaveBeenCalledWith({
      where: { status: AlertStatus.ACTIVE, expiresAt: { lte: expect.any(Date) } },
      data: { status: AlertStatus.EXPIRED },
    });
  });
});
