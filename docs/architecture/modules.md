# Modules

All NestJS modules live under `apps/api/src/`. The `DatabaseModule` is global and injects `PrismaService` everywhere.

Global prefix is `/api/v1` (see `packages/contracts/src/index.ts` for the canonical route map). `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard` are applied globally in `main.ts`; `ThrottlerGuard` is registered via `APP_GUARD` in `AppModule`. Every route is authenticated unless marked `@Public()`. Permission-gated routes additionally require a DB-backed permission grant checked by `PermissionsGuard`.

Legend: ✓ Implemented | ~ Stub only | ✗ Not started

Registered in `app.module.ts`: `database`, `auth`, `users`, `organizations`, `locations`, `locations/climate`, `providers`, `datasets`, `reports`, `alerts`, `biodiversity`, `observations`, `restoration`, `media`, `ingestion`, `weather`, `flood`, `marine`, `radiation`, `emissions`, `companies`, `metrics`, `notifications`, `permissions`, `analytics`, `water-bodies`, `gamification`, `community`. `SeedService` is also registered directly in `AppModule` (not its own module) and seeds dev users + a seed organization on first boot.

## database ✓

Global module. Provides `PrismaService` (extends `PrismaClient`) with connect/disconnect lifecycle hooks.

## health ✓

Not a module — a single `HealthController` registered directly in `app.module.ts`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | Public — returns `status`, `service`, `timestamp`, `version` |

## auth ✓

Owns registration, login, token refresh, session lifecycle, and authentication guards.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public — redeems an opaque refresh token |
| POST | `/auth/logout` | Public — revokes a refresh token, idempotent |
| GET | `/auth/profile` | Authenticated |
| PATCH | `/auth/profile` | Authenticated — update display name, bio, phone, etc. |
| PATCH | `/auth/password` | Authenticated (`EMAIL` provider only) |
| POST | `/auth/forgot-password` | Public — enqueues password-reset email (enumeration-proof) |
| POST | `/auth/reset-password` | Public — redeems reset token, revokes all sessions |
| POST | `/auth/send-verification` | Authenticated — (re)sends email verification link |
| POST | `/auth/verify-email` | Public — marks email as verified via token |
| GET | `/auth/google` | Public — initiates Google OAuth 2.0 flow (Passport redirect) |
| GET | `/auth/google/callback` | Public — Google consent callback; issues a 30-second `OAuthExchangeCode` and redirects browser to `APP_URL/auth/callback?code=…` |
| POST | `/auth/exchange` | Public — redeems a 30-second exchange code; returns access + refresh tokens (used by the Next.js route handler to set httpOnly cookies) |

`JWT_SECRET` is required: `common/env.validation.ts` validates it at boot via `ConfigModule.forRoot({ validate })`, and both `auth.module.ts` and `jwt.strategy.ts` read it with `getOrThrow` — there is no fallback value. A missing, placeholder, or under-32-character secret aborts startup before the database is touched.

Access tokens are JWTs; refresh tokens are opaque random strings stored as SHA-256 hashes in the `RefreshToken` table, **not** JWTs and **not** Redis-backed. Refresh rotates the pair and revokes the old token, so a stolen refresh token stops working once the legitimate client refreshes. `RefreshTokenCleanupScheduler` runs daily at 2 AM and deletes tokens expired 30+ days ago.

Registration, login, and logout each write an audit event (`USER_REGISTER`, `USER_LOGIN`, `USER_LOGOUT`) with the caller's IP. Logout stays idempotent but audits only a real revocation — repeat logouts and unknown tokens still return success without logging a duplicate or unattributable event. Failed logins also write `USER_LOGIN_FAILED` (added 2026-08-21) — unknown email gets `userId: null` with the attempted address in meta; wrong password or deactivated account gets the real `userId` with a `reason` field. The HTTP response is a generic 401 either way; the audit trail is the only place the distinction is visible. See `docs/progress.md` "Auth Refresh/Logout" for why Postgres was chosen over Redis.

## users ✓

Owns user profiles, roles, and user lifecycle.

