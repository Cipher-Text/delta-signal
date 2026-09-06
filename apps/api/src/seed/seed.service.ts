import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrganizationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_SEED_PASSWORD = 'NatureGrid123!';
const SALT_ROUNDS = 12;

const SEED_USERS: {
  email: string;
  displayName: string;
  role: UserRole;
}[] = [
  { email: 'citizen@deltasignal.org', displayName: 'Seed Citizen', role: 'CITIZEN' },
  { email: 'researcher@deltasignal.org', displayName: 'Seed Researcher', role: 'RESEARCHER' },
  {
    email: 'organization.admin@deltasignal.org',
    displayName: 'Seed Organization Admin',
    role: 'ORGANIZATION_ADMIN',
  },
  { email: 'government@deltasignal.org', displayName: 'Seed Government', role: 'GOVERNMENT' },
  { email: 'moderator@deltasignal.org', displayName: 'Seed Moderator', role: 'MODERATOR' },
  { email: 'admin@deltasignal.org', displayName: 'Seed Admin', role: 'ADMIN' },
];

const SEED_ORGANIZATION = {
  name: 'Delta Signal Bangladesh',
  type: 'NGO' as OrganizationType,
  description: 'Seed organization for local development and admin workflows.',
  website: 'https://deltasignal.org',
  country: 'Bangladesh',
  isVerified: true,
};

