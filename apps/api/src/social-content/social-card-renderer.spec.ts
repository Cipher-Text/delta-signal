import { formatBst, renderSocialCardSvg, type SocialCardInput } from './social-card-renderer';

const base: Omit<SocialCardInput, 'type' | 'source' | 'headline'> = {
  summary: 'Highest modeled PM2.5 values in the latest comparable data window',
  disclaimer: 'Modeled PM2.5 values are not direct ground-station measurements or an official AQI.',
  sourceLabel: 'Open-Meteo air-quality model',
  observedAt: new Date('2026-10-15T03:00:00Z'),
  location: 'Bangladesh',
  width: 1080,
  height: 1350,
  logoDataUri: '',
};

const ranking = (rows: Array<Record<string, unknown>>) => ({ ranking: { rows } });

describe('formatBst', () => {
  it('formats Bangladesh time with the full weekday (regression: "As of hu Oct 15 2026")', () => {
    expect(formatBst(new Date('2026-10-15T03:00:00Z'))).toBe('Thu 15 Oct 2026, 09:00 BST (UTC+6)');
  });

  it('rolls into the next Dhaka day after 18:00 UTC', () => {
    expect(formatBst('2026-10-15T19:30:00Z')).toBe('Fri 16 Oct 2026, 01:30 BST (UTC+6)');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatBst(null)).toBe('');
    expect(formatBst('not a date')).toBe('');
  });
});

describe('renderSocialCardSvg', () => {
  it('draws a ranked national card with values, units, bars and the as-of line', () => {
    const svg = renderSocialCardSvg({
      ...base,
      type: 'NATIONAL_AIR_QUALITY_WATCH',
      headline: 'Top 5 modeled PM2.5 districts',
      source: ranking([
        { district: 'Mymensingh', pm25: 155.5 },
        { district: 'Netrokona', pm25: 141.1 },
      ]),
    });
    expect(svg).toContain('BANGLADESH AIR QUALITY WATCH');
    expect(svg).toContain('Mymensingh');
    expect(svg).toContain('155.5');
    expect(svg).toContain('µg/m³');
    expect(svg).toContain('As of Thu 15 Oct 2026, 09:00 BST (UTC+6)');
    expect(svg).toContain('Source: Open-Meteo air-quality model');
    expect(svg).toContain('not direct ground-station measurements');
  });

  it('shows river stations as a multiple of their mean', () => {
    const svg = renderSocialCardSvg({
      ...base,
      type: 'NATIONAL_RIVER_WATCH',
      headline: 'Top 5 river forecast signals',
      source: ranking([{ station: 'Bamna', river: 'Bishkhali', district: 'Barguna', discharge: 21, ratio: 2.33 }]),
    });
    expect(svg).toContain('2.3×');
    expect(svg).toContain('Bishkhali · Barguna · 21 m³/s');
  });

  it('draws a hero number and three stat tiles for a district weather card', () => {
    const svg = renderSocialCardSvg({
      ...base,
      type: 'CURRENT_WEATHER',
      headline: 'Dhaka: current weather',
      location: 'Dhaka',
      source: { reading: { temperature2m: 31.2, apparentTemperature: 36.4, precipitation: 0, relativeHumidity2m: 74, windSpeed10m: 9.4 } },
    });
    expect(svg).toContain('TODAY IN BANGLADESH · DHAKA');
    expect(svg).toContain('31.2');
    expect(svg).toContain('Feels like 36.4 °C');
    expect(svg).toContain('HUMIDITY');
    expect(svg).toContain('74 %');
  });

  it('colours alert chips by severity and escapes markup in titles', () => {
    const svg = renderSocialCardSvg({
      ...base,
      type: 'NATIONAL_ALERT_WATCH',
      headline: 'Bangladesh alert watch',
      source: ranking([{ title: 'Flood <b>warning</b> & "surge"', severity: 'EMERGENCY', districts: ['Sunamganj'] }]),
    });
    expect(svg).toContain('#c23b3b');
    expect(svg).toContain('EMERGENCY');
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;');
  });

  it('wraps a long headline to two lines and ends it with an ellipsis rather than overflowing', () => {
    const svg = renderSocialCardSvg({
      ...base,
      type: 'ENVIRONMENTAL_ALERT',
      headline: 'An extremely long alert headline '.repeat(8),
      source: { alert: { severity: 'WARNING', status: 'ACTIVE', issuedAt: '2026-10-14' } },
    });
    const headlineLines = svg.match(/font-size="58" font-weight="700"/g) ?? [];
    expect(headlineLines).toHaveLength(2);
    expect(svg).toContain('…');
  });

  it('renders a valid, well-formed SVG of the requested size for portrait and square formats', () => {
    for (const [width, height] of [[1080, 1350], [1080, 1080]]) {
      const svg = renderSocialCardSvg({
        ...base,
        type: 'NATIONAL_BIODIVERSITY',
        headline: 'Recent biodiversity observations',
        width,
        height,
        source: ranking([{ species: 'Halcyon smyrnensis', commonName: 'White-throated Kingfisher', district: 'Moulvibazar', observedAt: '2026-10-11' }]),
      });
      expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"`)).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg.match(/</g)?.length).toBe(svg.match(/>/g)?.length);
    }
  });

  it('falls back gracefully for an unknown card type', () => {
    const svg = renderSocialCardSvg({ ...base, type: 'SOMETHING_NEW', headline: 'New card', source: {} });
    expect(svg).toContain('SOMETHING NEW');
    expect(svg).toContain('MODEL DATA');
  });
});
