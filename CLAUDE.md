# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (Nx run-many)
pnpm dev            # Start all apps
pnpm build          # Build all apps
pnpm test           # Run all tests
pnpm lint           # Lint all apps
pnpm format         # Format (nx format:write)

# Database (packages/database)
pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev (interactive, prompts for name)
pnpm db:push        # prisma db push (sync without migration file)
pnpm db:studio      # prisma studio

# Infrastructure
docker compose up -d           # Start Redis + API + web + admin containers
docker compose build api       # Rebuild API image after schema/migration changes
docker compose logs api -f     # Stream API logs (seeding, cron jobs)

# API tests (from apps/api)
pnpm exec jest                                  # All tests
pnpm exec jest --testPathPattern=auth.service   # Single spec file
pnpm exec jest --watch                          # Watch mode
pnpm exec jest --coverage                       # Coverage report
```

`pnpm lint` is excluded from CI (rule set not yet stabilised) but runs cleanly locally — run it before any PR.

## Architecture

**Nx monorepo** with pnpm workspaces. Three TS apps share packages via path aliases (`@nature-grid/*` → `packages/*/src`).

```
apps/api          NestJS modular monolith    :3001
apps/web          Next.js 14 public site     :3000
apps/admin        Next.js 14 admin shell     :3002
apps/data-worker  Python GIS skeleton        (no active jobs)

packages/database  Prisma schema + client + migrations
packages/shared    Enums/types (source of truth for enum values)
packages/contracts Route map + DTOs (used by web only; api does not depend on it)
packages/ui        Empty placeholder
packages/config    Empty placeholder
```

**Postgres is local-only** — the docker-compose no longer runs a Postgres container. Local Postgres runs on **port 5432**; `DATABASE_URL` must use `localhost:5432`. The API container connects via `host.docker.internal:5432`.

### API (NestJS)

Global setup in `apps/api/src/main.ts`:
- `helmet()` applied first — security headers on every response including errors
- Prefix `/api/v1`
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` registered via `useGlobalGuards`; `ThrottlerGuard` registered via `APP_GUARD` in `AppModule` (needs DI)
- Rate limits: global 120 req / 60 s; auth endpoints tightened — login/register 5 req / 60 s, refresh 20 req / 60 s

**Feature modules** (`apps/api/src/`): `auth`, `users`, `organizations`, `locations`, `locations/climate`, `providers`, `datasets`, `reports`, `alerts`, `observations`, `restoration`, `biodiversity`, `weather`, `flood`, `radiation`, `marine`, `emissions`, `companies`, `gamification`, `metrics`, `notifications`, `permissions`, `analytics`, `water-bodies`, `ingestion`, `media`, `database`, `common`. Also registered in `AppModule`: a `SeedService` (seeds dev users + organization on boot).

Each feature module follows: `*.module.ts` → `*.controller.ts` → `*.service.ts` → `dto/` folder.

**Auth & guard stack:**
- `JwtAuthGuard` (extends `AuthGuard('jwt')`) — checks `@Public()` reflector metadata; skips JWT validation if present
- `RolesGuard` — checks `@Roles(...)` metadata against `request.user.role`; skips if no `@Roles` decorator applied
- `PermissionsGuard` — checks `@RequirePermissions(...)` metadata against DB-backed role-permission grants; ADMIN bypasses all permission checks; results are cached per role for 5 minutes
- `@Public()` — `SetMetadata(PUBLIC_KEY, true)` — bypasses `JwtAuthGuard` entirely
- `@Roles('ADMIN', ...)` — role gate; values must be UPPERCASE matching Prisma enum exactly
- `@RequirePermissions('organizations.manage', ...)` — fine-grained permission gate backed by `Permission`/`RolePermission` models
- `@CurrentUser()` — param decorator injecting `JwtPayload` from `request.user`

**Refresh tokens:** Opaque crypto-random bytes stored as SHA-256 hash in Postgres (`RefreshToken` model). Not JWTs. Redeemable only via `POST /api/v1/auth/refresh`. Rotated on use; daily cleanup cron removes expired rows.

**JWT_SECRET** is validated at boot in `apps/api/src/common/env.validation.ts`. The app refuses to start if the secret is missing, empty, a known placeholder (`dev-secret-change-in-production`, `change-me`, `changeme`, `secret`), or shorter than 32 characters. Generate with `openssl rand -base64 48`.

### Database (Prisma)