const SEED_ORGANIZATIONS: {
  name: string;
  type: OrganizationType;
  description: string;
  website: string;
  country: string;
}[] = [
  {
    name: 'Bangladesh Poribesh Andolon (BAPA)',
    type: 'NGO',
    description:
      'A nationwide civic movement and advocacy platform focused on river protection, air quality management, urban environment improvement, and climate policy in Bangladesh.',
    website: 'https://www.bapa.org.bd',
    country: 'Bangladesh',
  },
  {
    name: 'Bangladesh Environment and Development Society (BEDS)',
    type: 'NGO',
    description:
      'Dedicated to coastal ecosystem restoration, mangrove preservation, biodiversity conservation, and building sustainable eco-villages around the Sundarbans.',
    website: 'https://www.bedsbd.org',
    country: 'Bangladesh',
  },
  {
    name: 'Center for Natural Resource Studies (CNRS)',
    type: 'NGO',
    description:
      'A leading non-governmental organization specializing in wetland (Haor) management, community-based natural resource conservation, and ecosystem restoration.',
    website: 'https://cnrs.org.bd',
    country: 'Bangladesh',
  },
  {
    name: 'Environment and Social Development Organization (ESDO)',
    type: 'NGO',
    description:
      'Promotes environmental justice, toxic chemical elimination, single-use plastic reduction campaigns, and sustainable waste management policies.',
    website: 'https://esdo.org',
    country: 'Bangladesh',
  },
  {
    name: 'WildTeam',
    type: 'NGO',
    description:
      'A wildlife conservation organization focused on Bengal tiger protection, human-wildlife conflict mitigation, and biodiversity research in the Sundarbans.',
    website: 'https://www.wildteam.org.bd',
    country: 'Bangladesh',
  },
  {
    name: 'International Centre for Climate Change and Development (ICCCAD)',
    type: 'RESEARCH_INSTITUTION',
    description:
      'A global research institute based in Bangladesh conducting action research, policy analysis, and capacity building on climate change adaptation.',
    website: 'https://www.icccad.net',
    country: 'Bangladesh',
  },
  {
    name: 'International Union for Conservation of Nature (IUCN) Bangladesh',
    type: 'INTERNATIONAL_ORG',
    description:
      'Global authority on the status of the natural world, conducting species Red List assessments, nature-based solutions, and ecosystem conservation initiatives.',
    website: 'https://www.iucn.org',
    country: 'Bangladesh',
  },
  {
    name: 'Department of Environment (DoE)',
    type: 'GOVERNMENT_AGENCY',
    description:
      'Government department under the Ministry of Environment, Forest and Climate Change responsible for environmental enforcement, pollution control, and clearance.',
    website: 'http://www.doe.gov.bd',
    country: 'Bangladesh',
  },
  {
    name: 'Bangladesh Forest Department (BFD)',
    type: 'GOVERNMENT_AGENCY',
    description:
      'Government agency responsible for forest resource management, biodiversity protection, wildlife conservation, and protected areas across Bangladesh.',
    website: 'http://www.bforest.gov.bd',
    country: 'Bangladesh',
  },
  {
    name: 'World Wide Fund for Nature (WWF)',
    type: 'INTERNATIONAL_ORG',
    description:
      'Global environmental non-profit working on wilderness preservation, climate mitigation, and reducing human impact on the environment.',
    website: 'https://www.worldwildlife.org',
    country: 'Switzerland',
  },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      await this.bootstrapProductionAdmin();
      await this.seedRealOrganizations();
      return;
    }
    await this.seedUsers();
    await this.seedOrganization();
    await this.seedRealOrganizations();
  }

  /**
   * Production-only bootstrap: creates the first ADMIN account from env vars.
   * Runs only when BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are set,
   * and only if no ADMIN user exists yet. Safe to leave in production code —
   * it is a no-op once the account exists or the env vars are removed.
   *
   * After first boot: remove BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD
   * from your deployment environment.
   */
  private async bootstrapProductionAdmin() {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();

    if (!email || !password) return;

    const existing = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existing) {
      this.logger.log('Production admin already exists — skipping bootstrap');
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.create({
      data: {
        email,
        displayName: 'Admin',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        profile: { create: {} },
      },
    });

    this.logger.warn(
      `Bootstrap admin created: ${email} — remove BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD from your environment now`,
    );
  }

  private async seedUsers() {
    const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, SALT_ROUNDS);

    for (const user of SEED_USERS) {
      await this.prisma.user.upsert({
        where: { email: user.email },
        update: {
          displayName: user.displayName,
          role: user.role,
          isActive: true,
        },
        create: {
          ...user,
          passwordHash,
          isActive: true,
        },
      });
    }

    this.logger.log(`Seed users ready: ${SEED_USERS.length} accounts`);
  }

  private async seedOrganization() {
    const existing = await this.prisma.organization.findFirst({
      where: { name: SEED_ORGANIZATION.name },
    });
    if (existing) {
      await this.prisma.organization.update({
        where: { id: existing.id },
        data: SEED_ORGANIZATION,
      });
      const admin = await this.prisma.user.findUnique({
        where: { email: 'organization.admin@deltasignal.org' },
        select: { id: true },
      });
      if (admin) {
        await this.prisma.organizationMembership.upsert({
          where: { organizationId_userId: { organizationId: existing.id, userId: admin.id } },
          create: { organizationId: existing.id, userId: admin.id, role: 'ADMIN' },
          update: { role: 'ADMIN' },
        });
      }
      return;
    }

    const organization = await this.prisma.organization.create({ data: SEED_ORGANIZATION });
    const admin = await this.prisma.user.findUnique({
      where: { email: 'organization.admin@deltasignal.org' },
      select: { id: true },
    });
    if (admin) {
      await this.prisma.organizationMembership.create({
        data: { organizationId: organization.id, userId: admin.id, role: 'ADMIN' },
      });
    }
    this.logger.log(`Seed organization ready: ${SEED_ORGANIZATION.name}`);
  }

  private async seedRealOrganizations() {
    for (const org of SEED_ORGANIZATIONS) {
      const existing = await this.prisma.organization.findFirst({ where: { name: org.name } });
      if (existing) {
        await this.prisma.organization.update({ where: { id: existing.id }, data: org });
      } else {
        await this.prisma.organization.create({ data: org });
      }
    }
    this.logger.log(`Real organizations seeded: ${SEED_ORGANIZATIONS.length} records`);
  }

}

