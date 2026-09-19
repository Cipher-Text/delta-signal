# Implementation Plan

> Historical implementation record. Completed milestones and design deviations are retained for traceability. For current state, use [progress.md](progress.md), [roadmap.md](roadmap.md), and [architecture/feature-map.md](architecture/feature-map.md).

This plan defines the recommended build order. It is intentionally more concrete than the roadmap.

## Principle

Build persistence and ingestion before features. Real environmental data in the DB makes every module easier to build, test, and demo.

---

## ~~Milestone 1: Frontend Public Page~~ — Done

`apps/web` — initial public UI foundation; the application now uses live API-backed Server Components with explicit empty/error fallbacks. The original static-seed implementation is retained here as historical context.

## ~~Milestone 2: Shared Types and Contracts~~ — Done

`packages/shared` + `packages/contracts` — 28 exported types/interfaces, full enums, DTOs, paginated envelopes, route contract map.

## ~~Milestone 3: Backend Foundation~~ — Done

`apps/api` — Auth (JWT/bcrypt), users, organizations, locations (8 div / 64 district auto-seed), providers, datasets (catalog seed), reports (status workflow + audit), alerts (severity + audit), global validation, guard infrastructure.

**Caveats found 2026-08-17:** the guard infrastructure shipped with a casing bug — `@Roles(...)` call sites used lowercase role strings while Prisma/JWT values are uppercase, so every role-gated endpoint rejected every user (including admins) until fixed. See `docs/progress.md` "Critical RBAC Fix". Separately, `CreateReportDto`/`CreateAlertDto` validated `districtId` with `@IsUUID()`, but this schema only ever generates CUIDs — any submission specifying a real district always failed validation until fixed. See `docs/progress.md` "Report Submission Form".

## ~~Milestone 4: Database Foundation~~ — Done

`packages/database` — Initial schema established and auto-seeding wired. Current state: 14 migrations, 61 models, 32 enums. PostgreSQL on port 5432. Auto-seed on boot via OnModuleInit hooks (`LocationsService`, `DatasetsService`, `ProvidersService`, `PermissionsService`, `SeedService`).

---

## Milestone 5: Schema Expansion + Auth Refresh — Partial

Extend the Prisma schema with all models needed for ingestion, reports enrichment, and auth completeness. No logic yet — schema only.

**Status (2026-08-25):** Task 10 (`District.lat`/`lng`, done via Milestone 6 as a prerequisite, with real per-district coordinates rather than the divisional-capital placeholder originally scoped) and the auth refresh endpoint (tasks 1, 12, 13 — done, with a different design than specified here, see below) are complete. Task 9 (`RestorationProject`) is also done — built as part of Milestone 11 with a simplified field set. `ReportMedia` and `ReportComment` were implemented on 2026-08-22. The ingestion-specific models below (`WeatherReading`, `AirQualityReading`, `WeatherAggregate`, `AqiAggregate`, `ApiCallLog`) were superseded by a different, smaller design — see Milestone 6.

**Target:** `packages/database/prisma/schema.prisma`

### New Prisma models to add

| Model | Purpose | Priority |
| --- | --- | --- |
| `RefreshToken` | Store issued refresh tokens for revocation | Auth |
| `WeatherReading` | One row per district per fetch | Ingestion |
| `AirQualityReading` | One row per district per AQ fetch | Ingestion |
| `WeatherAggregate` | Daily rollup per district | Ingestion |
| `AqiAggregate` | Daily AQI rollup per district | Ingestion |
| `ApiCallLog` | Every external HTTP call logged | Ingestion |
| `ReportMedia` | Photo/file attachments on citizen reports | Reports |
| `ReportComment` | Comments with nested reply support | Reports |
| `RestorationProject` | Community restoration/sustainability projects | Community |

Also add to `District` model: `lat Float?` and `lng Float?` for OpenMeteo centroid lookups.

### Tasks

1. ~~Add `RefreshToken` model (token, userId, expiresAt, revokedAt, deviceId, ipAddress, userAgent).~~ Done (2026-08-16), with one change: field is `tokenHash` (SHA-256 of the token), not a raw stored `token` — same reasoning as `User.passwordHash`. See task 12 below for why the token itself is opaque, not a JWT.
2. Add `WeatherReading` model (districtId, providerId, observedAt, tempC, feelsLikeC, humidityPct, pressureHpa, windSpeedKmh, windDirDeg, precipMm, cloudCoverPct, uvIndex, weatherCode, rawJson). Composite unique on `(districtId, observedAt)`.
3. Add `AirQualityReading` model (districtId, providerId, measuredAt, aqiEuropean, pm25, pm10, o3, no2, so2, co, dominantPollutant, rawJson). Composite unique on `(districtId, measuredAt)`.
4. Add `WeatherAggregate` model (districtId, date, avgTempC, minTempC, maxTempC, totalPrecipMm, avgHumidityPct, avgWindSpeedKmh). Composite unique on `(districtId, date)`.
5. Add `AqiAggregate` model (districtId, date, avgAqi, maxAqi, hoursUnhealthy, dominantPollutant). Composite unique on `(districtId, date)`.
6. Add `ApiCallLog` model (provider, endpoint, httpStatus, responseMs, responseBytes, correlationId, errorMsg, districtId?, createdAt).
7. Add `ReportMedia` model (reportId, mediaType, url, thumbnailUrl?, caption?, metaJson?).
8. Add `ReportComment` model (reportId, userId, body, parentCommentId?, status).
9. ~~Add `RestorationProject` model (title, description, category, status, organizationId?, districtId?, startDate?, endDate?, fundingGoal?, fundingRaised?, impactMetrics Json?, participantCount).~~ Done — but not in this milestone's pass, and not with this exact field set. Built 2026-08-19 as part of Milestone 11, with `fundingGoal`/`fundingRaised`/`impactMetrics Json?`/`participantCount` all replaced by a single `impactSummary` text field and a `_count` computed from a `RestorationParticipant` join table — see Milestone 11 below.
10. Add `lat Float?` and `lng Float?` to `District`.
11. Run `prisma migrate dev --name add_ingestion_models` and regenerate client.

