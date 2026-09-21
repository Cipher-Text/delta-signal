import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SocialCardFormat, SocialContentType, SocialDraftStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateSocialDraftDto } from './dto/create-social-draft.dto';
import { UpdateSocialDraftDto } from './dto/update-social-draft.dto';
import { MarkPublishedDto } from './dto/mark-published.dto';
import { NationalRankingService } from './national-ranking.service';

const DRAFT_INCLUDE = {
  district: { select: { id: true, name: true, bnName: true, division: { select: { name: true } } } },
  createdBy: { select: { id: true, displayName: true } },
  approvedBy: { select: { id: true, displayName: true } },
  renderedAssets: { orderBy: { createdAt: 'desc' as const } },
  publications: {
    orderBy: { createdAt: 'desc' as const },
    include: { platformAccount: { select: { id: true, platform: true, displayName: true } } },
  },
} as const;

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const text = (value: unknown) => value == null ? '' : String(value);

const seriesLabelFor = (type: SocialContentType): string => {
  switch (type) {
    case SocialContentType.CURRENT_WEATHER: return 'TODAY IN BANGLADESH';
    case SocialContentType.WEATHER_FORECAST: return 'RAIN WATCH';
    case SocialContentType.RIVER_SIGNAL: return 'RIVER WATCH';
    case SocialContentType.ENVIRONMENTAL_ALERT: return 'ALERT EXPLAINER';
    case SocialContentType.BIODIVERSITY_OBSERVATION: return 'WILD BANGLADESH';
    case SocialContentType.NATIONAL_RAIN_WATCH: return 'BANGLADESH RAIN WATCH';
    case SocialContentType.NATIONAL_AIR_QUALITY_WATCH: return 'BANGLADESH AIR QUALITY WATCH';
    case SocialContentType.NATIONAL_HEAT_WATCH: return 'BANGLADESH HEAT WATCH';
    case SocialContentType.NATIONAL_RIVER_WATCH: return 'RIVER WATCH BANGLADESH';
    case SocialContentType.NATIONAL_ALERT_WATCH: return 'BANGLADESH ALERT WATCH';
    case SocialContentType.NATIONAL_COMMUNITY_SIGNALS: return 'COMMUNITY SIGNALS BANGLADESH';
    case SocialContentType.NATIONAL_BIODIVERSITY: return 'WILD BANGLADESH';
    default: return String(type).replaceAll('_', ' ');
  }
};

const evidenceLabelFor = (type: SocialContentType): string => {
  switch (type) {
    case SocialContentType.WEATHER_FORECAST:
    case SocialContentType.RIVER_SIGNAL: return 'FORECAST';
    case SocialContentType.ENVIRONMENTAL_ALERT: return 'ALERT';
    case SocialContentType.BIODIVERSITY_OBSERVATION: return 'GBIF OBSERVATION';
    case SocialContentType.NATIONAL_ALERT_WATCH: return 'ALERT';
    case SocialContentType.NATIONAL_COMMUNITY_SIGNALS: return 'VERIFIED REPORTS';
    case SocialContentType.NATIONAL_BIODIVERSITY: return 'GBIF OBSERVATION';
    case SocialContentType.NATIONAL_RAIN_WATCH:
    case SocialContentType.NATIONAL_AIR_QUALITY_WATCH:
    case SocialContentType.NATIONAL_HEAT_WATCH:
    case SocialContentType.NATIONAL_RIVER_WATCH: return 'NATIONAL DATA';
    default: return 'MODEL DATA';
  }
};

function deltaSignalLogoDataUri(): string {
  const candidates = [
    resolve(process.cwd(), 'apps/admin/public/logo.svg'),
    resolve(process.cwd(), '../../apps/admin/public/logo.svg'),
  ];
  const logoPath = candidates.find((candidate) => existsSync(candidate));
  return logoPath ? `data:image/svg+xml;base64,${readFileSync(logoPath).toString('base64')}` : '';
}

