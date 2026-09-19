# Ingestion Plan

> Historical planning and source-analysis document. Provider-specific current behavior belongs in `docs/integrations/`; current implementation status belongs in `docs/progress.md` and `docs/architecture/modules.md`.

Source analysis: `open-nature/apps/backend` (partial implementation, Spring Boot) and `open-nature-backend2` (entity model only). This document captures what was learned and translates it into a concrete NestJS/Prisma plan for delta-signal. No Java code will be ported — logic and patterns will be re-implemented in TypeScript.

---

## Implementation status (updated 2026-08-27)

OpenMeteo weather, air quality, Flood ingestion, and GBIF biodiversity ingestion are all **done**. `IngestionModule` is also implemented (not a stub) — `IngestionService` tracks job lifecycle (`RUNNING → SUCCEEDED/FAILED`) and is called by weather, GBIF, and flood schedulers. See `docs/architecture/modules.md` "ingestion" and `docs/integrations/` for provider details.

The original plan in this document was redesigned during implementation. Key deviations:

| Planned (this doc) | Actually built | Why |
| --- | --- | --- |
| Module at `apps/api/src/ingestion/` with `clients/`, `schedulers/`, `services/` subfolders | Self-contained `apps/api/src/weather/` module (client, service, scheduler, controller — 4 files, no subfolders) | Only one provider (OpenMeteo) was in scope; the split wasn't earning its keep yet. `ingestion/` handles generic job bookkeeping. |
| `WeatherReading` / `AirQualityReading` (one wide table each, `rawJson` column) | `CurrentWeatherReading`, `HourlyWeatherForecast`, `DailyWeatherForecast`, `HourlyAirQuality` (4 tables, trimmed fields, no raw JSON) | Current/hourly/daily have different fetch cadences and shapes; splitting them avoids one table with mostly-null columns depending on reading type. |
| `WeatherAggregate` / `AqiAggregate` daily rollups | Not built | No consumer needed rollups yet; raw hourly/daily rows are queried directly. Revisit if retention or dashboard needs arise. |
| `ApiCallLog` — every external HTTP call logged | Not built | Deliberately skipped — failures are logged via NestJS `Logger` only. |
| Proximity/radius-based location matching | Direct `districtId` foreign key on every weather row | Every fetch already targets a known district, so matching by FK is simpler and exact. |
| District lat/lng: "hardcode divisional capitals first" | All 64 districts backfilled with real coordinates | The source data was already available. |
| Resilience4j-equivalent circuit breaker | Manual 3-attempt retry with fixed backoff, no circuit breaker | Trimmed for MVP. |
| Read endpoints at `/ingestion/weather/latest` | `/weather/current`, `/weather/hourly/:districtId`, `/weather/daily/:districtId`, `/weather/air-quality` | Endpoints live under the module that owns the data. |
| `IngestionJob` tracking deferred | `IngestionService` now writes job records per cron run (RUNNING → SUCCEEDED/FAILED) | Implemented 2026-08-24. |

The gap analysis, API research, and "what NOT to port" sections below are still useful background, but provider-specific facts now live in `docs/integrations/`. The concrete implementation plan (models, module structure, tasks) has been superseded for OpenMeteo and GBIF.

---

## What the Java backends established

### open-nature (partially implemented)

| Component | Status | Notes |
| --- | --- | --- |
| OpenMeteo HTTP client | Done | Reactive WebClient, 60+ parameters, 4 fetch types |
| Resilience4j circuit breaker | Done | Sliding window 10, 50% failure threshold, 30s open |
| Retry with backoff | Done | 3 attempts, 2s base, 1.5x multiplier |
| Spring scheduler | Done | Hourly current, 2h hourly/AQ, 12h daily |
| ApiResponseLog entity | Done | All API calls logged with timing, error, correlation ID |
| OpenMeteo data → DB persistence | **Not done** | TODO comment in scheduler — fetch works, save does not |
| District stats aggregation | Partial | Service exists, has no source data yet |
| Air quality → DB persistence | **Not done** | Same issue |

### open-nature-backend2 (entity model only)