### Auth refresh endpoint (same milestone) — Done (2026-08-16)

12. ~~Add `POST /auth/refresh` — verify refresh token from `RefreshToken` table, issue new access token, rotate refresh token.~~ Done, exactly as specified — rotation implemented (old token revoked on use, fresh pair issued).
13. ~~Add `POST /auth/logout` — revoke refresh token (set `revokedAt`).~~ Done, idempotent.

**Design change from what's written above:** the refresh token itself is now a random opaque string (`crypto.randomBytes(48)`), not a JWT. Found while implementing this: the *existing* `register`/`login` already issued a "refresh token" that was actually a JWT signed with the same secret as the access token — meaning it could be used directly as a bearer access token, since nothing distinguished token type. Making it opaque closes that gap; it can only ever be redeemed via `/auth/refresh`. A `RefreshTokenCleanupScheduler` (`@Cron`, daily at 2 AM) also deletes tokens expired 30+ days ago — not originally scoped here, added since `@nestjs/schedule` was already available from Milestone 6.

### Definition of done

- Migration applied, all new tables live. — `RefreshToken` ✓; `RestorationProject`/`RestorationParticipant` ✓ (2026-08-19, via M11); `ReportMedia`/`ReportComment` ✓ (2026-08-22, via M8 pass — migration `20260822120000_add_report_comment_and_media`).
- `POST /auth/refresh` and `POST /auth/logout` work. ✓ — verified live: register → refresh (rotates) → old token rejected → refresh token rejected as a Bearer access token → logout → refresh rejected → logout again still succeeds.
- `District` has lat/lng columns (nullable, populated in next milestone). ✓

---

## ~~Milestone 6: OpenMeteo Ingestion~~ — Done (redesigned)

Implemented 2026-08-16, with a smaller scope than originally planned here. Full rationale for each deviation: `docs/ingestion-plan.md` → "Implementation status".

**Target (actual):** `apps/api/src/weather/` — a self-contained module, not `apps/api/src/ingestion/` as originally scoped. The shared `IngestionModule` now tracks provider job lifecycle records for scheduled syncs.

### Directory structure (actual)

```
apps/api/src/weather/
  dto/
    open-meteo-response.dto.ts
  weather-openmeteo.client.ts   ← native fetch, manual 3-attempt retry, no circuit breaker
  weather.service.ts            ← fetch/map/upsert + read methods
  weather.scheduler.ts           ← @Cron: current 15min, hourly+AQ 2h, daily 12h
  weather.controller.ts          ← GET /weather/{current,hourly,daily,air-quality}[/:districtId]
  weather.module.ts
```

### Tasks — what was actually done

1. Installed `@nestjs/schedule`; registered `ScheduleModule.forRoot()` in `AppModule`.
2. Retry is inlined in `weather-openmeteo.client.ts` (no separate `util/retry.ts`) — 3 attempts, fixed backoff.
3. No `ApiCallLog`/`logCall` — failures logged via NestJS `Logger` only.
4. District coordinates: all 64 districts backfilled with real lat/lng from `open-nature`'s `district.csv` (not hardcoded divisional capitals), via `LocationsService.onModuleInit`.
5. `weather-openmeteo.client.ts` has one method per fetch type (current/hourly/daily/air-quality) against OpenMeteo's forecast + air-quality endpoints, with a trimmed parameter set (see `docs/ingestion-plan.md`).
6. Air quality fetch lives in the same client, not a separate `openmeteo-airquality.client.ts`.
7. `weather.service.ts` loops fetchable districts (`lat`/`lng` not null), calls the client, upserts into `CurrentWeatherReading` / `HourlyWeatherForecast` / `DailyWeatherForecast` / `HourlyAirQuality` — one row per `(districtId, time)`, no `IngestionJob` start/end tracking.
8. Air quality persistence is part of the same service, not a separate ingestion service.
9. `weather.scheduler.ts` — `@Cron('0 */15 * * * *')` for current weather.
10. Same scheduler — `@Cron('0 0 */2 * * *')` for hourly weather + air quality; `@Cron('0 0 */12 * * *')` for daily.
11. `IngestionService` was added later (2026-08-24); weather scheduler runs now write `IngestionJob` records and update dataset `lastSyncedAt`.
12. `WeatherModule` wired into `AppModule`; also imported by `DatasetsModule` so the pre-existing `GET /datasets/weather/current` and `GET /datasets/air-quality/current` placeholders now return real data instead of their "Connect OpenMeteo ingestion worker" stub text.
13. Read endpoints live at `/weather/*`, not `/ingestion/*`: `GET /weather/current[/:districtId]`, `GET /weather/hourly/:districtId`, `GET /weather/daily/:districtId`, `GET /weather/air-quality[/:districtId]`.