Roles (all in `UserRole`): `CITIZEN | RESEARCHER | ORGANIZATION_ADMIN | GOVERNMENT | MODERATOR | ADMIN`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/users` | Admin |
| GET | `/users/:id` | Admin |
| GET | `/users/audit-events` | Admin |
| PATCH | `/users/:id/role` | Admin |
| PATCH | `/users/:id/deactivate` | Admin |
| PATCH | `/users/:id/reactivate` | Admin |

`@Roles('ADMIN')` is applied at the controller level, so all routes are admin-only.

`PATCH /users/:id/role` writes `USER_ROLE_CHANGE` with `{from, to}` in `meta`. `PATCH /users/:id/deactivate` writes `USER_DEACTIVATE` with `{wasActive}`. `PATCH /users/:id/reactivate` re-enables a deactivated account. `GET /users/audit-events` returns a paginated, filterable list of all `AuditEvent` rows (filterable by `action`, `userId`, `entityType`).

## organizations ✓

Owns NGOs, research groups, public agencies, community groups, and institutions. Organization classification uses `OrganizationType`; `ProviderType` is reserved for data-source providers.

Admin management uses `OrganizationMembership` as a many-to-many link between users and organizations. Each membership is either `ADMIN` or `MEMBER`; users may belong to multiple organizations. The management endpoints use the RBAC permission `organizations.manage`, currently granted to the platform `ADMIN` role.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/organizations` | Public (`?type`, `?page`, `?pageSize`) |
| GET | `/organizations/:id` | Public |
| GET/POST | `/admin/organizations` | `organizations.manage` |
| POST/PATCH/DELETE | `/admin/organizations/:id/members[/:userId]` | `organizations.manage` |

## locations ✓

Owns administrative geography for Bangladesh.

Entities: `Division → District → Upazila → Union`

Seeded on first boot via `OnModuleInit`: 8 divisions, 64 districts (all with GeoJSON boundary), 494 upazilas, 4,540 unions — all with lat/lng. All coordinates are hardcoded in `apps/api/src/locations/seed/bangladesh.ts`; no runtime file reads are required. This file is the source of truth — edit it directly if location data needs updating.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/locations/divisions` | Public |
| GET | `/locations/districts` | Public (`?divisionId`) |
| GET | `/locations/districts/:id` | Public |
| GET | `/locations/upazilas` | Public (`?districtId`) |
| GET | `/locations/upazilas/:id` | Public |
| GET | `/locations/unions` | Public (`?upazilaId`) |
| GET | `/locations/unions/:id` | Public |

## locations/climate ✓

Owns the daily union-level climate ingestion pipeline. No HTTP endpoints — scheduler only.

`LocationClimateScheduler` runs daily at midnight (`@Cron('0 0 0 * * *')`). `LocationClimateService` calls the OpenMeteo forecast API (daily temp max/min/mean, precipitation, wind speed, UV index) and air-quality API (PM2.5, PM10, ozone, UV index) in batch: up to 1,000 union coordinates per HTTP request, so 4,540 unions require just 6 requests total. The service reuses `WeatherOpenMeteoClient` exported from `WeatherModule`.

Raw daily results are upserted into `UnionDailyClimate` (one row per union per day, unique on `(unionId, date)`). After inserting, 30-day rolling averages are recomputed bottom-up — Union → Upazila → District → Division — via bulk `UPDATE … FROM (SELECT … GROUP BY)` SQL, updating the 11 climate columns on each geography model in a single pass per level.

## providers ✓

Owns data source provenance: government agencies, research institutions, NGOs, satellite feeds, IoT sensors.

Auto-seeds the `OpenMeteo` and `GBIF` provider records on first boot.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/providers` | Public (`?type`, `?page`, `?pageSize`) |
| GET | `/providers/:id` | Public |

## datasets ✓

Owns dataset catalog, metadata, access policy, version history, and source references.

Access policies: `PUBLIC | LOGIN_REQUIRED | RESEARCHER | APPROVED | GOVERNMENT`

