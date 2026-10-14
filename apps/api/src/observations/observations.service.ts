import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ObservationCategory, ObservationTrustLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { UpdateObservationTrustDto } from './dto/update-trust.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { clampPagination } from '../common/pagination';
import { resolveGeoHierarchy } from '../common/validate-district';
import { GamificationService } from '../gamification/gamification.service';

export interface NearbyObservationRow {
  id: string; category: string; trustLevel: string;
  lat: number | null; lng: number | null; districtId: string | null;
  species: string | null; observedAt: Date; distance_m: number;
}

const MEASUREMENT_SELECT = {
  id: true,
  parameter: true,
  value: true,
  unit: true,
  method: true,
  detectionLimit: true,
  qualityFlag: true,
  notes: true,
  recordedAt: true,
} as const;

const OBSERVATION_SELECT = {
  id: true,
  category: true,
  trustLevel: true,
  description: true,
  districtId: true,
  upazilaId: true,
  unionId: true,
  lat: true,
  lng: true,
  species: true,
  observedAt: true,
  createdAt: true,
  updatedAt: true,
  observer: { select: { id: true, displayName: true } },
  district: { select: { id: true, name: true, division: { select: { id: true, name: true } } } },
  upazila:  { select: { id: true, name: true } },
  union:    { select: { id: true, name: true } },
  measurements: { select: MEASUREMENT_SELECT, orderBy: { recordedAt: 'asc' as const } },
} as const;

@Injectable()
export class ObservationsService {
  private readonly logger = new Logger(ObservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async create(dto: CreateObservationDto, user: JwtPayload) {
    const geo = await resolveGeoHierarchy(this.prisma, dto);

    if (dto.observedAt && new Date(dto.observedAt) > new Date()) {
      throw new BadRequestException('observedAt cannot be in the future');
    }

    const observation = await this.prisma.$transaction(async (tx) => {
      const obs = await tx.observation.create({
        data: {
          category: dto.category,
          description: dto.description,
          districtId: geo.districtId,
          upazilaId: geo.upazilaId,
          unionId: geo.unionId,
          lat: dto.lat,
          lng: dto.lng,
          species: dto.species,
          observedAt: dto.observedAt ? new Date(dto.observedAt) : undefined,
          observerId: user.sub,
          trustLevel: ObservationTrustLevel.UNVERIFIED,
          ...(dto.measurements?.length && {
            measurements: {
              createMany: {
                data: dto.measurements.map((m) => ({
                  parameter: m.parameter,
                  value: m.value,
                  unit: m.unit,
                  method: m.method,
                  detectionLimit: m.detectionLimit,
                  qualityFlag: m.qualityFlag,
                  notes: m.notes,
                })),
              },
            },
          }),
        },
        select: OBSERVATION_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: 'OBSERVATION_SUBMIT',
          userId: user.sub,
          entityType: 'Observation',
          entityId: obs.id,
          meta: dto.measurements?.length ? { measurementCount: dto.measurements.length } : undefined,
        },
      });

      return obs;
    });

    // Trigger badge evaluation after the transaction commits.
    // Water Sentinel counts all WATER_QUALITY observations and Clean Air Defender
    // counts all AIR_QUALITY observations regardless of trust level — so badge
    // progress must be recalculated on every new observation, not just on trust
    // level promotion.
    this.gamification.evaluateBadges(user.sub).catch((err: unknown) => {
      this.logger.warn(`Badge evaluation failed after observation create: ${String(err)}`);
    });

    return observation;
  }