Schema: `packages/database/prisma/schema.prisma` — 60 models, 31 enums. 11 migrations applied (latest: `20260902181219_add_company_model`).

**All IDs are Prisma CUIDs** (e.g. `cmstewlrj0012usw17sqz1d3n`). Use `@IsString()` in DTO validators, never `@IsUUID()`.

**All enum values are UPPERCASE** and defined in `packages/shared`. A previous bug had them lowercase, causing `RolesGuard` to reject every request including admins. The shared package is the canonical source — Prisma, guards, and DTOs must all agree.

Seeding happens in service `onModuleInit()` hooks (idempotent upserts):
- `LocationsService` — seeds 8 divisions, 64 districts (all with GeoJSON boundary), 494 upazilas, 4,540 unions — all with lat/lng. Hardcoded in `apps/api/src/locations/seed/bangladesh.ts` (no runtime file reads). This file is the source of truth — edit it directly if location data needs updating.
- `ProvidersService` — seeds OpenMeteo, GBIF, and World Bank provider records
- `DatasetsService` — seeds 9 dataset catalog records (OpenMeteo Weather, OpenMeteo Flood, District Air Quality Index, Water Body Registry, Biodiversity Occurrences, Sundarbans Monitoring, Emissions Inventory, OpenMeteo Marine Weather, OpenMeteo Satellite Radiation)
- `PermissionsService` — seeds 11 named permissions (`reports.create`, `reports.moderate`, `alerts.manage`, `restoration.create`, `restoration.join`, `observations.create`, `observations.verify`, `observations.delete`, `organizations.access`, `organizations.manage`, `users.manage`) and default role grants
- `CompaniesService` — seeds **801 company records** (two-pass: parents before subsidiaries) and **1,451 industrial facility records** (lookup by `Company.name @unique`) — real Bangladeshi entities from the Mapped in Bangladesh (MiB) directory plus verified facilities (tanneries, power plants, etc.); see `companies.seed.ts`, `mib-companies.seed.ts`, `facilities/facilities.seed.ts`, `facilities/mib-facilities.seed.ts`. Seeding uses pre-loaded lookup maps (3 queries total on boot regardless of dataset size) to avoid N+1 startup penalty.
- `SeedService` — seeds 6 dev user accounts (one per role, password `NatureGrid123!`) and a seed organization for local development

Every mutation writes an `AuditEvent` record (action, userId, entityType, entityId, meta, ipAddress).

Notable schema decisions:
- `Occurrence.gbifOccurrenceKey` is `BigInt` — real GBIF keys exceed `INT4` range (caught on first live sync)
- `District.geom` is `Unsupported("geography(Point, 4326)")` — PostGIS point geometry now active via migration `20260901000000_postgis_geometry`. `District.coastLat`/`coastLng` hold the representative coastal coordinate used by the marine module.
- `OrganizationMembership` model links users to organizations with `ADMIN` or `MEMBER` role — users may belong to multiple organizations. `ORGANIZATION_ADMIN` is also a platform-level role in `UserRole`, separate from org-scoped membership.
- All 4 geography models (`Division`, `District`, `Upazila`, `Union`) carry 11 climate columns (`avgTemp30d`, `minTemp30d`, `maxTemp30d`, `avgHumidity30d`, `totalPrecip30d`, `avgWindSpeed30d`, `avgCloudCover30d`, `avgPm25_30d`, `avgPm10_30d`, `avgUvIndex30d`, `climateUpdatedAt`) — populated nightly by `LocationClimateModule`
- `UnionDailyClimate` — raw daily history per union; the source for 30-day rolling averages
- `UserProfile.earnedBadges` (String[]) + `UserProfile.contributionPoints` (Int) — gamification data stored on the profile model; no separate Badge model
- `NationalEmissionReading` — annual national GHG readings ingested from the World Bank Climate Change API; unique constraint on `(year, indicatorCode)`; 4 indicators tracked (Total GHG, CO₂, CH₄, N₂O)
- `ObservationMeasurement` — quantitative measurements per observation using `MeasurementParameter`, `MeasurementUnit`, and `QualityFlag` enums (water/air/biodiversity/soil parameters)
- `ProjectTarget` + `ProjectActivity` + `ProjectMetric` — restoration project sub-resources for tracking measurable goals, activity logs, and metric readings using `RestorationTargetMetric` enum
- `AlertType` enum (11 values) — distinguishes FLOOD, FLASH_FLOOD, CYCLONE, STORM_SURGE, HEATWAVE, AIR_QUALITY, WATER_POLLUTION, LANDSLIDE, DROUGHT, WILDFIRE, OTHER
- `AlertArea` — allows an alert to cover multiple districts/upazilas beyond the primary `districtId`
- `DatasetVersion` — published snapshots of a dataset with version string, metadata, and optional file URL
- `WaterBody`, `WaterBodyUpazila`, `LoticWaterBodyDetails`, `LenticWaterBodyDetails` — water body registry using `WaterBodyType` and `HydrologicalClass` enums
- `WaterLevelStation` — gauge stations with `dangerLevel`, `warningLevel`, `normalLevel` thresholds (metres above datum, nullable)
- `StationFloodForecast` — flood discharge forecasts per station (replaced earlier district-based model)
- `WaterLevelReading` — observed water level readings per station with `WaterLevelTrend` enum
- `Company` — legal entity that owns/operates industrial sites; self-referential `parentCompanyId` for conglomerates; `name @unique` for seed lookups; `CompanyType` enum (PRIVATE/STATE_OWNED/JOINT_VENTURE/MULTINATIONAL/CONGLOMERATE/CLUSTER)
- `IndustrialFacility` — physical industrial site linked to a company; `FacilityType` enum (15 types); `ComplianceStatus` enum (COMPLIANT/NON_COMPLIANT/UNDER_REVIEW/UNKNOWN); `etpInstalled Boolean`; seeded by `CompaniesService`