Seeded on first boot: 9 catalog records (OpenMeteo Weather, OpenMeteo Flood, District Air Quality Index, Water Body Registry, Biodiversity Occurrences, Sundarbans Monitoring, Emissions Inventory, OpenMeteo Marine Weather, OpenMeteo Satellite Radiation) — all idempotent upserts.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/datasets` | Public (`?category`, `?accessPolicy`, `?page`, `?pageSize`) |
| GET | `/datasets/:id` | Public |
| GET | `/datasets/weather/current` | Public — delegates to `weather` module |
| GET | `/datasets/air-quality/current` | Public — delegates to `weather` module |
| GET | `/datasets/:id/download` | Role-gated (policy-checked) |
| POST | `/datasets/:id/access-request` | Authenticated |
| GET | `/datasets/:id/access-requests` | Admin |
| PATCH | `/datasets/:id/access-requests/:requestId` | Admin — approve/reject |
| POST | `/datasets` | Admin — create dataset record |
| PATCH | `/datasets/:id` | Admin — update metadata (audited `DATASET_UPDATE`) |
| GET | `/datasets/:id/versions` | Authenticated |
| POST | `/datasets/:id/versions` | Admin — publish a new dataset version (audited `DATASET_VERSION_PUBLISH`) |

Dataset detail pages live at `/data/:id` in `apps/web`; they show metadata, API endpoints, and live previews for OpenMeteo, Flood, and GBIF datasets.

## reports ✓

Owns citizen issue reports, verification status, status history, and audit log.

Categories: `WATER_POLLUTION | ILLEGAL_DUMPING | DEFORESTATION | WILDLIFE_INCIDENT | FLOODING | AIR_POLLUTION | OTHER`

Status workflow: `SUBMITTED → UNDER_REVIEW → VERIFIED/REJECTED → RESOLVED`

Submission writes a `REPORT_SUBMIT` audit event. Every status transition writes a `ReportStatusEvent` and a `REPORT_STATUS_CHANGE` audit event in one transaction.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/reports` | Public — verified/resolved only (`?status`, `?category`, `?districtId`, `?page`, `?pageSize`) |
| GET | `/reports/mine` | Authenticated — caller's own reports, all statuses |
| GET | `/reports/:id` | Public |
| POST | `/reports` | Authenticated |
| PATCH | `/reports/:id/status` | Moderator / Admin |
| GET | `/reports/:id/comments` | Public — non-internal only |
| GET | `/reports/:id/comments/all` | Moderator / Admin — includes internal notes |
| POST | `/reports/:id/comments` | Authenticated |
| GET | `/reports/:id/media` | Public |
| POST | `/reports/:id/media` | Authenticated |

## alerts ✓

Owns disaster and environmental alert records and geographic alert areas.

Types: `FLOOD | FLASH_FLOOD | CYCLONE | STORM_SURGE | HEATWAVE | AIR_QUALITY | WATER_POLLUTION | LANDSLIDE | DROUGHT | WILDFIRE | OTHER`

Severities: `INFO | WATCH | WARNING | EMERGENCY`

Statuses: `DRAFT | ACTIVE | EXPIRED | CANCELLED`

Default public list returns `ACTIVE` alerts, ordered by severity descending. Every create and status update writes an `AuditEvent`. `AlertArea` records allow an alert to target multiple districts and/or upazilas beyond the primary `districtId`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/alerts` | Public (`?status`, `?severity`, `?districtId`, `?page`, `?pageSize`) |
| GET | `/alerts/:id` | Public |
| POST | `/alerts` | Government / Moderator / Admin |
| PATCH | `/alerts/:id` | Government / Moderator / Admin |

## observations ✓

Owns environmental observations submitted by users and researchers, with quantitative measurements attached per observation. Built in M9 (2026-08-17).

Categories: `BIODIVERSITY | WATER_QUALITY | AIR_QUALITY | LAND_USE | RESTORATION`

Trust levels: `RESEARCH_GRADE | COMMUNITY | UNVERIFIED | FLAGGED`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/observations` | Public (`?category`, `?trustLevel`, `?districtId`, `?page`, `?pageSize`) |
| GET | `/observations/mine` | Authenticated — caller's own observations, all trust levels |
| GET | `/observations/nearby` | Public — spatial query by lat/lng + radius |
| GET | `/observations/:id` | Public |
| POST | `/observations` | Authenticated |
| PATCH | `/observations/:id` | Owner / Admin |
| PATCH | `/observations/:id/trust` | Researcher / Admin |
| DELETE | `/observations/:id` | Owner / Admin |
| POST | `/observations/:id/measurements` | Authenticated — attach a quantitative measurement (audited `OBSERVATION_MEASUREMENT_ADD`) |
| DELETE | `/observations/:id/measurements/:measurementId` | Owner / Admin (audited `OBSERVATION_MEASUREMENT_DELETE`) |

Submissions always start at `UNVERIFIED` regardless of submitter role. Public listings exclude `FLAGGED` unless `trustLevel` is filtered explicitly. Trust changes write an `OBSERVATION_TRUST_CHANGE` audit event recording the `from`/`to` levels. `species` is free text, not a FK to `Species` — see `architecture/data-model.md`. Measurements use `MeasurementParameter` + `MeasurementUnit` + `QualityFlag` enums for water quality, air quality, biodiversity, and soil parameters.

## biodiversity ✓

Owns species taxonomy and occurrence records sourced from GBIF. Separate from generic observations. Built in M10 (2026-08-19).

| Method | Path | Access |
| --- | --- | --- |
| GET | `/biodiversity/species` | Public (`?search`, `?page`, `?pageSize`) |
| GET | `/biodiversity/species/:id` | Public |
| GET | `/biodiversity/occurrences` | Public (`?speciesId`, `?districtId`, `?page`, `?pageSize`) |

