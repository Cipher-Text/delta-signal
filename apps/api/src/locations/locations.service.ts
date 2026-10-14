import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { ObservationTrustLevel, Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SEED_DATA } from './seed/bangladesh';

@Injectable()
export class LocationsService implements OnModuleInit {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.division.count();
    if (count === 0) await this.seed();
    await this.seedCoastalMetadata();
  }

  /**
   * Always runs on boot — idempotent upsert of isCoastal + coastal monitoring
   * coordinates for coastal districts. Sourced from SEED_DATA so coordinates
   * are maintained in bangladesh.ts rather than duplicated here.
   */
  private async seedCoastalMetadata() {
    const coastal = SEED_DATA.flatMap(div =>
      div.districts.filter(d => d.isCoastal && d.coastLat != null && d.coastLng != null),
    );

    let updated = 0;
    for (const d of coastal) {
      const result = await this.prisma.district.updateMany({
        where: { name: d.name },
        data: { isCoastal: true, coastLat: d.coastLat, coastLng: d.coastLng },
      });
      updated += result.count;
    }
    this.logger.log(`Coastal metadata seeded: ${updated} districts updated`);
  }

  private async seed() {
    this.logger.log('Seeding Bangladesh geography…');

    let districtCount = 0;
    let upazilaCount = 0;
    let thanaCount = 0;
    let unionCount = 0;

    for (const div of SEED_DATA) {
      const division = await this.prisma.division.upsert({
        where: { name: div.name },
        update: {
          bnName: div.bnName, slug: div.slug, pcode: div.pcode,
          lat: div.lat, lng: div.lng, areaSqKm: div.areaSqKm, url: div.url,
        },
        create: {
          name: div.name, bnName: div.bnName, slug: div.slug, pcode: div.pcode,
          lat: div.lat, lng: div.lng, areaSqKm: div.areaSqKm, url: div.url,
        },
      });

      for (const dist of div.districts) {
        const district = await this.prisma.district.upsert({
          where: { name_divisionId: { name: dist.name, divisionId: division.id } },
          update: {
            bnName: dist.bnName, slug: dist.slug, pcode: dist.pcode,
            lat: dist.lat, lng: dist.lng, centerLat: dist.centerLat, centerLng: dist.centerLng,
            areaSqKm: dist.areaSqKm, url: dist.url, isCoastal: dist.isCoastal ?? false,
            coastLat: dist.coastLat ?? null, coastLng: dist.coastLng ?? null,
            boundary: dist.boundary as Prisma.InputJsonValue ?? Prisma.JsonNull,
          },
          create: {
            name: dist.name, bnName: dist.bnName, slug: dist.slug, pcode: dist.pcode,
            lat: dist.lat, lng: dist.lng, centerLat: dist.centerLat, centerLng: dist.centerLng,
            areaSqKm: dist.areaSqKm, url: dist.url, isCoastal: dist.isCoastal ?? false,
            coastLat: dist.coastLat ?? null, coastLng: dist.coastLng ?? null,
            boundary: dist.boundary as Prisma.InputJsonValue ?? Prisma.JsonNull,
            divisionId: division.id,
          },
        });
        districtCount++;

        for (const up of dist.upazilas) {
          const upazila = await this.prisma.upazila.upsert({
            where: { name_districtId: { name: up.name, districtId: district.id } },
            update: {
              bnName: up.bnName, slug: up.slug, pcode: up.pcode,
              lat: up.lat, lng: up.lng, areaSqKm: up.areaSqKm, url: up.url,
              isThana: up.isThana ?? false,
            },
            create: {
              name: up.name, bnName: up.bnName, slug: up.slug, pcode: up.pcode,
              lat: up.lat, lng: up.lng, areaSqKm: up.areaSqKm, url: up.url,
              isThana: up.isThana ?? false,
              districtId: district.id,
            },
          });
          if (up.isThana) thanaCount++; else upazilaCount++;

          for (const un of up.unions) {
            await this.prisma.union.upsert({
              where: { name_upazilaId: { name: un.name, upazilaId: upazila.id } },
              update: {
                bnName: un.bnName, slug: un.slug, pcode: un.pcode,
                lat: un.lat, lng: un.lng, url: un.url,
                isCoastal: un.isCoastal ?? dist.isCoastal ?? false,
              },
              create: {
                name: un.name, bnName: un.bnName, slug: un.slug, pcode: un.pcode,
                lat: un.lat, lng: un.lng, url: un.url,
                isCoastal: un.isCoastal ?? dist.isCoastal ?? false,
                upazilaId: upazila.id,
              },
            });
            unionCount++;
          }
        }
      }
    }

    this.logger.log(
      `Geography seeded: ${SEED_DATA.length} divisions, ${districtCount} districts, ` +
      `${upazilaCount} upazilas, ${thanaCount} thanas, ${unionCount} unions`,
    );
  }

  // ─── Read queries ────────────────────────────────────────────────────────────

  getDivisions() {
    return this.prisma.division.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { districts: true } } },
    });
  }

  /**
   * Public activity roll-up for one division: exact counts plus the latest few records, so the page does not
   * download and filter whole lists. Reports are verified ones; observations exclude flagged records.
   */
  async getDivisionActivity(divisionId: string) {
    const division = await this.prisma.division.findUnique({ where: { id: divisionId }, select: { id: true } });
    if (!division) throw new NotFoundException('Division not found');

    const inDivision = { districtId: { in: await this.districtIdsOf(divisionId) } };
    const reportWhere = { ...inDivision, status: ReportStatus.VERIFIED };
    const observationWhere = { ...inDivision, trustLevel: { not: ObservationTrustLevel.FLAGGED } };

    const [verifiedReports, researchObservations, occurrences, restorationProjects, reports, observations] = await Promise.all([
      this.prisma.citizenReport.count({ where: reportWhere }),
      this.prisma.observation.count({ where: { ...inDivision, trustLevel: ObservationTrustLevel.RESEARCH_GRADE } }),
      this.prisma.occurrence.count({ where: inDivision }),
      this.prisma.restorationProject.count({ where: inDivision }),
      this.prisma.citizenReport.findMany({
        where: reportWhere,
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, category: true, updatedAt: true, district: { select: { id: true, name: true } } },
      }),
      this.prisma.observation.findMany({
        where: observationWhere,
        orderBy: { observedAt: 'desc' },
        take: 3,
        select: {
          id: true, category: true, species: true, description: true, trustLevel: true, observedAt: true,
          district: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      counts: { verifiedReports, researchObservations, occurrences, restorationProjects },
      recent: { reports, observations },
    };
  }

  private async districtIdsOf(divisionId: string): Promise<string[]> {
    const rows = await this.prisma.district.findMany({ where: { divisionId }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  getDistricts(divisionId?: string) {
    return this.prisma.district.findMany({
      where: divisionId ? { divisionId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        division: { select: { id: true, name: true } },
        _count: { select: { upazilas: true } },
      },
    });
  }

  async getDistrict(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: {
        division: { select: { id: true, name: true } },
        upazilas: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, bnName: true },
        },
      },
    });
    if (!district) throw new NotFoundException('District not found');
    return district;
  }

  getUpazilas(districtId?: string, isThana?: boolean) {
    return this.prisma.upazila.findMany({
      where: {
        ...(districtId ? { districtId } : {}),
        ...(isThana !== undefined ? { isThana } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        district: { select: { id: true, name: true } },
        _count: { select: { unions: true } },
      },
    });
  }

  async getUpazila(id: string) {
    const upazila = await this.prisma.upazila.findUnique({
      where: { id },
      include: {
        district: {
          select: {
            id: true, name: true,
            division: { select: { id: true, name: true } },
          },
        },
        unions: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, bnName: true },
        },
      },
    });
    if (!upazila) throw new NotFoundException('Upazila not found');
    return upazila;
  }

  getUnions(upazilaId?: string, isCoastal?: boolean) {
    return this.prisma.union.findMany({
      where: {
        ...(upazilaId ? { upazilaId } : {}),
        ...(isCoastal !== undefined ? { isCoastal } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        upazila: {
          select: {
            id: true, name: true,
            district: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async getUnion(id: string) {
    const union = await this.prisma.union.findUnique({
      where: { id },
      include: {
        upazila: {
          select: {
            id: true, name: true,
            district: {
              select: {
                id: true, name: true,
                division: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!union) throw new NotFoundException('Union not found');
    return union;
  }
}
