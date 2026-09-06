import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PermissionsService } from './permissions/permissions.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers. Applied before routing so every response carries them,
  // including error responses.
  app.use(helmet());

  app.setGlobalPrefix('api/v1');
  // Split and filter empty strings that would result from a trailing comma or
  // an empty CORS_ORIGIN value. Never fall back to `true` (allow-all) because
  // that, combined with credentials:true, lets any origin read auth cookies.
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? false;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Catches all unhandled exceptions; sanitises 5xx bodies in production
  // to prevent stack traces / DB error details from leaking.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global input validation — strips unknown fields, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply guards globally. Execution order: JwtAuthGuard → RolesGuard → PermissionsGuard.
  // PermissionsGuard is instantiated via app.get() so it receives the DI-managed
  // PermissionsService (which holds the DB-backed cache).
  const reflector = app.get(Reflector);
  const permissionsService = app.get(PermissionsService);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
    new PermissionsGuard(reflector, permissionsService),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Delta Signal API')
    .setDescription('API reference for Delta Signal services')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api/v1`);
  logger.log(`API docs running on http://localhost:${port}/api/docs`);
}

// Catch promise rejections that were never .catch()-ed anywhere in the process.
// NestJS .catch() blocks on fire-and-forget calls cover most cases, but a
// process-level handler is the last safety net for anything that slips through.
process.on('unhandledRejection', (reason: unknown) => {
  new Logger('Process').error(
    'Unhandled promise rejection',
    reason instanceof Error ? reason.stack : String(reason),
  );
});

// Uncaught synchronous exceptions in async code outside the NestJS lifecycle.
// Log and exit — running in an unknown state is worse than restarting cleanly.
process.on('uncaughtException', (err: Error) => {
  new Logger('Process').error('Uncaught exception', err.stack);
  process.exit(1);
});

void bootstrap();
