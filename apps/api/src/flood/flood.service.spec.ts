import { classifyFloodRisk } from '@delta-signal/shared';
import { FloodService } from './flood.service';

describe('flood risk classification', () => {
  it('classifies high and elevated discharge signals', () => {
    expect(classifyFloodRisk(200, 100, 120)).toBe('HIGH');
    expect(classifyFloodRisk(160, 100, 120)).toBe('ELEVATED');
    expect(classifyFloodRisk(120, 100, 120)).toBeNull();
  });

  it('uses percentile thresholds and returns unknown when comparison data is missing', () => {
    expect(classifyFloodRisk(181, 100, 120)).toBe('HIGH');
    expect(classifyFloodRisk(121, 100, 120)).toBe('ELEVATED');
    expect(classifyFloodRisk(200, null, 120)).toBeNull();
    expect(classifyFloodRisk(200, 0, 120)).toBeNull();
  });
});

describe('FloodService latest forecast query', () => {
  it('requests newest forecast rows per station', async () => {
    const prisma = {
      stationFloodForecast: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new FloodService(prisma as never, {} as never);

    await service.getLatestForAllStations();

    expect(prisma.stationFloodForecast.findMany).toHaveBeenCalledWith(expect.objectContaining({
      distinct: ['stationId'],
      orderBy: [{ stationId: 'asc' }, { forecastDate: 'desc' }],
    }));
  });
});
