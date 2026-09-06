# Architecture

Delta Signal is a modular environmental platform. It starts as a monorepo with independently deployable apps and a modular NestJS API, then grows into separate services only when a domain needs its own runtime, scaling profile, or ownership model.

## Primary Apps

| App | Runtime | Responsibility |
| --- | --- | --- |
| `apps/web` | Next.js | Public citizen, researcher, and organization experience |
| `apps/admin` | Next.js | Internal moderation, data operations, alerts, and platform management |
| `apps/api` | NestJS | Core API and business workflows |
| `apps/data-worker` | Python | GIS processing, scientific data jobs, ingestion, and batch tasks |

## Core Data Infrastructure

| Component | Purpose |
| --- | --- |
| PostgreSQL | Primary relational database |
| PostGIS | **Enabled** (2026-09-01) — `District.geom geography(Point, 4326)` added via migration `20260901000000_postgis_geometry`. Other geography fields still use plain `Float` lat/lng; polygon geometry remains planned. |
| Redis | In use — `REDIS_URL` is consumed by BullMQ (`BullModule.forRootAsync` in `AppModule`). Refresh tokens remain in Postgres; Redis is used only for job queues. |
| BullMQ (`bullmq`, `@nestjs/bullmq`) | In use — `email` queue (password-reset, email-verification, alert-notification; `EmailProcessor` with 4-attempt exponential backoff) and `gamification` queue (badge evaluation; `GamificationProcessor` with dedup by `jobId: badge-eval:{userId}`). |

## API Module Layout

The API is a modular NestJS monolith. Modules own their routes, services, persistence access, and contracts.

```text
apps/api/src/
├── common/
│   ├── decorators/        # @CurrentUser, @Roles, @Public, @RequirePermissions
│   └── guards/            # JwtAuthGuard, RolesGuard, PermissionsGuard
├── database/              # PrismaService (global module)
├── seed/                  # ✓ SeedService — dev users + seed org on boot (in AppModule, not its own module)
├── auth/                  # ✓ register, login, profile, JWT strategy
├── users/                 # ✓ list, get, role update, deactivate, reactivate, audit events (admin-only)
├── organizations/         # ✓ list, get, admin CRUD + memberships
├── locations/             # ✓ divisions, districts, upazilas, unions + auto-seed
├── providers/             # ✓ list, get
├── datasets/              # ✓ catalog + access policy + download + access requests, auto-seed
├── reports/               # ✓ submit, list (public), status workflow + comments + media + audit
├── alerts/                # ✓ list (public), create, update + audit
├── observations/          # ✓ CRUD + trust-level workflow
├── biodiversity/          # ✓ species/occurrences + daily GBIF sync
├── restoration/           # ✓ projects + idempotent join workflow
├── metrics/               # ✓ live platform counters
├── permissions/           # ✓ DB-backed permission model, admin grant/revoke endpoints
├── analytics/             # ✓ role-scoped dashboard queries (admin/moderator/government/researcher/orgadmin)
├── media/                 # ✓ StorageService (S3/MinIO), MediaService, presign + upload endpoints
├── weather/               # ✓ OpenMeteo client, service, scheduler, current/hourly/daily/AQ
├── flood/                 # ✓ OpenMeteo Flood/GloFAS client, daily discharge, scheduler
├── locations/climate/     # ✓ union-level climate pipeline, daily cron, 30d rolling averages
├── ingestion/             # ✓ provider job tracking for scheduled weather + GBIF + flood syncs
└── notifications/         # ✓ AlertSubscription, email delivery via BullMQ email queue
```

Legend: ✓ Implemented

`weather` and `biodiversity` keep their provider clients and schedulers in their own modules. The shared `ingestion` module tracks scheduled provider runs as `IngestionJob` records and updates dataset `lastSyncedAt` values on success. `permissions` owns the `Permission` and `RolePermission` models and is used by `PermissionsGuard` for fine-grained access control. Provider-specific details live in `docs/integrations/`.

## Domain Map

| Domain | API Module(s) | What it covers |
| --- | --- | --- |
| Authentication and sessions | `auth` | JWT access tokens, opaque refresh tokens, login/register/logout, audit trail |
| Users and roles | `users` | 6 roles (CITIZEN → ADMIN), role updates, deactivation, reactivation, audit event listing |
| Organizations | `organizations` | Org records + memberships (ADMIN/MEMBER) linked to providers and restoration projects |
| Geography | `locations`, `locations/climate` | 8 divisions, 64 districts, 494 upazilas, 4,540 unions — auto-seeded; nightly union-level climate pipeline + 30d rolling averages |
| Environmental data | `datasets`, `weather`, `flood`, `radiation`, `marine`, `emissions` | Dataset catalog, access policy, download enforcement, OpenMeteo weather/AQ, Flood/GloFAS, satellite radiation, marine forecasts, and national GHG emissions (World Bank API) |
| Biodiversity | `biodiversity` | GBIF species and occurrence records, daily sync |
| Citizen engagement | `reports`, `observations`, `restoration` | Reports (status workflow + comments + media), observations (trust levels), restoration projects |
| Alerts and notifications | `alerts`, `notifications` | Severity-tiered alerts, email delivery, subscription by district/nationwide |
| Platform metrics | `metrics` | Live counters for the public homepage |
| Permissions | `permissions` | DB-backed permission model; fine-grained role grants managed by `PermissionsGuard` |
| Analytics dashboards | `analytics` | Role-scoped aggregated stats for admin, moderator, government, researcher, org admin |
| Admin console | `apps/admin` | Moderation, user management, alert creation, dataset publishing, organization membership management, ingestion monitoring |

Advanced domains (climate forecasting, carbon accounting, research publications, structured surveys, satellite remote sensing) are planned for Phase 7 — see `docs/roadmap.md` and `docs/architecture/feature-map.md`.

## Boundary Rules

- Frontends call the API through typed contracts from `packages/contracts`.
- Apps do not import each other directly.
- Shared UI belongs in `packages/ui`.
- Shared domain-neutral TypeScript belongs in `packages/shared`.
- Database schema and migration tooling belongs in `packages/database`.
- The Python worker communicates through database records, queues, object storage, or API contracts. It should not import TypeScript app code.
- A domain is extracted from the NestJS API only after operational pressure justifies it.