Added these well-designed entities not yet in delta-signal:
- `WeatherData` — full time-series per reading (temp, humidity, pressure, wind, precipitation, cloud, UV, AQI, raw JSON)
- `AirQualityData` — PM2.5, PM10, O3, NO2, SO2, CO, CO2, CH4, NH3, health recommendations
- `WeatherAggregate` / `AqiAggregate` — daily rollups per division/district
- `ReportMedia` — media attachments on citizen reports
- `ReportComment` — comments with nested reply support
- `RestorationProject` (SustainabilityProject) — community restoration tracking
- `CitizenProfile`, `ResearcherProfile`, `OrganizationProfile` — extended per-role profiles
- `ClimateAlert` — richer than current Alert (affected area polygon, estimated population, shelter locations)
- `ApiCallLog` — all external API calls tracked

---

## What delta-signal already has (do not duplicate)

This table reflects the state at the time of original planning. The schema now has 63 models and 35 enums. See `docs/architecture/data-model.md` for the full current model list.

| Model | Module | Notes |
| --- | --- | --- |
| `User` | auth / users | Role, passwordHash, isActive, lastLoginAt |
| `UserProfile` | users | Extended profile fields, visibility settings |
| `UserSocialLink` | users | Per-platform social links |
| `Organization` | organizations | Type, isVerified, memberships |
| `OrganizationMembership` | organizations | Many-to-many users↔orgs with ADMIN/MEMBER role |
| `Provider` | providers | Type, isActive, linked to Organization |
| `Division` | locations | Auto-seeded, 8 divisions, climate columns |
| `District` | locations | Auto-seeded, 64 districts, lat/lng, climate columns |
| `Upazila` | locations | Auto-seeded, 494 upazilas, climate columns |
| `Union` | locations | Auto-seeded, 4,540 unions, climate columns |
| `UnionDailyClimate` | locations/climate | Raw daily climate data per union per day |
| `Dataset` | datasets | Catalog metadata + access policy, download enforcement |
| `DatasetAccessRequest` | datasets | Access request + approve/reject workflow |
| `CitizenReport` | reports | Category, status workflow, lat/lng, status history |
| `ReportStatusEvent` | reports | Per-transition audit row |
| `ReportComment` | reports | Public + internal (moderator) comments |
| `ReportMedia` | reports | URL-registered media attachments |
| `Observation` | observations | Trust levels, category, species free text |
| `RestorationProject` | restoration | Status, category, participant join workflow |
| `RestorationParticipant` | restoration | Join table with unique constraint |
| `Species` | biodiversity | GBIF taxonomy |
| `Occurrence` | biodiversity | GBIF occurrences with BigInt key |
| `Alert` | alerts | Severity, status, district link |
| `AlertSubscription` | notifications | District or nationwide, min severity |
| `NotificationDelivery` | notifications | Per-delivery status tracking |
| `IngestionJob` | ingestion | Status machine, linked to Provider — now actively written |
| `FloodForecast` | flood | Daily GloFAS river-discharge forecasts per district |
| `CurrentWeatherReading` | weather | District-level current weather |
| `HourlyWeatherForecast` | weather | District-level hourly forecast |
| `DailyWeatherForecast` | weather | District-level daily forecast |
| `HourlyAirQuality` | weather | District-level hourly air quality |
| `Permission` | permissions | Named permission definitions |
| `RolePermission` | permissions | Role → permission grants |
| `RefreshToken` | auth | SHA-256 hashed opaque tokens |
| `AuditEvent` | audit | All write operations (25 action types) |

---

## Gaps to fill — Prisma models to add

### Priority 1 — Auth completeness

| Model | Purpose | Key fields |
| --- | --- | --- |
| `RefreshToken` | Store issued refresh tokens for revocation | `token`, `userId`, `expiresAt`, `revokedAt`, `deviceId` |

### Priority 2 — Ingestion data storage

