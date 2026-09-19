# Progress

Current update (2026-09-19): Union detail pages now use the shared continuous location-page UX with sticky in-page navigation for overview, climate, and context. Climate scope is explicitly labelled as 30-day derived OpenMeteo aggregates, freshness is shown, and district-level environmental capabilities remain clearly linked rather than implied at union precision.

Current update (2026-09-19): Upazila detail pages now use the same continuous location-page UX as district pages: sticky in-page navigation for overview, climate, and geography; explicit 30-day PM2.5 and freshness labels; climate-detail empty states; and clear OpenMeteo derived-data provenance. Existing union navigation remains unchanged.

Current update (2026-09-19): District detail pages now use a continuous environmental overview instead of URL-driven tabs. Existing weather, air quality, flood, marine, alerts, climate, radiation, biodiversity, reports, observations, restoration, and upazila sections remain available in one scrollable page with sticky in-page anchors for Overview, Hazards, Climate, Activity, and Geography. No API or schema changes were required.

Current update (2026-09-19): Division location pages now provide a broader environmental overview using existing public data structures: active alerts, weather and air-quality coverage, station-based flood signals, verified reports, observations, biodiversity occurrence totals, restoration totals, freshness context, and district navigation. No schema or API changes were required; the page filters existing public responses by the division's district IDs. The seasonal forecast integration remains deferred.

Current update (2026-09-18): Public flood-risk strip now uses station-level latest forecasts, preserves river and district context, shows neutral unavailable/no-signal states, and labels OpenMeteo/GloFAS simulated discharge as non-official flood intelligence. The flood API latest-per-station query now orders by newest forecast date.

Public map follow-up (2026-09-18): Flood markers now use the same high/elevated/within-range thresholds and expose station, river, district, forecast date, discharge ratio, and the non-official-warning limitation.

District flood freshness (2026-09-18): District profiles now choose the earliest forecast date across available stations and rank same-day station signals by discharge ratio instead of assuming the first API row is current.

Flood regression coverage (2026-09-18): Added shared `classifyFloodRisk` logic and API tests for HIGH/ELEVATED thresholds, P75 overrides, missing comparison values, and newest-per-station forecast ordering. The API, public strip, map, and analytics dashboard now share the same classifier.

Public source-status correction (2026-09-18): Removed the unused static `OpenMeteo sync: Healthy` claim from public seed data. The public board now avoids asserting provider freshness without a verified ingestion timestamp.

Station detail context (2026-09-18): Water-level station pages now show observed threshold status and trend alongside the earliest forecast discharge risk and ratio to historical mean, with the simulated/non-official limitation stated in the forecast source note.

Public source-label audit (2026-09-18): Replaced unsupported public “Live now”, “live platform statistics”, “live snapshot”, freshness-on-map, and “live weather” wording with latest/current-available language unless a concrete update timestamp is present.

Public freshness indicators (2026-09-18): Added concrete weather `readingTime` and climate `climateUpdatedAt` displays to public surfaces, with explicit unavailable wording when timestamps are absent.

Current update (2026-09-18): Government flood and water-level intelligence now summarizes the existing latest `StationFloodForecast` and `WaterLevelReading` rows: high/elevated discharge signals, rising gauges, station coverage, river/district context, threshold status, and a ranked highest-risk list. The web government dashboard exposes these as KPIs and an operational table; no new data source or schema was introduced. API and web type checks pass.