### Frontend (apps/web)

Next.js 14 App Router, Server Components throughout — no `useState`, no Redux, no Zustand. All form mutations use Server Actions. State lives in the URL or httpOnly cookies.

Route groups:
- `(public)` — `/`, `/login`, `/register`
- `(app)` — authenticated pages behind a sidebar shell: `/dashboard`, `/profile`, `/alerts`, `/alerts/:id`, `/observations`, `/observations/:id`, `/biodiversity`, `/biodiversity/species/:id`, `/community`, `/reports`, `/reports/:id`, `/locations`, `/locations/divisions/:id`, `/locations/districts/:id`, `/locations/upazilas/:id`, `/locations/unions/:id`, `/restoration`, `/restoration/:id`, `/data`, `/data/:id`, `/organizations`, `/organizations/:id`, `/industrial-sites` (tabbed: `?tab=companies` or default sites), `/industrial-sites/:id`, `/industrial-sites/companies/:id`

Edge middleware (`middleware.ts`) guards `/profile` and auto-refreshes expired access tokens before page render.

Fetch helpers: `apiGet` (cached), `apiGetAuthed`, `apiPost`, `apiPostAuthed` (never cached).

**`DistrictSelect` component** (`apps/web/components/district-select.tsx`) — Server Component that renders a `<select>` with districts grouped by division via `<optgroup>`. Accepts `DistrictWithDivision[]` (includes `division?: { id, name }`). Used on profile, reports, observations, restoration pages.

**Profile page tabs** (URL param `?tab=...`): `personal` (bio, phone, occupation, expertise, research interests, social links, institution, education), `location` (district, country, visibility), `achievements` (profile completeness widget, badge showcase, contribution points, level), `alerts` (severity subscriptions), `security` (password change, session management).

`apps/web` depends on `@nature-grid/contracts` for route constants and DTOs. `apps/api` has `@nature-grid/contracts` as a **devDependency only** — it is never imported in production code, but `apps/api/src/common/contract-types.typecheck.ts` uses it for compile-time contract enforcement: every service return type is asserted against its contract type via `tsc --noEmit` in CI. A service dropping a required field or changing a field type will produce a `TS2322` error and fail the build.

**Contracts gap:** `packages/contracts/src/index.ts` does not yet list routes for `radiation` or `marine` — these API endpoints exist but the web app does not consume them yet. Add contract entries before building frontend pages for those features.

### Admin Console (apps/admin)

Next.js 14 App Router at port 3002. Same Server Components + Server Actions pattern as `apps/web` — no client-side state.

Route groups: `(auth)` — `/login`; `(admin)` — all other pages behind a dark sidebar shell. Edge middleware (`middleware.ts`) guards all routes, decodes JWT expiry via `atob` (Edge runtime — no `Buffer`), auto-refreshes tokens before page render.

