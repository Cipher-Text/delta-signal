import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './common/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { LocationsModule } from './locations/locations.module';
import { ProvidersModule } from './providers/providers.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ReportsModule } from './reports/reports.module';
import { AlertsModule } from './alerts/alerts.module';
import { BiodiversityModule } from './biodiversity/biodiversity.module';
import { ObservationsModule } from './observations/observations.module';
import { RestorationModule } from './restoration/restoration.module';
import { MediaModule } from './media/media.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { EmissionsModule } from './emissions/emissions.module';
import { WeatherModule } from './weather/weather.module';
import { FloodModule } from './flood/flood.module';
import { MarineModule } from './marine/marine.module';
import { RadiationModule } from './radiation/radiation.module';
import { LocationClimateModule } from './locations/climate/location-climate.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GamificationModule } from './gamification/gamification.module';
import { WaterBodiesModule } from './water-bodies/water-bodies.module';
import { CommunityModule } from './community/community.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { CompaniesModule } from './companies/companies.module';
import { SocialContentModule } from './social-content/social-content.module';
import { MembersModule } from './members/members.module';
import { HealthController } from './health.controller';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Baseline limit for every route. Auth routes tighten this further with
    // their own @Throttle decorators — see auth.controller.ts.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    // Global BullMQ Redis connection — feature modules register their own queues
    // via BullModule.registerQueue and run processors as WorkerHost providers.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: +(parsed.port || '6379'),
            ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
            // Required by BullMQ workers — prevents them from blocking the event loop.
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    LocationsModule,
    ProvidersModule,
    DatasetsModule,
    ReportsModule,
    AlertsModule,
    BiodiversityModule,
    ObservationsModule,
    RestorationModule,
    MediaModule,
    IngestionModule,
    EmissionsModule,
    WeatherModule,
    FloodModule,
    MarineModule,
    RadiationModule,
    LocationClimateModule,
    MetricsModule,
    NotificationsModule,
    PermissionsModule,
    AnalyticsModule,
    GamificationModule,
    WaterBodiesModule,
    CommunityModule,
    FacilitiesModule,
    CompaniesModule,
    SocialContentModule,
    MembersModule,
  ],
  controllers: [HealthController],
  // ThrottlerGuard is registered here rather than in main.ts's useGlobalGuards
  // because it needs injected dependencies (storage service + reflector).
  providers: [SeedService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
