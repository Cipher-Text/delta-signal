/**
 * Social card renderer: builds the SVG for every shareable card (later rasterized to PNG by sharp / librsvg).
 *
 * Design: a coloured header that names the series and the headline, a white panel overlapping it with the
 * evidence (ranked bars, a hero number with stat tiles, or a list), then a footer with the plain-language
 * summary, the "as of" time in Bangladesh time, the source and the disclaimer. Each series has its own colour
 * and glyph so a feed of cards is easy to tell apart at a glance.
 *
 * librsvg limits: no CSS, no text wrapping, no filters. Gradients, rounded rects, opacity and basic text work,
 * so text is wrapped here with a width estimate and shadows are drawn as stacked translucent shapes.
 */

export interface SocialCardInput {
  /** `SocialContentType` value, e.g. `NATIONAL_AIR_QUALITY_WATCH`. */
  type: string;
  headline: string;
  summary: string | null;
  disclaimer: string | null;
  sourceLabel: string;
  observedAt: Date | string | null;
  /** District name for single-place cards; `Bangladesh` for national ones. */
  location: string;
  source: Record<string, any>;
  width: number;
  height: number;
  /** `data:` URI of the logo, or an empty string. */
  logoDataUri: string;
}

type Theme = { key: string; a: string; b: string; tint: string; glyph: string; label: string; evidence: string };

const FONT = 'Noto Sans Bengali, Arial, sans-serif';

const CLOUD = 'M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5 4.25 4.25 0 0 1 17 18z';
const THEMES: Record<string, Omit<Theme, 'label' | 'evidence'>> = {
  SKY: { key: 'SKY', a: '#2f86c7', b: '#1d5a91', tint: '#e6f1fa', glyph: `${CLOUD}` },
  RAIN: { key: 'RAIN', a: '#2a7db8', b: '#1a4f7c', tint: '#e6f1fa', glyph: `${CLOUD} M8 21l1-2.4M12 21l1-2.4M16 21l1-2.4` },
  AIR: { key: 'AIR', a: '#6a4c9c', b: '#3d2a69', tint: '#eee9f6', glyph: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8' },
  HEAT: { key: 'HEAT', a: '#d9601a', b: '#9c3a0c', tint: '#fceee2', glyph: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z' },
  RIVER: { key: 'RIVER', a: '#1d86a0', b: '#0e5368', tint: '#e2f2f6', glyph: 'M2 9c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0M2 15c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0' },
  ALERT: { key: 'ALERT', a: '#c23b3b', b: '#7d1f1f', tint: '#fbe8e8', glyph: 'M12 3L2 20h20zM12 10v4M12 17v.5' },
  COMMUNITY: { key: 'COMMUNITY', a: '#147a57', b: '#0b4a35', tint: '#e4f3ea', glyph: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5 6-5s6 2 6 5M17 9a2.5 2.5 0 1 0 0-5M16 14.5c3 0 5 1.8 5 4.5' },
  SEA: { key: 'SEA', a: '#0f7391', b: '#0a3f5e', tint: '#e0f0f5', glyph: 'M2 8c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0M2 13c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0M2 18c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0' },
  DIGEST: { key: 'DIGEST', a: '#3f64a8', b: '#243a68', tint: '#e8edf7', glyph: 'M4 20V10M10 20V4M16 20v-7M22 20V8' },
  WILD: { key: 'WILD', a: '#3f7447', b: '#234a2b', tint: '#e8f2ea', glyph: 'M5 19c0-9 5-14 15-14 0 9-5 14-14 14M5 19l7-7' },
};

const SERIES: Record<string, { theme: keyof typeof THEMES; label: string; evidence: string }> = {
  CURRENT_WEATHER: { theme: 'SKY', label: 'TODAY IN BANGLADESH', evidence: 'MODEL DATA' },
  WEATHER_FORECAST: { theme: 'RAIN', label: 'RAIN WATCH', evidence: 'FORECAST' },
  RIVER_SIGNAL: { theme: 'RIVER', label: 'RIVER WATCH', evidence: 'FORECAST' },
  ENVIRONMENTAL_ALERT: { theme: 'ALERT', label: 'ALERT EXPLAINER', evidence: 'ALERT' },
  BIODIVERSITY_OBSERVATION: { theme: 'WILD', label: 'WILD BANGLADESH', evidence: 'GBIF OBSERVATION' },
  NATIONAL_RAIN_WATCH: { theme: 'RAIN', label: 'BANGLADESH RAIN WATCH', evidence: 'NATIONAL DATA' },
  NATIONAL_AIR_QUALITY_WATCH: { theme: 'AIR', label: 'BANGLADESH AIR QUALITY WATCH', evidence: 'NATIONAL DATA' },
  NATIONAL_HEAT_WATCH: { theme: 'HEAT', label: 'BANGLADESH HEAT WATCH', evidence: 'NATIONAL DATA' },
  NATIONAL_RIVER_WATCH: { theme: 'RIVER', label: 'RIVER WATCH BANGLADESH', evidence: 'NATIONAL DATA' },
  NATIONAL_ALERT_WATCH: { theme: 'ALERT', label: 'BANGLADESH ALERT WATCH', evidence: 'ALERT' },
  NATIONAL_COMMUNITY_SIGNALS: { theme: 'COMMUNITY', label: 'COMMUNITY SIGNALS BANGLADESH', evidence: 'VERIFIED REPORTS' },
  NATIONAL_BIODIVERSITY: { theme: 'WILD', label: 'WILD BANGLADESH', evidence: 'GBIF OBSERVATION' },
  DISTRICT_SNAPSHOT: { theme: 'SKY', label: 'DISTRICT SNAPSHOT', evidence: 'MODEL DATA' },
  NATIONAL_COASTAL_WATCH: { theme: 'SEA', label: 'COASTAL WATCH', evidence: 'MARINE FORECAST' },
  NATIONAL_PERIOD_SUMMARY: { theme: 'DIGEST', label: 'BANGLADESH IN REVIEW', evidence: 'ALERTS & CLIMATE' },
  CUSTOM_EDITORIAL: { theme: 'SKY', label: 'DELTA SIGNAL NOTE', evidence: 'EDITORIAL' },
};

const SEVERITY: Record<string, { fg: string; bg: string }> = {
  EMERGENCY: { fg: '#ffffff', bg: '#c23b3b' },
  WARNING: { fg: '#ffffff', bg: '#d9601a' },
  WATCH: { fg: '#4d3a00', bg: '#f1c94b' },
  INFO: { fg: '#ffffff', bg: '#2f86c7' },
};

// ─── text helpers ────────────────────────────────────────────────────────────

const esc = (v: unknown) =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

/** Rough advance width in px; good enough to wrap and truncate (Bengali glyphs are much wider than Latin). */
function textWidth(s: string, size: number, bold: boolean): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0x0980 && c <= 0x09ff) w += size * 0.95;
    else if (c > 0x2e80) w += size;
    else if (ch === ' ') w += size * 0.28;
    else if ('iljtfI.,:;|!\''.includes(ch)) w += size * 0.3;
    else if ('mwMW@%'.includes(ch)) w += size * 0.88;
    else if (ch >= 'A' && ch <= 'Z') w += size * (bold ? 0.7 : 0.66);
    else if (ch >= '0' && ch <= '9') w += size * 0.58;
    else w += size * (bold ? 0.58 : 0.54);
  }
  return w;
}