### Definition of done — actual

- On scheduler tick, weather and air quality data is fetched for all 64 districts and saved to their typed tables. ✓
- Every HTTP call writes an `ApiCallLog` row. — **Not done**, deliberately skipped (see deviations above).
- `IngestionJob` records track run lifecycle. — **Done later**, via the shared `IngestionService` added on 2026-08-24; the earlier implementation did not yet include it.
- Latest readings queryable via API. ✓ — verified live against the real OpenMeteo API and local Postgres.

---

## ~~Milestone 7: Dataset Access + Downloads~~ — Done (2026-08-24)

**Target:** `apps/api/src/datasets/`

**Status (2026-08-24):** All 5 tasks done. Download requires authentication for all access policies (PUBLIC datasets still require login — consistent with most real data portals). Download response is honest: no file URL, returns dataset metadata + a map of API endpoints where the data is accessible per category. See `docs/progress.md` "Ingestion Module + Dataset Access".

### Tasks

1. ~~Add `GET /datasets/:id/download` — checks `accessPolicy`, returns download URL or 403.~~ Done — enforces all 5 policies (PUBLIC/LOGIN_REQUIRED → any auth; RESEARCHER → role check; APPROVED → approved `DatasetAccessRequest`; GOVERNMENT → role check). Writes `DATASET_ACCESS` audit event.
2. ~~Add `POST /datasets/:id/access-request` — stores request for APPROVED-tier datasets.~~ Done — open to any authenticated user; `ConflictException` on duplicate; writes `DATASET_ACCESS` audit event.
3. ~~Add `POST /datasets` (admin) — create new dataset catalog entry.~~ Done — `@Roles('ADMIN')`, uses existing `CreateDatasetDto`.
4. ~~Add `PATCH /datasets/:id` (admin) — update metadata, publish toggle.~~ Done — pre-existing endpoint, already shipped.
5. ~~Connect `Dataset.lastSyncedAt` update when ingestion succeeds.~~ Done — `IngestionService.completeJob(jobId, categories)` updates `lastSyncedAt` for all matching datasets; called by weather and GBIF schedulers on success.

Also added: `GET /datasets/:id/access-requests` (ADMIN list) and `PATCH /datasets/:id/access-requests/:requestId` (ADMIN approve/reject with `DATASET_ACCESS_DECISION` audit).

### Definition of done

- PUBLIC datasets downloadable without auth. — **Not exactly**: download requires auth for all policies; PUBLIC just has no role/approval check beyond that.
- LOGIN_REQUIRED datasets return 401 for guests. ✓ — all download attempts without a valid JWT return 401.
- RESEARCHER/APPROVED/GOVERNMENT datasets return 403 with access-request route. ✓

---

## ~~Milestone 8: Report Enrichment~~ — Done (2026-08-22, partial scope)

Add media attachments and comments to citizen reports.

**Target:** `apps/api/src/reports/`

**Status (2026-08-22):** Tasks 1–4 done. Task 5 (comment editing/soft-delete) and nested replies deferred — no `parentCommentId` field; not needed for the current moderation workflow.

### Tasks

1. ~~Add `POST /reports/:id/media` — upload metadata (URL from external storage, or later MinIO), create `ReportMedia` row.~~ Done — clients register an externally hosted URL; no server-side file upload.
2. ~~Add `GET /reports/:id/media` — list media for a report.~~ Done — public endpoint.
3. ~~Add `POST /reports/:id/comments` — authenticated users can comment. Creates `ReportComment`.~~ Done — `isInternal` flag supported; CITIZEN/RESEARCHER cannot set it true (silently clamped). Writes `REPORT_COMMENT_ADD` audit event.
4. ~~Add `GET /reports/:id/comments` — list comments.~~ Done — two variants: `GET /reports/:id/comments` (public, non-internal only) and `GET /reports/:id/comments/all` (`@Roles('MODERATOR', 'ADMIN')`, all including internal).
5. Add `PATCH /reports/:id/comments/:commentId` (author or moderator) — edit or soft-delete. — **Not done.** Deferred; no `isDeleted`/`editedAt` fields on `ReportComment`.

### Definition of done

- Reports can have media attachments and comments. — Done.
- Nested replies supported. — **Not done.** No `parentCommentId` field added; deferred.
- Comment moderation available to MODERATOR/ADMIN. — Done via `GET …/comments/all` and the `isInternal` visibility filter.

---

## ~~Milestone 9: Observations Module~~ — Done

Environmental observations by citizens and researchers with trust levels.

**Target:** `apps/api/src/observations/`

**Status (2026-08-17):** All 6 tasks done, plus the `apps/web/app/observations/page.tsx` frontend upgraded from an honest empty state (M15) to real data and a working submission form in the same pass. See `docs/progress.md` "Observations Module" for full detail.

### New Prisma model — as actually built