**Cookie separation:** uses `nga_access` / `nga_refresh` cookie names — distinct from `apps/web`'s `ng_access_token` / `ng_refresh_token` to prevent cross-app interference. Constants in `lib/session-constants.ts`.

**Role enforcement:** login rejects non-MODERATOR/ADMIN accounts at the application layer (best-effort revoke + clear cookies). The `(admin)` layout re-checks role on every render via `GET /api/v1/auth/profile`.

**Nav:** `components/admin-nav.tsx` is `'use client'` (uses `usePathname()` for active-link state); Datasets and Users links are ADMIN-only. The layout itself stays a Server Component.

Pages: Reports (moderation queue, 5-status tabs), Users (role change, deactivate, reactivate), Alerts (create, cancel, status tabs), Datasets (publish toggle, access policy), Organizations (create, membership management), Ingestion (job history, status tabs, per-job detail — ADMIN-only), Permissions (role ↔ permission matrix CRUD), Restoration (project admin), Audit (audit event log), Settings (layout & design tokens), System (system health).

### Weather, Biodiversity, Flood, Radiation, Marine & Location Climate modules

These modules handle external data ingestion. All use `IngestionService` (imported from `IngestionModule`) to write `IngestionJob` records per scheduler run.

- `weather/` — OpenMeteo HTTP client (`WeatherOpenMeteoClient`, exported from `WeatherModule`), three cron jobs (current every 15 min, hourly/AQ every 2 h, daily every 12 h), public read endpoints. Fetches at **district** level (64 locations).
- `biodiversity/` — GBIF HTTP client, daily sync cron (fetches 1,000 occurrences), species + occurrence read endpoints
- `flood/` — OpenMeteo Flood / GloFAS HTTP client, six-hour scheduler (initial sync on empty table), station-based forecast and water level reading endpoints. Forecasts are persisted as `StationFloodForecast` per water level station (replaced earlier district-level `FloodForecast` model). Endpoints: `GET /flood/forecast`, `GET /flood/forecast/station/:stationId`, `GET /flood/forecast/district/:districtId`, `GET /flood/stations/:stationId/readings`, `GET /flood/stations/:stationId/latest`.
- `radiation/` — OpenMeteo Satellite Radiation HTTP client (`RadiationOpenMeteoClient`), daily cron at 1am, initial sync on empty table. Fetches `shortwave_radiation_sum`, `sunshine_duration`, `daylight_duration` for all 64 districts (7-day window from the archive API). **Aggregation:** 10-minute native W/m² samples are summed to daily MJ/m² via `Σ(W/m²) × step_seconds / 1,000,000`; step interval is inferred from the first two timestamps. 3-attempt retry with exponential backoff (500 ms, 1500 ms); 30-second fetch timeout. Upserts per `(districtId, readingDate)`. Endpoints: `GET /radiation/daily`, `GET /radiation/daily/:districtId?from=&to=`.
- `marine/` — OpenMeteo Marine Weather HTTP client (`MarineOpenMeteoClient`), daily cron at 2am, initial sync on empty table. Fetches 11 daily wave/swell/wind-wave variables for all 64 district centroids; inland districts produce a fetch error logged as `warn` and skipped. Endpoints: `GET /marine/forecast`, `GET /marine/forecast/:districtId?from=&to=`.
- `locations/climate/` — `LocationClimateModule` with a daily cron (`0 0 0 * * *`). Fetches OpenMeteo at **union** level using the batch API (up to 1,000 coords per HTTP request — 4,540 unions = 6 total requests). Stores raw daily data in `UnionDailyClimate`, then recomputes 30-day rolling averages bottom-up: Union → Upazila → District → Division via bulk `UPDATE … FROM (SELECT … GROUP BY)` SQL wrapped in a single Prisma `$transaction`. Reuses `WeatherOpenMeteoClient` from `WeatherModule` (import `WeatherModule` to get it). Writes `IngestionJob` records via `IngestionService` (categories `WEATHER` + `AIR_QUALITY`).

### Emissions module

`apps/api/src/emissions/` — ingests national GHG emissions data from the World Bank Climate Change API. No user input — read-only automated pipeline matching the radiation/marine pattern.

