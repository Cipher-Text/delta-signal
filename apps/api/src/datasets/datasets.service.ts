import { BadRequestException, Injectable, NotFoundException, OnModuleInit, Logger, ForbiddenException, ConflictException } from '@nestjs/common';
import { DatasetCategory, DatasetAccessPolicy, DatasetAccessRequestStatus } from '@prisma/client';
import { PublishDatasetVersionDto } from './dto/publish-dataset-version.dto';
import { PrismaService } from '../database/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { SEED_DATASETS } from './seed/catalog';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { RequestDatasetAccessDto } from './dto/request-dataset-access.dto';
import { DecideDatasetAccessDto } from './dto/decide-dataset-access.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';

const DATASET_SELECT = {
  id: true,
  name: true,
  category: true,
  accessPolicy: true,
  source: true,
  providerId: true,
  description: true,
  recordCount: true,
  lastSyncedAt: true,
  isPublished: true,
  license: true,
  refreshCron: true,
  version: true,
  spatialExtent: true,
  createdAt: true,
  updatedAt: true,
  provider: { select: { id: true, name: true, type: true } },
} as const;

const VERSION_SELECT = {
  id: true,
  version: true,
  notes: true,
  publishedAt: true,
  publishedBy: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class DatasetsService implements OnModuleInit {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.dataset.count();
    if (count === 0) {
      await this.seed();
    } else {
      await this.ensureFloodDataset();
    }
  }

  private async seed() {
    this.logger.log('Seeding dataset catalog…');
    await this.prisma.dataset.createMany({ data: SEED_DATASETS });
    this.logger.log(`Dataset catalog seeded: ${SEED_DATASETS.length} records`);
  }

  private async ensureFloodDataset() {
    const exists = await this.prisma.dataset.findFirst({
      where: { source: 'openmeteo-flood' },
      select: { id: true },
    });
    if (exists) return;

    const floodDataset = SEED_DATASETS.find((dataset) => dataset.source === 'openmeteo-flood');
    if (!floodDataset) return;
    await this.prisma.dataset.create({ data: floodDataset });
    this.logger.log('Added dataset catalog entry: OpenMeteo Flood Forecasts');
  }

  list(category?: DatasetCategory, accessPolicy?: DatasetAccessPolicy, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = {
      isPublished: true,
      ...(category ? { category } : {}),
      ...(accessPolicy ? { accessPolicy } : {}),
    };
    return Promise.all([
      this.prisma.dataset.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: DATASET_SELECT,
      }),
      this.prisma.dataset.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async getById(id: string) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id },
      select: DATASET_SELECT,
    });
    if (!dataset) throw new NotFoundException('Dataset not found');
    return dataset;
  }

  listAll() {
    return this.prisma.dataset
      .findMany({ orderBy: { name: 'asc' }, select: DATASET_SELECT })
      .then((data) => ({ data, total: data.length }));
  }

  async update(id: string, dto: UpdateDatasetDto, actor: JwtPayload) {
    await this.getById(id);
    const updated = await this.prisma.dataset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.accessPolicy !== undefined ? { accessPolicy: dto.accessPolicy } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.license !== undefined ? { license: dto.license } : {}),
        ...(dto.refreshCron !== undefined ? { refreshCron: dto.refreshCron } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.spatialExtent !== undefined ? { spatialExtent: dto.spatialExtent } : {}),
      },
      select: DATASET_SELECT,
    });
    await this.prisma.auditEvent.create({
      data: {
        action: 'DATASET_UPDATE',
        userId: actor.sub,
        entityType: 'Dataset',
        entityId: id,
        meta: JSON.parse(JSON.stringify(dto)),
      },
    });
    return updated;
  }

  async create(dto: CreateDatasetDto, actor: JwtPayload) {
    if (dto.providerId) {
      const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId }, select: { id: true } });
      if (!provider) throw new BadRequestException('Provider not found');
    }

    const dataset = await this.prisma.dataset.create({
      data: {
        name: dto.name,
        category: dto.category,
        accessPolicy: dto.accessPolicy,
        source: dto.source,
        description: dto.description ?? null,
        providerId: dto.providerId ?? null,
        license: dto.license ?? null,
        refreshCron: dto.refreshCron ?? null,
        version: dto.version ?? null,
        spatialExtent: dto.spatialExtent ?? null,
      },
      select: DATASET_SELECT,
    });
    await this.prisma.auditEvent.create({
      data: {
        action: 'DATASET_UPDATE',
        userId: actor.sub,
        entityType: 'Dataset',
        entityId: dataset.id,
        meta: { event: 'created', ...JSON.parse(JSON.stringify(dto)) },
      },
    });
    return dataset;
  }

  /** Access-policy-aware download info. Requires authenticated user. */
  async download(id: string, user: JwtPayload, ipAddress?: string) {
    const dataset = await this.getById(id);

    switch (dataset.accessPolicy) {
      case 'PUBLIC':
      case 'LOGIN_REQUIRED':
        // Any authenticated user is permitted.
        break;
      case 'RESEARCHER':
        if (!['RESEARCHER', 'ADMIN'].includes(user.role)) {
          throw new ForbiddenException('RESEARCHER role or above required');
        }
        break;
      case 'APPROVED': {
        const request = await this.prisma.datasetAccessRequest.findUnique({
          where: { datasetId_userId: { datasetId: id, userId: user.sub } },
          select: { status: true },
        });
        if (request?.status !== 'APPROVED') {
          throw new ForbiddenException(
            'Access not approved — submit an access request for this dataset',
          );
        }
        break;
      }
      case 'GOVERNMENT':
        // The role enum value is GOVERNMENT (there is no GOVERNMENT_AGENCY role).
        if (!['GOVERNMENT', 'ADMIN'].includes(user.role)) {
          throw new ForbiddenException('GOVERNMENT role or above required');
        }
        break;
    }

    await this.prisma.auditEvent.create({
      data: {
        action: 'DATASET_ACCESS',
        userId: user.sub,
        entityType: 'Dataset',
        entityId: id,
        meta: { policy: dataset.accessPolicy },
        ipAddress: ipAddress ?? null,
      },
    });

    return {
      dataset,
      access: 'GRANTED',
      downloadUrl: null as string | null,
      note: 'Data is available via the API endpoints listed below. Direct file download is not yet supported.',
      apiEndpoints: this.resolveApiEndpoints(dataset.category),
    };
  }

  private resolveApiEndpoints(category: string): string[] {
    const map: Record<string, string[]> = {
      WEATHER: [
        'GET /api/v1/weather/current',
        'GET /api/v1/weather/current/:districtId',
        'GET /api/v1/weather/hourly/:districtId',
        'GET /api/v1/weather/daily/:districtId',
      ],
      AIR_QUALITY: [
        'GET /api/v1/weather/air-quality',
        'GET /api/v1/weather/air-quality/:districtId',
      ],
      BIODIVERSITY: [
        'GET /api/v1/biodiversity/species',
        'GET /api/v1/biodiversity/occurrences',
      ],
      REPORTS: ['GET /api/v1/reports'],
      MONITORING: ['GET /api/v1/observations'],
      GEOSPATIAL: ['GET /api/v1/locations/districts', 'GET /api/v1/locations/divisions'],
      WATER: [],
    };
    return map[category] ?? [];
  }

  async requestAccess(id: string, dto: RequestDatasetAccessDto, user: JwtPayload, ipAddress?: string) {
    await this.getById(id);
    try {
      const request = await this.prisma.datasetAccessRequest.create({
        data: { datasetId: id, userId: user.sub },
        select: {
          id: true,
          status: true,
          createdAt: true,
          dataset: { select: { id: true, name: true } },
        },
      });
      await this.prisma.auditEvent.create({
        data: {
          action: 'DATASET_ACCESS',
          userId: user.sub,
          entityType: 'DatasetAccessRequest',
          entityId: request.id,
          meta: { event: 'requested', reason: dto.reason ?? null },
          ipAddress: ipAddress ?? null,
        },
      });
      return request;
    } catch {
      throw new ConflictException('Access request already submitted for this dataset');
    }
  }

  async listAccessRequests(datasetId: string, status?: DatasetAccessRequestStatus) {
    await this.getById(datasetId);
    const where = { datasetId, ...(status ? { status } : {}) };
    const requests = await this.prisma.datasetAccessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        decidedAt: true,
        user: { select: { id: true, displayName: true, email: true, role: true } },
        decidedBy: { select: { id: true, displayName: true } },
      },
    });
    return { data: requests, total: requests.length };
  }

  async decideAccessRequest(
    datasetId: string,
    requestId: string,
    dto: DecideDatasetAccessDto,
    actor: JwtPayload,
  ) {
    const existing = await this.prisma.datasetAccessRequest.findFirst({
      where: { id: requestId, datasetId },
      select: { id: true, status: true, userId: true },
    });
    if (!existing) throw new NotFoundException('Access request not found');
    if (existing.status !== 'PENDING') {
      throw new ConflictException('Access request has already been decided');
    }

    const updated = await this.prisma.datasetAccessRequest.update({
      where: { id: requestId },
      data: {
        status: dto.decision,
        decidedById: actor.sub,
        decidedAt: new Date(),
      },
      select: { id: true, status: true, decidedAt: true },
    });

    await this.prisma.auditEvent.create({
      data: {
        action: 'DATASET_ACCESS_DECISION',
        userId: actor.sub,
        entityType: 'DatasetAccessRequest',
        entityId: requestId,
        meta: { decision: dto.decision, note: dto.note ?? null, targetUserId: existing.userId },
      },
    });
    return updated;
  }

  // ─── Version history ──────────────────────────────────────────────────────────

  async publishVersion(id: string, dto: PublishDatasetVersionDto, actor: JwtPayload) {
    await this.getById(id);
    return this.prisma.$transaction(async (tx) => {
      // Stamp the dataset's current version field.
      await tx.dataset.update({
        where: { id },
        data: { version: dto.version },
      });

      const entry = await tx.datasetVersion.create({
        data: {
          datasetId: id,
          version: dto.version,
          notes: dto.notes,
          publishedById: actor.sub,
        },
        select: VERSION_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: 'DATASET_VERSION_PUBLISH',
          userId: actor.sub,
          entityType: 'DatasetVersion',
          entityId: entry.id,
          meta: { datasetId: id, version: dto.version },
        },
      });

      return entry;
    });
  }

  async listVersions(id: string) {
    await this.getById(id);
    const data = await this.prisma.datasetVersion.findMany({
      where: { datasetId: id },
      select: VERSION_SELECT,
      orderBy: { publishedAt: 'desc' },
    });
    return { data, total: data.length };
  }

  async currentWeather() {
    const districts = await this.weatherService.getLatestCurrentForAllDistricts();
    return {
      source: 'openmeteo',
      status: 'live',
      districts,
    };
  }

  async currentAirQuality() {
    const stations = await this.weatherService.getLatestAirQualityForAllDistricts();
    return {
      source: 'openmeteo',
      status: 'live',
      stations,
    };
  }
}