`gbif.client.ts` queries `api.gbif.org/v1/occurrence/search` filtered to `country=BD&hasCoordinate=true`. `BiodiversityScheduler` syncs daily at midnight, catching and logging failures without crashing the run. `iucnStatus` is intentionally unpopulated — GBIF occurrence search does not return it, and per-species enrichment was scoped out of v1.

## restoration ✓

Owns community and organization restoration projects with a participant join workflow, measurable targets, activity logs, and metric readings. Built in M11 (2026-08-19).

Categories: `TREE_PLANTING | WETLAND_RESTORATION | RIVERBANK_PROTECTION | MANGROVE | WASTE_MANAGEMENT | OTHER`

Statuses: `PLANNED | ACTIVE | COMPLETED | PAUSED`

Target metrics: `TREES_PLANTED | AREA_RESTORED_HA | SEEDLINGS_SURVIVED | SPECIES_REINTRODUCED | WATER_QUALITY_SCORE | CARBON_SEQUESTERED_T | VOLUNTEER_HOURS | OTHER`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/restoration/projects` | Public (`?category`, `?status`, `?districtId`, `?page`, `?pageSize`) |
| GET | `/restoration/projects/:id` | Public |
| POST | `/restoration/projects` | Organization Admin / Admin |
| PATCH | `/restoration/projects/:id` | Authenticated — creator or Admin only |
| POST | `/restoration/projects/:id/join` | Authenticated |
| GET | `/restoration/projects/:id/targets` | Public |
| POST | `/restoration/projects/:id/targets` | Creator / Admin (audited `RESTORATION_TARGET_ADD`) |
| GET | `/restoration/projects/:id/activities` | Public |
| POST | `/restoration/projects/:id/activities` | Authenticated (audited `RESTORATION_ACTIVITY_ADD`) |
| GET | `/restoration/projects/:id/targets/:targetId/metrics` | Public |
| POST | `/restoration/projects/:id/targets/:targetId/metrics` | Authenticated (audited `RESTORATION_METRIC_ADD`) |

Note the controller prefix is `restoration/projects`, not `restoration`. `PATCH` has no route-level `@Roles` guard: ownership is enforced inside `RestorationService.update`, which throws `ForbiddenException` unless the caller is the project creator or an `ADMIN`. Joining is idempotent via the `(projectId, userId)` unique constraint on `RestorationParticipant`.

## weather ✓

Owns OpenMeteo integration: HTTP client, fetch/persist service, cron scheduler, and read endpoints. Provider-specific field and endpoint details live in `docs/integrations/openmeteo.md`.

Tables: `CurrentWeatherReading`, `HourlyWeatherForecast`, `DailyWeatherForecast`, `HourlyAirQuality` — all keyed by `districtId` (not raw lat/lng proximity matching), unique on `(districtId, time)`.

Scheduler cadence: current every 15 min (`0 */15 * * * *`), hourly + air quality every 2h (`0 0 */2 * * *`), daily every 12h (`0 0 */12 * * *`). Per-district fetch failures are caught and logged via NestJS `Logger` without stopping the run for other districts. Each outer scheduler run creates an `IngestionJob` when the `OpenMeteo` provider exists and marks it `SUCCEEDED` or `FAILED`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/weather/current` | Public — latest reading for every district |
| GET | `/weather/current/:districtId` | Public |
| GET | `/weather/hourly/:districtId` | Public (`?from`, `?to`) |
| GET | `/weather/daily/:districtId` | Public (`?from`, `?to`) |
| GET | `/weather/air-quality` | Public — latest reading for every district |
| GET | `/weather/air-quality/:districtId` | Public |

Also consumed by `DatasetsModule` to serve `/datasets/weather/current` and `/datasets/air-quality/current`, and by `apps/web`'s `map-section.tsx` (public homepage "Current conditions" sidebar, with fallback to static data if the API is unreachable). `WeatherOpenMeteoClient` is exported from `WeatherModule` and reused by `LocationClimateModule` for batch union-level fetches.

## flood ✓

Owns the OpenMeteo Flood / GloFAS integration: provider client, station-based discharge persistence, six-hour scheduler, ingestion tracking, water level readings, and public read endpoints.