  listMine(userId: string, rawPage = 1, rawPageSize = 10) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.observation.findMany({
        where: { observerId: userId },
        skip,
        take: pageSize,
        orderBy: { observedAt: 'desc' },
        select: OBSERVATION_SELECT,
      }),
      this.prisma.observation.count({ where: { observerId: userId } }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  /**
   * Public list, most recently observed first. `counts` ignores the trust filter (but respects type and place,
   * and never includes FLAGGED) so the All / Research grade / Community / Unverified segments keep their own totals.
   */
  async list(
    category?: ObservationCategory,
    trustLevel?: ObservationTrustLevel,
    districtId?: string,
    upazilaId?: string,
    unionId?: string,
    rawPage = 1,
    rawPageSize = 20,
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const scope = {
      ...(category ? { category } : {}),
      ...(districtId ? { districtId } : {}),
      ...(upazilaId ? { upazilaId } : {}),
      ...(unionId ? { unionId } : {}),
    };
    const where = { ...scope, ...(trustLevel ? { trustLevel } : { trustLevel: { not: ObservationTrustLevel.FLAGGED } }) };

    const [data, total, grouped] = await Promise.all([
      this.prisma.observation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ observedAt: 'desc' }, { id: 'asc' }],
        select: OBSERVATION_SELECT,
      }),
      this.prisma.observation.count({ where }),
      this.prisma.observation.groupBy({
        by: ['trustLevel'],
        where: { ...scope, trustLevel: { not: ObservationTrustLevel.FLAGGED } },
        _count: { _all: true },
      }),
    ]);

    const n = (t: ObservationTrustLevel) => grouped.find((g) => g.trustLevel === t)?._count._all ?? 0;
    const researchGrade = n(ObservationTrustLevel.RESEARCH_GRADE);
    const community = n(ObservationTrustLevel.COMMUNITY);
    const unverified = n(ObservationTrustLevel.UNVERIFIED);
    return {
      data,
      total,
      page,
      pageSize,
      counts: { researchGrade, community, unverified, all: researchGrade + community + unverified },
    };
  }

  async getById(id: string) {
    const observation = await this.prisma.observation.findUnique({
      where: { id },
      select: OBSERVATION_SELECT,
    });
    if (!observation) throw new NotFoundException('Observation not found');
    return observation;
  }

  /** Owner-only: edit description, location, species, or observedAt of an UNVERIFIED observation. */
  async update(id: string, dto: UpdateObservationDto, user: JwtPayload) {
    const observation = await this.getById(id);

    if (observation.observer?.id !== user.sub) {
      throw new ForbiddenException('You can only edit your own observations');
    }
    if (observation.trustLevel !== ObservationTrustLevel.UNVERIFIED) {
      throw new ForbiddenException('Only UNVERIFIED observations can be edited');
    }
    if (dto.observedAt && new Date(dto.observedAt) > new Date()) {
      throw new BadRequestException('observedAt cannot be in the future');
    }

    // Resolve geo hierarchy only if any geo field is being updated
    let geo: { districtId?: string; upazilaId?: string; unionId?: string } = {};
    if (dto.districtId !== undefined || dto.upazilaId !== undefined || dto.unionId !== undefined) {
      geo = await resolveGeoHierarchy(this.prisma, {
        districtId: dto.districtId,
        upazilaId: dto.upazilaId,
        unionId: dto.unionId,
      });
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.observation.update({
        where: { id },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(geo.districtId !== undefined && { districtId: geo.districtId }),
          ...(geo.upazilaId !== undefined && { upazilaId: geo.upazilaId }),
          ...(geo.unionId !== undefined && { unionId: geo.unionId }),
          ...(dto.lat !== undefined && { lat: dto.lat }),
          ...(dto.lng !== undefined && { lng: dto.lng }),
          ...(dto.species !== undefined && { species: dto.species }),
          ...(dto.observedAt !== undefined && { observedAt: new Date(dto.observedAt) }),
        },
        select: OBSERVATION_SELECT,
      }),
      this.prisma.auditEvent.create({
        data: {
          action: 'OBSERVATION_UPDATE',
          userId: user.sub,
          entityType: 'Observation',
          entityId: id,
        },
      }),
    ]);

    return updated;
  }

  async updateTrust(id: string, dto: UpdateObservationTrustDto, actor: JwtPayload) {
    const observation = await this.getById(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.observation.update({
        where: { id },
        data: { trustLevel: dto.trustLevel },
        select: OBSERVATION_SELECT,
      }),
      this.prisma.auditEvent.create({
        data: {
          action: 'OBSERVATION_TRUST_CHANGE',
          userId: actor.sub,
          entityType: 'Observation',
          entityId: id,
          meta: { from: observation.trustLevel, to: dto.trustLevel },
        },
      }),
    ]);

    // Award water_sentinel / biodiversity_explorer / clean_air_defender badges
    // when an observation reaches RESEARCH_GRADE trust.
    if (dto.trustLevel === ObservationTrustLevel.RESEARCH_GRADE && observation.observer?.id) {
      this.gamification
        .evaluateBadges(observation.observer.id)
        .catch((err: unknown) => this.logger.warn(`Badge evaluation failed: ${String(err)}`));
    }

    return updated;
  }

  /** MODERATOR/ADMIN: permanently remove an observation. */
  async delete(id: string, actor: JwtPayload) {
    await this.getById(id); // throws 404 if not found

    await this.prisma.$transaction([
      this.prisma.observation.delete({ where: { id } }),
      this.prisma.auditEvent.create({
        data: {
          action: 'OBSERVATION_DELETE',
          userId: actor.sub,
          entityType: 'Observation',
          entityId: id,
        },
      }),
    ]);
  }

  /** Owner only: add a measurement to an UNVERIFIED observation. */
  async addMeasurement(observationId: string, dto: CreateMeasurementDto, user: JwtPayload) {
    const observation = await this.getById(observationId);

    if (observation.observer?.id !== user.sub) {
      throw new ForbiddenException('You can only add measurements to your own observations');
    }
    if (observation.trustLevel !== ObservationTrustLevel.UNVERIFIED) {
      throw new ForbiddenException('Measurements cannot be modified once the observation is verified');
    }

    return this.prisma.$transaction(async (tx) => {
      const measurement = await tx.observationMeasurement.create({
        data: {
          observationId,
          parameter: dto.parameter,
          value: dto.value,
          unit: dto.unit,
          method: dto.method,
          detectionLimit: dto.detectionLimit,
          qualityFlag: dto.qualityFlag,
          notes: dto.notes,
        },
        select: MEASUREMENT_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: 'OBSERVATION_MEASUREMENT_ADD',
          userId: user.sub,
          entityType: 'ObservationMeasurement',
          entityId: measurement.id,
          meta: { observationId, parameter: dto.parameter },
        },
      });

      return measurement;
    });
  }

  /** Owner or MODERATOR/ADMIN: delete a single measurement from an observation. */
  async deleteMeasurement(observationId: string, measurementId: string, actor: JwtPayload) {
    const observation = await this.getById(observationId);

    const isOwner = observation.observer?.id === actor.sub;
    const isMod = actor.role === 'MODERATOR' || actor.role === 'ADMIN';

    if (!isOwner && !isMod) {
      throw new ForbiddenException('You can only delete measurements from your own observations');
    }
    if (isOwner && !isMod && observation.trustLevel !== ObservationTrustLevel.UNVERIFIED) {
      throw new ForbiddenException('Measurements cannot be modified once the observation is verified');
    }

    const measurement = await this.prisma.observationMeasurement.findUnique({
      where: { id: measurementId },
    });
    if (!measurement || measurement.observationId !== observationId) {
      throw new NotFoundException('Measurement not found');
    }

    await this.prisma.$transaction([
      this.prisma.observationMeasurement.delete({ where: { id: measurementId } }),
      this.prisma.auditEvent.create({
        data: {
          action: 'OBSERVATION_MEASUREMENT_DELETE',
          userId: actor.sub,
          entityType: 'ObservationMeasurement',
          entityId: measurementId,
          meta: { observationId, parameter: measurement.parameter },
        },
      }),
    ]);
  }

  // ─── Spatial proximity search ──────────────────────────────────────────────

  async findNearby(lat: number, lng: number, radiusKm: number, rawPage = 1, rawPageSize = 20) {
    if (!isFinite(lat) || lat < -90 || lat > 90) throw new BadRequestException('lat must be between -90 and 90');
    if (!isFinite(lng) || lng < -180 || lng > 180) throw new BadRequestException('lng must be between -180 and 180');
    if (!isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) throw new BadRequestException('radiusKm must be between 0 and 500');

    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const radiusM = radiusKm * 1000;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<NearbyObservationRow[]>(Prisma.sql`
        SELECT
          o.id,
          o.category,
          o."trustLevel",
          o.lat,
          o.lng,
          o."districtId",
          o.species,
          o."observedAt",
          ST_Distance(
            o.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          )::float8 AS distance_m
        FROM "Observation" o
        WHERE o.geom IS NOT NULL
          AND ST_DWithin(
            o.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusM}
          )
          AND o."trustLevel" != 'FLAGGED'
        ORDER BY distance_m ASC
        LIMIT ${pageSize} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<[{ total: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "Observation" o
        WHERE o.geom IS NOT NULL
          AND ST_DWithin(
            o.geom,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusM}
          )
          AND o."trustLevel" != 'FLAGGED'
      `),
    ]);

    return { data: rows, total: Number(countRows[0]?.total ?? 0), page, pageSize, radiusKm };
  }
}
