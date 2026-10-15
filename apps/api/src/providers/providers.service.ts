import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { clampPagination } from '../common/pagination';

const PROVIDER_SELECT = {
  id: true,
  name: true,
  type: true,
  country: true,
  isActive: true,
  organization: { select: { id: true, name: true, slug: true } },
} as const;

export const OPENMETEO_PROVIDER_NAME = 'OpenMeteo';
export const GBIF_PROVIDER_NAME = 'GBIF';
export const WORLD_BANK_PROVIDER_NAME = 'World Bank';

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Seed well-known data providers on first boot. */
  async onModuleInit() {
    await this.upsertProvider(OPENMETEO_PROVIDER_NAME, 'INTERNATIONAL_ORG', 'Germany');
    await this.upsertProvider(GBIF_PROVIDER_NAME, 'INTERNATIONAL_ORG', 'Denmark');
    await this.upsertProvider(WORLD_BANK_PROVIDER_NAME, 'INTERNATIONAL_ORG', 'United States');
  }

  private async upsertProvider(name: string, type: ProviderType, country: string) {
    const existing = await this.prisma.provider.findFirst({ where: { name } });
    if (existing) return;
    await this.prisma.provider.create({ data: { name, type, country } });
    this.logger.log(`Seeded provider: ${name}`);
  }

  list(type?: ProviderType, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = {
      isActive: true,
      ...(type ? { type } : {}),
    };
    return Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: PROVIDER_SELECT,
      }),
      this.prisma.provider.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async getById(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        datasets: { select: { id: true, name: true, category: true } },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }
}
