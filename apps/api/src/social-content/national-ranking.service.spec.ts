import { NationalRankingService } from './national-ranking.service';

/** Prisma double: every model answers with empty results and records which models were touched. */
function build() {
  const touched = new Set<string>();
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method: string) => async () => {
        touched.add(name);
        if (method === 'count') return name === 'district' ? 64 : 0;
        if (method === 'findMany' || method === 'groupBy') return [];
        return null;
      },
    });
  const prisma: any = new Proxy({}, { get: (_t, name: string) => model(name) });
  return { service: new NationalRankingService(prisma), touched };
}

describe('NationalRankingService suggestions', () => {
  it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('%s never reads citizen reports, observations or species records', async (cadence) => {
    const { service, touched } = build();
    const suggestions = await service.getSuggestions(cadence);
    for (const forbidden of ['citizenReport', 'observation', 'occurrence', 'species']) expect([...touched]).not.toContain(forbidden);
    const series = suggestions.map((s) => s.series);
    expect(series).not.toContain('COMMUNITY_SIGNALS');
    expect(series).not.toContain('WILD_BANGLADESH');
  });

  it('the weekly and monthly summary is built from alerts and climate only', async () => {
    const { service } = build();
    const [summary] = (await service.getSuggestions('MONTHLY')).filter((s) => s.series === 'PERIOD_SUMMARY');
    const row = (summary.sourceSnapshot as { rows: Array<Record<string, unknown>> }).rows[0];
    expect(Object.keys(row).sort()).toEqual(['airQuality', 'alerts', 'days', 'hottest', 'wettest']);
  });
});