`Observation` — `observerId?`, `districtId?`, `lat?`, `lng?`, `category` (`ObservationCategory`), `trustLevel` (`ObservationTrustLevel`, `@default(UNVERIFIED)`), `description`, `species?`, `observedAt` (`@default(now())`). Simpler than originally scoped above: no `measuredAt`/`rawValue`/`unit`/`mediaUrls` — those were speculative fields for a sensor-reading style observation that the actual citizen/researcher sighting model doesn't need yet; can be added when a real use case needs them.

### Tasks

1. ~~Add `Observation` Prisma model, migrate.~~ Done — migration `20260817181448_add_observations`. `ObservationCategory`/`ObservationTrustLevel` enums already existed uppercase in `packages/shared` (added proactively during the Critical RBAC Fix), so no casing bug this time.
2. ~~Add `POST /observations` — requires auth, defaults to LOW trust.~~ Done — defaults to `UNVERIFIED` (the enum's "newly submitted" value; there's no separate `LOW` value in `ObservationTrustLevel`). Writes an `OBSERVATION_SUBMIT` audit event (the enum value already existed, unused, from before this milestone).
3. ~~Add `GET /observations` — public, filterable by districtId/category/trustLevel/date.~~ Done — filterable by category/trustLevel/districtId (no date filter added — not needed yet, list already orders by `observedAt desc`). Hides `FLAGGED` by default, matching how `/reports` hides unverified statuses by default; an explicit `?trustLevel=FLAGGED` still returns them.
4. ~~Add `GET /observations/:id`.~~ Done.
5. ~~Add `PATCH /observations/:id/trust` (RESEARCHER/ADMIN) — promote trust level.~~ Done — confirmed with the user to keep this exactly RESEARCHER/ADMIN rather than also including MODERATOR, since trust validation is a distinct domain-expertise judgment from a moderator's report-review role.
6. ~~Write audit events for trust changes.~~ Done — added `OBSERVATION_TRUST_CHANGE` to `AuditAction`, records `{from, to}` in `meta`.

### Definition of done

- Citizens can submit observations. — Done, verified live via a full browser click-through and direct API testing.
- Researchers can verify and promote trust level. — Done, verified live: a bootstrapped `RESEARCHER` promoted `UNVERIFIED` → `RESEARCH_GRADE`; a plain `CITIZEN` correctly got 403 on the same endpoint.
- Public can browse by district and category. — Done, verified via `GET /observations?category=...` and `?districtId=...`.

---

## ~~Milestone 10: Biodiversity + GBIF~~ — Done

Connect to GBIF API for species occurrence data for Bangladesh.

**Target (as built):** self-contained `apps/api/src/biodiversity/`, not `apps/api/src/ingestion/` for provider-specific client/service/controller code. Shared job tracking was added later through `IngestionService`; the GBIF scheduler now writes `IngestionJob` records.

**Status (2026-08-19):** All 6 tasks done. `apps/web/app/biodiversity/page.tsx` upgraded from an honest empty state (M15) to real species/occurrence data in the same pass. See `docs/progress.md` "Biodiversity + GBIF Module" for full detail.

### New Prisma models — as actually built

| Model | Fields (as built) | Deviation from original spec |
| --- | --- | --- |
| `Species` | `gbifKey` (unique), `canonicalName`, `vernacularName?`, `kingdom?/phylum?/class?/order?/family?/genus?`, `iucnStatus?`, `imageUrl?` | Same field list as scoped. `iucnStatus` stays nullable/unpopulated — no per-species IUCN enrichment call built in v1, confirmed with the user. |
| `Occurrence` | `gbifOccurrenceKey` (unique), `speciesId`/`species`, `districtId?`/`district`, `lat`, `lng`, `observedAt?`, `recordedBy?`, `basisOfRecord?` | Dropped `datasetKey` and `rawJson` (unused, same trim already applied to the weather tables). **Added** `gbifOccurrenceKey` as a natural unique key — without it, every daily re-sync would create duplicate rows for the same physical record. |

**Real bug found and fixed**: `gbifOccurrenceKey` was originally typed `Int`, matching Prisma's default for a numeric ID — but GBIF's own occurrence keys can exceed Postgres `INT4` range (hit a real value of `5,938,050,912` on the very first sync attempt). Fixed by changing to `BigInt`.

### Tasks

