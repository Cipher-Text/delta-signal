import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SocialCardFormat, SocialContentType, SocialDraftStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';
import { ensureBengaliFontconfig } from '../common/svg-fonts';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateSocialDraftDto } from './dto/create-social-draft.dto';
import { UpdateSocialDraftDto } from './dto/update-social-draft.dto';
import { MarkPublishedDto } from './dto/mark-published.dto';
import { NationalRankingService } from './national-ranking.service';
import { renderSocialCardSvg } from './social-card-renderer';

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
    ensureBengaliFontconfig();
    const png = await sharp(Buffer.from(svg), { density: 144 })
      .resize(dimensions.width, dimensions.height)
      .png()
      .toBuffer();
    const contentHash = createHash('sha256').update(png).digest('hex');
    // A re-render with unchanged inputs produces byte-identical PNGs (same
    // contentHash), so the hash alone isn't enough to keep storageKey unique
    // across separate render attempts — append a random suffix per attempt.
    const uniqueSuffix = randomBytes(4).toString('hex');
    const key = `social-cards/${draft.id}/${draft.format.toLowerCase()}-${contentHash.slice(0, 16)}-${uniqueSuffix}.png`;
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
    if (dto.type === SocialContentType.CUSTOM_EDITORIAL) {
      if (!dto.headline) throw new BadRequestException('A headline is required for a custom card');
      return {
        sourceId: null,
        sourceLabel: 'Delta Signal editorial',
        observedAt: new Date(),
        snapshot: { kind: dto.type, theme: dto.theme ?? 'SKY', kicker: dto.kicker ?? null, highlights: dto.highlights ?? [] },
        defaultHeadline: dto.headline,
        defaultSummary: dto.summary ?? '',
        defaultDisclaimer: 'Editorial content prepared by the Delta Signal team.',
      };
    }
    if (dto.type.startsWith('NATIONAL_')) {
      const cadence = dto.cadence ?? 'DAILY';
      const suggestions = await this.ranking.getSuggestions(cadence);
      const baseByType: Record<string, string> = {
        NATIONAL_RAIN_WATCH: 'RAIN_WATCH',
        NATIONAL_AIR_QUALITY_WATCH: 'AIR_QUALITY_WATCH',
        NATIONAL_HEAT_WATCH: 'HEAT_WATCH',
        NATIONAL_RIVER_WATCH: 'RIVER_WATCH',
        NATIONAL_ALERT_WATCH: 'ALERT_WATCH',
        NATIONAL_COASTAL_WATCH: 'COASTAL_WATCH',
        NATIONAL_PERIOD_SUMMARY: 'PERIOD_SUMMARY',
      };
      // Weather rankings are cadence-prefixed (WEEKLY_RAIN_WATCH); the others keep one name across cadences.
      const base = baseByType[dto.type];
      // Community Signals and Wild Bangladesh rankings are no longer produced (suggestions ignore citizen reports and observations).
      if (!base) throw new BadRequestException('This national card type is no longer produced from suggestions');
      const prefixed = cadence !== 'DAILY' && ['RAIN_WATCH', 'AIR_QUALITY_WATCH', 'HEAT_WATCH'].includes(base);
      const wanted = prefixed ? `${cadence}_${base}` : base;
      if (dto.type === SocialContentType.NATIONAL_PERIOD_SUMMARY && cadence === 'DAILY') throw new BadRequestException('Period summaries need a weekly or monthly cadence');
      const suggestion = suggestions.find((item) => item.series === wanted);
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
    if (dto.type === SocialContentType.DISTRICT_SNAPSHOT) {
      const now = new Date();
      const [weather, air, climate, alertCount] = await Promise.all([
        this.prisma.currentWeatherReading.findFirst({ where: { districtId: dto.districtId }, orderBy: { readingTime: 'desc' } }),
        this.prisma.hourlyAirQuality.findFirst({ where: { districtId: dto.districtId, forecastTime: { lte: now } }, orderBy: { forecastTime: 'desc' } }),
        this.prisma.district.findUnique({ where: { id: dto.districtId }, select: { totalPrecip30d: true, avgTemp30d: true, avgPm25_30d: true } }),
        this.prisma.alert.count({ where: { status: 'ACTIVE', OR: [{ districtId: dto.districtId }, { areas: { some: { districtId: dto.districtId } } }] } }),
      ]);
      if (!weather && !air) throw new BadRequestException('No current weather or air-quality data is available for this district');
      const parts = [weather?.temperature2m != null ? `${Math.round(weather.temperature2m)}°C` : null, air?.pm25 != null ? `PM2.5 ${Math.round(air.pm25)} µg/m³` : null].filter(Boolean);
      return {
        sourceId: weather?.id ?? air?.id ?? null,
        sourceLabel: 'Open-Meteo current weather and air-quality model, Delta Signal alerts',
        observedAt: weather?.readingTime ?? air?.forecastTime ?? now,
        snapshot: { ...base, kind: dto.type, weather, airQuality: air, climate30d: climate, activeAlerts: alertCount },
        defaultHeadline: `${district.name} right now`,
        defaultSummary: parts.length ? `${parts.join(', ')}. ${alertCount ? `${alertCount} active alert${alertCount === 1 ? '' : 's'}.` : 'No active alerts.'}` : 'A snapshot of current conditions.',
        defaultDisclaimer: 'Model-based values; local conditions may differ. Not an official AQI or forecast.',
      };
    }
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
    return renderSocialCardSvg({
      type: draft.type,
      headline: draft.headline,
      summary: draft.summary ?? null,
      disclaimer: draft.disclaimer ?? null,
      sourceLabel: draft.sourceLabel,
      observedAt: draft.sourceObservedAt ?? null,
      location: draft.district?.name ?? source.district?.name ?? 'Bangladesh',
      source,
      width,
      height,
      logoDataUri: deltaSignalLogoDataUri(),
    });
  }
}