Forecasts are now stored per **water level station** (`StationFloodForecast`) rather than per district. The `FloodScheduler` runs every six hours (`0 30 */6 * * *`) and triggers an initial sync when the table is empty. OpenMeteo Flood returns simulated river discharge, not an official Bangladesh flood warning; official FFWC integration remains a separate future source.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/flood/forecast` | Public — latest stored forecast day for all stations |
| GET | `/flood/forecast/station/:stationId` | Public — full forecast window for one station (`?from`, `?to`) |
| GET | `/flood/forecast/district/:districtId` | Public — forecasts for all stations in a district |
| GET | `/flood/stations/:stationId/readings` | Public — historical water level readings (`?from`, `?to`) |
| GET | `/flood/stations/:stationId/latest` | Public — most recent water level reading for a station |

## radiation ✓

Owns the OpenMeteo Satellite Radiation integration: HTTP client, daily persistence, scheduler, ingestion tracking, and public read endpoints.

Fetches three daily variables (`shortwave_radiation_sum` Wh/m², `sunshine_duration` seconds, `daylight_duration` seconds) for all 64 districts. Scheduler runs at 1am (`@Cron('0 0 1 * * *')`) and triggers an initial sync on first boot if the table is empty. Each run creates an `IngestionJob` record.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/radiation/daily` | Public — latest reading for every district |
| GET | `/radiation/daily/:districtId` | Public (`?from`, `?to`) |

## marine ✓

Owns the OpenMeteo Marine Weather integration: HTTP client, daily forecast persistence, scheduler, ingestion tracking, and public read endpoints.

Fetches 11 daily wave/swell/wind-wave variables for all 64 districts. OpenMeteo snaps coordinates to the nearest marine grid cell; inland districts produce no rows (errors logged as `warn`). Scheduler runs at 2am (`@Cron('0 0 2 * * *')`) and triggers an initial sync on first boot if the table is empty. Each run creates an `IngestionJob` record.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/marine/forecast` | Public — latest forecast for every district that has data |
| GET | `/marine/forecast/:districtId` | Public (`?from`, `?to`) |

## emissions ✓

Ingests national GHG data from the World Bank Climate Change API (`api.worldbank.org/v2/country/BGD/indicator/{code}`). All read endpoints are `@Public()`. No user-input write paths exist.

**Indicators synced:** `EN.GHG.ALL.MT.CE.AR5` (Total GHG), `EN.GHG.CO2.MT.CE.AR5` (CO₂), `EN.GHG.CH4.MT.CE.AR5` (CH₄), `EN.GHG.N2O.MT.CE.AR5` (N₂O). Values in Mt CO₂e, annual, 1976–2024.

**Client:** `WorldBankClient` — paginates through API responses (2 pages × 50 records), 3-attempt retry, 30 s timeout per request.

**Scheduler:** `EmissionsScheduler` — `@Cron('0 0 3 * * 0')` (weekly Sunday 3am); triggers initial sync on empty table via `onModuleInit`.

**Storage:** `NationalEmissionReading` — one row per `(year, indicatorCode)`; upserts in a single `$transaction` per indicator. Null-value rows (e.g. 2025 projection) are skipped.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/emissions` | Public (`?indicator=`, `?from=`, `?to=`) |
| GET | `/emissions/indicators` | Public — distinct codes in DB |
| GET | `/emissions/:year` | Public — all indicators for a year |

## companies ✓

Owns legal entities (companies) and their physical industrial sites (facilities). `CompaniesService.onModuleInit()` seeds both on first boot: 42 company records in two passes (parents before subsidiaries), then 44 facility records (lookup by `Company.name @unique`). This means no separate seed script is needed.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/companies` | Public (`?companyType`, `?districtId`, `?isActive`, `?page`, `?limit`) |
| GET | `/companies/:id` | Public — includes subsidiaries and facilities list |
| POST | `/companies` | Government / Admin |
| PATCH | `/companies/:id` | Government / Admin |
| GET | `/facilities` | Public (`?facilityType`, `?complianceStatus`, `?districtId`, `?upazilaId`, `?companyId`, `?isActive`, `?page`, `?limit`) |
| GET | `/facilities/:id` | Public — includes linked company, recent citizen reports |
| POST | `/facilities` | Government / Admin |
| PATCH | `/facilities/:id` | Government / Admin |
| DELETE | `/facilities/:id` | Admin |

`CompaniesModule` exports `CompaniesService` so that `FacilitiesService` can resolve company seeds during `onModuleInit`. Mutations write `COMPANY_CREATE`, `COMPANY_UPDATE`, `FACILITY_CREATE`, `FACILITY_UPDATE`, `FACILITY_DELETE` audit events. Public web surface: `/industrial-sites` (tabbed — `?tab=companies` switches to company list), `/industrial-sites/companies/:id` (company detail with subsidiaries and sites table), `/industrial-sites/:id` (facility detail with linked reports).

## metrics ✓

Owns live platform counters for the public homepage. Built as M13 task 7 (2026-08-19).

| Method | Path | Access |
| --- | --- | --- |
| GET | `/metrics/platform` | Public |

Returns `activeAlerts`, `emergencyAlerts`, `verifiedReports`, `publicDatasets`, `researchGradeObservations`, and `districtsWithResearchGradeObservations` — six real counts computed in a single `Promise.all`, no cached or precomputed values.

## media ✓

Owns file upload and presigned URL generation for evidence attachments and media assets.

- `StorageService` — wraps AWS S3Client with `forcePathStyle: true` for MinIO; graceful degradation when storage env vars are absent
- `MediaService` — validates MIME type against `ALLOWED_MIME_TYPES`, enforces 100 MB size limit (`MAX_UPLOAD_SIZE_BYTES`), generates keys as `{folder}/{userId}/{uuid}{ext}`
- `media.constants.ts` — exports `MAX_UPLOAD_SIZE_BYTES`, `ALLOWED_MIME_TYPES`, `UPLOAD_FOLDERS`

| Method | Path | Access |
| --- | --- | --- |
| POST | `/media/upload` | Authenticated — multipart file upload |
| POST | `/media/presign` | Authenticated — returns presigned URL for direct client upload |

Env vars required for storage: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`.