Last updated: 2026-09-17 (Dashboard freshness metadata — all role-scoped analytics responses now include generated-at metadata and relevant provider sync status: Admin sees OpenMeteo/GBIF/World Bank, Government sees OpenMeteo, Researcher sees GBIF, and internal Moderator/Organization Admin views use no external source; freshness windows and explicit `UNKNOWN` fallback are included, and web headers display the latest relevant update/source names. Added shared contract types; metric meanings, access behavior, and ingestion schedules remain unchanged. Alert geography correction — Government analytics now aggregates active alerts from canonical `AlertArea` district/upazila/union records, deduplicates each alert per division, and reports area-less alerts as `Nationwide`; added mixed-area and nationwide regression coverage. Organization dashboard isolation — `/analytics/orgadmin` now resolves the caller's `ADMIN` memberships and scopes restoration project status, category, recency, participant totals, and top-project queries to those organizations; users with no administered organization receive an explicit empty portfolio. Added regression tests for cross-organization scoping and the no-membership zero state. Dashboard presentation refresh — `/dashboard` now has a clearer Bangladesh/live context, responsive KPI cards, elevated data panels, and improved dashboard hierarchy. See `docs/dashboard.md`. Previously: 2026-09-06 production hardening — deploy pipeline wired: `deploy.yml` builds to Docker Hub + SSH deploy to VPS via `appleboy/ssh-action`; `docker-compose.prod.yml` updated: Redis service added, `build:` replaced with `image:` refs, `REDIS_URL`/`NODE_ENV`/`APP_URL`/`GOOGLE_*`/`STORAGE_*` env vars added, API health check + `service_healthy` dependency for web/admin; root `error.tsx` + `not-found.tsx` added to `apps/web` and `apps/admin` (route-group boundaries already had them; root level was missing); `process.on('unhandledRejection')` + `process.on('uncaughtException')` added to `apps/api/src/main.ts`; `@@index([organizationId])` + `@@index([createdById])` added to `RestorationProject` schema + migration `20260906000000_add_restoration_project_indexes`; git remote (`Cipher-Text/delta-signal`) confirmed live. Previously: Google OAuth — `AuthProvider` enum (EMAIL | GOOGLE), `User.googleId`, nullable `User.passwordHash`, `OAuthExchangeCode` model, 30-second exchange code pattern, `GoogleStrategy`, `/auth/google` + `/auth/google/callback` + `/auth/exchange` endpoints, auto-send verification email on registration, SMTP/email flows fully wired (forgot-password, reset-password, verify-email), Mailpit added to docker-compose for local SMTP. Also: Docker build fixed (build cache pruned + `20260903000000_add_google_oauth` migration resolved). Previously: Companies + Industrial Sites — `Company` model (self-referential conglomerate/subsidiary tree) + `IndustrialFacility` model with `CompanyType`/`FacilityType`/`ComplianceStatus` enums; `CompaniesModule` with CRUD + two-pass idempotent seed (42 companies, 44 facilities); tabbed `/industrial-sites` page with URL-param tab switching between sites and companies; `/industrial-sites/companies/:id` and `/industrial-sites/:id` detail pages. Previously: World Bank emissions rewrite — `emissions/` module converted from user-input (`PollutionSource`/`EmissionEntry`) to World Bank Climate Change API ingestion; `NationalEmissionReading` model; 4 GHG indicators; weekly scheduler; `/emissions` frontend page showing time-series table. Before that: E2E test suite — 45 tests across 4 spec files; CI e2e job with postgres service container; docs updated — roadmap Phase 6/7/8 status, roles-and-permissions expanded with role-feature matrix and planned Phase 7/8 permissions. Community module — `CommunityModule`, 5 models, full CRUD + poll vote, `/community` and `/community/:id` pages; Phase 5 closed. PostGIS point geometry on District; Water Bodies module; flood module refactored to station-based; observation measurements; restoration sub-resources; AlertType enum + AlertArea; DatasetVersion; water level readings. 2026-08-29 BullMQ, Gamification module, Media module; 2026-08-28 OpenMeteo audit, Radiation, Marine, Emissions.)

## Status Legend

| Status | Meaning |
| --- | --- |
| Done | Completed and usable as baseline |
| In Progress | Started but not finished |
| Planned | Agreed direction, not started |
| Blocked | Cannot continue without decision or input |

## Overall Status

| Area | Status | Notes |
| --- | --- | --- |
| Monorepo scaffold | Done | `apps`, `packages`, `docs`, `infrastructure`, Nx/pnpm config |
| Documentation baseline | Done | Mission, vision, stack, roles, business logic, flows, API catalog, architecture |
| Frontend mocks | Done | All 11 pages — nav linking, sidebar, design system, trust levels, feed, admin console, theme reference |
| Public-first product model | Done | Public `/`, login-gated contribution/download/advanced access |
| Public frontend — M1 | Done | 8 React components, full CSS design system, static seed data, runs at port 3000 |
| Frontend live data — M13 | Done | Weather sidebar, full auth flow, citizen report + observation submission, live platform metrics, and (2026-08-19) every remaining static homepage component now wired to live data or an honest empty state — see "Public Weather Wiring", "Public Auth Flow Wiring", "Profile Page Mockup Fidelity", "Report Submission Form", "Observations Module", "Live Platform Metrics", and "Homepage Preview Sections Wired" below. All 7 tasks done — Milestone 13 is fully complete. |
| Frontend "app shell" layout (sidebar pages) — M15 | Done | Established via `/profile`, powers all 7 pages. `/data`, `/reports`, `/alerts`, `/observations`, `/restoration`, `/biodiversity`, and now `/community` (all real backend data — community wired 2026-09-01). See "App-Shell Pages: Data, Reports, Alerts", "App-Shell Pages: Observations, Biodiversity, Restoration, Community", "Observations Module", "Restoration Projects Module", "Biodiversity + GBIF Module", and "Community module" below. |
| Dashboard presentation | Done | `/dashboard` keeps role-scoped analytics and now uses a responsive live-status header, KPI cards, elevated panels, and clearer data hierarchy. |
| Shared types and contracts — M2 | Done | Full enums, DTOs, paginated envelopes, request/response types, route contract map |
| Backend foundation — M3 | Done | Auth (JWT/bcrypt), users, orgs, locations (8 div/64 district auto-seed), providers, datasets (catalog seed), reports (status workflow + audit), alerts (severity + audit), global validation, guard infrastructure. **Caveat:** role-gated endpoints shipped with a casing bug that rejected every user until 2026-08-17 — see "Critical RBAC Fix" below. |
| Prisma schema | Done | 32 enums, 61 models — includes water bodies, observation measurements, restoration sub-resources, AlertType/AlertArea, DatasetVersion, StationFloodForecast, WaterLevelReading, PostGIS geom on District, Company, IndustrialFacility, AuthProvider/OAuthExchangeCode (Google OAuth) |
| Database migration | Done | 13 migrations applied (latest `20260906000000_add_restoration_project_indexes`); 61 tables live; Postgres on port 5432 |
| District coordinates | Done | Migration `add_district_coordinates`; all 64 districts backfilled with real lat/lng sourced from `open-nature`'s district registry (`LocationsService.onModuleInit` backfills on boot if missing) |
| Seed data | Done | LocationsService auto-seeds 8 divisions + 64 districts (all with GeoJSON boundary) on boot; DatasetsService auto-seeds 9 catalog records; ProvidersService auto-seeds `OpenMeteo` and `GBIF` providers on boot idempotently; no separate seed script needed |
| Auth — refresh / logout | Done | Postgres-backed `RefreshToken` model (not Redis — see "Auth Refresh/Logout" below), opaque tokens with rotation, daily cleanup cron |
| Automated tests | Done | 153 unit tests in 11 spec files + 45 e2e tests in 4 spec files (`health`, `auth`, `public`, `protected`). Unit tests: auth, RBAC, env validation, reports, observations, restoration, notifications, gamification, media (fully mocked). E2e tests: full NestJS app against real DB, BullMQ/throttler stubbed. No web/admin tests. See "First Test Suite + CI" and "2026-09-02 E2E Test Suite" below. |
| CI | Done | `.github/workflows/ci.yml` — 2026-08-21; updated (2026-09-02) to add `e2e` job with postgres:16 service container, `prisma migrate deploy`, and `jest --config jest.e2e.config.js --runInBand --ci`. Remote (`Cipher-Text/delta-signal`) confirmed live 2026-09-06 — CI executes on every push to `main` and on PRs. |
| CD | Done | `.github/workflows/deploy.yml` — wired 2026-09-06 for Docker Hub + VPS SSH deployment. Builds all three images (api/web/admin) tagged with git SHA + `latest`, pushes to Docker Hub, SCPs `docker-compose.prod.yml` to VPS, SSHs in to write `.env`, pull images, and `docker compose up -d`. Triggered automatically after CI passes on `main` or via `workflow_dispatch`. GitHub environment secrets required: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, plus all app env vars. |
| API contract enforcement | Done | 2026-08-22 — `contract-types.typecheck.ts` + `select` discipline in 4 services. Checked by `tsc --noEmit` in CI. See "Phase 6b: API Contract Enforcement" below. |
| Notification delivery — Phase 6c | Done | 2026-08-22 — `AlertSubscription` + `NotificationDelivery` schema, Nodemailer email service. `NotificationsService.dispatchForAlert` now creates PENDING `NotificationDelivery` records and enqueues per-user jobs via the BullMQ `email` queue (4-attempt exponential backoff). See "Phase 6c: Notification Delivery" below. |
| JWT secret handling | Done | Fixed 2026-08-21 — boot-time validation, no fallback. See "JWT Secret Fail-Fast" below. |
| Security headers (`helmet`) | Done | 2026-08-21 — see "Phase 6a Complete" below. |
| Rate limiting (`@nestjs/throttler`) | Done | 2026-08-21 — global 120 req/60 s; auth endpoints 5/20 req/60 s. See "Phase 6a Complete" below. |
| Audit coverage | Done | 25 `AuditAction` values defined and all written. Latest additions: `PERMISSION_GRANT`/`PERMISSION_REVOKE` (permissions module), `OBSERVATION_UPDATE`/`OBSERVATION_DELETE`. See "Audit Coverage Gap", "Phase 6a Complete", and "Ingestion Module + Dataset Access" below. |
| ESLint | Done | 2026-08-21 — `.eslintrc.json` for api/web/admin apps. See "Phase 6a Complete" below. |
| RBAC / role guard casing bug | Done | Fixed 2026-08-17 — see "Critical RBAC Fix" below. Every role-gated endpoint (`POST /alerts`, `PATCH /alerts/:id`, `PATCH /reports/:id/status`, `PATCH /users/:id/role`, `PATCH /users/:id/deactivate`) previously rejected all users, including admins. |
| PostGIS point geometry | Done | `District.geom geography(Point, 4326)` added by migration `20260901000000_postgis_geometry`. Polygon geometry (boundaries, alert zones) still planned. |
| Observations module — M9 | Done | Full CRUD + trust-level workflow live (2026-08-17) — see "Observations Module" below. `/observations` now shows real data with a working submission form. |
| Biodiversity module — M10 | Done | Daily GBIF sync + public species/occurrence endpoints live (2026-08-19) — see "Biodiversity + GBIF Module" below. `/biodiversity` now shows real species and occurrence data with a working search. |
| Report media (M5) | Done | `ReportMedia` schema + `POST/GET /reports/:id/media` endpoints done (2026-08-22). Clients register an external URL. File upload via MinIO/S3 is handled by the separate `media` module (see below). |
| Media module | Done | `StorageService` (S3/MinIO, `forcePathStyle`), `MediaService` (MIME validation, 100 MB limit, key generation), `MediaController` (`POST /media/upload`, `POST /media/presign`), `media.constants.ts`. Env vars: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`. |
| Water Bodies module | Done | 2026-08-31 — `WaterBody`, `WaterLevelStation`, `WaterLevelReading`; CSV seeding; `GET /water-bodies`, `GET /water-bodies/stations`, `GET /water-bodies/:id` — see "2026-08-31 Water Bodies & Schema Expansion" below |
| Observation measurements | Done | 2026-09-01 — `ObservationMeasurement` with `MeasurementParameter`, `MeasurementUnit`, `QualityFlag`; `POST/DELETE /observations/:id/measurements`; `GET /observations/nearby` |
| Restoration sub-resources | Done | 2026-09-01 — `ProjectTarget`, `ProjectActivity`, `ProjectMetric`; `RestorationTargetMetric` enum; full target/activity/metric CRUD endpoints |
| Alert types + geographic areas | Done | 2026-09-01 — `AlertType` enum (11 disaster types); `AlertArea` model for multi-location alerts |
| Dataset versioning | Done | 2026-09-01 — `DatasetVersion` model; `GET/POST /datasets/:id/versions`; audited `DATASET_VERSION_PUBLISH` |
| Gamification module | Done | 2026-08-29 — `GET /gamification/me`; profile completeness (10 checks, 0–100 score); 5 badge categories × 4 tiers (Bronze/Silver/Gold/Emerald); 5 levels (Newcomer → Environmental Leader); earned badges stored in `UserProfile.earnedBadges`; BullMQ `gamification` queue deduped by userId. |
| Community module | Done | 2026-09-01 — `CommunityPost`, `PostComment`, `Poll`, `PollOption`, `PollVote` (5 models, 5 `AuditAction` values); `GET/POST /community/posts`, `GET/DELETE /community/posts/:id`, `POST /community/posts/:id/comments`, `DELETE /community/posts/:id/comments/:commentId`, `POST /community/posts/:id/poll/vote`; vote upsert (change-vote); author/ADMIN delete; `/community` list page + create form with optional poll block; `/community/:id` detail with comments and poll bars. Phase 5 closed. |
| BullMQ queues | Done | `email` queue in NotificationsModule (`EmailProcessor` — password-reset, email-verification, alert-notification, 4-attempt exponential backoff); `gamification` queue in GamificationModule (`GamificationProcessor` — badge evaluation, deduped by `jobId: badge-eval:{userId}`). `BullModule.forRootAsync` in AppModule parses `REDIS_URL`. |
| District GeoJSON boundaries | Done | All 64 districts now have GeoJSON boundaries. The 8 previously missing (Brahmanbaria, Chattogram, Bogura, Chapainawabganj, Jashore, Jhalakathi, Moulvibazar, Netrokona) are now included in `bangladesh.ts`. `administrative.json`, `districts.geojson`, and `scripts/gen-bangladesh-seed.py` deleted — `bangladesh.ts` is the sole source of truth. |
| Weather ingestion (OpenMeteo) | Done | Live `weather` module — see "Weather ingestion" below |
| Flood ingestion (OpenMeteo/GloFAS) | Done | Refactored to station-based: `StationFloodForecast` per water level station, replacing earlier district-level model. Station readings via `GET /flood/stations/:stationId/readings|/latest`. Six-hour scheduler. — see "OpenMeteo Flood" and "2026-08-31 Water Bodies & Schema Expansion" below |
| Satellite radiation ingestion (OpenMeteo) | Done | 2026-08-28 — `radiation/` module; daily at 1am; 3 daily variables per district; `SatelliteRadiationReading` model. See "2026-08-28 Integrations" below. |
| Marine weather ingestion (OpenMeteo) | Done | 2026-08-28 — `marine/` module; daily at 2am; 11 wave/swell/wind-wave variables; coastal districts only; `MarineForecast` model. See "2026-08-28 Integrations" below. |
| Emissions tracking | Done | 2026-08-28 initial (user-input); **rewritten 2026-09-02** — World Bank Climate Change API ingestion; `NationalEmissionReading` model; 4 GHG indicators (Total GHG, CO₂, CH₄, N₂O); weekly scheduler; `/emissions` frontend page. See "2026-09-02 World Bank Emissions Rewrite" and "2026-08-28 Integrations" below. |
| OpenMeteo integration audit | Done | 2026-08-28 — HTTP timeout (AbortController, 30 s) on all 4 fetch clients; flood batch $transaction replacing loop upserts; UTC date fix (setUTCHours); aggregation transaction in climate sync; ingestion tracking for LocationClimateScheduler. See "2026-08-28 OpenMeteo Audit Fixes" below. |
| Ingestion module (generic) | Done | 2026-08-24 — `IngestionService` + `IngestionController` implemented; weather and GBIF schedulers now write `IngestionJob` records per run (RUNNING → SUCCEEDED/FAILED); `Dataset.lastSyncedAt` updated on every successful sync; GBIF provider seeded; admin ingestion dashboard live at `/ingestion`. See "Ingestion Module + Dataset Access" below. |
| Environmental monitoring model | Planned | OGC SensorThings-style or simplified internal model — decision pending |
| Dataset downloads / access requests | Done | 2026-08-24 — `GET /datasets/:id/download` (5-policy access enforcement), `POST /datasets/:id/access-request`, `GET/PATCH /datasets/:id/access-requests/:requestId` (admin approve/reject), `POST /datasets` (admin create). See "Ingestion Module + Dataset Access" below. |
| Restoration / projects — M11 | Done | Full CRUD + idempotent join workflow live (2026-08-19) — see "Restoration Projects Module" below. `/restoration` now shows real data with a working creation form (org-admins/admins) and a Join action (everyone else). |
| Community module | Planned | Not planned as an API module at all yet (`docs/architecture/feature-map.md`). Both `/community` (2026-08-17) and the homepage's `community-section.tsx` (2026-08-19) now show an honest empty state — no fabricated content anywhere in the app for this area. Sidebar nav link removed (2026-08-24) — page still exists but is no longer reachable via navigation. |
| Dockerfiles | Done | 2026-08-22 — api/web/admin Dockerfiles + docker-compose.prod.yml + deployment README. Bug fix 2026-08-24: admin service was missing `API_URL` env var. Updated 2026-09-06: `docker-compose.prod.yml` overhauled — Redis service added (required for BullMQ), `build:` replaced with `image:` refs pulling from Docker Hub (`${DOCKERHUB_USERNAME}/delta-signal-{api,web,admin}:${IMAGE_TAG}`), missing env vars added (`REDIS_URL`, `NODE_ENV`, `APP_URL`, `GOOGLE_*`, `STORAGE_*`), API health check added, web/admin now wait on `service_healthy`. See "Phase 6d: Dockerfiles" and "Deploy Fixes" below. |
| Admin frontend — M12 | Done | Full console at port 3002: login/logout, report moderation, user management, alert management, dataset management, and organization management. The Organizations menu and API use the RBAC permission `organizations.manage`; users can be attached to multiple organizations as `ADMIN` or `MEMBER`. |
| Consumer detail pages + profile activity | Done | 2026-08-23 — detail pages for reports, alerts, observations, restoration projects, and biodiversity species; all list pages now have clickable rows; `GET /reports/mine` + `GET /observations/mine` authenticated endpoints; profile page shows live report/observation history. See "Consumer Frontend" below. |
| Data worker | Planned | Python skeleton; no active jobs |
| Permissions module | Done | DB-backed `Permission`/`RolePermission` models, `PermissionsGuard`, 11 named permissions, default role grants, admin grant/revoke endpoints (`POST/DELETE /admin/permissions/roles`), audited (`PERMISSION_GRANT`/`PERMISSION_REVOKE`). |
| Analytics module | Done | Role-scoped dashboard endpoints: admin, moderator, government, researcher, org admin — each returns aggregated stats relevant to that role. |
| Seed service | Done | `SeedService` registered in `AppModule`; seeds 6 dev user accounts (one per role, password `NatureGrid123!`) and 1 seed organization on first boot. |
| Users reactivate endpoint | Done | `PATCH /users/:id/reactivate` re-enables deactivated accounts. |
| Companies + Industrial Sites | Done | 2026-09-02 — `Company` + `IndustrialFacility` models; `CompanyType`/`FacilityType`/`ComplianceStatus` enums; `CompaniesModule` with CRUD + idempotent two-pass seed (**801 companies, 1,451 facilities** — real entities from MiB directory + verified facilities); tabbed `/industrial-sites` page; company + facility detail pages. Seed rewritten 2026-09-06 to use pre-loaded lookup maps (3 queries on boot vs N×3 per-record). See "2026-09-02 Companies + Industrial Sites" below. |

## 2026-09-02 Companies + Industrial Sites

Added a full `Company` (legal entity) → `IndustrialFacility` (physical site) two-model hierarchy, replacing the earlier single-table design that used a free-text `operatorName` field.

**Schema changes** (migration `20260902181219_add_company_model`):
- `Company` model — `name @unique`, `companyType CompanyType`, self-referential `parentCompanyId` for conglomerates, `headquarterDistrictId FK`; 5 indexes
- `IndustrialFacility` model — `companyId FK` (replaces `operatorName String?`), `establishedYear?`, `productionCapacity?`, `landArea?`, `etpInstalled Boolean`, `etpCapacity?`
- New enums: `CompanyType` (PRIVATE/STATE_OWNED/JOINT_VENTURE/MULTINATIONAL/CONGLOMERATE/CLUSTER), `FacilityType` (15 types), `ComplianceStatus` (COMPLIANT/NON_COMPLIANT/UNDER_REVIEW/UNKNOWN)
- New `AuditAction` values: `COMPANY_CREATE`, `COMPANY_UPDATE`, `FACILITY_CREATE`, `FACILITY_UPDATE`, `FACILITY_DELETE`

**Seed data:**
- **801 company records** — ~500 RMG factories from the Mapped in Bangladesh (MiB) directory (`mib-companies.seed.ts`) plus ~300 detailed entries with descriptions, employee counts, websites, and conglomerate hierarchy (`companies.seed.ts`)
- **1,451 industrial facility records** — ~500 Narayanganj RMG facilities from MiB with GPS coordinates (`mib-facilities.seed.ts`) plus ~950 verified facilities across 15 types: garment factories, tanneries, brick fields, power plants, cement plants, shipbreaking yards, EPZs, paper mills, pharmaceutical plants, oil refineries (`facilities.seed.ts`)
- Seed uses pre-loaded lookup maps (3 queries on every boot, regardless of dataset size) — `existingNames` Set + `districtNameToId` Map + `companyNameToId` Map — to avoid the N×3 per-record query pattern that was there before
- Two-pass seeding strategy: parent companies first, then subsidiaries (resolve `parentCompanyId` by name lookup), then facilities (lookup company by `Company.name @unique`)

**API:**
- `GET /companies` — paginated list, filter by type/district/status
- `GET /companies/:id` — detail with subsidiaries + facilities list
- `POST/PATCH /companies` — GOVERNMENT/ADMIN only
- `GET /facilities` — paginated list, filter by type/compliance/district/company
- `GET /facilities/:id` — detail with company inline + linked citizen reports (latest 5)
- `POST/PATCH /facilities` — GOVERNMENT/ADMIN only; `DELETE /facilities/:id` — ADMIN only

**Frontend (`apps/web`):**
- `/industrial-sites` — single "Industry" nav link; tabbed page switching via URL param `?tab=companies` (default = sites); filter forms each carry a hidden `<input name="tab">` to preserve tab on submit; shared pagination
- `/industrial-sites/companies/:id` — company detail page: type badge, HQ district, parent company link, subsidiaries table, facilities table
- `/industrial-sites/:id` — facility detail page: compliance badge, facility type tag, company name linked to company page, details grid (ETP, capacity, land area), linked citizen reports, OpenStreetMap link
- Sidebar nav label changed from "Industrial Sites" to "Industry"

## 2026-09-02 World Bank Emissions Rewrite

The `emissions/` module was fully redesigned from user-input source tracking to an automated World Bank Climate Change API ingestion pipeline, following the same pattern as `radiation/` and `marine/`.

**What was removed:**
- `PollutionSource` + `EmissionEntry` Prisma models and all 3 related enums (`PollutionSourceType`, `PollutantType`, `EmissionUnit`)
- `emissions.manage` and `emissions.report` permissions (removed from seed + `Permission` type)
- `seedPollutionSources()` in `SeedService`
- Old DTOs: `create-pollution-source.dto.ts`, `update-pollution-source.dto.ts`, `create-emission-entry.dto.ts`
- `/emissions/[id]` frontend detail page; "Emissions" tab on district detail page

**What was added:**
- `NationalEmissionReading` Prisma model — `(year Int, indicatorCode String)` unique, stores Mt CO₂e values
- `WorldBankClient` — HTTP client with 3-attempt retry + 30 s timeout; pages through World Bank API (`/v2/country/BGD/indicator/{code}?format=json`)
- `EmissionsScheduler` — `@Cron('0 0 3 * * 0')` weekly Sunday 3am; initial sync on empty table
- `EmissionsService` — `syncAll`, `syncIndicator`, `getAll`, `getByYear`, `getIndicators`
- `WorldBankClient` seeded as a `WORLD_BANK` provider; `EMISSIONS: 1_009` cron lock key added

**Indicators synced (4):**
| Code | Description |
| --- | --- |
| `EN.GHG.ALL.MT.CE.AR5` | Total GHG emissions excl. LULUCF |
| `EN.GHG.CO2.MT.CE.AR5` | CO₂ only |
| `EN.GHG.CH4.MT.CE.AR5` | Methane (CH₄) |
| `EN.GHG.N2O.MT.CE.AR5` | Nitrous oxide (N₂O) |

**Endpoints (3, all `@Public()`):**
| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/emissions` | All readings; `?indicator=`, `?from=`, `?to=` filters |
| `GET` | `/emissions/indicators` | Distinct indicator codes in DB |
| `GET` | `/emissions/:year` | All indicators for a specific year |

**Frontend:** `/emissions` page rewritten — time-series table grouped by year × indicator, year/indicator filter bar. Source: World Bank Climate Change API, last updated 2026-07-13, 66 annual records (1976–2024).

**Migration:** `20260902010000_world_bank_emissions` — drops old tables/enums, removes orphaned permission rows, creates `NationalEmissionReading`.

---

## 2026-09-02 E2E Test Suite

### Infrastructure (`apps/api/test/`)

New test directory structure:

- `test/env-setup.js` — `setupFiles` script; loads `.env.test` via `dotenv.config()` in every Jest worker process before any module imports. `dotenv.config()` does not override existing env vars, so CI env vars (`DATABASE_URL`, `JWT_SECRET`) take precedence when `.env.test` is absent.
- `test/helpers/app.ts` — `createTestApp()` bootstraps the full `AppModule` against a real database with three targeted overrides: `ThrottlerGuard` stubbed to always allow (avoid rate-limit interference); `NotificationsService`, `EmailService`, and `GamificationService` replaced with jest stubs (all three inject BullMQ queues via `@InjectQueue`, which is incompatible with the CJS Jest loader — overriding the full service avoids the ESM incompatibility). Applies the same middleware chain as `main.ts`: `helmet`, global prefix `/api/v1`, `AllExceptionsFilter`, `ValidationPipe`, and all three guards.
- `test/helpers/auth.ts` — `loginAs(app, email, password?)` helper returns `{ accessToken, refreshToken }`; `bearer(token)` returns the Authorization header object.
- `jest.e2e.config.js` — separate Jest config; `testMatch: ['<rootDir>/test/specs/**/*.e2e-spec.ts']`, `testTimeout: 60_000`, same `moduleNameMapper` BullMQ stubs as the unit config, `transform` using `ts-jest` with `tsconfig.e2e.json`.
- `tsconfig.e2e.json` — extends `tsconfig.json`, adds `test/**/*.ts` to `include`.
- `.env.test` — local e2e env vars (gitignored); CI provides equivalent vars directly.

### Spec files (45 tests, 4 files)

**`health.e2e-spec.ts`** (2 tests) — `GET /health` shape, unknown route 404.

**`auth.e2e-spec.ts`** (13 tests) — register (201 / 409 duplicate / 400 missing fields / 400 short password); login (200 / 401 wrong password / 401 unknown email); profile with JWT (200) / no token (401) / malformed token (401); refresh token rotation (200 + old token invalidated → 401); logout (200 + invalidated → 401, idempotent second logout). Creates a unique test user per run (`e2e.auth.${Date.now()}@test.deltasignal.org`); cleans up in `afterAll`.

**`public.e2e-spec.ts`** (16 tests) — all unauthenticated. Health; locations (divisions × 8, districts × 64, `?divisionId` filter, upazilas); reports paginated shape; nearby reports; alerts paginated; observations paginated; biodiversity species paginated; datasets paginated; `GET /metrics/platform` (not `/metrics`); auth boundary (profile/mine/POST reports all → 401 without token).

**`protected.e2e-spec.ts`** (14 tests) — logs in as all 4 seed roles. Profile returns correct email + role + permissions. CITIZEN submits report (201; `reporter: { id }` joined object not flat `reporterId`); `GET /reports/mine` includes it; invalid payload → 400; no token → 401. CITIZEN logs observation (201; `observer: { id }`); future `observedAt` → 400. Analytics role enforcement: CITIZEN → 403 on `/analytics/admin`; ADMIN → 200; MODERATOR → 200 on `/analytics/moderator`; ADMIN → 403 on `/analytics/moderator` (exact role check); RESEARCHER → 200 on `/analytics/researcher`; no token → 401. CITIZEN denied `PATCH /reports/:id/status` (`reports.moderate` permission) → 403. Cleanup in `afterAll` deletes all created records (reportStatusEvent, reportMedia, reportComment, auditEvent, citizenReport; observationMeasurement, auditEvent, observation).

### Bug fixes discovered during test authoring

- **`POST /auth/login` (and refresh, logout, forgot-password, reset-password, verify-email) returned 201** — NestJS defaults all `@Post()` handlers to HTTP 201. Added `@HttpCode(HttpStatus.OK)` to each non-create POST in `auth.controller.ts`. `register` intentionally left as 201 (creates a new resource).
- **`GET /metrics` returned 404** — the actual route is `GET /metrics/platform` (controller at `@Controller('metrics')`, handler at `@Get('platform')`).
- **`reporterId`/`observerId` not in API response** — `REPORT_SELECT` returns `reporter: { id, displayName }` (joined object), not a flat foreign key. Matchers updated to `reporter: { id: expect.any(String) }`.

### CI update

`e2e` job added to `.github/workflows/ci.yml` after the `verify` job. Runs a `postgres:16` service container (user: `ci`, pass: `ci`, db: `ci`; `pg_isready` health check). Steps: `pnpm install --frozen-lockfile`, `prisma generate`, `prisma migrate deploy`, `jest --config jest.e2e.config.js --runInBand --ci`. `REDIS_URL` set in env (BullMQ reads it at module init even though it is stubbed in tests).

### npm script

Added to `apps/api/package.json`: `"test:e2e": "jest --config jest.e2e.config.js --runInBand"`.

---

## 2026-08-31 – 2026-09-01 Water Bodies, Schema Expansion & PostGIS

### Water Bodies module (`apps/api/src/water-bodies/`)

New module owning the water body registry and monitoring station directory. Models: `WaterBody`, `WaterBodyUpazila` (many-to-many to upazila), `LoticWaterBodyDetails` (rivers/canals), `LenticWaterBodyDetails` (haors/lakes/reservoirs), `WaterLevelStation` (with `dangerLevel`, `warningLevel`, `normalLevel` gauge thresholds in metres above datum — null if not configured), `WaterBodyStation`. Enums: `WaterBodyType`, `HydrologicalClass`. Seeded from CSV via `WaterBodiesService.onModuleInit`. Endpoints: `GET /water-bodies`, `GET /water-bodies/stations`, `GET /water-bodies/:id`.

### Flood module refactored to station-based

`FloodScheduler` now persists discharge forecasts to `StationFloodForecast` keyed by `stationId` rather than the old district-level `FloodForecast` model. New model `WaterLevelReading` stores observed (not forecasted) water levels per station. New enum: `WaterLevelTrend`. New endpoints: `GET /flood/forecast/station/:stationId`, `GET /flood/forecast/district/:districtId`, `GET /flood/stations/:stationId/readings`, `GET /flood/stations/:stationId/latest`. Old `GET /flood/forecast` now returns data for all stations (latest day).

### PostGIS point geometry on District (`20260901000000_postgis_geometry`)

`District.geom` is now `geography(Point, 4326)` — PostGIS is active for point queries on districts. The migration also adds `coastLat`/`coastLng` to `District` (coastal representative coordinates used by the marine module), gauge threshold columns to `WaterLevelStation`, and upazila-level FK relations on `CitizenReport`, `Observation`, `RestorationProject`, and `AlertArea`.

### Observation measurements

`ObservationMeasurement` model attached to `Observation`. Three new enums: `MeasurementParameter` (38 values covering water quality, air quality, biodiversity, and soil parameters), `MeasurementUnit` (18 values), `QualityFlag` (`GOOD | SUSPECT | BAD | ESTIMATED`). New endpoints: `POST /observations/:id/measurements` (audited `OBSERVATION_MEASUREMENT_ADD`), `DELETE /observations/:id/measurements/:measurementId` (audited `OBSERVATION_MEASUREMENT_DELETE`), `GET /observations/nearby` (spatial query). `Observation` now also accepts `upazilaId`.

### Restoration sub-resources

Three new models: `ProjectTarget` (measurable goal per project, using `RestorationTargetMetric` enum), `ProjectActivity` (narrative activity log entry), `ProjectMetric` (progress reading against a target). New enum: `RestorationTargetMetric` (8 values). New endpoints: `GET/POST /restoration/projects/:id/targets`, `GET/POST /restoration/projects/:id/activities`, `GET/POST /restoration/projects/:id/targets/:targetId/metrics`. Each write audits `RESTORATION_TARGET_ADD`, `RESTORATION_ACTIVITY_ADD`, `RESTORATION_METRIC_ADD`. `RestorationProject` now also accepts `upazilaId`.

### Alert types and geographic areas

New `AlertType` enum with 11 disaster type values: `FLOOD | FLASH_FLOOD | CYCLONE | STORM_SURGE | HEATWAVE | AIR_QUALITY | WATER_POLLUTION | LANDSLIDE | DROUGHT | WILDFIRE | OTHER`. New `AlertArea` model allows an alert to cover multiple districts/upazilas beyond the primary `districtId`. Replaces the earlier 7-type informal list in business-logic.md (which used different names: `SEVERE_AIR_QUALITY`, `SEVERE_WATER_POLLUTION`).

### Dataset versioning

`DatasetVersion` model tracks published snapshots of a dataset (version string, description, publishedById, recordCount, fileUrl, metadata). Endpoints: `GET /datasets/:id/versions`, `POST /datasets/:id/versions` (Admin; audited `DATASET_VERSION_PUBLISH`).

### New AuditAction values (total now 33)

Added: `OBSERVATION_MEASUREMENT_ADD`, `OBSERVATION_MEASUREMENT_DELETE`, `RESTORATION_TARGET_ADD`, `RESTORATION_ACTIVITY_ADD`, `RESTORATION_METRIC_ADD`, `DATASET_VERSION_PUBLISH`.

---

## 2026-08-28 OpenMeteo Audit Fixes

Audit of all four OpenMeteo integrations (weather, flood, satellite-radiation, marine) and the location climate batch job identified five reliability gaps. All fixed in a single pass.

### HIGH — HTTP timeout (no timeout → AbortController 30 s)

All `fetch()` calls in `WeatherOpenMeteoClient`, `FloodOpenMeteoClient`, `RadiationOpenMeteoClient`, and `MarineOpenMeteoClient` ran with no timeout. A slow or hung upstream would block a scheduler thread indefinitely, eventually stalling NestJS.

Pattern applied to all four clients:
```typescript
const FETCH_TIMEOUT_MS = 30_000;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timer);
  ...
} catch (err) {
  clearTimeout(timer);
  throw err;
}
```

### HIGH — Silent data loss on batch size mismatch (location climate)

`LocationClimateService.syncAll()` called the OpenMeteo batch API and zipped the response arrays by index. If OpenMeteo returned fewer entries than requested (e.g. one entry dropped silently), the zip would silently attribute wrong data to wrong districts with no error.

Fix: after normalising `weatherArr`/`aqArr`, assert lengths match the batch before processing:
```typescript
if (weatherArr.length !== batch.length || aqArr.length !== batch.length) {
  throw new Error(`OpenMeteo response size mismatch: expected ${batch.length}, got weather=${weatherArr.length} aq=${aqArr.length}`);
}
```

### MEDIUM — Flood loop upserts (N separate transactions → one batch $transaction)

`FloodService.syncDistrict()` ran N sequential `this.prisma.floodForecast.upsert()` calls in a for-loop. Each was an independent transaction, so a failure mid-loop left partial data. Replaced with `this.prisma.$transaction(daily.time.map(...))` — all 30 rows atomic.

### MEDIUM — UTC date bug (setHours → setUTCHours)

`LocationClimateService` used `new Date(); date.setHours(0,0,0,0)` to produce a date-only key. In non-UTC timezones (servers deployed in Asia/Dhaka) this produced the wrong date boundary. Changed to `setUTCHours(0,0,0,0)`.

### MEDIUM — Aggregation queries not in a transaction

The four rolling-average aggregation methods (`updateUnionRollingAverages`, `aggregateUpazilas`, `aggregateDistricts`, `aggregateDivisions`) were `async` methods each awaiting their own `$executeRaw`. A failure after the union step left the hierarchy inconsistent.

Changed each method to return `PrismaPromise` directly (removing `async`/`await`) and wrapped all four in a single `this.prisma.$transaction([...])` in `syncAll()`.

### LOW — Climate sync had no ingestion tracking

`LocationClimateScheduler` ran without calling `IngestionService`, so its runs were invisible in the admin ingestion dashboard. Added `IngestionModule` import to `LocationClimateModule`, wired `IngestionService` into the scheduler, and wrapped each run in `startJob` / `completeJob` / `failJob` with categories `['WEATHER', 'AIR_QUALITY']`.

### LOW — Schema drift comment

The raw SQL column names in the four aggregation SQL blocks are not type-checked by `tsc`. Added a `WARNING` comment above the block listing all hardcoded column names, so any future schema rename can be caught manually.

---

## 2026-08-28 Integrations (Satellite Radiation, Marine Weather, Emissions Tracking)

Three new domains implemented in a single pass.

### OpenMeteo Satellite Radiation (`apps/api/src/radiation/`)

- **Endpoint:** `satellite-api.open-meteo.com/v1/satellite`
- **Variables fetched:** `shortwave_radiation_sum`, `sunshine_duration`, `daylight_duration` (all daily)
- **Forecast window:** 7 days
- **Storage:** `SatelliteRadiationReading` — one row per district per day; unique `(districtId, readingDate)`; upserts in a single `$transaction` per district
- **Scheduler:** `RadiationScheduler` — `@Cron('0 0 1 * * *')` (daily at 1am); initial sync on first boot if table is empty
- **Ingestion tracking:** `DatasetCategory.MONITORING` via `IngestionService`
- **Public endpoints:** `GET /radiation/daily`, `GET /radiation/daily/:districtId?from=&to=`
- **Dataset catalog:** "OpenMeteo Satellite Radiation" (MONITORING / PUBLIC)

### OpenMeteo Marine Weather (`apps/api/src/marine/`)

- **Endpoint:** `marine-api.open-meteo.com/v1/marine`
- **Variables fetched:** 11 daily aggregates — `wave_height_max`, `wave_direction_dominant`, `wave_period_max`, `wind_wave_height_max`, `wind_wave_direction_dominant`, `wind_wave_period_max`, `wind_wave_peak_period_max`, `swell_wave_height_max`, `swell_wave_direction_dominant`, `swell_wave_period_max`, `swell_wave_peak_period_max`
- **Forecast window:** 7 days
- **Storage:** `MarineForecast` — one row per district per day; unique `(districtId, forecastDate)`; upserts in a single `$transaction` per district. Inland districts produce a fetch error (OpenMeteo snaps to the nearest marine cell — none for inland coordinates); logged as `warn`, skipped, not counted as failure
- **Coastal districts:** Cox's Bazar, Chattogram, Khulna, Satkhira, Barguna, Patuakhali, Bhola, Noakhali, and others
- **Scheduler:** `MarineScheduler` — `@Cron('0 0 2 * * *')` (daily at 2am, offset from climate at midnight and radiation at 1am); initial sync on first boot if table is empty
- **Ingestion tracking:** `DatasetCategory.WATER` via `IngestionService`
- **Public endpoints:** `GET /marine/forecast`, `GET /marine/forecast/:districtId?from=&to=`
- **Dataset catalog:** "OpenMeteo Marine Weather" (WATER / PUBLIC)
- **SST / ocean currents:** not stored — `sea_surface_temperature` and ocean current variables are hourly-only in the Marine API; deferred to a future hourly table

### Emissions Tracking — initial implementation (`apps/api/src/emissions/`)

Initial design used user-input source-level tracking (`PollutionSource` + `EmissionEntry` models, `emissions.manage` / `emissions.report` permissions). This design was **superseded on 2026-09-02** — see "2026-09-02 World Bank Emissions Rewrite" below for the current implementation.

---

## Ingestion Module + Dataset Access (2026-08-24)

## OpenMeteo Flood (initially 2026-08-25; refactored 2026-08-31)

Added `apps/api/src/flood/` as a separate provider integration. Originally stored 30-day district-level discharge forecasts in a `FloodForecast` model. **Refactored 2026-08-31** to station-based: forecasts now stored in `StationFloodForecast` keyed by `WaterLevelStation.id`. Old district-level endpoints replaced by `GET /flood/forecast/station/:stationId`, `GET /flood/forecast/district/:districtId`, `GET /flood/stations/:stationId/readings`, and `GET /flood/stations/:stationId/latest`. `IngestionJob` records created per scheduler run. The existing dataset catalog Flood entry seeded idempotently on API boot.

This is model-derived river-discharge context. It does not replace official FFWC warnings, which remain a separate integration.

Two major pending backend features implemented in a single pass.

### Ingestion job lifecycle

`IngestionModule` had been an empty `@Module({})` stub with no service or controller. The `IngestionJob` Prisma model already existed; this pass made weather and biodiversity schedulers write job records instead of running with no tracking.

**New files:**
- `apps/api/src/ingestion/ingestion.service.ts` — `startJob(providerId)` → creates job with `RUNNING` status; `completeJob(jobId, categories?)` → marks `SUCCEEDED` and updates `Dataset.lastSyncedAt` for affected categories; `failJob(jobId, errorMsg)` → marks `FAILED` with truncated error; `findProviderIdByName(name)` → provider lookup returning `null` if not found (job tracking skipped gracefully, sync continues); `list` / `getById` for admin reads.
- `apps/api/src/ingestion/ingestion.controller.ts` — `GET /ingestion/jobs` and `GET /ingestion/jobs/:id`, both `MODERATOR`/`ADMIN` gated.
- `apps/admin/app/(admin)/ingestion/page.tsx` — admin ingestion dashboard: status tabs (All / Running / Succeeded / Failed / Queued), per-tab counts, provider name, duration, relative start time, error message. Gracefully falls back if API unreachable.

**Modified files:**
- `apps/api/src/ingestion/ingestion.module.ts` — wired service + controller, exports `IngestionService`.
- `apps/api/src/providers/providers.service.ts` — added `GBIF_PROVIDER_NAME = 'GBIF'` export; `onModuleInit` refactored into a private `upsertProvider` helper, now idempotently seeds both `OpenMeteo` and `GBIF` providers on every boot.
- `apps/api/src/weather/weather.module.ts` — imports `IngestionModule`.
- `apps/api/src/weather/weather.scheduler.ts` — all three cron methods now look up the OpenMeteo provider ID, call `startJob`, and wrap each full run with `completeJob`/`failJob`. Per-district errors remain individually caught; only a full outer failure marks the job as `FAILED`. `completeJob` with `['WEATHER']` or `['WEATHER', 'AIR_QUALITY']` categories updates `Dataset.lastSyncedAt` — first time `lastSyncedAt` is ever populated.
- `apps/api/src/biodiversity/biodiversity.module.ts` — imports `IngestionModule`.
- `apps/api/src/biodiversity/biodiversity.scheduler.ts` — `syncGbif` wrapped with GBIF provider job tracking.
- `apps/admin/components/admin-nav.tsx` — Ingestion link added between Alerts and Datasets, visible to both MODERATOR and ADMIN.

### Dataset access & downloads (Milestone 7)

Five new endpoints completing the access-policy enforcement layer that the catalog had modelled but never enforced.

**New DTO files:**
- `apps/api/src/datasets/dto/request-dataset-access.dto.ts` — optional `reason` (max 1000 chars).
- `apps/api/src/datasets/dto/decide-dataset-access.dto.ts` — `decision: APPROVED | REJECTED` + optional `note`.

**New endpoints:**

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/datasets` | ADMIN | Create dataset catalog entry |
| `GET` | `/datasets/:id/download` | Any authenticated | Access-policy enforcement; writes `DATASET_ACCESS` audit |
| `POST` | `/datasets/:id/access-request` | Any authenticated | Creates `DatasetAccessRequest`; `ConflictException` on duplicate |
| `GET` | `/datasets/:id/access-requests` | ADMIN | List requests for a dataset, filterable by status |
| `PATCH` | `/datasets/:id/access-requests/:requestId` | ADMIN | Approve or reject; writes `DATASET_ACCESS_DECISION` audit |

**Access policy enforcement in `download`:**
- `PUBLIC` / `LOGIN_REQUIRED` → any authenticated user
- `RESEARCHER` → `RESEARCHER` or `ADMIN` role
- `APPROVED` → approved `DatasetAccessRequest` for this user + dataset
- `GOVERNMENT` → `GOVERNMENT_AGENCY` or `ADMIN` role

Download response is honest: no file URL exists yet. Returns dataset metadata + a list of API endpoints where the data is accessible (`resolveApiEndpoints` maps category → real API routes).

**Audit events closed:** `DATASET_ACCESS` and `DATASET_ACCESS_DECISION` are now written. The three dataset ones were the last gap at this point; `OBSERVATION_UPDATE`, `OBSERVATION_DELETE`, `PERMISSION_GRANT`, and `PERMISSION_REVOKE` were added subsequently. `AuditAction` now has 25 values, all written.

---

## Deploy Fixes (2026-08-24)

Two bugs caught during a pre-deploy review — neither caused test failures (no frontend tests exist) but both would have caused silent failures in production.

### Admin `API_URL` missing from `docker-compose.prod.yml`

The `admin` service in `docker-compose.prod.yml` had no `API_URL` environment variable. `apps/admin/lib/api.ts` falls back to `http://localhost:3001` when `API_URL` is unset — which resolves correctly on a developer machine but is unreachable inside a Docker container (the admin container's localhost is not the api container). Every server-side API call from the admin console would have failed silently in production.

**Fix:** Added `API_URL: ${API_URL:-http://api:3001}` to the `admin` service environment, matching the same line already present in the `web` service.

### Community sidebar link removed

`/community` has no backend module and shows a hardcoded "not built yet" message. The link was still present in `apps/web/components/app-sidebar.tsx`, making the dead-end navigable. The link was removed; the page file remains in place.

---

## Consumer Frontend (2026-08-23)

All major list pages now link to detail pages. Two new authenticated API endpoints allow users to view their own submissions regardless of status.

### New API endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/reports/mine` | Authenticated | Caller's own reports, all statuses, newest first |
| GET | `/observations/mine` | Authenticated | Caller's own observations, all trust levels, most recent first |

Both return `PaginatedEnvelope<CitizenReport>` / `PaginatedEnvelope<Observation>` — same shape as the public list, same `REPORT_SELECT` / `OBSERVATION_SELECT`. Routes added to `packages/contracts`.

### New detail pages

| Page | Route | Notes |
| --- | --- | --- |
| Report detail | `/reports/[id]` | Description, moderator summary, status history trail, media, comments, comment form |
| Alert detail | `/alerts/[id]` | Severity banner, description, instructions, subscription CTA |
| Observation detail | `/observations/[id]` | Trust-level strip, description, taxonomy-style details grid |
| Restoration project detail | `/restoration/[id]` | Description, impact summary, details grid, join form (active projects) |
| Biodiversity species detail | `/biodiversity/species/[id]` | Taxonomy, occurrence count, per-species occurrence table |

### List page updates

- All five list pages now have clickable rows or title links pointing to detail pages.
- Alerts page: made cards and history rows into `<Link>` elements; emergency strip also links to the alert detail; removed a broken decorative CSS map section (classes had been deleted); replaced stale "coming soon" notification banner with a real link to the profile subscriptions panel.
- Restoration list: title column is a link (rows have inline join forms so cannot be fully wrapped).
- Biodiversity species list: entire rows are links.

### Profile activity feed

The profile page "Recent activity" placeholder replaced with two live panels:

- **My reports** — fetches `/reports/mine` (authenticated), shows all statuses including SUBMITTED/UNDER_REVIEW with colour-coded badges, links to detail pages.
- **My observations** — fetches `/observations/mine` (authenticated), shows all trust levels, links to detail pages.
- **Hero stats** updated to show real report count, observation count, and member-since date.
- Alert subscriptions panel retained from Phase 6c UI.

---

## M12 Admin Console + M5 Report Enrichment (2026-08-22)

### M12: Admin Console Frontend

Full internal console at `apps/admin` (port 3002), built entirely with Next.js 15 App Router Server Components and Server Actions — no client-side state management.

**Auth and session design:**
- Separate cookie names (`nga_access` / `nga_refresh`) from the public web app (`ng_access_token` / `ng_refresh_token`) to prevent cross-app interference — both run on different ports but share a domain in production.
- `apps/admin/middleware.ts` — protects all routes under `/reports`+ prefix; decodes JWT expiry via `atob` (Edge runtime compatible, no `Buffer`); auto-refreshes expired access tokens before the page renders.
- Login enforces MODERATOR or ADMIN role at the application layer — attempts from CITIZEN/RESEARCHER accounts are rejected immediately after token issuance.

**Files added:**
- `apps/admin/lib/session-constants.ts` — cookie names + max-age constants
- `apps/admin/lib/api.ts` — `apiGet`, `apiPost`, `apiPatch` helpers with `ApiError` class
- `apps/admin/lib/session.ts` — `setSessionCookies`, `clearSessionCookies`, `getAccessToken`
- `apps/admin/lib/auth-actions.ts` — `loginAction`, `logoutAction`, `getCurrentAdminUser`
- `apps/admin/lib/report-actions.ts` — `updateReportStatusAction`
- `apps/admin/lib/user-actions.ts` — `updateRoleAction`, `deactivateUserAction`
- `apps/admin/lib/alert-actions.ts` — `createAlertAction`, `cancelAlertAction`
- `apps/admin/lib/dataset-actions.ts` — `togglePublishAction`, `updateAccessPolicyAction`
- `apps/admin/middleware.ts` — route protection + token auto-refresh
- `apps/admin/components/admin-nav.tsx` — `'use client'` nav with `usePathname()` active-state; Datasets + Users links ADMIN-only
- `apps/admin/app/(admin)/layout.tsx` — dark sidebar shell, fetches `/api/v1/auth/profile`, enforces MODERATOR/ADMIN role
- `apps/admin/app/(admin)/reports/page.tsx` — status-tab moderation queue (SUBMITTED / UNDER_REVIEW / VERIFIED / REJECTED / RESOLVED) with inline transition forms and note textarea
- `apps/admin/app/(admin)/users/page.tsx` — user list, role selector (hidden for ADMIN accounts), deactivate confirm (`<details>/<summary>`), self-deactivation prevented via JWT `sub` decode
- `apps/admin/app/(admin)/alerts/page.tsx` — create panel (`<details>` collapsible, auto-opens on error), ACTIVE / CANCELLED / EXPIRED tabs with live counts, per-severity left-border colour
- `apps/admin/app/(admin)/datasets/page.tsx` — publish/unpublish toggle, access policy selector, calls `GET /api/v1/datasets/admin` (ADMIN-only)
- `apps/admin/app/globals.css` — dark sidebar, status/severity/role/category/policy badge variants, `<details>` confirm pattern

**API changes to support admin console:**
- `datasets.controller.ts` — removed class-level `@Public()`, added per-endpoint `@Public()` to list/detail/weather/AQ; added `GET /datasets/admin` (`@Roles('ADMIN')`) before `GET :id` to avoid route conflict; added `PATCH /datasets/:id` (`@Roles('ADMIN')`)
- `datasets.service.ts` — added `listAll()` (no `isPublished` filter) and `update(id, dto, actor)` (writes `DATASET_UPDATE` audit)
- `schema.prisma` — `DATASET_UPDATE` added to `AuditAction` enum
- Migration `20260822100000_add_dataset_update_audit_action` — `ALTER TYPE "AuditAction" ADD VALUE 'DATASET_UPDATE'`

**Task 2 (Ingestion dashboard) is complete** — the dashboard reads `IngestionJob` rows created by the weather, GBIF, and Flood schedulers. `ApiCallLog` remains intentionally unimplemented.

---

### M5: Report Enrichment (schema + API)

Citizens and moderators can now attach evidence and discussion to reports.

**Schema (migration `20260822120000_add_report_comment_and_media`):**
- `ReportComment` — `reportId`, `authorId`, `body` (Text), `isInternal` (default false), `createdAt`. Internal comments are only returned to MODERATOR/ADMIN via `GET /reports/:id/comments/all`.
- `ReportMedia` — `reportId`, `uploadedById`, `url`, `mimeType?`, `fileSize?`, `caption?`, `createdAt`. No file upload — clients register an externally hosted URL.
- Back-relations added to `CitizenReport` (`comments[]`, `media[]`) and `User` (`reportComments[]`, `reportMedia[]`).
- `REPORT_COMMENT_ADD` and `REPORT_MEDIA_ADD` added to `AuditAction` enum.

**New API endpoints:**

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/reports/:id/comments` | Public | Returns non-internal comments only |
| `GET` | `/reports/:id/comments/all` | MODERATOR / ADMIN | All comments including internal |
| `POST` | `/reports/:id/comments` | Any authenticated | CITIZEN/RESEARCHER cannot set `isInternal: true` — silently clamped |
| `GET` | `/reports/:id/media` | Public | Lists all media on a report |
| `POST` | `/reports/:id/media` | Any authenticated | Registers a URL; no server-side upload |

**Contracts updated (`packages/contracts/src/index.ts`):**
- `ReportComment`, `ReportMedia`, `CreateReportCommentRequest`, `AddReportMediaRequest` types added
- `routes.reports` extended with `comments`, `addComment`, `media`, `addMedia` entries

**What's not done (deliberate scope):** nested comment replies (no `parentCommentId`), comment editing/soft-delete (no `PATCH /comments/:commentId`), file upload transport (MinIO/S3 deferred — see deferred table in `implementation-plan.md`).

---

## Phase 6d: Dockerfiles (2026-08-22)

Three production-ready Dockerfiles, standalone Next.js config, a production docker-compose, and a deployment README.

**Files added:**
- `.dockerignore` — excludes `node_modules`, `.next`, `dist`, `.env*`, git
- `apps/api/Dockerfile` — multi-stage (builder + runner). Builder installs all deps, generates Prisma client, runs `nest build`. Runner reinstalls prod-only deps, regenerates Prisma client, copies `dist/`. Non-root user (`api:nature`). Health check on `GET /api/v1/health`.
- `apps/api/docker-entrypoint.sh` — runs `prisma migrate deploy` before the Node process starts; idempotent on every container start.
- `apps/web/Dockerfile` — multi-stage. Builder runs `next build` (standalone mode). Runner copies the standalone tree + `apps/web/.next/static/`. Non-root user (`web:nature`).
- `apps/admin/Dockerfile` — same pattern as web.
- `docker-compose.prod.yml` — full production stack: postgres (with healthcheck), api (waits on `service_healthy`), web, admin. All env vars documented in compose file with defaults. Postgres not port-exposed to host by default.
- `infrastructure/docker/README.md` — deployment guide: quick-start commands, required env vars table, manual migration command, health check summary, known gaps.

**Next.js config changes:**
- `apps/web/next.config.mjs` — added `output: 'standalone'`, `outputFileTracingRoot` (repo root), `transpilePackages: ['@delta-signal/shared', '@delta-signal/contracts']`. The `.mjs` file takes precedence over `.ts`; the `.ts` file (accidentally created) was removed.
- `apps/admin/next.config.mjs` — added `output: 'standalone'`, `outputFileTracingRoot`. Same `.ts` cleanup.

**Standalone output verified live:**
- `apps/web/.next/standalone/apps/web/server.js` — confirmed present after clean build ✓
- `apps/admin/.next/standalone/apps/admin/server.js` — confirmed present ✓

**Design decisions:**
- Build context is the **repo root** (not individual app dirs) — workspace packages (`packages/shared`, `packages/contracts`, `packages/database`) are required at build time.
- `pnpm install --frozen-lockfile --prod` in runner stage omits devDeps (TypeScript, Jest, NestJS CLI) — workspace package sources are copied to satisfy pnpm's workspace links without needing the full install.
- Prisma generate runs in both builder (for compilation) and runner (for the runtime platform binary). A migration-at-startup entrypoint makes `docker compose up` self-contained.
- `POSTGRES_PASSWORD` and `JWT_SECRET` have no defaults in compose — the deployment fails loudly if they're absent rather than starting with an insecure configuration.

**Known gaps (noted in README):** no Nginx/TLS termination, no automated DB backups, secrets in plaintext `.env`, single-host only.

## Phase 6c: Notification Delivery (2026-08-22)

An alerting platform with `EMERGENCY` severity but no delivery mechanism is not shippable. This pass builds the full notification pipeline.

**Schema (migration `20260821215250_add_notification_subscriptions_and_deliveries`):**
- `NotificationChannel` enum (`EMAIL`) and `DeliveryStatus` enum (`PENDING`, `SENT`, `FAILED`)
- `AlertSubscription` — userId, districtId (nullable = nationwide), channel, minSeverity (`INFO`/`WATCH`/`WARNING`/`EMERGENCY`). No `@@unique` — Postgres treats `NULL != NULL` in unique indexes, breaking deduplication for global (districtId-null) subscriptions. Uniqueness enforced at application level in `subscribe()` instead.
- `NotificationDelivery` — subscriptionId (`onDelete: Cascade`), alertId, userId, channel, address (captured at send time), status, sentAt, failedAt, error. Pre-written as `PENDING` before the send attempt so a crash mid-flight leaves auditable evidence.
- Relations added to `User`, `District`, `Alert`.

**Email service (`notifications/email.service.ts`):**
- Reads `SMTP_HOST`/`PORT`/`USER`/`PASS`/`FROM` from `ConfigService` at construction — all optional.
- If `SMTP_HOST` is absent, logs a one-time `warn` and sets `transporter = null`. Every send call is then a debug-logged no-op, not an error. The API starts cleanly without SMTP configured.
- Plain-text email: severity label, area (district name or "Nationwide"), title, description, instructions (if set), issued timestamp, unsubscribe note.

**Notifications service (`notifications/notifications.service.ts`):**
- `subscribe()` — application-level uniqueness check (`findFirst`) then creates subscription. Throws `ConflictException` on duplicate.
- `listSubscriptions(userId)` — returns subscriptions with district name, ordered by `createdAt desc`.
- `unsubscribe(id, userId)` — `findFirst` to verify ownership, then `deleteMany` to avoid Prisma's own P2025 not-found on race conditions.
- `dispatchForAlert(alertId): void` — public, non-blocking. Fetches the alert, guards on `status === ACTIVE`, finds matching subscriptions (filtered by district and `minSeverity`), deduplicates by userId, creates `PENDING` `NotificationDelivery` records, then enqueues one `alert-notification` job per user into the BullMQ `email` queue. Called from `AlertsService` — never blocks the HTTP response.
- `QUALIFYING_MIN_SEVERITIES` — maps alert severity to the set of minSeverity values that qualify: `EMERGENCY → [INFO,WATCH,WARNING,EMERGENCY]`, `WARNING → [INFO,WATCH,WARNING]`, etc.
- `EmailProcessor` — handles `alert-notification`, `password-reset`, and `email-verification` job types with 4-attempt exponential backoff; updates `NotificationDelivery` to `SENT` or `FAILED` on completion.

**Controller (`notifications/notifications.controller.ts`):**
- `POST /notifications/subscriptions` — subscribe (any authenticated user)
- `GET /notifications/subscriptions` — list mine
- `DELETE /notifications/subscriptions/:id` — unsubscribe (ownership enforced in service)

**AlertsService wiring:**
- `create()` — calls `this.notifications.dispatchForAlert(alert.id)` after audit write (no await)
- `update()` — calls dispatch when `dto.status === AlertStatus.ACTIVE` (covers DRAFT → ACTIVE transitions; does not fire for EXPIRED/CANCELLED)

**Env vars added to `.env.example`** (all commented/optional): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

**Design decisions noted:**
- Nationwide alerts (districtId null) only reach global subscribers (districtId null), not district-specific subscribers. District-specific subscribers opted in to events in their area, not all national events.
- Dispatch enqueues one BullMQ job per subscriber — parallel processing is handled by the `email` queue's worker concurrency; SMTP thundering herd is avoided by queue rate controls.
- `onDelete: Cascade` on `NotificationDelivery.subscription` — delivery history is operational audit data, not compliance records; acceptable to lose with the subscription for v1.

`tsc --noEmit` clean. 52 tests pass (5 spec files) at the time of 6c completion; test suite subsequently expanded to 153 tests in 11 spec files.

## Phase 6b: API Contract Enforcement (2026-08-22)

The long-standing gap: `apps/api` did not import `@delta-signal/contracts`, so the backend could silently drift from the shapes the frontend relied on — wrong field name, missing field, wrong type — with nothing in CI to catch it.

**`select` discipline** — four services were using Prisma `include` (or no field filter) instead of an explicit `select`, meaning unintended fields could leak into API responses:
- `datasets.service.ts` `list()`/`getById()` — added `DATASET_SELECT` constant; switched from `include` to `select`
- `weather.service.ts` — `getLatestCurrent()`, `getLatestCurrentForAllDistricts()`, `getLatestAirQuality()`, `getLatestAirQualityForAllDistricts()` returned `createdAt` (not in the `CurrentWeatherReading` or `HourlyAirQualityReading` contract). Added `CURRENT_WEATHER_SELECT` and `AIR_QUALITY_SELECT` as static class constants; all four read methods now use them.
- `reports.service.ts` `getById()` — was using `include` (returning all scalar fields: `description`, `reporterId`, `resolvedAt`); changed to `select: { ...REPORT_SELECT, statusHistory: { ... } }`. The `statusHistory` detail is intentionally kept since it's useful for the detail view but is not part of the list contract.
- `alerts.service.ts` `getById()` — was using `include`; changed to `select: ALERT_SELECT`, matching the list response shape exactly.

**`contract-types.typecheck.ts`** — new file at `apps/api/src/common/contract-types.typecheck.ts`. No runtime effect; only purpose is to be checked by `tsc --noEmit` in CI. Covers all eight domain surfaces: reports, alerts, observations, datasets, restoration, biodiversity, weather (current + AQ), metrics.

Key design decisions:
- Uses a `Jsonified<T>` utility type (`Date→string`, `T[]→Jsonified<T>[]`, objects recursively mapped) to model NestJS's JSON serialisation — Prisma returns `Date`, the client receives ISO-8601 strings.
- Each check is a direct `const _check: ContractType = declared_service_result` assignment — TypeScript errors if the service return type is missing a required contract field or has the wrong type. Extra fields on the service side are fine (structural subtyping).
- Verified via deliberate breakage: injecting a `& { nonExistentField: string }` requirement triggered a precise `TS2322` error naming the exact missing field and the complete inferred service return type; restoring the file returned to zero errors.

`@delta-signal/contracts` added as a devDependency to `apps/api/package.json` (workspace link, zero download cost). `pnpm install` confirms lockfile unchanged.

All 60 existing tests still pass. `tsc --noEmit` clean across all three apps.

## Phase 6a Complete (2026-08-21)

All four security must-fixes landed in a single commit (`d428fa8`).

**`helmet`** — installed and called in `apps/api/src/main.ts` before routing, so every response (including error responses) carries standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.).

**Rate limiting** — `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])` applied globally in `AppModule`. `ThrottlerGuard` registered via `APP_GUARD` (not `useGlobalGuards`) so it gets DI. Auth endpoints tightened with `@Throttle` on the controller:
- `/auth/login` and `/auth/register`: 5 req / 60 s per IP
- `/auth/refresh`: 20 req / 60 s per IP (legitimate clients refresh every ~15 min)
- All other routes: global 120 req / 60 s baseline

**`USER_LOGIN_FAILED` audit** — the last known audit gap. `AuditAction.USER_LOGIN_FAILED` added via additive migration `20260820200435_add_user_login_failed_audit_action`. `AuthService.recordFailedLogin()` fires before every `UnauthorizedException` in `login()`:
- Unknown email → `userId: null`, `meta: { email, reason: 'unknown_email' }` — a spray across many accounts is still visible even though no `userId` exists
- Bad password or deactivated account → real `userId`, `meta: { email, reason: 'bad_password_or_inactive' }`

Both branches capture `ipAddress` from the request. The HTTP response remains a generic `401 Invalid credentials` in all cases — the distinction is only in the audit trail, not the API surface. Five regression tests added to `auth.service.spec.ts` verify: wrong-password audit, unknown-email audit, deactivated-user audit, IP capture on failure, and the invariant that `USER_LOGIN` is never written on a failed attempt.

**ESLint** — `.eslintrc.json` added for `apps/api`, `apps/web`, and `apps/admin`. `pnpm lint` now runs cleanly. Kept out of CI for now until the rule set is confirmed stable; `pnpm lint` should be run locally before any PR.

Result of this pass: `AuditAction` had 18 values; 15 were actively written at this point. The three unwritten (`DATASET_ACCESS`, `DATASET_DOWNLOAD`, `DATASET_ACCESS_DECISION`) were added later when dataset download/access-request endpoints shipped (2026-08-24). Additional values were added subsequently: `OBSERVATION_UPDATE`, `OBSERVATION_DELETE`, `PERMISSION_GRANT`, `PERMISSION_REVOKE`. `AuditAction` now has 25 values, all written.

## First Test Suite + CI (2026-08-21)

The repo had **zero test files and no `.github/` directory**. Both now exist.

**CI** — `.github/workflows/ci.yml`, on pull requests and pushes to `main`: `pnpm install --frozen-lockfile` → `prisma generate` → `prisma validate` → `tsc --noEmit` on api/web/admin → `jest` → `pnpm build`. Three things had to be right for it to pass on the first run: `prisma generate` must precede the typechecks (`apps/api` imports generated client types that do not exist in a fresh install); a dummy `DATABASE_URL` is needed because Prisma resolves `env("DATABASE_URL")` when loading the schema; and both Next builds were confirmed against an unreachable API, since every page is server-rendered on demand and nothing fetches at build time. Whole sequence was run locally end to end before committing.

Deliberately excluded: `pnpm lint` (ESLint was not yet installed when CI was written; added in Phase 6a, 2026-08-21, but kept out of the workflow until the rule set is stable) and the `web`/`admin` test stubs. Both would land red and train everyone to ignore the badge.

**Tests** — 52 across 5 suites in `apps/api`, all fully mocked, no database or running service (24 + 7 + 7 + 5 + 9):

- `roles.guard.spec.ts` — role matching, missing metadata, unauthenticated requests, and a dedicated case-sensitivity block covering all 6 Prisma roles
- `jwt-auth.guard.spec.ts` — `@Public()` short-circuits without consulting passport; `handleRequest` throws rather than returning a falsy user
- `auth.service.spec.ts` — register/login/refresh/logout against an in-memory Prisma double: bcrypt hashing, deactivated users, rotation on refresh, logout idempotency, and which actions do and do not audit
- `refresh-token.util.spec.ts` — token is opaque and not JWT-shaped, hash is never the raw token
- `env.validation.spec.ts` — the placeholder and 31-vs-32-character boundaries

Every historical bug got a named regression test, and the suite was **mutation-checked** — each bug was reintroduced and the tests confirmed to fail: case-insensitive role matching, JWT-shaped refresh tokens, dropping the placeholder rejection, dropping the logout audit, auditing a login before verifying the password, and storing the raw password. All six were caught.

Setup notes: `jest.config.js` maps the `@delta-signal/*` path aliases (ts-jest does not read them from `tsconfig.base.json`), and a new `tsconfig.build.json` keeps spec files out of `dist` now that `tsconfig.json` no longer excludes them — so specs are typechecked by CI but never shipped.

## JWT Secret Fail-Fast (fixed 2026-08-21)

`auth.module.ts:16` and `jwt.strategy.ts:17` both fell back to the literal `'dev-secret-change-in-production'`, and `JWT_SECRET` was absent from `.env.example` and `.env` — so nothing prompted anyone to set it and a deployment could sign real tokens with a public string.

- New `apps/api/src/common/env.validation.ts`, wired into `ConfigModule.forRoot({ validate })`. Rejects missing, empty, whitespace-only, known placeholders (`dev-secret-change-in-production`, `change-me`, `changeme`, `secret`), and anything under 32 characters. Also requires `DATABASE_URL`. Errors list every problem at once with the `openssl rand -base64 48` fix.
- Both call sites switched to `config.getOrThrow<string>('JWT_SECRET')` — no default parameter remains, so the fallback cannot return by accident.
- `JWT_SECRET` documented in `.env.example` with generation instructions; a real value set in the local `.env` (gitignored).

Validation runs during `ConfigModule` construction, so a bad config aborts **before** Prisma connects — verified, the failing runs never reach the database.

Verified end to end: missing / placeholder / 8-character secrets each exit 1 with the specific message; a valid secret boots, `POST /auth/register` issues a token and `GET /auth/profile` accepts it (200); a token forged with a different 48-character secret is rejected (401), confirming the configured secret is genuinely in use. Nine validator cases unit-checked directly, including the 31-vs-32 character boundary.

Worth knowing for future env work: `@prisma/client` loads the repo-root `.env` into `process.env` at import time, so `env -u JWT_SECRET` alone does **not** simulate a missing variable — the first attempt at this test passed for the wrong reason. The `.env` line has to be removed as well.

## Audit Coverage Gap (found + fixed 2026-08-20)

Found while syncing `docs/architecture/modules.md` against the code: `AuditAction` declared 16 values, but only 8 were ever written by a service. The schema made audit coverage look complete when it was not.

Unwritten before this pass:

- `USER_REGISTER`, `USER_LOGIN`, `USER_LOGOUT`, `USER_ROLE_CHANGE` — the `auth` and `users` services wrote **no** audit events at all, so authentication activity and role escalations left no trail.
- `REPORT_SUBMIT` — report *submission* was unaudited; only status changes were. `observations` audited both submit and trust change, so `reports` was inconsistent with its sibling.
- `DATASET_ACCESS`, `DATASET_DOWNLOAD`, `DATASET_ACCESS_DECISION` — still unwritten, blocked on the unimplemented dataset download/access-request endpoints.

Fixed:

- `auth.service.ts` — new private `recordAuthEvent()` helper writes `USER_REGISTER`, `USER_LOGIN` (only after credentials verify, so failed attempts are not logged), and `USER_LOGOUT`. `auth` is the only service that populates `AuditEvent.ipAddress`, since it already captures request metadata for `RefreshToken` rows.
- `logout` now reads the token's owning user **before** revoking, so the event is attributable, and audits only a real revocation — repeat logouts and unknown tokens still return `{success: true}` without logging duplicate or unattributable events. The endpoint stays idempotent.
- `users.service.ts` — `updateRole` writes `USER_ROLE_CHANGE` with `{from, to}`, and `deactivate` writes `USER_DEACTIVATE` with `{wasActive}`. Both in the same `$transaction` as the update, so a failed audit write rolls the change back.
- `reports.service.ts` — `create` writes `REPORT_SUBMIT`, using the same sequential pattern as `observations` (`entityId` is not known until the row exists, so the array-form `$transaction` cannot reference it).
- `AuditAction.USER_DEACTIVATE` did not exist and required migration `20260819185617_add_user_deactivate_audit_action` — a single additive `ALTER TYPE ... ADD VALUE`. `prisma migrate status` was checked first to confirm no drift, since `migrate dev` resets the database if it finds any.

Result at this pass: 14 of 17 values written. Every implemented mutating endpoint was audited; the only gaps at this point were the three `DATASET_*` values whose endpoints did not exist yet.

Verified live against real Postgres for all six actions: 2x register, login, 3x logout (exactly 1 `USER_LOGOUT` written — idempotency held), role change with correct actor/target attribution, deactivation (plus a 401 confirming the user could no longer log in), and report submission with `entityId` matching the created report. Report status transitions and the invalid-transition 403 were re-checked as a regression guard, since `reports.service.ts` was touched. All test data deleted afterward and the database confirmed back to its exact prior baseline.

Known gap at this pass: failed logins were not audited — there was no `USER_LOGIN_FAILED` enum value. This was fixed in Phase 6a (2026-08-21) — see "Phase 6a Complete" below.

## Weather Ingestion (built 2026-08-16)

Self-contained `apps/api/src/weather` module — not the generic `apps/api/src/ingestion` module described in `docs/ingestion-plan.md`/`docs/implementation-plan.md` M6. See those docs' "Implementation status" notes for the design deviations (no `ApiCallLog`, no `IngestionJob` wiring, trimmed field set, `districtId` FK instead of proximity search).

- `weather-openmeteo.client.ts` — native `fetch` + manual 3-attempt retry against OpenMeteo forecast + air-quality APIs
- `weather.service.ts` — fetch/map/upsert into 4 tables; read methods for controller and cross-module use
- `weather.scheduler.ts` — `@Cron`: current every 15 min, hourly + air quality every 2h, daily every 12h
- `weather.controller.ts` — public `GET /weather/{current,hourly,daily,air-quality}[/:districtId]`
- `DatasetsService.currentWeather()` / `currentAirQuality()` — previously placeholder stubs, now wired to real `WeatherService` data

Verified live against the real OpenMeteo API and local Postgres.

## Auth Refresh/Logout (built 2026-08-16)

Postgres-backed, not Redis — `roadmap.md`/this doc previously said "needs a token store (Redis)", but `implementation-plan.md`'s concrete M5 task list specified a Prisma `RefreshToken` model instead. Went with Postgres: no Redis client dependency existed anywhere in `apps/api` yet, and this keeps a single source of truth alongside every other model.

- `RefreshToken` Prisma model — `tokenHash` (SHA-256, raw token never stored), `expiresAt`, `revokedAt`, `deviceId`/`ipAddress`/`userAgent`
- Refresh tokens are opaque random strings (`crypto.randomBytes(48)`), **not JWTs** — this closes a real bug found while scoping: the previous "refresh token" was a JWT signed with the same secret as the access token, so it could be used directly as a bearer access token. An opaque token can only ever be redeemed via `/auth/refresh`.
- `POST /auth/refresh` — validates, then **rotates**: old token revoked, new access+refresh pair issued. A stolen refresh token stops working the moment the legitimate client refreshes.
- `POST /auth/logout` — revokes a refresh token; idempotent.
- `RefreshTokenCleanupScheduler` — daily `@Cron` (2 AM) deletes tokens expired 30+ days ago.

Verified live: register → refresh (rotates) → reuse of old token rejected (401) → refresh token rejected when used as a Bearer access token (401, confirms the fix) → logout → refresh with logged-out token rejected (401) → logout again still succeeds (idempotent). Device metadata (IP, user-agent) confirmed captured on token rows.

## Public Weather Wiring (built 2026-08-16)

First slice of M13 (Frontend Data Integration) — `apps/web`'s homepage still renders mostly static seed data, but its "Current conditions" sidebar (`map-section.tsx`) now fetches live weather/AQ data instead.

- `packages/contracts/src/index.ts` — new `routes.weather` group + `CurrentWeatherReading`/`HourlyAirQualityReading` response types
- `apps/web/lib/api.ts` — new minimal server-side `apiGet<T>(path)` fetch helper (`API_URL` env var, no `NEXT_PUBLIC_` prefix — nothing runs client-side), `revalidate: 900` matching the current-weather cron cadence
- `apps/web/components/map-section.tsx` — now an async Server Component; fetches `/weather/current` + `/weather/air-quality`, picks Dhaka/Sylhet/Khulna/Cox's Bazar, falls back to the original static `CONDITIONS` array if the API is unreachable
- Relabeled two rows to match what's actually stored rather than what the mock implied: "Dhaka AQI" (a composite index we don't compute) → "Dhaka PM2.5" (raw stored value); "Sylhet rainfall (24h)" (a rolling sum we don't have) → "Sylhet precipitation (current)" (OpenMeteo's last-hour instantaneous reading)
- Sync-status row now reflects real data freshness ("Live" / "Delayed (Xm ago)") instead of a hardcoded "Healthy" string

Verified live end-to-end: seeded real OpenMeteo data → homepage rendered it → killed the API + cleared the Next.js fetch cache → homepage fell back cleanly to static values, no crash → restarted the API → live data resumed automatically. Test data and dev servers cleaned up afterward.

## Public Auth Flow Wiring (built 2026-08-16)

Second slice of M13 — login/register/logout are now fully wired end to end, not just the backend endpoints. This was a greenfield build on the frontend side: no routes, no middleware, no cookie handling, no auth deps existed in `apps/web` before this.

- Session storage is httpOnly cookies (not `localStorage`) — the only sane choice given every existing component in `apps/web` is a Server Component; Server Components can't read `localStorage` anyway, and cookies keep tokens inaccessible to any XSS payload.
- `middleware.ts` — runs on every request (Edge runtime). Decodes the access-token JWT's `exp` claim (no signature verification needed, just an expiry check) and, if it's missing/expired but a refresh-token cookie exists, calls `/auth/refresh` and rewrites both cookies **before** any Server Component renders. Protects `/profile` — redirects guests to `/login`.
- `lib/session.ts` / `lib/current-user.ts` — cookie set/clear (Server Actions only — Next.js forbids setting cookies during Server Component rendering) and `getCurrentUser()` (reads the now-fresh access token, calls `/auth/profile`, returns `null` for guests).
- `lib/auth-actions.ts` — `loginAction`/`registerAction`/`logoutAction` as Server Actions bound directly to `<form action={...}>` — zero client components, zero new client-side state library. Register auto-logs-in (the backend already returns tokens on register). Errors surface via a redirect + `?error=` query param rather than `useActionState`, trading a full-page reload on error for not introducing the first client component in the codebase.
- `app/login`, `app/register`, `app/profile` — new routes. (`login`/`register` were later moved into the `(public)` route group — see "Profile Page Mockup Fidelity" below.)
- `public-nav.tsx` moved from `page.tsx` into `layout.tsx` so it's shared shell across all routes, and made session-aware: "Sign in" for guests, "Hi, {displayName}" + sign-out for logged-in users. (The homepage/nav wrapper was later moved again, from the root `layout.tsx` into a `(public)` route group's layout — see below.)
- Fixed a pre-existing gap while here: `public-nav.tsx`/`public-footer.tsx`/`hero-section.tsx` all had "Sign in"/"Create account" CTAs pointing at `/profile`, which didn't distinguish login from registration and didn't exist as a route at all before this. Now point at real `/login`/`/register`.
- One bug caught before shipping: the middleware's JWT-decode initially used Node's `Buffer`, which doesn't exist in the Edge runtime middleware runs on — switched to the Web-standard `atob`.

Verified live in a real browser (not just curl, since Next.js Server Actions bound to `<form>` don't map to plain REST calls): guest nav state → `/profile` redirects to `/login` when logged out → register (auto-login) → real user data rendered on `/profile` → nav shows "Hi, {name}" → session persists across page navigation → logout reverts nav to guest and re-protects `/profile` → login with correct credentials works → login with wrong password shows the real backend "Invalid credentials" message. Not independently re-verified: the middleware's silent-refresh-on-expiry path (would require waiting out the 15-minute access token), though it calls the same `/auth/refresh` endpoint already proven correct in the backend auth work above.

## Profile Page Mockup Fidelity (built 2026-08-17)

`/profile` was shipped quickly (previous entry) as a bare 4-field account card to verify the auth flow worked — it didn't match `mocks/frontend-design/profile.html` at all. Fixing that turned out to reveal a bigger structural gap: **every mocked page except the public homepage** (`data`, `observations`, `reports`, `alerts`, `biodiversity`, `restoration`, `community`, `profile`, `admin`) shares one unified sidebar "app shell" layout, completely different from the top-nav shell the homepage uses. `/profile` needed that shell introduced for the first time.

- **Routing restructured**: `/`, `/login`, `/register` moved into a new `app/(public)/` route group with its own layout (owns `<PublicNav/>` + the `public-shell` wrapper). Root `app/layout.tsx` is now bare (`html`/`body`/fonts only) so `/profile` — deliberately left outside the group — doesn't inherit the public top nav. Route groups don't affect URLs, so `/`, `/login`, `/register` still resolve exactly as before.
- `components/app-sidebar.tsx` — new reusable sidebar (brand, sectioned nav — Overview/Explore/Account — active-link highlighting via an explicit `active` prop, since Server Components can't use the client-only `usePathname` hook). Intended to be reused by M7–M12's pages, not just `/profile`.
- CSS ported directly from the mock's `styles.css` into `globals.css`: `.app-shell`, `.sidebar`, `.profile-hero`, `.avatar`, `.stat-row`, `.tab-nav`, `.empty-state`. Same CSS variables as the existing design system, so no visual clash.
- `/profile` rebuilt: avatar (initials derived from `displayName`), role label, real stat-row (Role / Member since / Last sign-in — all from `GET /auth/profile`), tab nav (Activity/My Reports/My Observations/Campaigns), and an honest "No activity yet" empty state.
- **Deliberately not ported from the mock**: the mock's Eco score, badges count, "Badges earned" panel, "Recent activity" feed items, and "Settings" notification toggles — none of those have a backing data model (no badge system, no user-facing activity log, no notification-preferences field on `User`). Fabricating numbers/feed items for these would misrepresent the product; they're honestly omitted rather than faked, per an explicit decision on this rebuild.
- One bug caught during verification: nesting each sidebar nav section in its own wrapper `<div>` broke the CSS grid the mock's flat nav structure relies on (links overlapped). Fixed by flattening `AppSidebar`'s render to direct siblings, matching the mock's actual DOM shape.

Verified live in a real browser: homepage unaffected (still top-nav, still live weather data) → register → `/profile` renders the sidebar shell with real data, matching the mock's layout → sign-out (moved to match the mock's hero position) still works and redirects to `/` with guest state restored.

## Critical RBAC Fix (found + fixed 2026-08-17)

Discovered while wiring `/alerts`'s role-conditional "Issue alert" badge — checking enum casing for filter chips surfaced a severe, already-shipped bug unrelated to the page-building task at hand.

**The bug:** `packages/shared/src/index.ts` defined `UserRole`, `AlertSeverity`, `ReportCategory`, `ReportStatus`, `DatasetCategory`, `DatasetAccessPolicy`, and `ProviderType` as **lowercase** string literals (`'admin'`, `'moderator'`, `'government'`, ...), but the real Prisma enums — what the database and JWT payload actually contain — are **uppercase** (`ADMIN`, `MODERATOR`, `GOVERNMENT`, ...). Every `@Roles(...)` call site was written against the lowercase shared type, e.g. `@Roles('government', 'moderator', 'admin')`, but `RolesGuard` compares that array against `request.user.role`, which is always uppercase at runtime. `['government','moderator','admin'].includes('ADMIN')` is `false` — always. **Every role-gated endpoint rejected every user, including legitimate admins, with no role able to pass**: `POST /alerts`, `PATCH /alerts/:id`, `PATCH /reports/:id/status`, `PATCH /users/:id/role`, `PATCH /users/:id/deactivate`.

This had been latent because nothing in `apps/web` consumed real API enum values through `@delta-signal/shared` until this session's work — the only prior consumer was `lib/static-data.ts`'s fully-static mock data, which never touched the real API.

**The fix:**
- `packages/shared/src/index.ts` — uppercased every enum to match Prisma exactly. `ObservationTrustLevel`/`ObservationCategory`/`ProjectStatus` (no Prisma model exists yet — Observations/Restoration modules are stubs) were uppercased too, on the same convention, to avoid repeating this bug when those modules ship.
- Every `@Roles(...)` call site fixed: `alerts.controller.ts` (×2), `reports.controller.ts`, `users.controller.ts` (class-level, gates the whole controller).
- `apps/api/src/users/dto/update-role.dto.ts`'s `@IsIn(ASSIGNABLE_ROLES)` validator list — same bug, a second and independent instance TypeScript caught immediately after the first fix (compiling `@delta-signal/api` failed with 5 real type errors here).
- `apps/web/lib/static-data.ts` and `components/reports-alerts-section.tsx` — the mock `ALERTS` array and its `SEVERITY_CLASS` lookup map used the same lowercase convention; fixed to match, otherwise alert severity coloring on the homepage would have silently broken the moment the shared type was corrected.
- `UserRole` keeps a `'guest'` variant not present in Prisma at all (unauthenticated requests have no role) — documented as never a real runtime value, kept only for the permission-matrix documentation use in `roles-and-permissions.md`.

**Verified live**, both directions: registered a citizen, bootstrapped them to `ADMIN` directly in Postgres (no admin existed yet to do it via the API), then confirmed `POST /alerts` → 201 (previously would have been 403 for every role) and `PATCH /users/:id/role` → 200 promoting a second test user. Re-confirmed a plain `CITIZEN` user is still correctly rejected (403) — the fix restores correct behavior in both directions, not just "allow everyone." Test users/data cleaned up afterward.

## App-Shell Pages: Data, Reports, Alerts (built 2026-08-17)

First 3 of Milestone 15's 7 pages — same honesty principle applied throughout: real data or an explicit "not available" state, never fabricated content.

- `packages/contracts/src/index.ts` — added `Dataset`, `CitizenReport`, `Alert`, `Provider`, `DistrictSummary` response types (none existed before; only request-param types did) and re-exported `ProviderType` from `@delta-signal/shared` (wasn't re-exported previously).
- `apps/web/lib/format.ts` — new `titleCase()`/`relativeTime()` helpers shared across the three pages.
- **`/data`** — real dataset catalog (`GET /datasets`) with a working category filter (query-string driven, no client JS). Mock's fabricated "Provider health" panel replaced with a real **Providers** panel (`GET /providers`). Mock's temperature/rainfall chart omitted entirely — no historical weather trend data exists to back it. Gated downloads shown as an honest access-policy tag, not a working button (`GET /datasets/:id/download` doesn't exist — M7).
- **`/reports`** — real report list (`GET /reports`, already correctly verified/resolved-only by default) with a working category filter. Metric cards show **only** Verified and Resolved counts (two real `?status=X` calls reading `.total`) — mock's "Under review"/"Submitted today" counts omitted, since the public API deliberately hides non-verified reports and showing those counts even in aggregate would undermine that access rule. Mock's elaborate disabled submission form replaced with a plain "Sign in to submit" CTA — the real form is separately sequenced (M13 task 5).
- **`/alerts`** — real alert cards + emergency banner (`GET /alerts`, ACTIVE by default) with a working severity filter, plus a real history table (`GET /alerts?status=EXPIRED`). Small backend fix needed first: `ALERT_SELECT` only projected `instructions`, not `description` — alert cards would've had no body text. "Warning zones" map reuses the homepage's existing decorative placeholder pattern (already documented as "replace with real map library in Phase 4"), not a new fabrication. "Issue alert" is a real role-conditional badge (`GOVERNMENT`/`MODERATOR`/`ADMIN` only, read from `getCurrentUser()`) — but since no alert-creation page exists yet, it reads "Issue alert — coming soon" rather than linking somewhere non-functional. Notification toggles replaced with a plain "coming soon" note.

Verified live: seeded a real verified report and two real alerts (one `EMERGENCY`, one `WARNING`) via the now-fixed role-gated endpoints, confirmed all three pages render them correctly, confirmed the category/severity filters actually refetch (not decorative), confirmed the "Issue alert" badge is invisible for guests/citizens and appears correctly once logged in as the bootstrapped admin. Test data and dev servers cleaned up afterward.

## Report Submission Form (built 2026-08-17)

M13 task 5 — the "Report an environmental issue" form on `/reports` was still decorative (disabled, mock-only) until this pass. Same honesty principle as the rest of M13/M15: the form matches the real `CreateReportDto` contract, not the mock's fields.

- `apps/web/app/reports/page.tsx` — form now renders for logged-in users (`user ? <form> : "Sign in to submit"` CTA, unchanged for guests). Fields: **Title** (added — not in the mock, but required by the real DTO and useful for the list view, which has no other short label to show), **Issue type** (real `ReportCategory` enum, was already correct), **District** (a real `<select>` populated from `GET /locations/districts`, replacing the mock's free-text location field — free text can't map to a real `districtId`), **Description** (unchanged). Mock's "Severity estimate" field dropped entirely — no such field exists on `CitizenReport` or `CreateReportDto`, and severity isn't citizen-set anywhere in the domain model. "Attach photo/video" also omitted — no media/upload backend exists yet (`ReportMedia` is still M8, unbuilt).
- `apps/web/lib/report-actions.ts` — new `submitReportAction` Server Action, posts to `POST /reports` with the authenticated user's access token; redirects to `/reports?submitted=1` on success or `/reports?error=...` with the real backend validation message on failure.
- `apps/web/lib/api.ts` — added `apiPostAuthed` (authenticated POST, never cached) and a shared `extractErrorMessage` helper fixing a latent bug in both `apiPost` and the new `apiPostAuthed`: NestJS's `ValidationPipe` returns `message` as a `string[]`, not a `string`, so the previous error handling would have rendered `"[object Object]"` or similar on any validation failure instead of the actual message.
- `app/globals.css` — `.field select`, `.field textarea`, `.form-success` added for the new form fields and the post-submit success banner.

**Second critical bug found while verifying this** (independent of the RBAC casing bug found in the previous pass): `CreateReportDto.districtId` and `CreateAlertDto.districtId` were both decorated `@IsUUID()`, but every ID in this schema is a Prisma CUID (e.g. `cmstewlrj0012usw17sqz1d3n`), not a UUID. Any report or alert submission that specified a real district — i.e. the realistic, non-empty-optional-field case — would always fail validation with "districtId must be a UUID". This had been masked in the previous RBAC-fix verification pass because that testing happened to omit `districtId` on every request. Fixed by changing `@IsUUID()` → `@IsString()` in both `apps/api/src/reports/dto/create-report.dto.ts` and `apps/api/src/alerts/dto/create-alert.dto.ts`, removing the now-unused `IsUUID` import from each.

Verified live end-to-end in a real browser (not just curl): filled and submitted the form on `/reports` with a district selected → success banner rendered → confirmed the row landed in Postgres with `status: SUBMITTED` and the correct `districtId`. Then exercised the full review workflow with a bootstrapped admin: `PATCH /reports/:id/status` `SUBMITTED → UNDER_REVIEW → VERIFIED`, confirmed via direct API call that the report now appears in `GET /reports?status=VERIFIED`. (The public `/reports` page itself won't reflect a just-verified report until its existing 15-minute ISR cache window elapses — same `revalidate: 900` pattern already used elsewhere in `apps/web`, not a new gap.) Test report, test users (`reporttester@deltasignal.org`, a temporary bootstrapped `admintester@deltasignal.org`), their refresh tokens, and the associated `ReportStatusEvent` audit rows were all cleaned up afterward; dev servers stopped and `apps/web/.next` cache cleared.

## App-Shell Pages: Observations, Biodiversity, Restoration, Community (built 2026-08-17)

Final 4 of Milestone 15's 7 pages — completes the milestone. At the time, none of these four had any backend: no `Observation` model (M9), no `Species`/`Occurrence` models or GBIF ingestion (M10), no `RestorationProject` model (M11), and Community isn't even planned as an API module yet (`docs/architecture/feature-map.md` says keep it out of core until a real content workflow exists). Same honesty principle as every prior page this session — an explicit "not built yet" state, not the mocks' fabricated stats, species cards, project rows, or feed. **`/observations` was later upgraded to real data once M9 shipped, `/restoration` once M11 shipped, and `/biodiversity` once M10 shipped — see "Observations Module", "Restoration Projects Module", and "Biodiversity + GBIF Module" below.**

- `apps/web/app/observations/page.tsx`, `apps/web/app/biodiversity/page.tsx`, `apps/web/app/restoration/page.tsx`, `apps/web/app/community/page.tsx` — all new. Each renders `<AppSidebar active="..." />` + the mock's real title/subtitle copy, then a single `panel` with an `.empty-state` message naming what's missing and which milestone unblocks it. The mocks' search bars, type filters, metric grids, species cards, habitat-pressure chart, project leaderboard, and feed items were all dropped — they're decorative controls and fabricated numbers over data that doesn't exist.
- `/observations` additionally links to `/reports` ("In the meantime, you can file a citizen report") as the nearest real thing citizens can do today.
- **Judgment call on `/community` specifically**: `implementation-plan.md` had left this open between an honest empty state or keeping the mock's static `COMMUNITY_FEED` data labeled as illustrative. Went with the same empty state as the other three, for consistency with the precedent set twice already (`/profile`'s eco score/badges, and `/data`/`/reports`/`/alerts`) rather than carving out an exception. Note this doesn't touch the homepage's `community-section.tsx`, which still renders that static feed data — a separate, already-documented M13 gap, not part of this page-building task.
- No backend, CSS, or contracts changes needed — `.empty-state`/`.panel`/`.panel-header` already existed, and `AppSidebar` already had all four `NavKey` entries wired correctly.

Verified live in a real browser: all four routes render (confirmed via `curl` 200s too), sidebar active-link highlighting is correct on each, no console errors, and `nx run @delta-signal/web:build` compiles cleanly with all four correctly picked up as static pages (no data dependency, unlike `/data`/`/reports`/`/alerts`'s dynamic rendering). Dev server stopped and `.next` cache cleared afterward. **Milestone 15 is now fully done — all 7 app-shell pages exist.**

## Observations Module (built 2026-08-17)

Milestone 9 — the first of the four "not built yet" M15 pages to get a real backend. Closes two long-open threads at once: `/observations` gets real data, and observation submission (the last unbuilt piece of M13) now works.

- `packages/database/prisma/schema.prisma` — new `Observation` model (`category`, `trustLevel` `@default(UNVERIFIED)`, `description`, `districtId?`/`district`, `lat?`/`lng?`, `species?`, `observerId?`/`observer`, `observedAt`) plus `ObservationCategory` and `ObservationTrustLevel` enums — these already existed uppercase in `packages/shared` (added proactively during the Critical RBAC Fix specifically to avoid this bug when the module shipped, and it worked: no casing mismatch this time). Added `OBSERVATION_TRUST_CHANGE` to `AuditAction` (`OBSERVATION_SUBMIT` already existed but was unused until now). Migration `20260817181448_add_observations`.
- `apps/api/src/observations/` — full CRUD mirroring the `reports` module's shape: `@Public() GET /observations` (filterable by category/trustLevel/districtId, hides `FLAGGED` by default the same way reports hides unverified statuses by default), `@Public() GET /observations/:id`, `POST /observations` (any authenticated user, defaults to `UNVERIFIED`, writes `OBSERVATION_SUBMIT` audit event), `@Roles('RESEARCHER','ADMIN') PATCH /observations/:id/trust` (writes `OBSERVATION_TRUST_CHANGE` with `{from, to}` in `meta`). `districtId` validated with `@IsString()`, not `@IsUUID()` — applied the CUID lesson from the start this time, no bug to find.
- **Trust-level gate scope decision**: `updateTrust` is `RESEARCHER`/`ADMIN` only, not `MODERATOR` — matched the original M9 plan text exactly rather than extending the reviewer set from reports, since trust validation is a domain-expertise judgment, distinct from a moderation/status-review task. Confirmed with the user before implementing.
- `packages/contracts/src/index.ts` — added a full `Observation` response type (same treatment `Dataset`/`CitizenReport`/`Alert` got for M15) and a `trust` route. Also corrected `CreateObservationRequest`, which had never been wired to anything real: it previously had a speculative `locationId`/`coordinates`/`observedAt`/`species` shape that didn't match what the app actually needed to send. Now matches the real DTO (`category`, `description`, `districtId?`, `lat?`, `lng?`).
- `apps/web/app/observations/page.tsx` — replaces the honest-empty-state page with a real list (category filter, trust-level shown via existing `.tag` variants — no new `.trust-pill` CSS ported from the mock) and a real submission form (category, district — real `<select>`, not free text — description). **Deliberately dropped from the form**: `species` and a user-editable `observedAt` — the mock's own submission preview doesn't have them either (just type/location/description), and the server sets `observedAt` to submission time automatically. Also skipped the mock's decorative map, matching `/data`'s precedent of dropping mock chrome that adds no function.
- `apps/web/lib/observation-actions.ts` — new `submitObservationAction` Server Action, same shape as `submitReportAction`.

Verified live: registered a citizen, submitted an observation with a real district → confirmed `UNVERIFIED` in Postgres and visible via `GET /observations` → confirmed the same citizen gets 403 on `PATCH /:id/trust` → bootstrapped a `RESEARCHER`, promoted the same observation to `RESEARCH_GRADE` → confirmed both audit events (`OBSERVATION_SUBMIT`, `OBSERVATION_TRUST_CHANGE` with correct `from`/`to`) were recorded. Full browser click-through of the new `/observations` page (login → filter → submit → success banner) confirmed the same flow visually. Both `apps/api` and `apps/web` builds are clean. Test users, test observation, and dev servers cleaned up afterward.

## Restoration Projects Module (built 2026-08-19)

Milestone 11 — the second of the four "not built yet" M15 pages to get a real backend (after Observations/M9). Also finally lands `RestorationProject`, the last of the three models M5 deferred back on 2026-08-16 (`ReportMedia`/`ReportComment` are still pending).

- `packages/database/prisma/schema.prisma` — new `RestorationProject` model (`title`, `description`, `category`, `status` reusing the existing `ProjectStatus` enum `@default(PLANNED)`, `organizationId?`/`organization`, `districtId?`/`district`, `startDate?`/`endDate?`, `impactSummary?`, `createdById`/`createdBy`) plus a new `RestorationParticipant` join model (`projectId`, `userId`, `joinedAt`, `@@unique([projectId, userId])`) and a new `RestorationCategory` enum (`TREE_PLANTING`/`WETLAND_RESTORATION`/`RIVERBANK_PROTECTION`/`MANGROVE`/`WASTE_MANAGEMENT`/`OTHER`, matching the mock's filter options — no shared enum for this existed before). Added `RESTORATION_PROJECT_CREATE`/`_UPDATE`/`_JOIN` to `AuditAction`. Migration `20260819104332_add_restoration_projects`.
- **Scope simplification, confirmed with the user before implementing**: the original M5 field list included `fundingGoal`/`fundingRaised`/`impactMetrics (Json)`. Replaced with a single `impactSummary` free-text field (e.g. "640 ha mangrove restored") — matches what the mock actually displays, avoids building unused money-tracking or a JSON shape nothing renders specially yet.
- **Participant counting**: no denormalized `participantCount` column — `_count: { participants: true }` computed at query time via the `RestorationParticipant` join table instead, so a repeat "join" click can never inflate a stored counter. The unique constraint makes `join()` naturally idempotent: a second join attempt catches Prisma's `P2002` and is a silent no-op rather than an error.
- `apps/api/src/restoration/` — new module, wasn't even wired into `AppModule` before this (unlike `observations`/`biodiversity`, which had empty stub modules already registered). `@Public() GET /restoration/projects` (filterable by category/status/districtId), `@Public() GET /restoration/projects/:id`, `@Roles('ORGANIZATION_ADMIN','ADMIN') POST /restoration/projects`, `PATCH /restoration/projects/:id` (any authenticated user at the guard layer — ownership checked inside the service: creator or `ADMIN` only, everyone else gets 403), `POST /restoration/projects/:id/join` (any authenticated user).
- **Remaining limitation**: `ORGANIZATION_ADMIN` is still a global role for restoration-project creation; membership-scoped restoration ownership is a separate follow-up now that `OrganizationMembership` exists.
- `packages/shared/src/index.ts` / `packages/contracts/src/index.ts` — added `RestorationCategory` to shared; added a full `RestorationProject` response type (with `_count.participants`, `organization`/`district` refs), `CreateRestorationProjectRequest`, `UpdateRestorationProjectRequest`, and `create`/`update` routes (`list`/`detail`/`join` already existed).
- `apps/web/app/restoration/page.tsx` — replaces the honest-empty-state page with a real project list (category filter, org/district/status/participant columns) and **two distinct authenticated actions**, unlike every other submission form built this session: a project-registration form shown only to `ORGANIZATION_ADMIN`/`ADMIN`, and a "Join" button shown to every other logged-in user. Kept intentionally simple — no per-row "already joined" indicator, since that would need an extra membership lookup per project; the Join action is a plain idempotent button, not a toggle. Also consolidated the table to the existing 4-column `.table-row` grid CSS (shared by every other table in the app) rather than adding a new 6-column CSS variant for this one page.
- `apps/web/lib/restoration-actions.ts` — new `createRestorationProjectAction`/`joinRestorationProjectAction` Server Actions.

Verified live: a plain citizen blocked from `POST /restoration/projects` (403) → bootstrapped an `ORGANIZATION_ADMIN` + a real `Organization`, created a project with a real organization and district → citizen joined (idempotent — a second join left the participant count at 1, confirmed via both curl and a browser click) → a non-owner, non-admin blocked from `PATCH /:id` (403) → the creator successfully updated status to `ACTIVE` → all three audit events (`RESTORATION_PROJECT_CREATE`/`_JOIN`/`_UPDATE`) recorded correctly. Both UI states confirmed live in the browser: the citizen sees the project list with a "Join" button and no creation form; the org-admin sees the registration form (with real Organization/District dropdowns) and no Join button. Both `apps/api`/`apps/web` builds are clean. Test users, test organization, test project, and dev servers cleaned up afterward.

## Biodiversity + GBIF Module (built 2026-08-19)

Milestone 10 — the third of the four "not built yet" M15 pages to get a real backend (after Observations/M9 and Restoration/M11). Only `/community` now remains an honest empty state, since Community isn't even a planned API module yet.

- **Design deviation, mirroring the weather module's precedent**: built self-contained in `apps/api/src/biodiversity/` (client + service + scheduler + controller), not the generic `apps/api/src/ingestion/` module the original M10 plan pointed at — same reasoning already documented for OpenMeteo.
- `packages/database/prisma/schema.prisma` — new `Species` (`gbifKey` unique, `canonicalName`, `vernacularName?`, taxonomy fields, `iucnStatus?`, `imageUrl?`) and `Occurrence` (`gbifOccurrenceKey` unique, `speciesId?`/`species`, `districtId?`/`district`, `lat`/`lng`, `observedAt?`, `recordedBy?`, `basisOfRecord?`) models. **Dropped from the original spec**: `rawJson` on `Occurrence` — same trim already applied to the weather tables; nothing consumes it and it would bloat storage across thousands of rows. **Added, not in the original field list**: `gbifOccurrenceKey` as a natural unique key — without it, every daily re-sync would create duplicate rows for the same physical GBIF record; mirrors how weather readings dedupe on `(districtId, observedAt)`.
- **Real bug found and fixed during first verification run**: `gbifOccurrenceKey` was originally typed `Int`, but the very first sync attempt hit a real GBIF occurrence key of `5,938,050,912` — outside Postgres `INT4` range (max ~2.1 billion). Changed to `BigInt` (migration `20260819150726_fix_gbif_occurrence_key_bigint`). Not returned in any API response, so no BigInt-JSON-serialization issue to work around.
- **Known approximation, flagged not hidden**: GBIF gives lat/lng, not a `districtId`. There's no PostGIS/polygon boundary data yet (tracked in the existing "PostGIS geography fields" open item), so `districtId` is assigned by nearest-centroid distance to the 64 seeded district centroids — an approximation, not a real point-in-polygon lookup. Occurrences near a district border may get attributed to the wrong neighbor.
- **Scope decision, confirmed with the user before implementing**: skip IUCN conservation-status enrichment for v1. GBIF's occurrence search doesn't include IUCN status (that needs a separate per-species API call); `iucnStatus` stays a nullable, unpopulated column rather than either faking the mock's colored badges or building a second enrichment pipeline this pass.
- `apps/api/src/biodiversity/` — `gbif.client.ts` (native `fetch` + 3-attempt retry against `GET /v1/occurrence/search?country=BD&hasCoordinate=true`, paginated at GBIF's 300-record max page size, mirrors `weather-openmeteo.client.ts`'s exact retry shape); `biodiversity.service.ts` (`syncFromGbif()` upserts `Species` by `gbifKey` and `Occurrence` by `gbifOccurrenceKey`, **capped at ~1000 records per sync** — not "all GBIF records ever for Bangladesh," same bounded-scope reasoning as weather's 64-district loop); `biodiversity.scheduler.ts` (`@Cron(EVERY_DAY_AT_MIDNIGHT)`); `biodiversity.controller.ts` (`@Public() GET /biodiversity/species[/:id]`, `@Public() GET /biodiversity/occurrences`). No manual-trigger endpoint, matching the weather module's precedent — verification ran the service directly via `NestFactory.createApplicationContext`, not a script reimplementing the logic.
- `packages/contracts/src/index.ts` — added `Species`/`Occurrence` response types (with `_count.occurrences` on `Species`), `SpeciesListParams`/`OccurrenceListParams`, and an `occurrences` route (`species`/`speciesDetail` already existed; the pre-existing `highlights` route stays unbuilt — unused elsewhere, out of this milestone's scope).
- `apps/web/app/biodiversity/page.tsx` — replaces the honest-empty-state page with a real species table (name search via a plain GET form, no client JS) and a real occurrence table. Two real metrics (species recorded, occurrence records) replace the mock's four fabricated stats. **Drops** the mock's habitat-pressure bar chart entirely — fabricated, no pressure-index data exists, same treatment `/data` gave its chart. No species-card illustrations either (the mock's cards were hardcoded background images for 3 specific species; arbitrary real GBIF species have no matching artwork).

Verified live against the real GBIF API: first sync run hit the `Int` overflow bug immediately (see above); after the fix, a full sync pulled 1000 real occurrence records across 285 distinct real species with correct taxonomy, real vernacular names, and real image URLs sourced from GBIF, spread across genuine Bangladesh districts (Pabna, Habiganj, Manikganj, Cumilla, Barguna, etc.) via the nearest-centroid approximation. A second sync run confirmed idempotency: species count stayed at 285, occurrence count stayed at exactly 1000, no duplicates. Browser click-through confirmed the page renders correctly and the name-search filter works (e.g. searching "kingfisher" correctly narrowed to 5 real kingfisher species via vernacular-name matching). Both `apps/api`/`apps/web` builds are clean. Unlike every prior verification pass this session, **the synced GBIF data was left in place rather than cleaned up** — it's real biodiversity data, not throwaway test fixtures. Dev servers stopped and `.next` cache cleared.

## Live Platform Metrics (built 2026-08-19)

M13 task 7 — the last remaining item in M13's explicit task list, though **task 2 (replace every static homepage component) is still only partial** even after this: `dataset-preview`, `reports-alerts-section`, and `biodiversity-restoration`/`community-section` still render static seed data. Only the homepage's metrics cards were in scope for this pass.

- `apps/api/src/metrics/` — new module (didn't exist; `routes.metrics.platform` and `PlatformMetrics` in `packages/shared` were speculative, never wired to anything real, same as several other request/response types corrected earlier this session). `@Public() GET /metrics/platform` returns real counts matching exactly what the homepage's four cards display — **not** the old generic `PlatformMetrics` shape (`totalReports`/`contributors`/`districtsMonitored`), which didn't correspond to any of the four actual cards. Real shape: `activeAlerts` (+ `emergencyAlerts` sub-count), `verifiedReports` (status `VERIFIED` only, matching the label literally), `publicDatasets` (`accessPolicy: PUBLIC` only, not counting gated catalog entries), `researchGradeObservations` (+ `districtsWithResearchGradeObservations`, computed via `distinct: ['districtId']`, not a stored counter).
- `packages/shared/src/index.ts` — corrected `PlatformMetrics` to the real shape above.
- `apps/web/components/metrics-section.tsx` — now an async Server Component, same fallback pattern as `map-section.tsx`: fetches `/metrics/platform`, falls back cleanly to the static `METRICS` array if the API is unreachable. Existing card styling (highlighted "Active alerts" card, warning-colored sub-note) preserved, now driven by the real emergency count instead of a hardcoded "4 emergency severity."

Verified live: seeded 2 active alerts (1 `EMERGENCY`), 1 `VERIFIED` report, 2 `RESEARCH_GRADE` observations across 2 districts → confirmed `GET /metrics/platform` returned exactly matching counts → confirmed the homepage rendered those exact numbers (including "Public datasets: 0" — a genuine, honest zero, since none of the seeded catalog datasets actually have `PUBLIC` access policy) → killed the API → homepage fell back cleanly to static values, no crash (same pattern as the original weather-sidebar verification) → restarted the API → live data resumed automatically. Test data cleaned up afterward; dev servers stopped and `.next` cache cleared.

## Homepage Preview Sections Wired (built 2026-08-19)

Closes out M13 task 2 entirely — the last 4 static homepage components (`dataset-preview`, `reports-alerts-section`, `biodiversity-restoration`, `community-section`) are now either wired to real data or an honest empty state. Done across two passes the same day.

**Pass 1 — `dataset-preview.tsx` and `reports-alerts-section.tsx`:**
- `dataset-preview.tsx` — real `GET /datasets` catalog (5 rows), real category (`titleCase`), real access-policy tag reusing the same label/variant mapping as `/data/page.tsx`.
- `reports-alerts-section.tsx` — real `GET /reports`/`GET /alerts` (3 each), meta strings built from real fields (district + status/severity + `relativeTime`), not the mock's fabricated "Evidence reviewed by moderator" copy.

**Real bug caught during my own verification of pass 1** (independent of the RBAC/CUID/BigInt bugs found earlier): the first draft of both `loadReports()`/`loadAlerts()`/`loadDatasets()` treated a genuinely empty-but-successful API response the same as an unreachable API — silently swapping in the fake static content whenever the real list happened to be empty. That's the exact honesty violation this whole session has been guarding against, just introduced by me this time instead of found in pre-existing code. Fixed by splitting the fallback signal from the data: `{ items, isLive }` (or `{ rows, isLive }`) — `isLive: false` (triggering the static fallback) only on a genuine fetch failure; a real empty list stays `isLive: true` with zero items, rendering an honest "No verified reports yet." / "No active alerts right now." / "No datasets published yet." `.empty-state` message instead.

**Pass 2 — `biodiversity-restoration.tsx` and `community-section.tsx`:**
- `biodiversity-restoration.tsx` — real species/occurrence totals (`GET /biodiversity/species`/`/occurrences`, `?pageSize=1` just for the `total`) replace the mock's illustrative "38 indexed districts" copy; real restoration project previews (`GET /restoration/projects?pageSize=2`, preferring `impactSummary` when set) replace the static list. Same `{ items, isLive }` honest-empty-state pattern as pass 1.
- `community-section.tsx` — **confirmed with the user**: replaced the fabricated `COMMUNITY_FEED` feed entirely with an honest "Community content isn't a built module yet" message, matching the `/community` page's own precedent, since there's no backend at all to wire this to (Community isn't a planned API module — `docs/architecture/feature-map.md`). Removed the now-fully-unused `COMMUNITY_FEED` constant and `CommunityItem` interface from `lib/static-data.ts` rather than leaving dead code behind; updated the file's migration-guide comment accordingly.

Verified live across both passes: with an empty DB, all sections correctly showed honest empty states (not fake data) → seeded one real report, one real alert, one real restoration project → each rendered correctly with real fields and correct `relativeTime` formatting → killed the API → every wired section fell back cleanly to static illustrative content (Community stayed on its honest empty state throughout, since it has no fetch dependency at all) → restarted the API → full recovery, confirmed via both `get_page_text` and the dev server's own request log (ruled out a batch of console-reported errors as stale HMR entries from an earlier failed compile, not live errors — confirmed via the actual terminal log showing clean `200` responses). Both builds are clean. Test data (report, alert, restoration project, temporary org-admin user) cleaned up afterward; dev servers stopped and `.next` cache cleared. **Milestone 13 is now fully done.**

## Completed Files

### Project docs

- `docs/project-brief.md`
- `docs/access-model.md`
- `docs/tech-stack.md`
- `docs/roles-and-permissions.md`
- `docs/business-logic.md`
- `docs/flows.md`
- `docs/roadmap.md`
- `docs/progress.md`
- `docs/implementation-plan.md`

### Architecture docs

- `docs/architecture/README.md`
- `docs/architecture/feature-map.md`
- `docs/architecture/modules.md`
- `docs/architecture/data-model.md`
- `docs/architecture/refactor-plan.md`

### API docs

- `docs/api/README.md`
- `docs/api/initial-api.md`
- `docs/api/backend-api-links.md`

### Ingestion and planning

- `docs/ingestion-plan.md` — gap analysis vs Java backends, priority APIs, NestJS ingestion design, what NOT to port

### Frontend mocks

- `mocks/frontend-design/index.html`
- `mocks/frontend-design/data.html`
- `mocks/frontend-design/observations.html`
- `mocks/frontend-design/reports.html`
- `mocks/frontend-design/alerts.html`
- `mocks/frontend-design/biodiversity.html`
- `mocks/frontend-design/restoration.html`
- `mocks/frontend-design/community.html`
- `mocks/frontend-design/profile.html`
- `mocks/frontend-design/admin.html`
- `mocks/frontend-design/theme.html`

### Shared packages

- `packages/shared/src/index.ts` — 24 exported types and interfaces (added `RestorationCategory` 2026-08-19; `PlatformMetrics` corrected to its real shape 2026-08-19, see "Live Platform Metrics"). Enum values corrected to uppercase 2026-08-17 to match Prisma (see "Critical RBAC Fix" above) — this file is the source of the casing that must always match the database.
- `packages/contracts/src/index.ts` — 15 route groups, 36 exported types: response entities (`Dataset`, `CitizenReport`, `Alert`, `Provider`, `Observation`, `RestorationProject`, `Species`, `Occurrence`, `CurrentWeatherReading`, `HourlyAirQualityReading`), request types (incl. refresh/logout), list-param types, envelopes. Note `routes.community` is defined but has no API module behind it, and `apps/api` does not import this package — the no-raw-route-strings rule is frontend-only

### Database

- `packages/database/prisma/schema.prisma` — full domain schema (current state is documented at the top of `docs/architecture/data-model.md`; this historical milestone entry predates the later dataset-access and Flood additions)

### API (`apps/api/src/`)

- `database/prisma.service.ts`, `database/database.module.ts`
- `common/decorators/current-user.decorator.ts`
- `common/decorators/roles.decorator.ts`
- `common/guards/jwt-auth.guard.ts`
- `common/guards/roles.guard.ts`
- `auth/` — register, login, profile, refresh (rotating), logout, JWT strategy, refresh-token utils, daily cleanup cron, DTOs; audit events for register/login/logout with caller IP (2026-08-20, see "Audit Coverage Gap")
- `users/` — list, get, update role, deactivate, DTOs (role-gating fixed 2026-08-17, see "Critical RBAC Fix"); role change + deactivation now audited transactionally (2026-08-20, see "Audit Coverage Gap")
- `organizations/` — public list/detail plus admin-only organization creation and many-to-many membership management via `organizations.manage`
- `locations/` — all 5 endpoints, Bangladesh seed (8 div / 64 districts, with lat/lng)
- `providers/` — list, get, OpenMeteo provider auto-seed
- `datasets/` — list, get, weather/current, air-quality/current (live via `weather` module), catalog seed
- `reports/` — list (public), get, create, status workflow, audit log on both submit and status change (`REPORT_SUBMIT` added 2026-08-20), DTOs (role-gating fixed 2026-08-17; `districtId` validator fixed from `@IsUUID()` to `@IsString()` 2026-08-17, see "Report Submission Form" below)
- `alerts/` — list (public), get, create, update, audit log, DTOs (role-gating fixed 2026-08-17; `description` now selected in list/detail; `districtId` validator fixed from `@IsUUID()` to `@IsString()` 2026-08-17, same bug as reports)
- `observations/` — list (public), get, create, `PATCH :id/trust` (RESEARCHER/ADMIN), audit log, DTOs — built 2026-08-17, see "Observations Module" above
- `restoration/` — list (public), get, create (ORGANIZATION_ADMIN/ADMIN), update (owner/ADMIN), join (idempotent), audit log, DTOs — built 2026-08-19, see "Restoration Projects Module" above
- `biodiversity/` — GBIF client, service (daily sync, capped at 1000 records), scheduler, public `species`/`occurrences` endpoints — built 2026-08-19, see "Biodiversity + GBIF Module" above
- `metrics/` — public `GET /metrics/platform`, real counts — built 2026-08-19, see "Live Platform Metrics" above
- `weather/` — OpenMeteo client, service, scheduler, controller (current/hourly/daily/air-quality)

### Web frontend (`apps/web/`)

- `app/globals.css` — full public-page CSS design system + auth form styles + app-shell/sidebar/profile-hero styles (ported from the mock)
- `app/layout.tsx` — bare root layout: Inter font via next/font/google, no shell markup (moved to the `(public)` group below)
- `app/(public)/layout.tsx` — owns `<PublicNav />` + the `public-shell` wrapper for `/`, `/login`, `/register`
- `app/(public)/page.tsx` — composes all 8 public sections (route group; still resolves to `/`)
- `app/(public)/login/page.tsx`, `app/(public)/register/page.tsx` — Server Action forms, no client JS
- `app/profile/page.tsx` — protected route, outside the `(public)` group so it doesn't get the top nav; sidebar app-shell + real user data + honest empty-state activity feed (see "Profile Page Mockup Fidelity" above)
- `app/data/page.tsx`, `app/reports/page.tsx`, `app/alerts/page.tsx` — real data on the sidebar app-shell (see "App-Shell Pages: Data, Reports, Alerts" above); `/reports` also has a real, working submission form as of 2026-08-17 (see "Report Submission Form" above)
- `app/observations/page.tsx` — real data + a working submission form as of 2026-08-17 (see "Observations Module" above); `app/restoration/page.tsx` — real data + a creation form (org-admins/admins) and a Join action (everyone else) as of 2026-08-19 (see "Restoration Projects Module" above); `app/biodiversity/page.tsx` — real species/occurrence data + name search as of 2026-08-19 (see "Biodiversity + GBIF Module" above); `app/community/page.tsx` — still an honest empty-state page, no API module planned for it yet. **Milestone 15 complete — all 7 app-shell pages built; 6 of 7 now show real data.**
- `lib/report-actions.ts` — `submitReportAction` Server Action, posts to `POST /reports` with the caller's access token
- `lib/observation-actions.ts` — `submitObservationAction` Server Action, posts to `POST /observations` with the caller's access token
- `lib/restoration-actions.ts` — `createRestorationProjectAction`/`joinRestorationProjectAction` Server Actions
- `lib/static-data.ts` — typed seed data with migration guide; every array is now used only as a fallback (never as primary content) across all wired components; `ALERTS`' severity values corrected to uppercase 2026-08-17; `COMMUNITY_FEED`/`CommunityItem` removed 2026-08-19 (no longer referenced anywhere — see "Homepage Preview Sections Wired")
- `lib/api.ts` — server-side fetch helpers: `apiGet` (cached, weather/datasets/reports/alerts), `apiGetAuthed`/`apiPost`/`apiPostAuthed` (never cached, auth + mutations); shared `extractErrorMessage` correctly unwraps NestJS's `string[]` validation error format (fixed 2026-08-17)
- `lib/format.ts` — `titleCase()`/`relativeTime()` display helpers, shared by the new app-shell pages
- `lib/session-constants.ts`, `lib/session.ts`, `lib/current-user.ts` — cookie names, cookie set/clear, `getCurrentUser()`
- `lib/auth-actions.ts` — `loginAction`, `registerAction`, `logoutAction`
- `middleware.ts` — route protection (`/profile`) + proactive access-token refresh at the edge
- `.env.example` / `.env.local` — `API_URL` for the backend
- `components/public-nav.tsx` — async and session-aware (see "Public Auth Flow Wiring" above)
- `components/app-sidebar.tsx` — reusable sidebar shell, now used by all 8 app-shell routes: `/profile`, `/data`, `/reports`, `/alerts`, `/observations`, `/biodiversity`, `/restoration`, `/community`
- `components/hero-section.tsx`
- `components/metrics-section.tsx` — live (see "Live Platform Metrics" above); static-fallback pattern shared with every component below
- `components/map-section.tsx` — "Current conditions" sidebar live (see "Public Weather Wiring" above); map canvas panel remains a deliberate decorative placeholder (documented as "replace with real map library in Phase 4"), not a fabrication
- `components/dataset-preview.tsx` — live real dataset catalog as of 2026-08-19 (see "Homepage Preview Sections Wired" above)
- `components/reports-alerts-section.tsx` — live real reports/alerts previews as of 2026-08-19 (see "Homepage Preview Sections Wired" above); severity-to-CSS-class lookup fixed 2026-08-17 (same casing bug, see "Critical RBAC Fix"); dead `/profile` CTA fixed to `/login`
- `components/biodiversity-restoration.tsx` — live real species/occurrence totals + restoration project previews as of 2026-08-19 (see "Homepage Preview Sections Wired" above)
- `components/community-section.tsx` — honest empty state as of 2026-08-19, matching the `/community` page (see "Homepage Preview Sections Wired" above); no backend exists to wire this to
- `components/public-footer.tsx`

## Next Work

See `docs/implementation-plan.md` for the full milestone list (M5–M14).

1. ~~Review and approve the public-first mock direction.~~ Done.
2. ~~Revise mocks for production-level responsiveness and copy.~~ Done.
3. ~~Implement public web page from approved mock.~~ Done — M1.
4. ~~Define shared enums, DTOs, and route contracts.~~ Done — M2.
5. ~~Implement backend foundation.~~ Done — M3.
6. ~~Start the database and run migration.~~ Done — M4. Postgres on port 5433, Redis on 6379, API live at port 3001.
7. ~~Seed data.~~ Done — auto-seeded on first boot (8 div / 64 dist / 5 datasets).
8. ~~Write ingestion plan — analyse Java backends, identify gaps, plan NestJS design.~~ Done — `docs/ingestion-plan.md`.
9. **M5 partial:** District lat/lng ✓, auth refresh/logout ✓ (2026-08-16, Postgres-backed, not Redis — see "Auth Refresh/Logout" above), and `RestorationProject`/`RestorationParticipant` ✓ (2026-08-19, built as part of M11 — see "Restoration Projects Module" above). Still pending: `ReportMedia`, `ReportComment` models.
10. ~~**M6:** Implement OpenMeteo ingestion — weather + air quality.~~ Done (2026-08-16), with a redesigned scope: self-contained `weather` module for provider client/service/scheduler/controller. `IngestionJob` tracking was added later on 2026-08-24. See `docs/integrations/openmeteo.md`.
11. ~~**M13:** Frontend Data Integration.~~ Done (2026-08-19) — homepage weather sidebar (2026-08-16), full auth flow (2026-08-16), `/profile` rebuilt to match its mockup with a reusable sidebar app-shell (2026-08-17), citizen report submission (2026-08-17), observation submission (2026-08-17), live platform metrics (2026-08-19, task 7), and every remaining static homepage component wired to live data or an honest empty state (2026-08-19, task 2) — see "Public Weather Wiring", "Public Auth Flow Wiring", "Profile Page Mockup Fidelity", "Report Submission Form", "Observations Module", "Live Platform Metrics", and "Homepage Preview Sections Wired" above. **Milestone 13 is fully complete.**
12. ~~**M15:** Build all 7 app-shell pages.~~ Done (2026-08-17) — `/data`, `/reports`, `/alerts` with real backend data, `/observations`, `/biodiversity`, `/restoration`, `/community` with honest empty states — see "App-Shell Pages: Data, Reports, Alerts" and "App-Shell Pages: Observations, Biodiversity, Restoration, Community" above. Also fixed along the way: a critical RBAC casing bug that had every role-gated endpoint rejecting all users — see "Critical RBAC Fix" above — and a second bug where `districtId` validators required a UUID but the schema uses CUIDs — see "Report Submission Form" above.
13. ~~**M9:** Observations module — schema, endpoints, trust-level workflow.~~ Done (2026-08-17) — see "Observations Module" above. `/observations` upgraded from an honest empty state to real data + a working submission form.
14. ~~**M11:** Restoration Projects — schema, endpoints, ownership + join workflow.~~ Done (2026-08-19) — see "Restoration Projects Module" above. `/restoration` upgraded from an honest empty state to real data + a creation form (org-admins/admins) + a Join action (everyone else). Also lands the last of M5's three deferred models.
15. ~~**M10:** Biodiversity + GBIF — schema, GBIF client, daily sync, public endpoints.~~ Done (2026-08-19) — see "Biodiversity + GBIF Module" above. `/biodiversity` upgraded from an honest empty state to real species/occurrence data pulled from the live GBIF API. Found and fixed a real `Int`-overflow bug on the first sync run.
16. ~~**M13 task 7:** Live platform metrics on the homepage.~~ Done (2026-08-19) — see "Live Platform Metrics" above. Corrected the previously-unused `PlatformMetrics` shape to match what the homepage's four metric cards actually need.
17. ~~**M13 task 2:** Wire `dataset-preview`/`reports-alerts-section`/`biodiversity-restoration`/`community-section` to real data.~~ Done (2026-08-19) — see "Homepage Preview Sections Wired" above. Caught and fixed a real honesty bug along the way (empty-but-real API responses were being treated the same as unreachable-API failures). **Milestone 13 is now fully complete — every M13 task is done.**
18. **Next up:** WAQI integration (M14) for station-level AQI, deeper ingestion operations such as manual retry/trigger endpoints, or broader provider work from `docs/integrations/`. `/community` is the only app-shell page left without a real backend, and no milestone plans one yet.

## Open Questions

- ~~District lat/lng centroids: load from open-nature-backend2 CSVs or hardcode divisional capitals first?~~ Resolved — loaded from `open-nature`'s district CSV (all 64 districts, not just divisional capitals).
- WAQI API key: register at aqicn.org for dev/staging?
- Weather data retention policy: how long to keep raw hourly/daily rows? No aggregation tables were built, so this is now more pressing than originally scoped.
- Should a generic `ApiCallLog`/audit trail be added for external ingestion calls, or is per-request logging via the NestJS `Logger` sufficient? Currently skipped by deliberate decision for the weather module.
- "Log out all devices" / view active sessions — `RefreshToken` has `deviceId`, so a per-device session list and bulk-revoke endpoint are straightforward to add later; deliberately out of scope for the initial refresh/logout pass.
- Role-aware nav beyond guest-vs-logged-in (moderator/admin nav, role-specific CTAs) — deliberately out of scope for the frontend auth wiring pass; current nav only distinguishes guest from any authenticated user.
- Eco score, badges, and a user-facing activity feed (all shown in the `profile.html` mock) have no backing data model at all — is this product direction still wanted? If so it needs real scoping (a badge/achievement system, an activity log exposed per-user, a scoring formula), not just a UI pass. Currently omitted from `/profile` rather than faked.
- ~~No milestone currently covers building `/data`, `/observations`, `/reports`, `/alerts`, `/biodiversity`, `/restoration`, `/community` as real `apps/web` routes.~~ Resolved — **Milestone 15** in `implementation-plan.md`, now fully done: `/data`, `/reports`, `/alerts`, `/observations`, `/restoration`, and `/biodiversity` all wired to real backends (2026-08-17 through 2026-08-19); only `/community` still ships an honest empty state, to be revisited once a real content workflow (and its API module) is actually scoped — nothing plans one yet.
- ~~Should GBIF species get IUCN conservation-status enrichment (a second per-species API call) in v1, or stay unpopulated?~~ Resolved (2026-08-19) — stay unpopulated for v1. `iucnStatus` is a nullable column; `/biodiversity` renders species without a fabricated badge rather than guessing.
- ~~M13 task 2's remaining static homepage components are no longer backend-blocked — wiring is now purely a frontend task.~~ Resolved (2026-08-19) — all four wired or given an honest empty state. See "Homepage Preview Sections Wired".
- Watch for a general "treat empty-but-successful as a failure" anti-pattern in any future fallback-on-error component: an empty real list must render an honest empty state, never silently swap in illustrative static content. Caught once already (2026-08-19, `dataset-preview`/`reports-alerts-section`/`biodiversity-restoration` all needed this fix) — worth a lint rule or code-review checklist item if more fallback components get added.
- ~~Who should be allowed to promote an observation's trust level — RESEARCHER/ADMIN only, or also MODERATOR?~~ Resolved (2026-08-17) — RESEARCHER/ADMIN only, matching the original M9 plan exactly. Trust validation is treated as a distinct domain-expertise judgment from a moderator's report-review role.
- ~~Should the original M5 `fundingGoal`/`fundingRaised`/`impactMetrics (Json)` fields be built for `RestorationProject`, or simplified?~~ Resolved (2026-08-19) — simplified to a single `impactSummary` free-text field. No funding-tracking feature is scoped yet, and the mock itself never shows fundraising figures.
- `RestorationProject` creation still checks the global `ORGANIZATION_ADMIN` role rather than organization-scoped membership; the new membership model is currently used for admin-managed organization membership and should be applied to restoration ownership in a future pass.
- No automated test currently guards against the RBAC casing bug recurring (e.g. a future `@Roles(...)` call site or a new shared enum drifting back to lowercase). Worth an integration test that actually logs in per role and hits each role-gated endpoint, rather than relying on TypeScript to catch it by luck the way it did this time.
- Same class of gap for the CUID/UUID bug found 2026-08-17: nothing currently guards against a future optional ID field being decorated `@IsUUID()` instead of `@IsString()`. A quick grep-based check (`@IsUUID()` should not appear anywhere in `apps/api` given this schema never generates real UUIDs) would catch it cheaply without a full integration test.
- Third instance of the same "external identifier doesn't fit the assumed type" bug class (after the enum-casing and CUID/UUID bugs): GBIF occurrence keys overflowed Postgres `INT4`, caught immediately on the first live sync run since real data was used from the start. Worth remembering as a general rule for any future external-ID field: default to `BigInt`/`String` unless the provider's docs explicitly bound the value's range.
- `Occurrence.districtId` is a nearest-centroid approximation (no polygon boundaries exist), so occurrences near a division/district border may be attributed to the wrong neighbor. Same underlying gap as the "PostGIS geography fields" item below — worth revisiting together.
- Should government users publish alerts directly, or must alerts always go through moderator/admin approval?
- PostGIS `geography` fields: replace lat/lng Float when polygon queries needed (deferred to Phase 3).