- **Client** (`world-bank.client.ts`) — fetches `https://api.worldbank.org/v2/country/BGD/indicator/{CODE}?format=json&page=N&per_page=50`; paginates all pages; 3-attempt retry (500 ms, 1500 ms); 30-second `AbortController` timeout. Response shape: `[metadata, records[]]` where `records[].value` is `number | null` and `records[].date` is a string year.
- **Four indicators**: `EN.GHG.ALL.MT.CE.AR5` (Total GHG), `EN.GHG.CO2.MT.CE.AR5` (CO₂), `EN.GHG.CH4.MT.CE.AR5` (CH₄), `EN.GHG.N2O.MT.CE.AR5` (N₂O) — all in Mt CO₂e; ~66 annual records per indicator (1976–present).
- **Scheduler** (`EmissionsScheduler`) — weekly cron (`0 0 3 * * 0`, Sunday 3am); advisory lock via `CRON_LOCK_KEYS.EMISSIONS`; initial sync on boot if table is empty; writes `IngestionJob` records via `IngestionService`.
- **Endpoints** (all `@Public()`):
  - `GET /emissions` — `?indicator`, `?from`, `?to` year filters; ordered year DESC
  - `GET /emissions/indicators` — distinct indicator codes + names
  - `GET /emissions/:year` — all indicators for a given year; 404 if no data
- **Frontend page** (`apps/web/app/(app)/emissions/page.tsx`) — time-series table grouped by year × indicator, indicator dropdown filter, from/to year inputs, World Bank source attribution.

### Water Bodies module

`apps/api/src/water-bodies/` — water body registry and monitoring station directory.

- **Models**: `WaterBody` (type, hydrological class, lat/lng, area), `WaterBodyUpazila` (many-to-many), `LoticWaterBodyDetails` (river/canal specifics), `LenticWaterBodyDetails` (haor/lake specifics), `WaterLevelStation` (gauge thresholds: `dangerLevel`, `warningLevel`, `normalLevel`), `WaterBodyStation`, `WaterLevelReading`
- **Enums**: `WaterBodyType`, `HydrologicalClass`, `WaterLevelTrend`
- **Endpoints**: `GET /water-bodies`, `GET /water-bodies/stations`, `GET /water-bodies/:id`
- Water level readings served via flood module: `GET /flood/stations/:stationId/readings`, `GET /flood/stations/:stationId/latest`
- Seeded from CSV via `WaterBodiesService.onModuleInit`

### Media module

`apps/api/src/media/` — file upload and presigned URL generation for evidence attachments.

