import { AnalyticsService } from './analytics.service';

describe('AnalyticsService organization dashboard', () => {
  it('scopes every restoration aggregate to organizations administered by the user', async () => {
    const prisma = {
      organizationMembership: {
        findMany: jest.fn().mockResolvedValue([
          { organizationId: 'org-a' },
          { organizationId: 'org-b' },
        ]),
      },
      restorationProject: {
        groupBy: jest.fn()
          .mockResolvedValueOnce([{ status: 'ACTIVE', _count: { id: 1 } }])
          .mockResolvedValueOnce([{ category: 'MANGROVE', _count: { id: 1 } }]),
        count: jest.fn().mockResolvedValue(1),
      },
      restorationParticipant: {
        count: jest.fn().mockResolvedValue(2),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        { id: 'project-a', title: 'Project A', participants: BigInt(2) },
      ]),
    };

    const service = new AnalyticsService(prisma as never);
    const result = await service.getOrgAdminDashboard('user-1');

    expect(prisma.organizationMembership.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', role: 'ADMIN' },
      select: { organizationId: true },
    });
    expect(prisma.restorationProject.groupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { organizationId: { in: ['org-a', 'org-b'] } },
    }));
    expect(prisma.restorationProject.groupBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { organizationId: { in: ['org-a', 'org-b'] } },
    }));
    expect(prisma.restorationProject.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: { in: ['org-a', 'org-b'] } }),
    }));
    expect(prisma.restorationParticipant.count).toHaveBeenCalledWith({
      where: { project: { organizationId: { in: ['org-a', 'org-b'] } } },
    });
    expect(result.engagement.topProjects).toEqual([
      { id: 'project-a', title: 'Project A', participants: 2 },
    ]);
  });

  it('returns an empty organization portfolio when the user administers no organization', async () => {
    const prisma = {
      organizationMembership: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      restorationProject: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      restorationParticipant: {
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    const service = new AnalyticsService(prisma as never);
    const result = await service.getOrgAdminDashboard('user-without-org');

    expect(result.projects).toMatchObject({
      total: 0,
      active: 0,
      newLast30d: 0,
      byStatus: [],
      byCategory: [],
    });
    expect(result.engagement).toEqual({
      totalParticipants: 0,
      avgParticipantsPerProject: 0,
      topProjects: [],
    });
  });
});

describe('AnalyticsService government alert geography', () => {
  it('counts each active alert once per affected division from canonical areas', async () => {
    const prisma = {
      alert: {
        groupBy: jest.fn().mockResolvedValue([
          { severity: 'WARNING', _count: { id: 2 } },
        ]),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'alert-multi',
            district: null,
            areas: [
              { district: { division: { name: 'Dhaka' } }, upazila: null, union: null },
              { district: null, upazila: { district: { division: { name: 'Dhaka' } } }, union: null },
              { district: null, upazila: null, union: { upazila: { district: { division: { name: 'Khulna' } } } } },
            ],
          },
          {
            id: 'alert-national',
            district: null,
            areas: [],
          },
        ]),
      },
      citizenReport: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      division: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      waterLevelStation: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const service = new AnalyticsService(prisma as never);
    const result = await service.getGovernmentDashboard();

    expect(result.alerts.byDivision).toEqual([
      { division: 'Dhaka', count: 1 },
      { division: 'Khulna', count: 1 },
      { division: 'Nationwide', count: 1 },
    ]);
    expect(prisma.alert.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'ACTIVE' },
    }));
  });
});