| Model | Purpose | Key fields |
| --- | --- | --- |
| `WeatherReading` | One row per district per fetch | `districtId`, `providerId`, `observedAt`, `tempC`, `feelsLikeC`, `humidityPct`, `pressureHpa`, `windSpeedKmh`, `windDirDeg`, `precipMm`, `cloudCoverPct`, `uvIndex`, `weatherCode`, `rawJson` |
| `AirQualityReading` | One row per district per fetch | `districtId`, `providerId`, `measuredAt`, `aqiEuropean`, `pm25`, `pm10`, `o3`, `no2`, `so2`, `co`, `dominantPollutant`, `rawJson` |
| `WeatherAggregate` | Daily rollup per district | `districtId`, `date`, `avgTempC`, `minTempC`, `maxTempC`, `totalPrecipMm`, `avgHumidityPct`, `avgWindSpeedKmh` |
| `AqiAggregate` | Daily AQI rollup per district | `districtId`, `date`, `avgAqi`, `maxAqi`, `hoursUnhealthy`, `dominantPollutant` |
| `ApiCallLog` | Every external HTTP call | `provider`, `endpoint`, `httpStatus`, `responseMs`, `responseBytes`, `correlationId`, `errorMsg`, `districtId`, `createdAt` |

### Priority 3 — Report enrichment

| Model | Purpose | Key fields |
| --- | --- | --- |
| `ReportMedia` | Attachments on citizen reports | `reportId`, `mediaType`, `url`, `thumbnailUrl`, `caption`, `metadata Json` |
| `ReportComment` | Comments with nested replies | `reportId`, `userId`, `body`, `parentCommentId`, `status` |

### Priority 4 — Extended profiles

| Model | Purpose | Key fields |
| --- | --- | --- |
| `CitizenProfile` | Extended data for citizen users | `userId`, `notificationPrefs Json`, `interestedTopics[]` |
| `ResearcherProfile` | Researcher-specific fields | `userId`, `institution`, `researchAreas[]`, `academicDegree`, `verified` |
| `OrganizationProfile` | Org-specific fields | `userId`, `websiteUrl`, `missionStatement`, `staffCount`, `verified`, `verificationDocs Json` |

### Priority 5 — Restoration and community

| Model | Purpose | Key fields |
| --- | --- | --- |
| `RestorationProject` | Restoration/sustainability projects | `title`, `description`, `category`, `status`, `organizationId`, `districtId`, `startDate`, `endDate`, `fundingGoal`, `fundingRaised`, `impactMetrics Json`, `participantCount` |

---

## Third-party APIs — priority order

| Priority | API | Key | Data | Frequency | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | **OpenMeteo weather** | None | Temperature, humidity, wind, precipitation, UV, weather code, cloud cover | Current every 15min, hourly every 2h, daily every 12h | Implemented. See `docs/integrations/openmeteo.md`. |
| 1 | **OpenMeteo air quality** | None | PM2.5, PM10, O3, NO2, SO2, CO, UV index | Every 2h | Implemented. AQI fields are available from OpenMeteo but not requested/stored yet. See `docs/integrations/openmeteo.md`. |
| 2 | **WAQI** | Free (register) | AQI per city station, dominant pollutant, health advice | Every 1h | More station-level granularity than OpenMeteo for urban AQI |
| 3 | **GBIF** | None | Species taxonomy and occurrence records for Bangladesh | Daily | Implemented. Filter by `country=BD&hasCoordinate=true`. See `docs/integrations/gbif.md`. |
| 4 | **BMD** | Gov approval | Bangladesh Met Dept — local station weather, cyclone bulletins | As available | May require official registration. Start with OpenMeteo for coverage. |
| 5 | **FFWC** | Gov approval | Bangladesh Flood Forecasting Warning Centre — flood alerts | Real-time | `http://www.ffwc.gov.bd`. May need scraping if no public API. |

Two further sources are unscheduled:

- **iNaturalist** occurrence ingestion. `apps/api/src/datasets/seed/catalog.ts` already lists iNaturalist as a dataset source, so the catalog advertises a source with no ingestion behind it.
- **OpenWeatherMap** / **AirNow** as additional weather and AQ coverage.
- Additional OpenMeteo APIs now documented in `docs/integrations/`: Flood, operational Climate summaries, Marine Weather, and Satellite Radiation are implemented; Seasonal Forecast remains deferred.

---

## Implementation design

### NestJS scheduler setup

Use `@nestjs/schedule` (cron-based, zero external dependency) for lightweight fetch jobs. BullMQ is now installed (`bullmq`, `@nestjs/bullmq`) and used for `email` and `gamification` queues — but **not yet for ingestion jobs**; ingestion schedulers remain cron-based. Admin-triggered retryable ingestion jobs are a future addition.