@Injectable()
export class SocialContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ranking: NationalRankingService,
  ) {}

  list(status?: SocialDraftStatus) {
    return this.prisma.socialPostDraft.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: DRAFT_INCLUDE,
    });
  }

  async getById(id: string) {
    const draft = await this.prisma.socialPostDraft.findUnique({ where: { id }, include: DRAFT_INCLUDE });
    if (!draft) throw new NotFoundException('Social draft not found');
    return draft;
  }

  async create(dto: CreateSocialDraftDto, actor: JwtPayload) {
    const source = await this.loadSource(dto);
    const headline = dto.headline ?? source.defaultHeadline;
    const summary = dto.summary ?? source.defaultSummary;
    const disclaimer = dto.disclaimer ?? source.defaultDisclaimer;
    const draft = await this.prisma.socialPostDraft.create({
      data: {
        type: dto.type,
        format: dto.format ?? SocialCardFormat.PORTRAIT_4_5,
        locale: dto.locale ?? 'en',
        headline,
        summary,
        caption: dto.caption ?? `${headline}. ${summary}`,
        disclaimer,
        districtId: dto.districtId,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        sourceObservedAt: source.observedAt,
        sourceSnapshot: source.snapshot as Prisma.InputJsonValue,
        createdById: actor.sub,
      },
      include: DRAFT_INCLUDE,
    });
    await this.prisma.auditEvent.create({
      data: {
        action: 'SOCIAL_DRAFT_CREATE',
        userId: actor.sub,
        entityType: 'SocialPostDraft',
        entityId: draft.id,
        meta: { type: dto.type, sourceId: source.sourceId, sourceLabel: source.sourceLabel },
      },
    });
    return draft;
  }

  async update(id: string, dto: UpdateSocialDraftDto, actor: JwtPayload) {
    const existing = await this.getById(id);
    if (existing.status === SocialDraftStatus.APPROVED || existing.status === SocialDraftStatus.ARCHIVED) {
      throw new ConflictException('Approved or archived drafts cannot be edited');
    }
    const draft = await this.prisma.socialPostDraft.update({
      where: { id },
      data: { ...dto, status: SocialDraftStatus.DRAFT, updatedById: actor.sub, approvedAt: null, approvedById: null },
      include: DRAFT_INCLUDE,
    });
    await this.prisma.auditEvent.create({
      data: { action: 'SOCIAL_DRAFT_UPDATE', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id },
    });
    return draft;
  }

  async render(id: string, actor: JwtPayload) {
    const draft = await this.getById(id);
    if (draft.status === SocialDraftStatus.APPROVED || draft.status === SocialDraftStatus.ARCHIVED) {
      throw new ConflictException('Approved or archived drafts cannot be rendered; edit the draft first to return it to DRAFT status');
    }
    const dimensions = draft.format === SocialCardFormat.SQUARE_1_1
      ? { width: 1080, height: 1080 }
      : { width: 1080, height: 1350 };
    const svg = this.renderSvg(draft, dimensions.width, dimensions.height);
    const png = await sharp(Buffer.from(svg), { density: 144 })
      .resize(dimensions.width, dimensions.height)
      .png()
      .toBuffer();
    const contentHash = createHash('sha256').update(png).digest('hex');
    const key = `social-cards/${draft.id}/${draft.format.toLowerCase()}-${contentHash.slice(0, 16)}.png`;
    const publicUrl = await this.storage.upload(key, png, 'image/png', 'attachment');
    const asset = await this.prisma.socialRenderedAsset.create({
      data: {
        draftId: id,
        format: draft.format,
        width: dimensions.width,
        height: dimensions.height,
        storageKey: key,
        publicUrl,
        contentHash,
        renderVersion: 'png-v1',
      },
    });
    await this.prisma.socialPostDraft.update({ where: { id }, data: { status: SocialDraftStatus.RENDERED } });
    await this.prisma.auditEvent.create({
      data: { action: 'SOCIAL_CARD_RENDER', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id, meta: { assetId: asset.id, contentHash } },
    });
    return this.getById(id);
  }

  async approve(id: string, actor: JwtPayload) {
    const draft = await this.getById(id);
    if (draft.status !== SocialDraftStatus.RENDERED || draft.renderedAssets.length === 0) {
      throw new ConflictException('Render the card before approving it');
    }
    const approved = await this.prisma.socialPostDraft.update({
      where: { id },
      data: { status: SocialDraftStatus.APPROVED, approvedById: actor.sub, approvedAt: new Date() },
      include: DRAFT_INCLUDE,
    });
    await this.prisma.auditEvent.create({ data: { action: 'SOCIAL_DRAFT_APPROVE', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id } });
    return approved;
  }

  async archive(id: string, actor: JwtPayload) {
    await this.getById(id);
    const archived = await this.prisma.socialPostDraft.update({ where: { id }, data: { status: SocialDraftStatus.ARCHIVED }, include: DRAFT_INCLUDE });
    await this.prisma.auditEvent.create({ data: { action: 'SOCIAL_DRAFT_ARCHIVE', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id } });
    return archived;
  }

  async markPublished(id: string, dto: MarkPublishedDto, actor: JwtPayload) {
    const draft = await this.getById(id);
    if (draft.status !== SocialDraftStatus.APPROVED) throw new ConflictException('Only approved cards can be marked published');
    const published = await this.prisma.socialPostDraft.update({ where: { id }, data: { publishedAt: new Date(), publishedNote: dto.note }, include: DRAFT_INCLUDE });
    await this.prisma.auditEvent.create({ data: { action: 'SOCIAL_PUBLICATION_MARK', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id, meta: { note: dto.note } } });
    return published;
  }

  async download(id: string, actor: JwtPayload) {
    const draft = await this.getById(id);
    if (draft.status !== SocialDraftStatus.APPROVED) throw new ConflictException('Only approved cards can be downloaded');
    const asset = draft.renderedAssets[0];
    if (!asset) throw new NotFoundException('Rendered asset not found');
    await this.prisma.auditEvent.create({ data: { action: 'SOCIAL_CARD_DOWNLOAD', userId: actor.sub, entityType: 'SocialPostDraft', entityId: id, meta: { assetId: asset.id } } });
    return { url: asset.publicUrl, format: asset.format, width: asset.width, height: asset.height };
  }

  private async loadSource(dto: CreateSocialDraftDto) {
    if (dto.type.startsWith('NATIONAL_')) {
      const cadence = dto.cadence ?? 'DAILY';
      const suggestions = await this.ranking.getSuggestions(cadence);
      const seriesByType: Record<string, string> = {
        NATIONAL_RAIN_WATCH: 'RAIN_WATCH',
        NATIONAL_AIR_QUALITY_WATCH: 'AIR_QUALITY_WATCH',
        NATIONAL_HEAT_WATCH: 'HEAT_WATCH',
        NATIONAL_RIVER_WATCH: 'RIVER_WATCH',
        NATIONAL_ALERT_WATCH: 'ALERT_WATCH',
        NATIONAL_COMMUNITY_SIGNALS: 'COMMUNITY_SIGNALS',
        NATIONAL_BIODIVERSITY: 'WILD_BANGLADESH',
      };
      const suggestion = suggestions.find((item) => item.series === seriesByType[dto.type]);
      if (!suggestion) throw new BadRequestException(`No ${cadence.toLowerCase()} data is currently available for this national card`);
      return {
        sourceId: suggestion.id,
        sourceLabel: suggestion.sourceLabel,
        observedAt: new Date(suggestion.windowEnd),
        snapshot: { kind: dto.type, series: suggestion.series, cadence, headline: suggestion.headline, reason: suggestion.reason, coverage: suggestion.coverage, ranking: suggestion.sourceSnapshot },
        defaultHeadline: suggestion.headline,
        defaultSummary: suggestion.reason,
        defaultDisclaimer: suggestion.series === 'AIR_QUALITY_WATCH' ? 'Modeled PM2.5 values are not direct ground-station measurements or an official AQI.' : 'National ranking generated from the available source data for the stated time window.',
      };
    }
    if (!dto.districtId) throw new BadRequestException('A district is required for district-level cards');
    const district = await this.prisma.district.findUnique({ where: { id: dto.districtId }, select: { id: true, name: true, bnName: true } });
    if (!district) throw new NotFoundException('District not found');
    const base = { district: { id: district.id, name: district.name, bnName: district.bnName } };
    if (dto.type === SocialContentType.CURRENT_WEATHER) {
      const row = await this.prisma.currentWeatherReading.findFirst({ where: { districtId: dto.districtId }, orderBy: { readingTime: 'desc' } });
      if (!row) throw new BadRequestException('No current weather data is available for this district');
      return { sourceId: row.id, sourceLabel: 'Open-Meteo current weather', observedAt: row.readingTime, snapshot: { ...base, kind: dto.type, reading: row }, defaultHeadline: `${district.name}: current weather`, defaultSummary: row.temperature2m == null ? 'Current weather data is available.' : `Temperature is ${row.temperature2m}°C with ${row.relativeHumidity2m ?? '—'}% relative humidity.`, defaultDisclaimer: 'Current model-based weather data; conditions may vary locally.' };
    }
    if (dto.type === SocialContentType.WEATHER_FORECAST) {
      const row = await this.prisma.dailyWeatherForecast.findFirst({ where: { districtId: dto.districtId, forecastDate: { gte: new Date() } }, orderBy: { forecastDate: 'asc' } });
      if (!row) throw new BadRequestException('No weather forecast is available for this district');
      return { sourceId: row.id, sourceLabel: 'Open-Meteo daily forecast', observedAt: row.createdAt, snapshot: { ...base, kind: dto.type, forecast: row }, defaultHeadline: `${district.name}: weather forecast`, defaultSummary: `Forecast for ${row.forecastDate.toISOString().slice(0, 10)}: ${row.temperature2mMin ?? '—'}–${row.temperature2mMax ?? '—'}°C, precipitation probability ${row.precipitationProbabilityMax ?? '—'}%.`, defaultDisclaimer: 'Forecast data from Open-Meteo; forecast conditions can change.' };
    }
    if (dto.type === SocialContentType.RIVER_SIGNAL) {
      if (!dto.stationId) throw new BadRequestException('A river station is required for river cards');
      const station = await this.prisma.waterLevelStation.findUnique({ where: { id: dto.stationId }, include: { district: { select: { name: true } } } });
      if (!station) throw new NotFoundException('River station not found');
      const row = await this.prisma.stationFloodForecast.findFirst({ where: { stationId: dto.stationId, forecastDate: { gte: new Date() } }, orderBy: { forecastDate: 'asc' } });
      if (!row) throw new BadRequestException('No river discharge forecast is available for this station');
      return { sourceId: row.id, sourceLabel: 'Open-Meteo flood discharge forecast', observedAt: row.createdAt, snapshot: { ...base, kind: dto.type, station: { id: station.id, name: station.name, riverName: station.riverName }, forecast: row }, defaultHeadline: `${station.riverName}: discharge forecast`, defaultSummary: `Forecast discharge is ${row.riverDischarge ?? '—'} m³/s for ${row.forecastDate.toISOString().slice(0, 10)}.`, defaultDisclaimer: 'Discharge forecast is not a declaration of flooding. Check official alerts and local water levels.' };
    }
    if (!dto.sourceId) throw new BadRequestException('A source record is required for this card type');
    if (dto.type === SocialContentType.ENVIRONMENTAL_ALERT) {
      const row = await this.prisma.alert.findFirst({ where: { id: dto.sourceId, status: 'ACTIVE' }, include: { areas: true } });
      if (!row) throw new BadRequestException('The selected alert is not active');
      return { sourceId: row.id, sourceLabel: 'Delta Signal environmental alert', observedAt: row.issuedAt, snapshot: { ...base, kind: dto.type, alert: row }, defaultHeadline: row.title, defaultSummary: row.description, defaultDisclaimer: 'Follow the official alert instructions and local authority guidance.' };
    }
    const occurrence = await this.prisma.occurrence.findUnique({ where: { id: dto.sourceId }, include: { species: true } });
    if (!occurrence) throw new NotFoundException('Biodiversity occurrence not found');
    return { sourceId: occurrence.id, sourceLabel: 'GBIF biodiversity occurrence', observedAt: occurrence.observedAt ?? occurrence.createdAt, snapshot: { ...base, kind: dto.type, occurrence: { ...occurrence, gbifOccurrenceKey: occurrence.gbifOccurrenceKey.toString() } }, defaultHeadline: `Species observation: ${occurrence.species.canonicalName}`, defaultSummary: `A ${occurrence.species.canonicalName} observation was recorded in ${district.name}.`, defaultDisclaimer: 'This is an observation record, not an estimate of population size or trend.' };
  }

  private renderSvg(draft: any, width: number, height: number) {
    const source = draft.sourceSnapshot as Record<string, any>;
    const location = draft.district?.name ?? source.district?.name ?? 'Bangladesh';
    const metrics = this.metricsFor(draft.type, source);
    const national = draft.type.startsWith('NATIONAL_');
    const metricMarkup = metrics.map((metric: { label: string; value: string }, index: number) => {
      if (national) {
        const y = 500 + index * 62;
        return `<text x="90" y="${y}" fill="#172026" font-size="25" font-weight="700" font-family="Arial, sans-serif">${escapeXml(`${index + 1}. ${metric.label}`)}</text><text x="${width - 90}" y="${y}" text-anchor="end" fill="#2e7b83" font-size="25" font-weight="700" font-family="Arial, sans-serif">${escapeXml(metric.value)}</text>`;
      }
      const y = 560 + index * 112;
      return `<text x="90" y="${y}" fill="#5b6d74" font-size="24" font-family="Arial, sans-serif">${escapeXml(metric.label)}</text><text x="90" y="${y + 48}" fill="#172026" font-size="40" font-weight="700" font-family="Arial, sans-serif">${escapeXml(metric.value)}</text>`;
    }).join('');
    const logo = deltaSignalLogoDataUri();
    const seriesLabel = seriesLabelFor(draft.type);
    const evidenceLabel = evidenceLabelFor(draft.type);
    const asOf = draft.sourceObservedAt ? `As of ${String(draft.sourceObservedAt).slice(0, 16).replace('T', ' ')}` : '';
    const brand = logo
      ? `<image href="${logo}" x="70" y="55" width="96" height="96" preserveAspectRatio="xMidYMid meet"/><text x="190" y="120" fill="#172026" font-size="28" font-weight="700" font-family="Arial, sans-serif">DELTA SIGNAL</text>`
      : `<text x="90" y="120" fill="#172026" font-size="28" font-weight="700" font-family="Arial, sans-serif">DELTA SIGNAL</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f0f4f5"/><rect x="0" y="0" width="${width}" height="24" fill="#3d9fa8"/>${brand}<text x="90" y="245" fill="#2e7b83" font-size="22" font-weight="700" letter-spacing="1" font-family="Arial, sans-serif">${escapeXml(seriesLabel)}</text><rect x="${width - 330}" y="205" width="240" height="48" rx="24" fill="#d9ecee"/><text x="${width - 210}" y="237" text-anchor="middle" fill="#246b73" font-size="17" font-weight="700" font-family="Arial, sans-serif">${escapeXml(evidenceLabel)}</text><text x="90" y="315" fill="#172026" font-size="48" font-weight="700" font-family="Arial, sans-serif">${escapeXml(location)}</text><text x="90" y="410" fill="#172026" font-size="38" font-weight="700" font-family="Arial, sans-serif">${escapeXml(draft.headline)}</text>${metricMarkup}<line x1="90" y1="${height - 230}" x2="${width - 90}" y2="${height - 230}" stroke="#d4dcdf"/><text x="90" y="${height - 175}" fill="#3a4f58" font-size="22" font-family="Arial, sans-serif">${escapeXml(draft.summary ?? '')}</text><text x="90" y="${height - 130}" fill="#5b6d74" font-size="18" font-family="Arial, sans-serif">${escapeXml(asOf)}</text><text x="90" y="${height - 95}" fill="#5b6d74" font-size="18" font-family="Arial, sans-serif">Source: ${escapeXml(draft.sourceLabel)}</text><text x="90" y="${height - 55}" fill="#8a9fa8" font-size="17" font-family="Arial, sans-serif">${escapeXml(draft.disclaimer ?? '')}</text></svg>`;
  }

  private metricsFor(type: SocialContentType, source: Record<string, any>) {
    if (type === SocialContentType.CURRENT_WEATHER) return [{ label: 'Temperature', value: `${source.reading?.temperature2m ?? '—'} °C` }, { label: 'Precipitation', value: `${source.reading?.precipitation ?? '—'} mm` }];
    if (type === SocialContentType.WEATHER_FORECAST) return [{ label: 'Forecast high', value: `${source.forecast?.temperature2mMax ?? '—'} °C` }, { label: 'Rain probability', value: `${source.forecast?.precipitationProbabilityMax ?? '—'}%` }];
    if (type === SocialContentType.RIVER_SIGNAL) return [{ label: 'Forecast discharge', value: `${source.forecast?.riverDischarge ?? '—'} m³/s` }, { label: 'Forecast date', value: `${String(source.forecast?.forecastDate ?? '').slice(0, 10)}` }];
    if (type === SocialContentType.ENVIRONMENTAL_ALERT) return [{ label: 'Severity', value: text(source.alert?.severity) }, { label: 'Status', value: text(source.alert?.status) }];
    if (type.startsWith('NATIONAL_')) {
      const rows = Array.isArray(source.ranking?.rows) ? source.ranking.rows : [];
      return rows.slice(0, 5).map((row: Record<string, unknown>) => ({
        label: text(row.district ?? row.station ?? row.species ?? row.title ?? 'Bangladesh'),
        value: text(row.rainfallMm ?? row.pm25 ?? row.avgPm25 ?? row.apparentTemperature ?? row.avgTemperature ?? row.discharge ?? row.severity ?? row.category ?? ''),
      }));
    }
    return [{ label: 'Species', value: text(source.occurrence?.species?.canonicalName) }, { label: 'Observed', value: text(source.occurrence?.observedAt ?? '').slice(0, 10) }];
  }
}