- `StorageService` — wraps AWS S3Client with `forcePathStyle: true` for MinIO compatibility; graceful degradation when storage env vars are unconfigured
- `MediaService` — MIME validation against `ALLOWED_MIME_TYPES`, 100 MB size limit (`MAX_UPLOAD_SIZE_BYTES`), key generation pattern `{folder}/{userId}/{uuid}{ext}`
- `MediaController` — `POST /media/upload` (multipart file upload), `POST /media/presign` (returns presigned URL for direct client upload)
- `media.constants.ts` — exports `MAX_UPLOAD_SIZE_BYTES`, `ALLOWED_MIME_TYPES`, `UPLOAD_FOLDERS`
- Env vars: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`

### BullMQ queues

BullMQ is wired via `BullModule.forRootAsync` in `AppModule`, parsing `REDIS_URL` for host/port/password. Two queues:

- **`email` queue** (in `NotificationsModule`) — `EmailProcessor` handles `password-reset`, `email-verification`, and `alert-notification` job types with 4-attempt exponential backoff. `AuthService.forgotPassword` and `sendVerificationEmail` enqueue jobs here instead of calling SMTP directly.
- **`gamification` queue** (in `GamificationModule`) — `GamificationProcessor` handles `evaluate-badges` jobs; deduplication via `jobId: badge-eval:{userId}` prevents parallel evaluation for the same user. `GamificationService.evaluateBadges()` enqueues a job; actual badge logic runs in `performEvaluation()` called by the processor.

### Gamification module

`apps/api/src/gamification/` — profile completeness scoring and badge system.

- **Endpoint:** `GET /api/v1/gamification/me` — returns completeness score (0–100), missing field prompts, earned badges, contribution points, level
- **Profile completeness:** 10 weighted checks across `UserProfile`, `UserSocialLink`, `OrganizationMembership`, `CitizenReport`, `Observation`. No DB model — computed in `COMPLETENESS_CHECKS` array in `GamificationService`.
- **Levels:** Newcomer (0) → Contributor (100) → Advocate (300) → Champion (600) → Environmental Leader (1200+)
- **Badges:** 5 categories × 4 tiers (Bronze 25 pts / Silver 75 pts / Gold 150 pts / Emerald 300 pts): Civic Guardian (verified reports), Water Sentinel (water quality observations), Clean Air Defender (air quality contributions), Biodiversity Explorer (research-grade species), Restoration Pioneer (ecological restoration projects)
- Badge counts computed via 6 parallel Prisma queries. `evaluateBadges()` enqueues a BullMQ job (deduped by userId); actual evaluation runs in `GamificationProcessor.performEvaluation()`. Earned badge IDs stored in `UserProfile.earnedBadges` (String[]).

### Analytics module

`apps/api/src/analytics/` — 5 role-gated dashboard endpoints, each returning aggregate stats tailored to the caller's role.

- `GET /analytics/admin` — users by role, reports by status, active alerts, organizations, datasets, species count, monthly observations, today's audit events
- `GET /analytics/moderator` — moderation queue depth, pending/under-review counts, reviewed-today, 7-day submission trend
- `GET /analytics/government` — active alerts by severity/division, verified reports (30 d), top districts, division climate data
- `GET /analytics/researcher` — total species, occurrences, research-grade observation %, top 10 species, 6-month occurrence trend
- `GET /analytics/orgadmin` — restoration projects by status, total/active counts, 30-day new projects, top projects by participant count

Complex queries use raw SQL via `prisma.$queryRaw`.

### Testing

153 unit tests in 11 spec files under `apps/api/src/` (all fully mocked — no DB, no running server):
- `roles.guard.spec.ts` — all 6 roles, case-sensitivity regression (9 tests)
- `jwt-auth.guard.spec.ts` — `@Public()` bypass, error handling (5 tests)
- `auth.service.spec.ts` — register/login/refresh/logout, token rotation, audit events, `USER_LOGIN_FAILED` in all three failure branches (24 tests)
- `refresh-token.util.spec.ts` — opaque format, hash isolation (7 tests)
- `env.validation.spec.ts` — placeholder rejection, 31/32-char boundary (7 tests)
- `reports.service.spec.ts` — status transitions, badge trigger, comment visibility, list filtering
- `observations.service.spec.ts` — future date rejection, owner/trust guards, FLAGGED exclusion, badge trigger
- `restoration.service.spec.ts` — permission checks, P2002 idempotency, org validation, badge trigger
- `notifications.service.spec.ts` — deduplication, severity filtering, PENDING delivery record, ConflictException
- `gamification.service.spec.ts` — earnedKeysForCategory, computeLevel, enqueue dedup, performEvaluation early-exit
- `media.service.spec.ts` — MIME allowlist, size limit, key generation, presign TTL

`apps/web` and `apps/admin` have no tests (`echo "No web tests configured yet"`).

CI (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → `pnpm audit --prod --audit-level=high` → `prisma generate` → `prisma validate` → `tsc --noEmit` × 3 → `jest` → `pnpm build`. A parallel `docker-build` job runs `docker build -f apps/api/Dockerfile -t nature-grid/api:ci .`. Remote is `Cipher-Text/nature-grid` on GitHub — CI runs on every push to `main` and on PRs. CD (`.github/workflows/deploy.yml`) builds and pushes images to Docker Hub then deploys to VPS via SSH (`appleboy/ssh-action`) — triggered automatically after CI passes on `main` or manually via `workflow_dispatch`.

## Key environment variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Local dev: `localhost:5432`. Docker container uses `host.docker.internal:5432`. |
| `JWT_SECRET` | Required. ≥ 32 chars, no known placeholders. App fails fast if absent. |
| `PORT` | Defaults to `3001` |
| `CORS_ORIGIN` | Defaults to `*` in dev |
| `API_URL` | Used by `apps/web` server-side fetches (no `NEXT_PUBLIC_` prefix) |
| `REDIS_URL` | Required for BullMQ queues — parsed by `BullModule.forRootAsync` in `AppModule` for host/port/password |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Optional one-time production admin seed — skipped if already exists |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional email delivery — wired to `EmailService` via nodemailer; used by the `email` BullMQ queue processor for password-reset, email-verification, and alert-notification jobs |
| `STORAGE_ENDPOINT` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` / `STORAGE_BUCKET` / `STORAGE_PUBLIC_URL` | Optional object storage (S3 / MinIO) for the `media` module — graceful degradation when absent |