## ingestion ✓

Owns provider job visibility for scheduled external data fetches, using the `IngestionJob` model (`QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED`).

Status: implemented service + read controller. `WeatherScheduler`, `BiodiversityScheduler`, `FloodScheduler`, `RadiationScheduler`, `MarineScheduler`, `EmissionsScheduler`, and `LocationClimateScheduler` all call `IngestionService.startJob`, `completeJob`, and `failJob`; successful jobs update `Dataset.lastSyncedAt` for matching dataset categories. Admin/moderator routes expose `GET /ingestion/jobs` and `GET /ingestion/jobs/:id`. There is no queue worker, manual trigger endpoint, or retry endpoint; recurring cron jobs are the retry mechanism.

## social-content ✓

Owns the Phase 1 human-reviewed social-card workflow. It reads existing weather, forecast, river-discharge, alert, biodiversity, and district records; it does not ingest new environmental data or publish to Meta platforms.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/social-content/drafts` | `social_content.create` |
| GET | `/social-content/drafts/:id` | `social_content.create` |
| POST | `/social-content/drafts` | `social_content.create` |
| PATCH | `/social-content/drafts/:id` | `social_content.edit` |
| POST | `/social-content/drafts/:id/render` | `social_content.render` |
| POST | `/social-content/drafts/:id/approve` | `social_content.approve` |
| POST | `/social-content/drafts/:id/archive` | `social_content.edit` |
| GET | `/social-content/drafts/:id/download` | `social_content.download` |
| POST | `/social-content/drafts/:id/mark-published` | `social_content.approve` |

Supported types are `CURRENT_WEATHER`, `WEATHER_FORECAST`, `RIVER_SIGNAL`, `ENVIRONMENTAL_ALERT`, and `BIODIVERSITY_OBSERVATION`. `SocialPostDraft` stores the source snapshot and source timestamp. `SocialRenderedAsset` stores the content hash, dimensions, render version, and S3/MinIO object URL. The renderer emits deterministic SVG in 1080×1350 (4:5) or 1080×1080 (1:1). Approval requires a rendered asset; editing resets a draft to `DRAFT`. All mutations write social `AuditEvent` actions.

## permissions ✓

Owns the DB-backed permission model: `Permission` (key, description) and `RolePermission` (role → permission join). Seeds 17 named permissions and default grants for all non-ADMIN roles on first boot. Social-content permissions are granted to MODERATOR for create/edit/render/download and to ADMIN for the full workflow. (`emissions.manage` and `emissions.report` were removed in 2026-09-02 when the emissions module was converted to API ingestion.)

| Method | Path | Access |
| --- | --- | --- |
| GET | `/admin/permissions` | Admin |
| POST | `/admin/permissions/roles` | Admin — grant permission to a role |
| DELETE | `/admin/permissions/roles` | Admin — revoke permission from a role |

`PermissionsService.getPermissionsForRole(role)` is the runtime path; results are cached per role for 5 minutes. `ADMIN` always receives every permission regardless of DB state. Grant and revoke each write `PERMISSION_GRANT` / `PERMISSION_REVOKE` audit events.

Named permissions (17): existing report, alert, restoration, observation, organization, and user permissions plus `social_content.create`, `social_content.edit`, `social_content.render`, `social_content.approve`, `social_content.download`, and `social_content.manage`.

## analytics ✓

Owns role-scoped dashboard queries returning aggregated platform statistics.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/analytics/admin` | Admin |
| GET | `/analytics/moderator` | Moderator |
| GET | `/analytics/government` | Government |
| GET | `/analytics/researcher` | Researcher |
| GET | `/analytics/orgadmin` | Organization Admin |