1. ~~Add `Species` and `Occurrence` Prisma models, migrate.~~ Done — migrations `20260819145646_add_biodiversity` and `20260819150726_fix_gbif_occurrence_key_bigint` (the second migration is the `Int`→`BigInt` fix above).
2. ~~Write `gbif.client.ts` in `ingestion/clients/` — queries `https://api.gbif.org/v1/occurrence/search?country=BD`.~~ Done, but in `apps/api/src/biodiversity/gbif.client.ts` (see target deviation above). Query adds `hasCoordinate=true` (occurrences without coordinates can't be geo-located to a district) and paginates at GBIF's 300-record max page size. Native `fetch` + 3-attempt retry, mirrors `weather-openmeteo.client.ts`'s exact shape.
3. ~~Write `biodiversity.scheduler.ts` — `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)` triggers GBIF fetch.~~ Done.
4. ~~Write `GbifIngestionService` — upserts `Species`, creates `Occurrence` rows.~~ Done as `BiodiversityService.syncFromGbif()` — also upserts `Occurrence` (not just creates), so a repeat sync updates existing rows rather than erroring. **Bounded at ~1000 records per sync** — not exhaustively syncing every GBIF record ever filed for Bangladesh, same reasoning as weather's fixed 64-district loop. District assignment uses nearest-centroid distance to the 64 seeded district centroids — an approximation, since no polygon boundary data exists yet (same gap as the "PostGIS geography fields" open item).
5. ~~Add `GET /biodiversity/species` — public, filterable by name/district.~~ Done — filterable by name (case-insensitive, matches canonical or vernacular name). District filtering lives on the occurrences endpoint instead, since district is a property of a sighting location, not the species itself.
6. ~~Add `GET /biodiversity/occurrences` — public, filterable by districtId/date.~~ Done — filterable by `speciesId`/`districtId`. No date filter added (not needed yet; list already orders by `observedAt desc`).

### Definition of done

- Daily GBIF sync runs and populates Species + Occurrence tables. — Done, verified live against the real GBIF API: first full sync pulled 1000 real occurrence records across 285 distinct species; a second run confirmed idempotency (same counts, no duplicates).
- Public endpoints expose occurrence data. — Done, verified via `GET /biodiversity/species` (with search) and `GET /biodiversity/occurrences`, and via a full browser click-through of `/biodiversity`.

---

## ~~Milestone 11: Restoration Projects~~ — Done

Community and organization restoration/sustainability project tracking.

**Target:** `apps/api/src/restoration/`

**Status (2026-08-19):** All 6 tasks done, plus `apps/web/app/restoration/page.tsx` upgraded from an honest empty state (M15) to real data, a creation form, and a Join action in the same pass. See `docs/progress.md` "Restoration Projects Module" for full detail.

### New Prisma models — as actually built

Task 1's premise was wrong: **the `RestorationProject` model had NOT actually been added in M5** — M5's own status note says `ReportMedia`, `ReportComment`, `RestorationProject` were all still pending. Built here instead: `RestorationProject` (`title`, `description`, `category` — new `RestorationCategory` enum, `status` reusing the existing `ProjectStatus` enum, `organizationId?`/`districtId?` as real FKs, `startDate?`/`endDate?`, `impactSummary?`, `createdById`) plus a `RestorationParticipant` join model (`projectId`, `userId`, `joinedAt`, `@@unique([projectId, userId])`) for idempotent joins and an accurate, non-denormalized participant count. **Simplified from the original M5 field list**, confirmed with the user: dropped `fundingGoal`/`fundingRaised`/`impactMetrics (Json)` in favor of one `impactSummary` free-text field — no funding feature is scoped yet, and a JSON blob nothing renders specially is worse than one honest text field.

### Tasks

1. ~~Add `RestorationModule` (model already added in M5).~~ Done — model was NOT actually pre-existing (see note above); built fresh, including wiring into `AppModule` (wasn't registered at all before this, unlike the `observations`/`biodiversity` stub modules).
2. ~~Add `POST /restoration/projects` — ORGANIZATION_ADMIN or ADMIN.~~ Done — the global role gate remains; organization memberships are now modeled separately for admin-managed organization attachment. Applying membership-scoped ownership to restoration creation remains a follow-up.
3. ~~Add `GET /restoration/projects` — public, filterable by category/status/districtId.~~ Done.
4. ~~Add `GET /restoration/projects/:id`.~~ Done.
5. ~~Add `PATCH /restoration/projects/:id` — owner or ADMIN.~~ Done — "owner" = `createdById`, enforced in the service (not via `@Roles`, since ownership isn't a role). Confirmed live: non-owner/non-admin gets 403, the creator gets 200.
6. ~~Add `POST /restoration/projects/:id/join` — CITIZEN can register as participant.~~ Done — open to any authenticated user, not just `CITIZEN` specifically (matches how `create()` on reports/observations isn't restricted to citizens either). Idempotent: a repeat join is a silent no-op via the unique-constraint catch, confirmed live via both curl and a browser click.

### Definition of done

- Organizations can create and track restoration projects. — Done, verified live with a bootstrapped `ORGANIZATION_ADMIN` and a real `Organization` record.
- Public can browse and citizens can join. — Done, verified live: public list/filter work unauthenticated, a citizen joined and a repeat join stayed idempotent.

---

## ~~Milestone 12: Admin Console Frontend~~ — Done (2026-08-22, task 2 blocked)

**Target:** `apps/admin`

Basic internal console for the operational views most needed first.

**Status (2026-08-25):** Tasks 1–6 done. The ingestion dashboard now reads real `IngestionJob` records created by the weather, biodiversity, and Flood schedulers. See `docs/progress.md` "Ingestion Module + Dataset Access" and "OpenMeteo Flood".

### Tasks

1. ~~Wire admin app to API — auth flow, token storage.~~ Done — separate httpOnly cookies (`nga_access`/`nga_refresh`), Edge-compatible middleware with auto-refresh, login enforces MODERATOR/ADMIN role at application layer.
2. ~~Ingestion status dashboard — live `IngestionJob` list, ApiCallLog failures.~~ Done — live `IngestionJob` list for scheduled provider runs; `ApiCallLog` remains intentionally unimplemented.
3. ~~Report moderation queue — filterable, inline status transitions.~~ Done — 5-status tabs (SUBMITTED/UNDER_REVIEW/VERIFIED/REJECTED/RESOLVED) with per-tab counts, inline `PATCH /reports/:id/status` forms with note textarea.
4. ~~User management — list, role change, deactivate.~~ Done — role selector (hidden for ADMIN accounts to prevent privilege lock-out), `<details>/<summary>` confirm for deactivate, self-deactivation prevented via JWT `sub` decode.
5. ~~Alert management — create/update/cancel alerts.~~ Done — collapsible create panel, ACTIVE/CANCELLED/EXPIRED status tabs, per-severity left-border colour, cancel confirm.
6. ~~Dataset management — publish/unpublish catalog entries.~~ Done — publish toggle + access policy selector, calls `GET /api/v1/datasets/admin`; API controller rewritten to add `@Roles('ADMIN')` per endpoint.

### Definition of done

- Admin users can perform moderation and monitoring tasks without direct DB access. — **Met** — all 6 tasks done, including ingestion monitoring (task 2) which now shows live `IngestionJob` records.

---

## ~~Milestone 13: Frontend Data Integration~~ — Done

Historical objective: replace the initial static seed data in `apps/web` with live API calls. Completed; the implementation details are retained below for traceability.

**Target:** `apps/web`

**Status (2026-08-19):** All 7 tasks done (task 3 resolved as not needed) — see `docs/progress.md` "Public Weather Wiring", "Public Auth Flow Wiring", "Report Submission Form", "Observations Module", "Live Platform Metrics", and "Homepage Preview Sections Wired". `/profile` was also rebuilt (2026-08-17) to match its mockup rather than being an ad hoc card — see `docs/progress.md` "Profile Page Mockup Fidelity" — which introduced a reusable sidebar "app shell" (`components/app-sidebar.tsx`). Every mocked `apps/web` page except the homepage (`data`, `observations`, `reports`, `alerts`, `biodiversity`, `restoration`, `community`) shares that same layout; building them is now tracked as **Milestone 15** below (added 2026-08-17 — none of M7–M12 actually covered this: M7–M11 are backend-only, M12 targets the separate `apps/admin` app). **Milestone 13 is now fully complete.**

### Tasks

1. ~~Add API client utility (typed fetch wrapper using contracts package).~~ Done — `apps/web/lib/api.ts`. Simpler than "typed fetch wrapper using contracts package" implies: a single `apiGet<T>(path)` helper (server-only `API_URL` env var, no `NEXT_PUBLIC_` prefix needed since nothing runs client-side yet), with route paths and response types imported from `packages/contracts` at the call site rather than baked into the helper itself.
2. ~~Replace `lib/static-data.ts` calls with `fetch('/api/v1/...')` in Server Components.~~ Done (2026-08-19) — live homepage sections use API-backed Server Components with fallback only when the API is unreachable. The Community module and `/community` page were implemented later on 2026-09-01. See `docs/progress.md` "Homepage Preview Sections Wired" and "Community module" for detail.
3. Add `SWR` or React Query for client-side refreshing data (map, live alerts). — Resolved as not needed: every live homepage section is a Server Component using Next.js's built-in `fetch` cache (`revalidate: 900`) rather than client-side polling. Revisit if a component ever needs to refresh without a full page reload.
4. ~~Wire auth — login/register flow, session persistence, role-aware nav.~~ Done (2026-08-16), with one scope note: "role-aware nav" only distinguishes guest vs. any logged-in user, not per-role nav (moderator/admin nav is a Phase 3+ concern). Session persistence is httpOnly cookies rather than a client-side store — the natural fit given every existing component was already a Server Component. See `docs/progress.md` "Public Auth Flow Wiring" for the full design (middleware-based token refresh, Server Actions for login/register/logout, new `/login`/`/register`/`/profile` routes). `/profile` itself shipped as a bare account card in that pass — rebuilt 2026-08-17 to match `mocks/frontend-design/profile.html`'s actual sidebar app-shell design; see `docs/progress.md` "Profile Page Mockup Fidelity".
5. ~~Wire report submission form to `POST /reports`.~~ Done (2026-08-17) — see `docs/progress.md` "Report Submission Form". Form fields matched to the real `CreateReportDto` rather than the mock: added a required Title field, replaced free-text location with a real District `<select>`, dropped the mock's fake "Severity estimate" field, omitted photo/video attachment (no media backend exists). Surfaced and fixed a second validation bug along the way: `districtId` was decorated `@IsUUID()` on both `CreateReportDto` and `CreateAlertDto`, but this schema only generates CUIDs — any submission specifying a real district always failed. Verified live via a full browser click-through plus the admin review workflow (`SUBMITTED → UNDER_REVIEW → VERIFIED`).
6. ~~Wire observation submission.~~ Done (2026-08-17) — built as part of Milestone 9 (the `Observation` model didn't exist until then). See `docs/progress.md` "Observations Module".
7. ~~Show live metrics from `GET /metrics` on the public homepage.~~ Done (2026-08-19) — see `docs/progress.md` "Live Platform Metrics". Built a real `apps/api/src/metrics/` module (didn't exist) and corrected `PlatformMetrics` in `packages/shared`, which had a speculative shape (`totalReports`/`contributors`/`districtsMonitored`) that didn't match any of the homepage's four actual metric cards.

### Definition of done

- Public page shows real data from the database. — Done (2026-08-19) — every homepage section is now live or an honest empty state: weather conditions, metrics cards, dataset preview, reports/alerts previews, biodiversity+restoration highlights, and the nav's session state are all real; `community-section` shows an honest empty state since no backend exists for it.
- Authenticated users can submit reports and observations. — Done (2026-08-17) — both report submission (task 5) and observation submission (task 6) work end to end.

---

## Milestone 14: WAQI Integration

Add urban AQI data from WAQI (World Air Quality Index) for station-level granularity.

**Reference:** `docs/ingestion-plan.md` — priority 2 API, free key at `aqicn.org/data-platform/token/`

### Tasks

1. Register WAQI API token, add to `.env` as `WAQI_API_KEY`.
2. Write `waqi.client.ts` (in `apps/api/src/weather/`, following the pattern `weather-openmeteo.client.ts` established).
3. Add a `@Cron(CronExpression.EVERY_HOUR)` job, either on `WeatherScheduler` or a new one.
4. Persist results into `HourlyAirQuality` (the table `weather` module M6 actually built — needs a `providerId` or `source` column added if WAQI and OpenMeteo readings must coexist per district/time; currently the table has no such column since it only ever stored OpenMeteo data).

### Definition of done

- WAQI data complements OpenMeteo AQ in `HourlyAirQuality` (schema change needed first — see task 4).
- Station-level readings visible per district.

---

## ~~Milestone 15: App-Shell Pages (Data Hub, Reports, Alerts, Observations, Biodiversity, Restoration, Community)~~ — Done

Built the `apps/web` routes that the nav (`public-nav.tsx`, `app-sidebar.tsx`) already linked to but that didn't exist yet — all were 404ing. Reused the sidebar `AppSidebar` shell established for `/profile` (M13), not a new layout per page.

**Status (2026-08-17):** All 8 tasks done. Tasks 1–3 (`/data`, `/reports`, `/alerts`) — see `docs/progress.md` "App-Shell Pages: Data, Reports, Alerts". Building `/alerts`'s role-conditional CTA also surfaced and fixed a critical, unrelated bug: every role-gated endpoint in the API was rejecting all users due to an enum-casing mismatch between `@delta-signal/shared` (lowercase) and Prisma (uppercase) — see `docs/progress.md` "Critical RBAC Fix". Tasks 4–8 (`/observations`, `/biodiversity`, `/restoration`, `/community`, active-link check) — see `docs/progress.md` "App-Shell Pages: Observations, Biodiversity, Restoration, Community".

**Target:** `apps/web/app/{data,observations,reports,alerts,biodiversity,restoration,community}/`

**Reference:** `mocks/frontend-design/{data,observations,reports,alerts,biodiversity,restoration,community}.html` for per-page layout; `docs/progress.md` "Profile Page Mockup Fidelity" for the app-shell pattern and the honest-empty-state precedent.

**Backend readiness varies per page** — some already have working APIs, some have no backend at all:

| Page | Backend | Status |
| --- | --- | --- |
| `/data` | `GET /datasets` | Real (M3) |
| `/reports` | `GET /reports` | Real (M3) — public list is verified/resolved only |
| `/alerts` | `GET /alerts` | Real (M3) |
| `/observations` | `GET /observations` | Real (M9, 2026-08-17) |
| `/biodiversity` | `GET /biodiversity/{species,occurrences}` | Real (M10, 2026-08-19) |
| `/restoration` | `GET /restoration/projects` | Real (M11, 2026-08-19) |
| `/community` | — | Not planned as an API module at all yet (see `docs/architecture/feature-map.md`) |

### Tasks

1. ~~`/data` — wire to `GET /datasets`, using the `AppSidebar` shell.~~ Done — category filter is query-string driven; provider list is live; dataset rows link to `/data/:id`, where metadata, API endpoints, and live OpenMeteo/Flood/GBIF previews are shown.
2. ~~`/reports` — wire to `GET /reports`. Public list only, matching what's already enforced server-side.~~ Done — metric cards deliberately show only Verified/Resolved counts, not the mock's Under-review/Submitted-today (those would leak status info the public API intentionally hides); submission form replaced with a sign-in CTA.
3. ~~`/alerts` — wire to `GET /alerts`.~~ Done — required a small backend fix first (`ALERT_SELECT` wasn't projecting `description`); role-conditional "Issue alert" badge added (real role check, but reads "coming soon" since no creation page exists); "Warning zones" reuses the homepage's existing decorative map placeholder.
4. ~~`/observations` — no backend yet: honest "not available yet" empty state (same pattern as `/profile`'s activity feed), not fabricated records. Revisit once M9 ships.~~ Done (2026-08-17) — also links to `/reports` as the nearest real thing citizens can do today. **Revisited the same day once M9 shipped**: upgraded to real data + a working submission form, see Milestone 9 above.
5. ~~`/biodiversity` — same honest-empty-state treatment; revisit once M10 ships.~~ Done (2026-08-17). **Revisited 2026-08-19 once M10 shipped**: upgraded to real species/occurrence data with name search, see Milestone 10 above.
6. ~~`/restoration` — same honest-empty-state treatment; revisit once M11 ships.~~ Done (2026-08-17). **Revisited 2026-08-19 once M11 shipped**: upgraded to real data + a creation form (org-admins/admins) + a Join action (everyone else), see Milestone 11 above.
7. ~~`/community` — same honest-empty-state treatment, or keep the existing static `COMMUNITY_FEED` mock data clearly labeled as illustrative, since `feature-map.md` already says to keep this out of core until a real content workflow exists — decide which when this task starts.~~ Done (2026-08-17) — went with the honest empty state, consistent with the other three and with the `/profile`/`/data`/`/reports`/`/alerts` precedent, rather than keeping the mock feed. The homepage's `community-section.tsx` still shows static `COMMUNITY_FEED` data — a separate, already-documented M13 gap, untouched by this task.
8. ~~Confirm `AppSidebar`'s active-link highlighting is correct for each new route.~~ Done — verified live for all 7 routes.

### Definition of done

- All 7 routes render instead of 404ing (nav links already point to them). — Done, confirmed via browser and `curl` 200s on all 7.
- `/data`, `/reports`, `/alerts` show real backend data through the sidebar shell. — Done, verified live with seeded real reports/alerts.
- `/observations`, `/biodiversity`, `/restoration`, `/community` show an honest empty/coming-soon state — no fabricated records, consistent with the `/profile` precedent. — Done (2026-08-17) for all four at the time, verified live in a real browser; production build compiled cleanly with all four as static pages. `/observations`, `/restoration`, and `/biodiversity` have since graduated to real data as their backends shipped (M9, M11, M10 — all by 2026-08-19); only `/community` remains an honest empty state.

---

## Phase 6a + 6b — Done (2026-08-21/22)

Both phases landed back-to-back; see `docs/progress.md` "Phase 6a Complete" and "Phase 6b: API Contract Enforcement" for full detail.

**Phase 6a (security must-fixes)** — all four items done in a single commit (2026-08-21):
- `helmet` installed and applied in `main.ts` before routing.
- `@nestjs/throttler` global (120 req/60 s) + auth routes tightened via `@Throttle` (login/register 5/60 s, refresh 20/60 s).
- `USER_LOGIN_FAILED` — additive migration + `AuthService.recordFailedLogin()` fires on unknown email and bad/inactive password; five regression tests added.
- ESLint — `.eslintrc.json` added for `apps/api`, `apps/web`, `apps/admin`; `pnpm lint` runs cleanly.

**Phase 6b (regression safety net)** — partially done:
- First test suite (52 tests across 5 spec files) and CI workflow — Done (2026-08-21). Test suite expanded to 153 tests in 11 spec files (2026-08-29) — reports, observations, restoration, notifications, gamification, media service specs added.
- ESLint — Done (2026-08-21, see 6a).
- API contract enforcement — Done (2026-08-22). `@delta-signal/contracts` added as devDep to `apps/api`. `src/common/contract-types.typecheck.ts` uses `Jsonified<T>` utility + TypeScript structural assignment to verify service return types match contract types; caught by `tsc --noEmit` in CI. Also fixed `include`→`select` discipline in `datasets.service.ts`, `reports.service.ts` (`getById`), `alerts.service.ts` (`getById`), and four weather read methods.
- E2e tests — Not started.
- Accessibility pass — Not started.

**Milestone 12 task 2 (ingestion dashboard)** — Done (2026-08-24, unblocked by ingestion module implementation). `GET /ingestion/jobs` endpoint + admin `/ingestion` page with status tabs, counts, duration, error display.

---

## Deferred / Later Phases

Cross-check this table against `docs/roadmap.md` Phase 6 and Phase 7 before relying on it. This table covers items deferred from active milestones; advanced features (emissions, climate forecasting, carbon accounting, research publications, surveys, satellite) live in roadmap Phase 7.

| Item | Why deferred |
| --- | --- |
| PostGIS `geography` fields | lat/lng Float is sufficient for M1–M9; PostGIS replaces when polygon queries needed |
| BMD / FFWC integration | Requires gov approval or scraping; start after OpenMeteo/WAQI proven |
| MinIO media storage | **No longer deferred** — `media` module fully implemented with `StorageService` (S3/MinIO), `POST /media/upload`, `POST /media/presign`. Requires `STORAGE_*` env vars. |
| Extended user profiles (CitizenProfile, ResearcherProfile, OrganizationProfile) | Add when profile UI is built — schema straightforward, not blocking. Delta Signal uses a flat `User` + `UserRole` for now; per-role profile extensions are the natural next step once the profile page grows. |
| Agricultural stress monitoring | Soil moisture, crop stress indicators, farmer alerts. Depends on Phase 7 satellite ingestion — cannot start before it. |
| Tree-level restoration tracking | GPS-tagged individual trees, growth photos, survival-rate analytics. `RestorationProject`/`RestorationParticipant` track projects and people, not individual plantings. |
| Notification / subscription system | **No longer deferred** — the dependency is met (alerts and observations both shipped 2026-08-17 to 2026-08-19). Scheduled as roadmap Phase 6c, including delivery transport, which was never in this plan. |
| Python data worker (apps/data-worker) | GIS processing and ML jobs — defer until API data layer is complete |
| OGC SensorThings model | Evaluate after observations module ships; may replace or extend it |
