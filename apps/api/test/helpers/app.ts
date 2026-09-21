/**
 * Creates a fully-bootstrapped NestJS test application backed by the real
 * database. BullMQ-dependent services that are not under test are replaced
 * with no-op stubs — BullMQ ships as pure ESM and cannot be loaded by Jest's
 * CJS runtime. Everything else (Prisma, guards, pipes, filters, auth, seeding)
 * runs as in production.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { PermissionsService } from '../../src/permissions/permissions.service';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { EmailService } from '../../src/notifications/email.service';
import { GamificationService } from '../../src/gamification/gamification.service';
import { SocialPublishingService } from '../../src/social-publishing/social-publishing.service';
import helmet from 'helmet';

const notificationsStub = {
  subscribe: jest.fn().mockResolvedValue({}),
  listSubscriptions: jest.fn().mockResolvedValue([]),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  dispatchForAlert: jest.fn(), // fire-and-forget, intentionally sync no-op
};

const emailStub = {
  queuePasswordReset: jest.fn().mockResolvedValue(undefined),
  queueVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendAlertEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
};

const gamificationStub = {
  evaluateBadges: jest.fn().mockResolvedValue(undefined),
  getMyGameData: jest.fn().mockResolvedValue({
    completenessScore: 0,
    missingFields: [],
    earnedBadges: [],
    contributionPoints: 0,
    level: 'Newcomer',
  }),
  performEvaluation: jest.fn().mockResolvedValue(undefined),
};

const socialPublishingStub = {
  list: jest.fn().mockResolvedValue([]),
  buildFacebookAuthorizeUrl: jest.fn().mockReturnValue(''),
  connectFacebook: jest.fn().mockResolvedValue([]),
  disconnect: jest.fn().mockResolvedValue(undefined),
  requestPublish: jest.fn().mockResolvedValue(undefined),
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    // Disable rate limiting in tests — we make many requests to the same endpoints.
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    // Replace BullMQ-dependent services with stubs (bullmq is pure ESM, incompatible
    // with Jest's CJS loader). These are tested separately in their own spec files.
    .overrideProvider(NotificationsService)
    .useValue(notificationsStub)
    .overrideProvider(EmailService)
    .useValue(emailStub)
    .overrideProvider(GamificationService)
    .useValue(gamificationStub)
    .overrideProvider(SocialPublishingService)
    .useValue(socialPublishingStub)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Mirror the bootstrap in main.ts exactly.
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const reflector = app.get(Reflector);
  const permissionsService = app.get(PermissionsService);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
    new PermissionsGuard(reflector, permissionsService),
  );

  await app.init();
  return app;
}