```
@nestjs/schedule   → hourly/daily fetch crons (OpenMeteo, GBIF) — actual implementation
BullMQ (partial)   → email + gamification queues live; ingestion queues not yet wired
```

### HTTP client pattern

Each external API gets its own client class in `apps/api/src/ingestion/clients/`:

```
openmeteo-weather.client.ts   — current + hourly + daily
openmeteo-airquality.client.ts
waqi.client.ts
gbif.client.ts
```

Each client:
- Uses native `fetch` (Node 18+) or `axios` — no reactive wrapper needed in NestJS
- Writes an `ApiCallLog` row for every request (success or failure)
- Throws typed errors that the scheduler catches and logs
- Has a correlation ID generated per request

### Retry / resilience

No Resilience4j equivalent library needed. Implement a simple retry utility:

```typescript
// apps/api/src/ingestion/util/retry.ts
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 2000): Promise<T>
```

For circuit-breaker behaviour, track consecutive failures in the `Provider.isActive` flag plus `ApiCallLog` failure counts.

### Scheduler structure (within IngestionModule)

```
ingestion/
  clients/
    openmeteo-weather.client.ts
    openmeteo-airquality.client.ts
    waqi.client.ts
    gbif.client.ts
  schedulers/
    weather.scheduler.ts       — @Cron every 1h, fetches all 64 districts
    air-quality.scheduler.ts   — @Cron every 2h
    biodiversity.scheduler.ts  — @Cron daily
  services/
    weather-ingestion.service.ts
    air-quality-ingestion.service.ts
    ingestion-job.service.ts   — manages IngestionJob records
    api-call-log.service.ts    — writes ApiCallLog rows
  ingestion.module.ts
```

### OpenMeteo parameters to fetch

**Current weather (per district lat/lng):**
```
current=temperature_2m,relative_humidity_2m,apparent_temperature,
        precipitation,weather_code,wind_speed_10m,wind_direction_10m,
        surface_pressure,cloud_cover,uv_index
```

**Hourly (7-day forecast):**
```
hourly=temperature_2m,relative_humidity_2m,precipitation_probability,
       precipitation,weather_code,wind_speed_10m,cloud_cover,uv_index
```

**Daily (14-day):**
```
daily=temperature_2m_max,temperature_2m_min,precipitation_sum,
      wind_speed_10m_max,uv_index_max,weather_code
```

**Air quality (per district):**
```
hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,
       ozone,european_aqi,european_aqi_pm2_5,european_aqi_pm10
```

### District coverage strategy

Fetch weather for all 64 districts using their lat/lng centroid. The `District` table already has `name` — add `lat` and `lng` columns (average centroid per district) as part of the upazila/union seed task. Until then, hardcode centroids for the 8 divisional capitals as a starting point.

---

## What NOT to port from Java backends

| Java component | Reason to skip |
| --- | --- |
| Spring Modulith boundary enforcement | NestJS modules already provide this |
| Liquibase migrations | Prisma handles migrations |
| MapStruct DTO mapping | Use plain TypeScript mapper functions |
| Hibernate Spatial / JTS | PostGIS via Prisma raw queries when needed |
| Spring Security config | Already implemented as NestJS guards |
| JJWT library | Already using `@nestjs/jwt` |
| CompletableFuture async pattern | Native async/await |
| ApplicationEventPublisher | NestJS EventEmitter2 if needed, or direct service calls |
| Resilience4j annotations | Simple retry utility is enough |
| Swagger SpringDoc | @nestjs/swagger when OpenAPI is needed |

---

## Open questions before implementing ingestion

1. ~~**District lat/lng centroids**~~ — Resolved (2026-08-16): added directly to `District` (not Upazila/Union), backfilled from `open-nature`'s `district.csv` for all 64 districts.
2. **WAQI API key** — a free account is needed at `aqicn.org/data-platform/token/`. Should we register one for dev?
3. **Weather data retention** — how long to keep raw hourly/daily rows? OpenMeteo hourly data generates 64 × ~12/day ≈ 768 rows/day per table. No aggregation tables were built, so raw rows accumulate indefinitely until a retention policy is decided.
4. **External-call audit trail** — no `ApiCallLog` was built (see "Implementation status" above). Revisit if debugging OpenMeteo schema drift or rate-limit issues becomes hard without one.