Each endpoint returns a tailored summary: admin sees user counts by role, report queue, alert severity counts, organizations, and species count; moderator sees queue breakdown and report submission trend; government sees active alerts by canonical affected division (resolved from `AlertArea` district/upazila/union records), verified reports by category/district, 30-day climate averages per division, and latest station-based flood/water-level signals; researcher sees biodiversity totals, top species, and observation trust breakdown; org admin sees organization-scoped restoration project counts and engagement metrics.

## water-bodies ✓

Owns the water body registry — rivers, haors, beels, canals, lakes, ponds, reservoirs, and estuaries — including the network of water level monitoring stations.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/water-bodies` | Public — list with optional filters |
| GET | `/water-bodies/stations` | Public — all water level stations |
| GET | `/water-bodies/:id` | Public — water body detail including station list and upazila coverage |

Seeded from CSV via `WaterBodiesService.onModuleInit`. Water level readings are served via the `flood` module endpoints (`GET /flood/stations/:stationId/readings`, `GET /flood/stations/:stationId/latest`). Gauge thresholds (`dangerLevel`, `warningLevel`, `normalLevel`) on each station determine alert threshold status at a given reading.

## notifications ✓

Owns alert subscription management and email notification delivery.

All three endpoints are authenticated — `JwtAuthGuard` applies globally.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/notifications/subscriptions` | Authenticated |
| GET | `/notifications/subscriptions` | Authenticated |
| DELETE | `/notifications/subscriptions/:id` | Authenticated |

`AlertSubscription` stores a per-user subscription with optional `districtId` (null = nationwide), `minSeverity` threshold, and `channel` (EMAIL only for v1). `NotificationsService.dispatchForAlert()` is called by `AlertsService` on every ACTIVE transition — it creates PENDING `NotificationDelivery` records and enqueues one BullMQ `email` job per matched subscriber with 4-attempt exponential backoff. `EmailProcessor` handles `password-reset`, `email-verification`, and `alert-notification` job types. `EmailService` wraps Nodemailer SMTP; email delivery degrades gracefully when `SMTP_*` env vars are absent (one-time startup warn, sends silently skipped). `AuthService` forgot-password and email-verification flows also enqueue `email` queue jobs here instead of calling SMTP directly.

## gamification ✓

Owns profile completeness scoring and the badge system for citizen engagement incentives.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/gamification/me` | Authenticated |

`GET /gamification/me` returns: completeness score (0–100), list of missing-field prompts, earned badges, contribution points, and current level. Profile completeness runs 10 weighted checks across `UserProfile`, `UserSocialLink`, `OrganizationMembership`, `CitizenReport`, and `Observation`. Levels: Newcomer (0) → Contributor (100) → Advocate (300) → Champion (600) → Environmental Leader (1200+). Badges: 5 categories × 4 tiers (Bronze 25 pts / Silver 75 pts / Gold 150 pts / Emerald 300 pts) — Civic Guardian (verified reports), Water Sentinel (water quality observations), Clean Air Defender (air quality contributions), Biodiversity Explorer (research-grade species), Restoration Pioneer (ecological restoration projects). Badge counts are computed via 6 parallel Prisma queries. `evaluateBadges()` enqueues a BullMQ `gamification` job deduped by `jobId: badge-eval:{userId}`; actual evaluation runs in `GamificationProcessor.performEvaluation()`. Earned badge IDs are stored in `UserProfile.earnedBadges` (String[]) and contribution points in `UserProfile.contributionPoints` (Int).

## community ✓

Owns community posts, comments, and polls — citizen-led discussion and structured polling.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/community/posts` | Public |
| POST | `/community/posts` | Authenticated |
| GET | `/community/posts/:id` | Public (guests see poll results; `userVotedOptionId` included for authenticated callers) |
| DELETE | `/community/posts/:id` | Authenticated — author or ADMIN |
| POST | `/community/posts/:id/comments` | Authenticated |
| DELETE | `/community/posts/:id/comments/:commentId` | Authenticated — comment author or ADMIN |
| POST | `/community/posts/:id/poll/vote` | Authenticated |

