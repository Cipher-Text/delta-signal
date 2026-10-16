import { NationalRankingService } from './national-ranking.service';

/** Prisma double: every model answers with empty results and records which models were touched; `overrides` supplies rows. */
function build(overrides: Record<string, unknown> = {}) {
  const touched = new Set<string>();
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method: string) => async () => {
        touched.add(name);
        if (`${name}.${method}` in overrides) return overrides[`${name}.${method}`];
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

  describe('lowest-value cards appear only when notable', () => {
    const district = (id: string) => ({ id, name: `D${id}`, bnName: null });
    const series = async (overrides: Record<string, unknown>, cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY') =>
      (await build(overrides).service.getSuggestions(cadence)).map((s) => s.series);

    it('river: high flow needs 1.5× its mean and low flow 0.5× or less; ordinary flows show neither', async () => {
      const row = (id: string, discharge: number) => ({ stationId: id, riverDischarge: discharge, riverDischargeMean: 100, forecastDate: new Date(), station: { id, name: `S${id}`, riverName: 'R', district: { name: 'X' } } });
      expect(await series({ 'stationFloodForecast.findMany': [row('1', 120), row('2', 100), row('3', 90)] })).not.toEqual(expect.arrayContaining(['RIVER_WATCH']));
      expect(await series({ 'stationFloodForecast.findMany': [row('1', 120), row('2', 100)] })).not.toContain('LOW_FLOW_WATCH');
      expect(await series({ 'stationFloodForecast.findMany': [row('1', 180), row('2', 100)] })).toContain('RIVER_WATCH');
      expect(await series({ 'stationFloodForecast.findMany': [row('1', 40), row('2', 100)] })).toContain('LOW_FLOW_WATCH');
      expect(await series({ 'stationFloodForecast.findMany': [row('1', 40), row('2', 100)] })).not.toContain('RIVER_WATCH');
    });

    it('river: a station with no usable mean is never ranked low', async () => {
      const row = { stationId: '1', riverDischarge: 5, riverDischargeMean: null, forecastDate: new Date(), station: { id: '1', name: 'S', riverName: 'R', district: null } };
      expect(await series({ 'stationFloodForecast.findMany': [row] })).not.toContain('LOW_FLOW_WATCH');
    });

    it('cold: needs a forecast minimum of 10 °C or lower, and ranks the coolest first', async () => {
      const row = (id: string, min: number) => ({ districtId: id, temperature2mMin: min, precipitationSum: 0, forecastDate: new Date(), district: district(id) });
      expect(await series({ 'dailyWeatherForecast.findMany': [row('1', 14), row('2', 12)] })).not.toContain('COLD_WATCH');
      const { service } = build({ 'dailyWeatherForecast.findMany': [row('1', 9.5), row('2', 7), row('3', 12)] });
      const cold = (await service.getSuggestions('DAILY')).find((s) => s.series === 'COLD_WATCH');
      expect(cold?.direction).toBe('LOWEST');
      expect((cold?.sourceSnapshot as { rows: Array<{ district: string; minTemperature: number }> }).rows.map((r) => r.minTemperature)).toEqual([7, 9.5, 12]);
    });

    it('clean air: needs at least three districts at the EPA Good level (9 µg/m³ or lower)', async () => {
      const row = (id: string, pm25: number) => ({ districtId: id, pm25, forecastTime: new Date(), district: district(id) });
      expect(await series({ 'hourlyAirQuality.findMany': [row('1', 5), row('2', 8), row('3', 30), row('4', 60)] })).not.toContain('CLEAN_AIR_WATCH');
      expect(await series({ 'hourlyAirQuality.findMany': [row('1', 5), row('2', 8), row('3', 9), row('4', 60)] })).toContain('CLEAN_AIR_WATCH');
      // The highest-PM2.5 card is unaffected by the gate
      expect(await series({ 'hourlyAirQuality.findMany': [row('1', 60)] })).toContain('AIR_QUALITY_WATCH');
    });

    it('monthly: coolest needs a 30-day mean of 15 °C or lower, driest 20 mm or less, cleanest 9 µg/m³ or lower', async () => {
      const d = (over: Record<string, unknown>) => ({ id: '1', name: 'A', bnName: null, climateUpdatedAt: null, ...over });
      const none = await series({ 'district.findMany': [d({ avgTemp30d: 22, totalPrecip30d: 180, avgPm25_30d: 40 })] }, 'MONTHLY');
      expect(none).not.toEqual(expect.arrayContaining(['MONTHLY_COLD_WATCH', 'MONTHLY_DRY_WATCH', 'MONTHLY_CLEAN_AIR_WATCH']));
      const notable = await series({ 'district.findMany': [d({ avgTemp30d: 13, totalPrecip30d: 8, avgPm25_30d: 7 })] }, 'MONTHLY');
      expect(notable).toEqual(expect.arrayContaining(['MONTHLY_COLD_WATCH', 'MONTHLY_DRY_WATCH', 'MONTHLY_CLEAN_AIR_WATCH']));
    });

    it('rain, heat and coastal highest-value cards stay available whatever the thresholds', async () => {
      const result = await series({
        'dailyWeatherForecast.findMany': [{ districtId: '1', precipitationSum: 0.2, temperature2mMin: 25, forecastDate: new Date(), district: district('1') }],
        'currentWeatherReading.findMany': [{ districtId: '1', apparentTemperature: 28, readingTime: new Date(), district: district('1') }],
      });
      expect(result).toEqual(expect.arrayContaining(['RAIN_WATCH', 'HEAT_WATCH']));
    });
  });
});
