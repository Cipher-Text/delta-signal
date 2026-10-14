import { ObservationTrustLevel } from '@prisma/client';
import { EcoBriefService } from './ecobrief.service';
import type { PrismaService } from '../database/prisma.service';

function build() {
  const prisma = {
    district: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'd1', name: 'Dinajpur', avgTemp30d: 28, minTemp30d: 22, maxTemp30d: 33, totalPrecip30d: 100, avgHumidity30d: 80, avgPm25_30d: 40, climateUpdatedAt: new Date('2026-10-06') },
        { id: 'd2', name: 'Sylhet', avgTemp30d: 30, minTemp30d: 23, maxTemp30d: 35, totalPrecip30d: 200, avgHumidity30d: 84, avgPm25_30d: 30, climateUpdatedAt: new Date('2026-10-06') },
      ]),
    },
    occurrence: {
      count: jest.fn().mockResolvedValue(3),
      groupBy: jest.fn().mockResolvedValue([
        { speciesId: 's1', _count: { _all: 2 }, _min: { observedAt: new Date('2025-01-02') }, _max: { observedAt: new Date('2025-03-04') } },
        { speciesId: 's2', _count: { _all: 1 }, _min: { observedAt: new Date('2024-06-01') }, _max: { observedAt: new Date('2024-06-01') } },
      ]),
    },
    species: {
      findMany: jest.fn().mockResolvedValue([
        { id: 's1', canonicalName: 'Columba livia', vernacularName: 'Rock Pigeon', kingdom: 'Animalia', family: 'Columbidae', iucnStatus: null },
        { id: 's2', canonicalName: 'Columba livia', vernacularName: null, kingdom: 'Animalia', family: null, iucnStatus: null },
      ]),
    },
    observation: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    nationalEmissionReading: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { service: new EcoBriefService(prisma as unknown as PrismaService), prisma };
}

const base = { areaType: 'COUNTRY' as const, from: '2025-01-01', to: '2025-12-31' };

describe('EcoBriefService', () => {
  it('gives the same report ID to the same query and a different one when the filter changes', async () => {
    const { service } = build();
    const a = await service.generate({ ...base });
    const b = await service.generate({ ...base });
    const c = await service.generate({ ...base, trust: 'research' });
    expect(a.reportId).toMatch(/^EB-[0-9A-F]{8}$/);
    expect(b.reportId).toBe(a.reportId);
    expect(c.reportId).not.toBe(a.reportId);
  });

  it('marks climate as a snapshot not aligned to the selected period and reports spread across districts', async () => {
    const { service } = build();
    const brief = await service.generate({ ...base, topics: 'climate' });
    const climate = brief.sections.climate as { periodAligned: boolean; statistics: Array<{ key: string; mean: number; min: number; max: number; n: number }>; districts: unknown[] };
    expect(climate.periodAligned).toBe(false);
    expect(climate.statistics.find((s) => s.key === 'temperature')).toMatchObject({ mean: 29, min: 28, max: 30, n: 2 });
    expect(climate.districts).toHaveLength(2);
    expect(brief.limitations.join(' ')).toContain('not filtered by the selected report dates');
  });

  it('folds species rows that share a scientific name and counts each name once', async () => {
    const { service } = build();
    const brief = await service.generate({ ...base, topics: 'biodiversity' });
    const bio = brief.sections.biodiversity as { coverage: { speciesRecorded: number }; species: Array<{ scientificName: string; records: number; firstObserved: string; lastObserved: string; commonName: string | null }> };
    expect(bio.coverage.speciesRecorded).toBe(1);
    expect(bio.species).toHaveLength(1);
    expect(bio.species[0]).toMatchObject({ scientificName: 'Columba livia', records: 3, firstObserved: '2024-06-01', lastObserved: '2025-03-04', commonName: 'Rock Pigeon' });
  });

  it('restricts observations to research grade when asked, but still reports the full review-level breakdown', async () => {
    const { service, prisma } = build();
    const brief = await service.generate({ ...base, topics: 'observations', trust: 'research' });
    expect(prisma.observation.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ trustLevel: ObservationTrustLevel.RESEARCH_GRADE }),
    });
    // The trust breakdown query ignores the filter so its effect stays visible.
    expect(prisma.observation.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['trustLevel'], where: expect.objectContaining({ trustLevel: { not: ObservationTrustLevel.FLAGGED } }) }),
    );
    expect(brief.summary.join(' ')).toContain('research-grade observation records');
  });

  it('lists every source with its licence in the methods block', async () => {
    const { service } = build();
    const brief = await service.generate({ ...base });
    expect(brief.methods.sources.map((s) => s.topic)).toEqual(['climate', 'biodiversity', 'emissions', 'observations']);
    expect(brief.methods.sources.every((s) => s.licence.length > 0)).toBe(true);
  });
});