function wrap(text: string, size: number, maxWidth: number, maxLines: number, bold = false): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (textWidth(next, size, bold) <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const used = lines.join(' ').split(' ').length;
  if (used < words.length && lines.length) {
    // Cut off: end the last line with an ellipsis that still fits.
    let last = lines[lines.length - 1];
    while (last.length > 1 && textWidth(`${last}…`, size, bold) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines.slice(0, maxLines);
}

function fit(text: string, size: number, maxWidth: number, bold = false): string {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && textWidth(`${t}…`, size, bold) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 15 Oct 2026, 09:00 BST (UTC+6)". Bangladesh time, fixed offset: no ICU dependence. */
export function formatBst(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const l = new Date(d.getTime() + 6 * 3_600_000);
  const hh = String(l.getUTCHours()).padStart(2, '0');
  const mm = String(l.getUTCMinutes()).padStart(2, '0');
  return `${DAYS[l.getUTCDay()]} ${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${l.getUTCFullYear()}, ${hh}:${mm} BST (UTC+6)`;
}

const day = (v: unknown) => {
  const d = new Date(String(v ?? ''));
  if (Number.isNaN(d.getTime())) return '—';
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

const n = (v: unknown, digits = 1): string => {
  const x = Number(v);
  return v == null || v === '' || Number.isNaN(x) ? '—' : x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const title = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ─── data shaping ────────────────────────────────────────────────────────────

interface Row {
  name: string;
  sub?: string;
  /** Number used for bar length; display text below is separate. */
  amount?: number;
  value?: string;
  unit?: string;
  chip?: { text: string; fg: string; bg: string };
}

function rankingRows(type: string, source: Record<string, any>): Row[] {
  const rows: Array<Record<string, any>> = Array.isArray(source.ranking?.rows) ? source.ranking.rows.slice(0, 5) : [];
  switch (type) {
    case 'NATIONAL_RAIN_WATCH':
      return rows.map((r) => ({ name: r.district, amount: Number(r.rainfallMm), value: n(r.rainfallMm), unit: 'mm' }));
    case 'NATIONAL_AIR_QUALITY_WATCH':
      return rows.map((r) => ({ name: r.district, amount: Number(r.pm25 ?? r.avgPm25), value: n(r.pm25 ?? r.avgPm25), unit: 'µg/m³' }));
    case 'NATIONAL_HEAT_WATCH':
      return rows.map((r) => ({ name: r.district, amount: Number(r.apparentTemperature ?? r.avgTemperature), value: n(r.apparentTemperature ?? r.avgTemperature), unit: '°C' }));
    case 'NATIONAL_RIVER_WATCH':
      return rows.map((r) => ({
        name: r.station,
        sub: [r.river, r.district, r.discharge != null ? `${n(r.discharge, 0)} m³/s` : null].filter(Boolean).join(' · '),
        amount: Number(r.ratio),
        value: `${n(r.ratio, 1)}×`,
        unit: 'of mean',
      }));
    case 'NATIONAL_COASTAL_WATCH':
      return rows.map((r) => ({
        name: r.district,
        sub: [r.swellHeightM != null ? `swell ${n(r.swellHeightM)} m` : null, r.wavePeriodS != null ? `${n(r.wavePeriodS, 0)} s period` : null, r.seaSurfaceTemp != null ? `sea ${n(r.seaSurfaceTemp, 0)} °C` : null].filter(Boolean).join(' · '),
        amount: Number(r.waveHeightM),
        value: n(r.waveHeightM),
        unit: 'm',
      }));
    case 'NATIONAL_ALERT_WATCH':
      return rows.map((r) => ({
        name: r.title,
        sub: Array.isArray(r.districts) && r.districts.length ? r.districts.slice(0, 3).join(', ') : 'Nationwide',
        chip: { text: String(r.severity ?? 'INFO'), ...(SEVERITY[String(r.severity)] ?? SEVERITY.INFO) },
      }));
    case 'NATIONAL_COMMUNITY_SIGNALS':
      return rows.map((r) => ({ name: title(r.category), sub: [r.district, day(r.reportedAt)].filter(Boolean).join(' · ') }));
    case 'NATIONAL_BIODIVERSITY':
      return rows.map((r) => ({ name: r.commonName || r.species, sub: [r.commonName ? r.species : null, r.district, day(r.observedAt)].filter(Boolean).join(' · ') }));
    default:
      return [];
  }
}

interface Hero {
  label: string;
  value: string;
  unit?: string;
  tiles: Array<{ label: string; value: string }>;
  /** Species / alert cards put words, not a number, in the hero. */
  words?: boolean;
  sub?: string;
  chip?: { text: string; fg: string; bg: string };
}

function heroFor(type: string, source: Record<string, any>, location: string): Hero | null {
  switch (type) {
    case 'CURRENT_WEATHER': {
      const r = source.reading ?? {};
      return {
        label: 'Temperature now',
        value: n(r.temperature2m),
        unit: '°C',
        sub: r.apparentTemperature != null ? `Feels like ${n(r.apparentTemperature)} °C` : undefined,
        tiles: [
          { label: 'Rain', value: `${n(r.precipitation)} mm` },
          { label: 'Humidity', value: `${n(r.relativeHumidity2m, 0)} %` },
          { label: 'Wind', value: `${n(r.windSpeed10m)} km/h` },
        ],
      };
    }
    case 'WEATHER_FORECAST': {
      const f = source.forecast ?? {};
      return {
        label: `Forecast high · ${day(f.forecastDate)}`,
        value: n(f.temperature2mMax, 0),
        unit: '°C',
        sub: f.temperature2mMin != null ? `Low ${n(f.temperature2mMin, 0)} °C` : undefined,
        tiles: [
          { label: 'Chance of rain', value: `${n(f.precipitationProbabilityMax, 0)} %` },
          { label: 'Rain total', value: `${n(f.precipitationSum)} mm` },
          { label: 'Max wind', value: `${n(f.windSpeed10mMax)} km/h` },
        ],
      };
    }
    case 'RIVER_SIGNAL': {
      const f = source.forecast ?? {};
      const ratio = f.riverDischarge != null && f.riverDischargeMean ? f.riverDischarge / f.riverDischargeMean : null;
      return {
        label: `Forecast discharge · ${day(f.forecastDate)}`,
        value: n(f.riverDischarge, f.riverDischarge >= 100 ? 0 : 1),
        unit: 'm³/s',
        sub: [source.station?.riverName, source.station?.name].filter(Boolean).join(' · '),
        tiles: [
          { label: 'Modeled mean', value: `${n(f.riverDischargeMean, 0)} m³/s` },
          { label: 'Versus mean', value: ratio == null ? '—' : `${n(ratio, 1)}×` },
          { label: 'Range', value: `${n(f.riverDischargeMin, 0)}–${n(f.riverDischargeMax, 0)}` },
        ],
      };
    }
    case 'ENVIRONMENTAL_ALERT': {
      const a = source.alert ?? {};
      const sev = SEVERITY[String(a.severity)] ?? SEVERITY.INFO;
      return {
        label: 'Severity',
        value: title(a.severity),
        words: true,
        chip: { text: String(a.status ?? '').toUpperCase(), ...sev },
        tiles: [
          { label: 'Issued', value: day(a.issuedAt) },
          { label: 'Type', value: a.alertType ? title(a.alertType) : 'Environmental' },
          { label: 'Place', value: location },
        ],
      };
    }
    case 'BIODIVERSITY_OBSERVATION': {
      const o = source.occurrence ?? {};
      const sp = o.species ?? {};
      return {
        label: 'Species recorded',
        value: sp.vernacularName || sp.canonicalName || '—',
        words: true,
        sub: sp.vernacularName ? sp.canonicalName : undefined,
        tiles: [
          { label: 'Observed', value: day(o.observedAt) },
          { label: 'Where', value: location },
          { label: 'Kingdom', value: sp.kingdom ?? '—' },
        ],
      };
    }
    case 'DISTRICT_SNAPSHOT': {
      const w = source.weather ?? {};
      const air = source.airQuality ?? {};
      const alerts = Number(source.activeAlerts ?? 0);
      return {
        label: `Temperature now · ${location}`,
        value: n(w.temperature2m, 0),
        unit: '°C',
        sub: w.apparentTemperature != null ? `Feels like ${n(w.apparentTemperature, 0)} °C` : undefined,
        tiles: [
          { label: 'PM2.5 (model)', value: air.pm25 != null ? `${n(air.pm25, 0)} µg/m³` : '—' },
          { label: 'Humidity', value: w.relativeHumidity2m != null ? `${n(w.relativeHumidity2m, 0)} %` : '—' },
          { label: 'Wind', value: w.windSpeed10m != null ? `${n(w.windSpeed10m)} km/h` : '—' },
          { label: 'Active alerts', value: alerts ? String(alerts) : 'None' },
        ],
      };
    }
    case 'NATIONAL_PERIOD_SUMMARY': {
      const s = (Array.isArray(source.ranking?.rows) ? source.ranking.rows[0] : null) ?? {};
      const hi = s.alerts?.highestSeverity;
      return {
        label: `Alerts issued · last ${s.days ?? 7} days`,
        value: n(s.alerts?.issued ?? 0, 0),
        unit: s.alerts?.issued === 1 ? 'alert' : 'alerts',
        sub: hi ? `Highest severity: ${title(hi)}` : 'No alerts issued in this period',
        tiles: [
          { label: s.wettest ? `Rain · ${s.wettest.district}` : 'Wettest (30d)', value: s.wettest ? `${n(s.wettest.rainfallMm, 0)} mm` : '—' },
          { label: s.hottest ? `Heat · ${s.hottest.district}` : 'Warmest (30d)', value: s.hottest ? `${n(s.hottest.avgTemperature)} °C` : '—' },
          { label: s.airQuality ? `PM2.5 · ${s.airQuality.district}` : 'PM2.5 (30d)', value: s.airQuality ? `${n(s.airQuality.avgPm25, 0)} µg/m³` : '—' },
        ],
      };
    }
    default:
      return null;
  }
}

// ─── drawing ─────────────────────────────────────────────────────────────────

export function renderSocialCardSvg(input: SocialCardInput): string {
  const { width: W, height: H } = input;
  const meta = SERIES[input.type] ?? { theme: 'COMMUNITY', label: title(input.type).toUpperCase(), evidence: 'MODEL DATA' };
  const custom = input.type === 'CUSTOM_EDITORIAL';
  const customTheme = custom && typeof input.source.theme === 'string' && THEMES[input.source.theme] ? input.source.theme : meta.theme;
  const customKicker = custom && typeof input.source.kicker === 'string' && input.source.kicker.trim() ? input.source.kicker.trim().toUpperCase() : meta.label;
  const theme: Theme = { ...THEMES[customTheme], label: custom ? customKicker : meta.label, evidence: meta.evidence };
  const portrait = H > W;
  const national = input.type.startsWith('NATIONAL_') || custom;

  const M = 60;
  const headSize = portrait ? 58 : 52;
  const headLines = wrap(input.headline, headSize, W - M * 2 - 40, 2, true);
  const lastBase = 262 + (headLines.length - 1) * (headSize + 10);
  const headerH = lastBase + 104;
  const panelX = 40;
  const panelY = headerH - 52;
  const panelW = W - 80;
  const panelB = H - 40;
  const pad = 44;
  const innerX = panelX + pad;
  const innerW = panelW - pad * 2;

  // Footer is measured first so the evidence area gets every remaining pixel.
  const sumLines = custom ? [] : wrap(input.summary ?? '', 25, innerW, 2);
  const asOf = formatBst(input.observedAt);
  const metaLines = wrap([asOf ? `As of ${asOf}` : '', `Source: ${input.sourceLabel}`].filter(Boolean).join('  ·  '), 18, innerW, 2);
  const discLines = wrap(input.disclaimer ?? '', 17, innerW, 2);
  const footerH = 40 + (custom ? 0 : Math.max(1, sumLines.length)) * 33 + 14 + metaLines.length * 25 + 8 + discLines.length * 23 + 34;
  const contentTop = panelY + 40;
  const contentBottom = panelB - footerH;

  const parts: string[] = [];
  const id = 'g' + theme.key;

  parts.push(
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.a}"/><stop offset="1" stop-color="${theme.b}"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="#eef3f0"/>`,
    `<rect width="${W}" height="${headerH}" fill="url(#${id})"/>`,
    // soft decoration
    `<circle cx="${W - 20}" cy="${headerH - 10}" r="300" fill="#ffffff" fill-opacity="0.07"/>`,
    `<circle cx="${W - 300}" cy="30" r="150" fill="#ffffff" fill-opacity="0.06"/>`,
    `<g transform="translate(${W - 255} ${headerH - 236}) scale(8)" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="${theme.glyph}"/></g>`,
  );

  // brand row
  if (input.logoDataUri) {
    parts.push(
      `<rect x="${M}" y="54" width="88" height="88" rx="22" fill="#ffffff"/>`,
      `<image href="${input.logoDataUri}" x="${M + 10}" y="64" width="68" height="68" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  const brandX = input.logoDataUri ? M + 108 : M;
  parts.push(`<text x="${brandX}" y="108" fill="#ffffff" font-size="30" font-weight="700" letter-spacing="2" font-family="${FONT}">DELTA SIGNAL</text>`);
  const pillW = Math.round(textWidth(theme.evidence, 17, true) + 56 + theme.evidence.length * 1.5);
  parts.push(
    `<rect x="${W - M - pillW}" y="76" width="${pillW}" height="44" rx="22" fill="#ffffff" fill-opacity="0.2"/>`,
    `<text x="${W - M - pillW / 2}" y="105" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="700" letter-spacing="1.5" font-family="${FONT}">${esc(theme.evidence)}</text>`,
  );

  // kicker + headline
  const kicker = national ? theme.label : `${theme.label}${input.location && input.location !== 'Bangladesh' ? ` · ${input.location.toUpperCase()}` : ''}`;
  parts.push(`<text x="${M}" y="200" fill="#ffffff" fill-opacity="0.88" font-size="22" font-weight="700" letter-spacing="3" font-family="${FONT}">${esc(fit(kicker, 22, W - M * 2, true))}</text>`);
  headLines.forEach((line, i) => {
    parts.push(`<text x="${M}" y="${262 + i * (headSize + 10)}" fill="#ffffff" font-size="${headSize}" font-weight="700" font-family="${FONT}">${esc(line)}</text>`);
  });

  // panel with a stacked shadow
  parts.push(
    `<rect x="${panelX}" y="${panelY + 14}" width="${panelW}" height="${panelB - panelY}" rx="40" fill="#0b1410" fill-opacity="0.04"/>`,
    `<rect x="${panelX}" y="${panelY + 7}" width="${panelW}" height="${panelB - panelY}" rx="40" fill="#0b1410" fill-opacity="0.05"/>`,
    `<rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelB - panelY}" rx="40" fill="#ffffff"/>`,
  );

  // evidence area
  const hero = custom ? null : heroFor(input.type, input.source, input.location);
  if (custom) parts.push(drawEditorial(input.summary ?? '', Array.isArray(input.source.highlights) ? input.source.highlights : [], theme, innerX, contentTop, innerW, contentBottom - contentTop, portrait));
  else if (hero) parts.push(drawHero(hero, theme, innerX, contentTop, innerW, contentBottom - contentTop, portrait));
  else if (national) parts.push(drawRanking(rankingRows(input.type, input.source), theme, innerX, contentTop, innerW, contentBottom - contentTop, portrait));

  // footer
  const fy = contentBottom;
  parts.push(`<line x1="${innerX}" y1="${fy}" x2="${innerX + innerW}" y2="${fy}" stroke="#dde5e1" stroke-width="2"/>`);
  let y = fy + 46;
  sumLines.forEach((line, i) => {
    parts.push(`<text x="${innerX}" y="${y + i * 33}" fill="#2c3b36" font-size="25" font-family="${FONT}">${esc(line)}</text>`);
  });
  y += (custom ? 0 : Math.max(1, sumLines.length)) * 33 + 14;
  metaLines.forEach((line, i) => {
    parts.push(`<text x="${innerX}" y="${y + i * 25}" fill="#5f6f68" font-size="18" font-family="${FONT}">${esc(line)}</text>`);
  });
  y += metaLines.length * 25 + 8;
  discLines.forEach((line, i) => {
    parts.push(`<text x="${innerX}" y="${y + i * 23}" fill="#7a8883" font-size="17" font-style="italic" font-family="${FONT}">${esc(line)}</text>`);
  });

  // bottom strip
  parts.push(
    `<rect x="${panelX}" y="${panelB - 8}" width="${panelW}" height="8" rx="4" fill="${theme.a}" fill-opacity="0"/>`,
    `<text x="${W / 2}" y="${H - 14}" text-anchor="middle" fill="#87948f" font-size="15" letter-spacing="1" font-family="${FONT}">Delta Signal · Environmental intelligence for Bangladesh</text>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

function drawRanking(rows: Row[], theme: Theme, x: number, topIn: number, w: number, h: number, portrait: boolean): string {
  if (!rows.length) return '';
  let top = topIn;
  const hasBars = rows.some((r) => r.amount != null && Number.isFinite(r.amount));
  const max = Math.max(...rows.map((r) => (Number.isFinite(r.amount as number) ? (r.amount as number) : 0)), 1);
  const pitch = Math.min(hasBars ? (portrait ? 172 : 128) : portrait ? 200 : 150, h / rows.length);
  top += Math.max(0, (h - pitch * rows.length) / 2);
  const nameSize = portrait ? 33 : 30;
  const out: string[] = [];
  rows.forEach((r, i) => {
    const ry = top + i * pitch;
    const cy = ry + (hasBars ? pitch * 0.36 : pitch / 2);
    const first = i === 0;
    // rank badge
    out.push(
      `<circle cx="${x + 28}" cy="${cy}" r="28" fill="${first ? theme.a : theme.tint}"/>`,
      `<text x="${x + 28}" y="${cy + 11}" text-anchor="middle" fill="${first ? '#ffffff' : theme.b}" font-size="30" font-weight="700" font-family="${FONT}">${i + 1}</text>`,
    );
    const valueText = r.value ? `${r.value}` : '';
    const unitW = r.unit ? textWidth(r.unit, 19, false) + 8 : 0;
    const valueW = r.value ? textWidth(valueText, 38, true) : 0;
    const chipW = r.chip ? Math.round(textWidth(r.chip.text, 17, true) + 34) : 0;
    const rightW = Math.max(valueW + unitW, chipW) + (valueW || chipW ? 24 : 0);
    const nameX = x + 78;
    const nameMax = w - 78 - rightW;
    if (r.sub || !hasBars) {
      // List rows: up to two lines for the name, then the detail line.
      const lines = wrap(String(r.name ?? ''), nameSize, nameMax, hasBars ? 1 : 2, true);
      const total = lines.length * (nameSize + 6) + (r.sub ? 30 : 0);
      let ly = cy - total / 2 + nameSize * 0.85;
      lines.forEach((line, k) => {
        out.push(`<text x="${nameX}" y="${ly + k * (nameSize + 6)}" fill="#17201d" font-size="${nameSize}" font-weight="700" font-family="${FONT}">${esc(line)}</text>`);
      });
      ly += (lines.length - 1) * (nameSize + 6);
      if (r.sub) out.push(`<text x="${nameX}" y="${ly + 32}" fill="#5f6f68" font-size="21" font-family="${FONT}">${esc(fit(r.sub, 21, nameMax))}</text>`);
    } else {
      out.push(`<text x="${nameX}" y="${cy + 11}" fill="#17201d" font-size="${nameSize + 2}" font-weight="700" font-family="${FONT}">${esc(fit(String(r.name ?? ''), nameSize + 2, nameMax, true))}</text>`);
    }
    if (r.value) {
      out.push(`<text x="${x + w}" y="${cy + 12}" text-anchor="end" fill="${first ? theme.a : theme.b}" font-size="38" font-weight="700" font-family="${FONT}">${esc(valueText)}${r.unit ? `<tspan fill="#7a8883" font-size="19" font-weight="400" dx="6">${esc(r.unit)}</tspan>` : ''}</text>`);
    }
    if (r.chip) {
      out.push(
        `<rect x="${x + w - chipW}" y="${cy - 19}" width="${chipW}" height="38" rx="19" fill="${r.chip.bg}"/>`,
        `<text x="${x + w - chipW / 2}" y="${cy + 6}" text-anchor="middle" fill="${r.chip.fg}" font-size="17" font-weight="700" letter-spacing="1" font-family="${FONT}">${esc(r.chip.text)}</text>`,
      );
    }
    if (hasBars && Number.isFinite(r.amount as number)) {
      const by = ry + pitch * 0.36 + 44;
      const bw = w - 78;
      const fill = Math.max(10, ((r.amount as number) / max) * bw);
      out.push(
        `<rect x="${nameX}" y="${by}" width="${bw}" height="14" rx="7" fill="${theme.tint}"/>`,
        `<rect x="${nameX}" y="${by}" width="${fill}" height="14" rx="7" fill="${theme.a}" fill-opacity="${first ? 1 : 0.62}"/>`,
      );
    }
  });
  return out.join('');
}

function drawHero(hero: Hero, theme: Theme, x: number, top: number, w: number, h: number, portrait: boolean): string {
  const out: string[] = [];
  const count = Math.min(hero.tiles.length, 6);
  const cols = count === 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(count / cols));
  const tileH = (portrait ? 168 : 132) - (rows > 1 ? 22 : 0);
  const tileGap = 18;
  const tileW = (w - tileGap * (cols - 1)) / cols;
  const tilesY = top + h - rows * tileH - (rows - 1) * tileGap - 24;
  const blockH = tilesY - top - 22;
  const pad = 40;
  const clip = `hero-${theme.key}`;

  // tinted hero block with a soft circle, so the number has a stage
  out.push(
    `<clipPath id="${clip}"><rect x="${x}" y="${top}" width="${w}" height="${blockH}" rx="36"/></clipPath>`,
    `<rect x="${x}" y="${top}" width="${w}" height="${blockH}" rx="36" fill="${theme.tint}"/>`,
    `<circle cx="${x + w - 40}" cy="${top + blockH - 30}" r="${Math.min(230, blockH * 0.45)}" fill="${theme.a}" fill-opacity="0.08" clip-path="url(#${clip})"/>`,
    `<text x="${x + pad}" y="${top + 62}" fill="${theme.b}" fill-opacity="0.85" font-size="23" font-weight="700" letter-spacing="2" font-family="${FONT}">${esc(hero.label.toUpperCase())}</text>`,
  );

  const midY = top + blockH / 2 + 24;
  if (hero.words) {
    const size = portrait ? 84 : 66;
    const lines = wrap(hero.value, size, w - pad * 2, 2, true);
    const blockTextH = lines.length * (size + 10) + (hero.sub ? 44 : 0) + (hero.chip ? 70 : 0);
    let by = midY - blockTextH / 2 + size * 0.8;
    lines.forEach((line, i) => {
      out.push(`<text x="${x + pad}" y="${by + i * (size + 10)}" fill="${theme.b}" font-size="${size}" font-weight="700" font-family="${FONT}">${esc(line)}</text>`);
    });
    by += (lines.length - 1) * (size + 10);
    if (hero.sub) {
      by += 50;
      out.push(`<text x="${x + pad}" y="${by}" fill="#3a4f48" font-size="30" font-style="italic" font-family="${FONT}">${esc(fit(hero.sub, 30, w - pad * 2))}</text>`);
    }
    if (hero.chip) {
      const cw = Math.round(textWidth(hero.chip.text, 20, true) + 44);
      by += 28;
      out.push(
        `<rect x="${x + pad}" y="${by}" width="${cw}" height="46" rx="23" fill="${hero.chip.bg}"/>`,
        `<text x="${x + pad + cw / 2}" y="${by + 31}" text-anchor="middle" fill="${hero.chip.fg}" font-size="20" font-weight="700" letter-spacing="1.5" font-family="${FONT}">${esc(hero.chip.text)}</text>`,
      );
    }
  } else {
    const size = Math.min(portrait ? 230 : 180, blockH * 0.5);
    const baseline = midY + size * 0.3 - (hero.sub ? 18 : 0);
    const numW = textWidth(hero.value, size, true);
    out.push(`<text x="${x + pad}" y="${baseline}" fill="${theme.a}" font-size="${size}" font-weight="700" letter-spacing="-4" font-family="${FONT}">${esc(hero.value)}</text>`);
    if (hero.unit) out.push(`<text x="${x + pad + numW + 16}" y="${baseline}" fill="${theme.b}" font-size="${Math.round(size * 0.3)}" font-weight="700" font-family="${FONT}">${esc(hero.unit)}</text>`);
    if (hero.sub) out.push(`<text x="${x + pad}" y="${baseline + 62}" fill="#3a4f48" font-size="30" font-family="${FONT}">${esc(fit(hero.sub, 30, w - pad * 2))}</text>`);
  }

  // stat tiles
  hero.tiles.slice(0, 6).forEach((t, i) => {
    const tx = x + (i % cols) * (tileW + tileGap);
    const tilesRowY = tilesY + Math.floor(i / cols) * (tileH + tileGap);
    out.push(
      `<rect x="${tx}" y="${tilesRowY}" width="${tileW}" height="${tileH}" rx="28" fill="${theme.tint}"/>`,
      `<rect x="${tx + 24}" y="${tilesRowY + 28}" width="36" height="6" rx="3" fill="${theme.a}"/>`,
      `<text x="${tx + 24}" y="${tilesRowY + 74}" fill="#5f6f68" font-size="20" font-weight="700" letter-spacing="1" font-family="${FONT}">${esc(fit(t.label.toUpperCase(), 20, tileW - 40, true))}</text>`,
      `<text x="${tx + 24}" y="${tilesRowY + tileH - 32}" fill="${theme.b}" font-size="${portrait ? 36 : 32}" font-weight="700" font-family="${FONT}">${esc(fit(t.value, portrait ? 36 : 32, tileW - 40, true))}</text>`,
    );
  });
  return out.join('');
}

function drawEditorial(summary: string, highlights: Array<{ label?: string; value?: string }>, theme: Theme, x: number, top: number, w: number, h: number, portrait: boolean): string {
  const out: string[] = [];
  const tiles = highlights.filter((t) => t && (t.label || t.value)).slice(0, 4);
  const cols = tiles.length === 1 ? 1 : 2;
  const rows = tiles.length ? Math.ceil(tiles.length / cols) : 0;
  const tileH = portrait ? 170 : 116;
  const gap = 18;
  const tilesH = rows ? rows * tileH + (rows - 1) * gap + 24 : 0;
  const blockH = h - tilesH - (rows ? 22 : 24);
  const pad = 40;
  // Largest type that shows the whole summary; only the smallest size may truncate.
  const sizes = tiles.length ? (portrait ? [42, 36, 32, 28] : [36, 32, 28, 26]) : portrait ? [64, 54, 46, 40, 34] : [54, 46, 40, 34, 30];
  let size = sizes[sizes.length - 1];
  let lines: string[] = [];
  for (const candidate of sizes) {
    const room = Math.max(2, Math.floor((blockH - 56) / (candidate + 12)));
    const attempt = wrap(summary, candidate, w - pad * 2 - 20, room);
    size = candidate;
    lines = attempt;
    if (!attempt.length || !attempt[attempt.length - 1].endsWith('…')) break;
  }
  const textH = lines.length * (size + 12);
  out.push(
    `<rect x="${x}" y="${top}" width="${w}" height="${blockH}" rx="36" fill="${theme.tint}"/>`,
    `<rect x="${x + pad}" y="${top + blockH / 2 - textH / 2 - 6}" width="8" height="${textH + 12}" rx="4" fill="${theme.a}"/>`,
  );
  lines.forEach((line, i) => {
    out.push(`<text x="${x + pad + 30}" y="${top + blockH / 2 - textH / 2 + size * 0.85 + i * (size + 12)}" fill="${theme.b}" font-size="${size}" font-family="${FONT}">${esc(line)}</text>`);
  });
  const tileW = (w - gap * (cols - 1)) / cols;
  const ty0 = top + blockH + 22;
  tiles.forEach((t, i) => {
    const tx = x + (i % cols) * (tileW + gap);
    const ty = ty0 + Math.floor(i / cols) * (tileH + gap);
    out.push(
      `<rect x="${tx}" y="${ty}" width="${tileW}" height="${tileH}" rx="28" fill="${theme.tint}"/>`,
      `<rect x="${tx + 24}" y="${ty + (portrait ? 26 : 20)}" width="36" height="6" rx="3" fill="${theme.a}"/>`,
      `<text x="${tx + 24}" y="${ty + (portrait ? 70 : 56)}" fill="#5f6f68" font-size="20" font-weight="700" letter-spacing="1" font-family="${FONT}">${esc(fit(String(t.label ?? '').toUpperCase(), 20, tileW - 40, true))}</text>`,
      `<text x="${tx + 24}" y="${ty + tileH - (portrait ? 30 : 24)}" fill="${theme.b}" font-size="${portrait ? 46 : 34}" font-weight="700" font-family="${FONT}">${esc(fit(String(t.value ?? ''), portrait ? 46 : 34, tileW - 40, true))}</text>`,
    );
  });
  return out.join('');
}