`CommunityPost` carries `title`, `body` (TEXT), optional `districtId`, and an optional 1:1 `Poll`. `PostComment` is flat (no nested replies). `PollVote` has a `@@unique([pollId, userId])` constraint — voting again updates the existing row (upsert), enabling vote-changing. Poll `endsAt` is optional; closed polls still display results but reject new votes. Author and ADMIN can delete posts and comments; deletions are cascaded. Paginated post list ordered by `createdAt DESC`. Audit actions: `COMMUNITY_POST_CREATE`, `COMMUNITY_POST_DELETE`, `COMMUNITY_COMMENT_ADD`, `COMMUNITY_COMMENT_DELETE`, `COMMUNITY_POLL_VOTE`.

## audit (embedded)

Audit events are written directly from services rather than via a separate injectable service. `AuditEvent` stores `action`, `userId`, `entityType`, `entityId`, `meta`, `ipAddress`, `createdAt`.

Services that write audit events:

| Service | Actions written |
| --- | --- |
| `auth` | `USER_REGISTER`, `USER_LOGIN`, `USER_LOGIN_FAILED`, `USER_LOGOUT` |
| `users` | `USER_ROLE_CHANGE`, `USER_DEACTIVATE` |
| `alerts` | `ALERT_CREATE`, `ALERT_STATUS_CHANGE` |
| `observations` | `OBSERVATION_SUBMIT`, `OBSERVATION_TRUST_CHANGE`, `OBSERVATION_UPDATE`, `OBSERVATION_DELETE`, `OBSERVATION_MEASUREMENT_ADD`, `OBSERVATION_MEASUREMENT_DELETE` |
| `reports` | `REPORT_SUBMIT`, `REPORT_STATUS_CHANGE`, `REPORT_COMMENT_ADD`, `REPORT_MEDIA_ADD` |
| `restoration` | `RESTORATION_PROJECT_CREATE`, `RESTORATION_PROJECT_UPDATE`, `RESTORATION_PROJECT_JOIN`, `RESTORATION_TARGET_ADD`, `RESTORATION_ACTIVITY_ADD`, `RESTORATION_METRIC_ADD` |
| `datasets` | `DATASET_ACCESS`, `DATASET_DOWNLOAD`, `DATASET_UPDATE`, `DATASET_VERSION_PUBLISH`, `DATASET_ACCESS_DECISION` |
| `permissions` | `PERMISSION_GRANT`, `PERMISSION_REVOKE` |
| `emissions` | *(none — no user-initiated writes; all data ingested by scheduler)* |
| `community` | `COMMUNITY_POST_CREATE`, `COMMUNITY_POST_DELETE`, `COMMUNITY_COMMENT_ADD`, `COMMUNITY_COMMENT_DELETE`, `COMMUNITY_POLL_VOTE` |
| `companies` | `COMPANY_CREATE`, `COMPANY_UPDATE` |
| `facilities` | `FACILITY_CREATE`, `FACILITY_UPDATE`, `FACILITY_DELETE` |

`AuditAction` declares 48 values. All are written by a service (`EMISSION_SOURCE_CREATE` and `EMISSION_ENTRY_CREATE` are stale holdovers from the old emissions schema — no service writes them).

`auth` is the only service that populates `AuditEvent.ipAddress`, because it already captures request metadata for `RefreshToken` rows. The others leave it null.

If audit event volume grows, extract to a dedicated `AuditModule` with its own service and queue.

## seed (embedded)

`SeedService` is registered directly in `AppModule` (not its own module) and seeds development fixtures on first boot via `OnModuleInit`:
- 6 user accounts (one per role: CITIZEN, RESEARCHER, ORGANIZATION_ADMIN, GOVERNMENT, MODERATOR, ADMIN) with password `NatureGrid123!`
- 1 seed organization (`Delta Signal Bangladesh`, `NGO`) with the org-admin user attached as an `ADMIN` member

These accounts exist only for local development and should not be created in production.

## Coverage note

`app.module.ts` registers 28 modules: `database` plus 27 feature modules (`companies` added 2026-09-02). All are fully implemented except `ingestion` (job tracking and read endpoints only — no retry queue, no manual trigger endpoint; recurring cron jobs serve as the retry mechanism). BullMQ queues (`email`, `gamification`) are wired via `BullModule.forRootAsync` in `AppModule`. Advanced domains not yet represented by a module — structured surveys, carbon accounting, research publications, satellite/remote sensing ingestion, forest registry — are planned for Phase 7 or Phase 8. See `docs/roadmap.md` and `docs/architecture/feature-map.md`.
