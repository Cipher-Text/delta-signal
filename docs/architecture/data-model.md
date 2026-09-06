# Data Model

Delta Signal uses PostgreSQL as the primary database. The Prisma schema lives at `packages/database/prisma/schema.prisma`. The Prisma client is regenerated via `pnpm run db:generate` from the `packages/database` directory.

Current state: **61 models, 32 enums, 12 migrations applied.**

## Enums

| Enum | Values |
| --- | --- |
| `UserRole` | `CITIZEN RESEARCHER ORGANIZATION_ADMIN GOVERNMENT MODERATOR ADMIN` |
| `OrganizationMemberRole` | `ADMIN MEMBER` |
| `ProfileVisibility` | `PUBLIC MEMBERS_ONLY PRIVATE` |
| `AlertSeverity` | `INFO WATCH WARNING EMERGENCY` |
| `AlertType` | `FLOOD FLASH_FLOOD CYCLONE STORM_SURGE HEATWAVE AIR_QUALITY WATER_POLLUTION LANDSLIDE DROUGHT WILDFIRE OTHER` |
| `AlertStatus` | `DRAFT ACTIVE EXPIRED CANCELLED` |
| `ReportStatus` | `SUBMITTED UNDER_REVIEW VERIFIED REJECTED RESOLVED` |
| `ReportCategory` | `WATER_POLLUTION ILLEGAL_DUMPING DEFORESTATION WILDLIFE_INCIDENT FLOODING AIR_POLLUTION OTHER` |
| `ObservationCategory` | `BIODIVERSITY WATER_QUALITY AIR_QUALITY LAND_USE RESTORATION` |
| `ObservationTrustLevel` | `RESEARCH_GRADE COMMUNITY UNVERIFIED FLAGGED` |
| `MeasurementParameter` | Water quality: `PH DISSOLVED_OXYGEN WATER_TEMPERATURE TURBIDITY CONDUCTIVITY SALINITY NITRATE_N PHOSPHATE_P BOD COD TOTAL_DISSOLVED_SOLIDS TOTAL_SUSPENDED_SOLIDS ARSENIC FECAL_COLIFORM WATER_DEPTH FLOW_VELOCITY` · Air: `PM25 PM10 CO2 CO NOX SOX OZONE VOC AQI AMBIENT_TEMPERATURE RELATIVE_HUMIDITY` · Biodiversity: `SPECIES_COUNT INDIVIDUAL_COUNT CANOPY_COVER VEGETATION_DENSITY` · Soil: `SOIL_PH SOIL_MOISTURE AREA_AFFECTED OTHER` |
| `MeasurementUnit` | `MG_PER_L UG_PER_L NTU US_PER_CM PPT PH_UNITS CELSIUS PPM PPB UG_PER_M3 PERCENT COUNT METERS METERS_PER_SECOND CFU_PER_100ML HECTARES INDEX OTHER` |
| `QualityFlag` | `GOOD SUSPECT BAD ESTIMATED` |
| `ProjectStatus` | `PLANNED ACTIVE COMPLETED PAUSED` |
| `RestorationCategory` | `TREE_PLANTING WETLAND_RESTORATION RIVERBANK_PROTECTION MANGROVE WASTE_MANAGEMENT OTHER` |
| `RestorationTargetMetric` | `TREES_PLANTED AREA_RESTORED_HA SEEDLINGS_SURVIVED SPECIES_REINTRODUCED WATER_QUALITY_SCORE CARBON_SEQUESTERED_T VOLUNTEER_HOURS OTHER` |
| `WaterBodyType` | `RIVER CANAL LAKE HAOR BEEL POND ESTUARY RESERVOIR OTHER` |
| `HydrologicalClass` | `PERENNIAL SEASONAL EPHEMERAL` |
| `WaterLevelTrend` | `RISING FALLING STEADY` |
| `FacilityType` | `GARMENT TANNERY BRICK_FIELD POWER_PLANT SHIPBREAKING TEXTILE CEMENT STEEL CHEMICAL PHARMACEUTICAL FERTILIZER PAPER_MILL FOOD_PROCESSING OIL_REFINERY OTHER` |
| `ComplianceStatus` | `COMPLIANT NON_COMPLIANT UNDER_REVIEW UNKNOWN` |
| `CompanyType` | `PRIVATE STATE_OWNED JOINT_VENTURE MULTINATIONAL CONGLOMERATE CLUSTER` |
| `AuthProvider` | `EMAIL GOOGLE` |
| `DatasetCategory` | `WEATHER AIR_QUALITY WATER BIODIVERSITY REPORTS MONITORING GEOSPATIAL` |
| `DatasetAccessPolicy` | `PUBLIC LOGIN_REQUIRED RESEARCHER APPROVED GOVERNMENT` |
| `DatasetAccessRequestStatus` | `PENDING APPROVED REJECTED` |
| `ProviderType` | `GOVERNMENT_AGENCY RESEARCH_INSTITUTION NGO INTERNATIONAL_ORG CITIZEN_SCIENCE SATELLITE IOT_SENSOR` |
| `OrganizationType` | `GOVERNMENT_AGENCY RESEARCH_INSTITUTION NGO COMMUNITY_GROUP PRIVATE_COMPANY INTERNATIONAL_ORG OTHER` |
| `IngestionStatus` | `QUEUED RUNNING SUCCEEDED FAILED CANCELLED` |
| `NotificationChannel` | `EMAIL` |
| `DeliveryStatus` | `PENDING SENT FAILED` |
| `AuditAction` | `USER_REGISTER USER_LOGIN USER_LOGIN_FAILED USER_LOGOUT USER_ROLE_CHANGE USER_DEACTIVATE PASSWORD_CHANGE PASSWORD_RESET_REQUEST PASSWORD_RESET EMAIL_VERIFICATION_SENT EMAIL_VERIFIED REPORT_SUBMIT REPORT_STATUS_CHANGE REPORT_COMMENT_ADD REPORT_MEDIA_ADD ALERT_CREATE ALERT_STATUS_CHANGE DATASET_ACCESS DATASET_DOWNLOAD DATASET_UPDATE DATASET_VERSION_PUBLISH DATASET_ACCESS_DECISION OBSERVATION_SUBMIT OBSERVATION_TRUST_CHANGE OBSERVATION_UPDATE OBSERVATION_DELETE OBSERVATION_MEASUREMENT_ADD OBSERVATION_MEASUREMENT_DELETE RESTORATION_PROJECT_CREATE RESTORATION_PROJECT_UPDATE RESTORATION_PROJECT_JOIN RESTORATION_TARGET_ADD RESTORATION_ACTIVITY_ADD RESTORATION_METRIC_ADD PERMISSION_GRANT PERMISSION_REVOKE EMISSION_SOURCE_CREATE EMISSION_ENTRY_CREATE COMMUNITY_POST_CREATE COMMUNITY_POST_DELETE COMMUNITY_COMMENT_ADD COMMUNITY_COMMENT_DELETE COMMUNITY_POLL_VOTE FACILITY_CREATE FACILITY_UPDATE FACILITY_DELETE COMPANY_CREATE COMPANY_UPDATE` |

All 48 `AuditAction` values are written by services (`EMISSION_SOURCE_CREATE` and `EMISSION_ENTRY_CREATE` are stale holdovers from the old emissions schema — no service writes them; they will be removed in a future migration). See the `audit` section in [modules.md](modules.md) for which services write what.

## Users & Auth

| Model | Key Fields | Relations |
| --- | --- | --- |
| `User` | `id cuid`, `email unique`, `displayName`, `passwordHash?` (nullable — Google-only users have none), `googleId? unique`, `authProvider AuthProvider @default(EMAIL)`, `role UserRole`, `isActive`, `lastLoginAt?` | → `CitizenReport[]`, `Observation[]`, `AuditEvent[]`, `RefreshToken[]`, `OAuthExchangeCode[]`, `RestorationProject[]` (created), `RestorationParticipant[]`, `DatasetAccessRequest[]` (as requester and as decider) |
| `UserProfile` | `userId unique`, contact/professional fields, location, profile/contact/link visibility | → `User` |
| `UserSocialLink` | `userId`, `platform`, `url`, unique `(userId, platform)` | → `User` |
| `RefreshToken` | `id`, `userId`, `tokenHash unique`, `expiresAt`, `revokedAt?`, `deviceId?`, `ipAddress?`, `userAgent?` | → `User` |
| `OAuthExchangeCode` | `id`, `userId`, `code unique`, `expiresAt` (30 s TTL), `usedAt?` | → `User` |

`RefreshToken` stores a SHA-256 hash, never the raw token. Tokens are opaque random strings (not JWTs) so they can only be redeemed via `POST /auth/refresh`. Refresh rotates: the old row is revoked and a new pair issued. See `docs/progress.md` "Auth Refresh/Logout" for the rationale (Postgres rather than Redis).

`OAuthExchangeCode` is the bridge between Google's OAuth callback (which arrives at the NestJS API) and the Next.js Route Handler that sets httpOnly cookies. The API issues a 30-second single-use opaque code, redirects the browser to Next.js `/auth/callback?code=…`, which POSTs the code to `POST /auth/exchange` (server-side) and sets the resulting token pair as httpOnly cookies. Google-authenticated users have `authProvider = GOOGLE`, `passwordHash = null`, and `isEmailVerified = true` (Google already verified the address). They cannot log in via the email/password endpoint.

## Organizations & Providers

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Organization` | `id`, `name`, `type OrganizationType`, `description?`, `website?`, `country`, `isVerified` | → `Provider[]`, `RestorationProject[]` |
| `OrganizationMembership` | `organizationId`, `userId`, `role OrganizationMemberRole` | → `Organization`, `User`; unique `(organizationId, userId)` |
| `Provider` | `id`, `name`, `type ProviderType`, `country`, `organizationId?`, `isActive` | → `Organization?`, `Dataset[]`, `IngestionJob[]` |

## Geography

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Division` | `id`, `name unique`, `bnName?`, `slug`, `pcode`, `lat`, `lng`, `areaSqKm`, `url`; climate: `avgTemp30d`, `minTemp30d`, `maxTemp30d`, `avgHumidity30d`, `totalPrecip30d`, `avgWindSpeed30d`, `avgCloudCover30d`, `avgPm25_30d`, `avgPm10_30d`, `avgUvIndex30d`, `climateUpdatedAt` | → `District[]` |
| `District` | `id`, `name`, `bnName?`, `slug`, `pcode`, `lat`, `lng`, `geom geography(Point,4326)?`, `centerLat`, `centerLng`, `areaSqKm`, `url`, `boundary Json?`, `isCoastal Boolean`, `coastLat?`, `coastLng?`, `divisionId`; climate columns (same 11 as Division) | → `Division`, `Upazila[]`, `CitizenReport[]`, `Alert[]`, `AlertArea[]`, `Observation[]`, `RestorationProject[]`, `Occurrence[]`, plus all 4 weather tables; unique `(name, divisionId)` |
| `Upazila` | `id`, `name`, `bnName?`, `slug`, `pcode`, `lat`, `lng`, `areaSqKm`, `url`, `districtId`; climate columns (same 11 as Division) | → `District`, `Union[]`, `CitizenReport[]`, `AlertArea[]`, `Observation[]`, `RestorationProject[]`; unique `(name, districtId)` |
| `Union` | `id`, `name`, `bnName?`, `slug`, `pcode`, `lat`, `lng`, `areaSqKm`, `url`, `upazilaId`; climate columns (same 11 as Division) | → `Upazila`, `UnionDailyClimate[]`; unique `(name, upazilaId)` |
| `UnionDailyClimate` | `id`, `unionId`, `date Date`, `avgTemp`, `minTemp`, `maxTemp`, `avgHumidity`, `totalPrecip`, `avgWindSpeed`, `maxWindSpeed`, `avgCloudCover`, `avgPm25`, `avgPm10`, `avgUvIndex`, `avgOzone`, `fetchedAt`; unique `(unionId, date)` | → `Union` |

## Datasets

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Dataset` | `id`, `name`, `category DatasetCategory`, `accessPolicy DatasetAccessPolicy`, `source`, `providerId?`, `description?`, `recordCount?`, `lastSyncedAt?`, `isPublished` | → `Provider?`, `DatasetAccessRequest[]`, `DatasetVersion[]` |
| `DatasetAccessRequest` | `id`, `datasetId`, `userId`, `status DatasetAccessRequestStatus`, `decidedById?`, `decidedAt?` | → `Dataset`, `User` (requester), `User?` (decider); unique `(datasetId, userId)` |
| `DatasetVersion` | `id`, `datasetId`, `version`, `description?`, `publishedById`, `publishedAt`, `recordCount?`, `fileUrl?`, `metadata Json?` | → `Dataset`, `User` (publisher) |

`DatasetAccessRequest` is implemented by `DatasetsService` and `DatasetsController`. `POST /datasets/:id/access-request` creates a request, admins can list and decide requests, and `GET /datasets/:id/download` applies the dataset policy before returning API access information. The unique constraint on `(datasetId, userId)` means one request per user per dataset; re-requesting after rejection still needs an explicit product decision. `DatasetVersion` tracks published snapshots of a dataset; each publish writes a `DATASET_VERSION_PUBLISH` audit event.

## Reports

| Model | Key Fields | Relations |
| --- | --- | --- |
| `CitizenReport` | `id`, `title`, `description`, `category ReportCategory`, `status ReportStatus`, `summary?`, `reporterId?`, `districtId?`, `lat?`, `lng?`, `resolvedAt?` | → `User?`, `District?`, `ReportStatusEvent[]`, `ReportComment[]`, `ReportMedia[]` |
| `ReportStatusEvent` | `id`, `reportId`, `status ReportStatus`, `note?` | → `CitizenReport` |
| `ReportComment` | `id`, `reportId`, `authorId`, `body Text`, `isInternal Boolean default false`, `createdAt` | → `CitizenReport`, `User`; non-internal comments public; internal visible to MODERATOR/ADMIN only |
| `ReportMedia` | `id`, `reportId`, `uploadedById`, `url`, `mimeType?`, `fileSize?`, `caption?`, `createdAt` | → `CitizenReport`, `User`; URL-registered only — no server-side upload yet |

## Observations

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Observation` | `id`, `category ObservationCategory`, `trustLevel ObservationTrustLevel`, `description`, `observerId?`, `districtId?`, `upazilaId?`, `lat?`, `lng?`, `species?`, `observedAt` | → `User?`, `District?`, `Upazila?`, `ObservationMeasurement[]` |
| `ObservationMeasurement` | `id`, `observationId`, `parameter MeasurementParameter`, `value Float`, `unit MeasurementUnit`, `qualityFlag QualityFlag default GOOD`, `measuredAt?`, `notes?` | → `Observation` |

Submissions always start at `UNVERIFIED`; only `RESEARCHER`/`ADMIN` can change `trustLevel`, and each change writes an `OBSERVATION_TRUST_CHANGE` audit event recording `from` and `to`. `species` is a free-text string here, deliberately not a FK to `Species` — generic observations are not required to resolve to a GBIF taxon. Measurements can be attached after submission (`POST /observations/:id/measurements`); each add/delete writes an audit event. `GET /observations/nearby` accepts a lat/lng and radius for spatial queries.

## Restoration

| Model | Key Fields | Relations |
| --- | --- | --- |
| `RestorationProject` | `id`, `title`, `description`, `category RestorationCategory`, `status ProjectStatus`, `organizationId?`, `districtId?`, `upazilaId?`, `startDate?`, `endDate?`, `impactSummary?`, `createdById` | → `Organization?`, `District?`, `Upazila?`, `User` (creator), `RestorationParticipant[]`, `ProjectTarget[]` |
| `RestorationParticipant` | `id`, `projectId`, `userId`, `joinedAt` | → `RestorationProject`, `User`; unique `(projectId, userId)` |
| `ProjectTarget` | `id`, `projectId`, `metric RestorationTargetMetric`, `targetValue Float`, `currentValue Float default 0`, `unit?`, `dueDate?` | → `RestorationProject`, `ProjectMetric[]` |
| `ProjectActivity` | `id`, `projectId`, `title`, `description?`, `activityDate`, `recordedById` | → `RestorationProject`, `User` |
| `ProjectMetric` | `id`, `targetId`, `value Float`, `recordedAt`, `notes?`, `recordedById` | → `ProjectTarget`, `User` |

The unique constraint on `(projectId, userId)` is what makes joining a project idempotent. `ProjectTarget` records measurable goals (trees planted, hectares restored, etc.); `ProjectMetric` logs progress readings against a target; `ProjectActivity` captures narrative activity logs. Create/update/join each write audit events; adding targets, activities, and metrics each write their own audit events.

## Biodiversity

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Species` | `id`, `gbifKey Int unique`, `canonicalName`, `vernacularName?`, `kingdom?`, `phylum?`, `class?`, `order?`, `family?`, `genus?`, `iucnStatus?`, `imageUrl?` | → `Occurrence[]` |
| `Occurrence` | `id`, `gbifOccurrenceKey BigInt unique`, `speciesId`, `districtId?`, `lat`, `lng`, `observedAt?`, `recordedBy?`, `basisOfRecord?` | → `Species`, `District?` |

`gbifOccurrenceKey` is `BigInt`, not `Int` — GBIF occurrence keys exceed the 32-bit signed range and overflowed on first sync (fixed in migration `20260819150726_fix_gbif_occurrence_key_bigint`). `iucnStatus` is nullable and intentionally unpopulated: GBIF's occurrence search does not return IUCN status, and a per-species enrichment call was scoped out of v1. Separate from `Observation` by design — GBIF occurrences are externally sourced records, not user submissions.

## Alerts and Notifications

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Alert` | `id`, `title`, `description`, `type AlertType`, `severity AlertSeverity`, `status AlertStatus`, `instructions?`, `districtId?`, `issuedAt`, `expiresAt?` | → `District?`, `AlertArea[]`, `NotificationDelivery[]` |
| `AlertArea` | `id`, `alertId`, `districtId?`, `upazilaId?`, `description?` | → `Alert`, `District?`, `Upazila?` — allows an alert to cover multiple geographic sub-areas |
| `AlertSubscription` | `id`, `userId`, `districtId?` (null = nationwide), `channel NotificationChannel`, `minSeverity AlertSeverity` | → `User`, `District?`, `NotificationDelivery[]`; uniqueness enforced in service (Postgres `NULL != NULL` in unique indexes breaks naive deduplication for global subscriptions) |
| `NotificationDelivery` | `id`, `subscriptionId`, `alertId`, `userId`, `channel`, `address` (captured at send time), `status DeliveryStatus`, `sentAt?`, `failedAt?`, `error?` | → `AlertSubscription` (cascade delete), `Alert`, `User` |

## Ingestion & Audit

| Model | Key Fields | Relations |
| --- | --- | --- |
| `IngestionJob` | `id`, `providerId`, `status IngestionStatus`, `startedAt?`, `endedAt?`, `errorMsg?` | → `Provider` |
| `AuditEvent` | `id`, `action AuditAction`, `userId?`, `entityType?`, `entityId?`, `meta Json?`, `ipAddress?` | → `User?` |

`IngestionJob` records are written by `IngestionService.startJob`/`completeJob`/`failJob`, called from `WeatherScheduler`, `BiodiversityScheduler`, `FloodScheduler`, `RadiationScheduler`, `MarineScheduler`, and `LocationClimateScheduler` on every cron run. (`FloodScheduler` now persists to `StationFloodForecast`, not the old district-based `FloodForecast` model.) Successful jobs set `Dataset.lastSyncedAt` for matching dataset categories. See the `ingestion` module in [modules.md](modules.md).

## Permissions

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Permission` | `id`, `key unique`, `description` | → `RolePermission[]` |
| `RolePermission` | `role UserRole`, `permissionId`; unique `(role, permissionId)` | → `Permission` |

Seeded on first boot by `PermissionsService.onModuleInit` with 13 named permissions and default role grants. Queried by `PermissionsGuard` for fine-grained access control on routes decorated with `@RequirePermissions(...)`. ADMIN bypasses all permission checks in the guard. Results cached per role for 5 minutes.

## Weather Models

| Model | Key Fields | Relations |
| --- | --- | --- |
| `CurrentWeatherReading` | `id`, `districtId`, `lat`, `lng`, `readingTime`, `temperature2m?`, `relativeHumidity2m?`, `apparentTemperature?`, `windSpeed10m?`, `windDirection10m?`, `precipitation?`, `weatherCode?`, `cloudCover?`, `isDay?` | → `District`; unique `(districtId, readingTime)` |
| `HourlyWeatherForecast` | `id`, `districtId`, `lat`, `lng`, `forecastTime`, `temperature2m?`, `relativeHumidity2m?`, `apparentTemperature?`, `precipitationProbability?`, `precipitation?`, `weatherCode?`, `windSpeed10m?`, `windDirection10m?`, `cloudCover?` | → `District`; unique `(districtId, forecastTime)` |
| `DailyWeatherForecast` | `id`, `districtId`, `lat`, `lng`, `forecastDate date`, `weatherCode?`, `temperature2mMax?`, `temperature2mMin?`, `apparentTemperatureMax?`, `apparentTemperatureMin?`, `precipitationSum?`, `precipitationProbabilityMax?`, `windSpeed10mMax?`, `uvIndexMax?`, `sunrise?`, `sunset?` | → `District`; unique `(districtId, forecastDate)` |
| `HourlyAirQuality` | `id`, `districtId`, `lat`, `lng`, `forecastTime`, `pm10?`, `pm25?`, `carbonMonoxide?`, `nitrogenDioxide?`, `sulphurDioxide?`, `ozone?`, `uvIndex?` | → `District`; unique `(districtId, forecastTime)` |

All 4 weather tables are keyed by `districtId`, not raw `lat`/`lng` proximity matching — every fetch already targets a known district's coordinates, so a direct FK is simpler and exact. `lat`/`lng` are still stored on each row for provenance, duplicating the district's coordinates at fetch time. Field sets are trimmed relative to the OpenMeteo API's full parameter list (see `docs/ingestion-plan.md` for the parameters actually requested) — no soil temperature/moisture or multi-height wind data. Populated by the `weather` module (`apps/api/src/weather/`); see `docs/progress.md` "Weather Ingestion".

## Satellite Radiation and Marine Models

| Model | Key Fields | Relations |
| --- | --- | --- |
| `SatelliteRadiationReading` | `id`, `districtId`, `lat`, `lng`, `readingDate Date`, `shortwaveRadiationSum Float?`, `sunshineDuration Float?`, `daylightDuration Float?`; unique `(districtId, readingDate)` | → `District` |
| `MarineForecast` | `id`, `districtId`, `lat`, `lng`, `forecastDate Date`, 11 Float? wave/swell/wind-wave fields (`waveHeightMax`, `waveDirectionDominant`, `wavePeriodMax`, `windWaveHeightMax`, `windWaveDirectionDominant`, `windWavePeriodMax`, `windWavePeakPeriodMax`, `swellWaveHeightMax`, `swellWaveDirectionDominant`, `swellWavePeriodMax`, `swellWavePeakPeriodMax`); unique `(districtId, forecastDate)` | → `District` |

`SatelliteRadiationReading` is populated daily at 1am by `RadiationScheduler` (`apps/api/src/radiation/`). Fetches 3 daily variables for all 64 districts via `satellite-api.open-meteo.com`. Public endpoints: `GET /radiation/daily` and `GET /radiation/daily/:districtId`.

`MarineForecast` is populated daily at 2am by `MarineScheduler` (`apps/api/src/marine/`). Fetches 11 daily wave/swell/wind-wave aggregates for all 64 district centroids via `marine-api.open-meteo.com`. Inland districts produce no valid marine grid cell — these are logged as `warn` and skipped; only coastal districts (Cox's Bazar, Chattogram, Khulna, Satkhira, Barguna, Patuakhali, Bhola, Noakhali, etc.) generate rows. Public endpoints: `GET /marine/forecast` and `GET /marine/forecast/:districtId`. SST and ocean current variables are hourly-only in the Marine API and are not yet stored.

## Emissions

| Model | Key Fields | Relations |
| --- | --- | --- |
| `NationalEmissionReading` | `id`, `year Int`, `indicatorCode String`, `indicatorName String`, `value Float?`, `unit String default "Mt CO2e"`, `ingestionJobId?` | none — flat table; `@@unique([year, indicatorCode])` |

`NationalEmissionReading` stores annual national GHG data fetched from the World Bank Climate Change API. One row per `(year, indicatorCode)` combination. Four indicators are synced: Total GHG, CO₂, CH₄, and N₂O. Values are in Mt CO₂e, excluding land-use change (LULUCF). Data covers 1976–2024 (66 records per indicator; 2025 is null and skipped). Populated weekly by `EmissionsScheduler` and on first boot. No user-input write paths. Implemented in `apps/api/src/emissions/`. Dataset catalog entry: "Emissions Inventory" (AIR_QUALITY / PUBLIC).

Note `carbonMonoxide` on `HourlyAirQuality` is an OpenMeteo air-quality pollutant reading. It is unrelated to carbon accounting or footprint tracking, which Delta Signal does not model yet — that is roadmap Phase 7.

## Industrial Sites

| Model | Key Fields | Relations |
| --- | --- | --- |
| `Company` | `id`, `name unique`, `bnName?`, `description?`, `companyType CompanyType`, `registrationNumber?`, `establishedYear?`, `employeeCount?`, `website?`, `contactEmail?`, `contactPhone?`, `isActive Boolean`, `headquarterDistrictId?`, `parentCompanyId?` | → `District?` (HQ), `Company?` (parent), `Company[]` (subsidiaries), `IndustrialFacility[]` |
| `IndustrialFacility` | `id`, `name`, `bnName?`, `description?`, `facilityType FacilityType`, `complianceStatus ComplianceStatus default UNKNOWN`, `companyId?`, `isActive Boolean`, `lat?`, `lng?`, `districtId`, `upazilaId?`, `unionId?`, `establishedYear?`, `productionCapacity?`, `landArea Float?`, `etpInstalled Boolean`, `etpCapacity Float?` | → `Company?`, `District`, `Upazila?`, `Union?`, `CitizenReport[]` |

`Company` represents the legal entity that owns or operates one or more physical sites. `name` has a `@unique` constraint (used by the seed lookup). Self-referential `parentCompanyId` allows modelling conglomerates and subsidiaries in a single table. `IndustrialFacility` is the physical site — one company may have many facilities. `etpInstalled` flags whether an Effluent Treatment Plant is installed; `complianceStatus` tracks DoE regulatory status. Seeded on boot via `CompaniesService.onModuleInit()`: first creates companies (two-pass — parents then subsidiaries), then facilities (looks up company by name). Audit events: `COMPANY_CREATE`, `COMPANY_UPDATE`, `FACILITY_CREATE`, `FACILITY_UPDATE`, `FACILITY_DELETE`.

Exposed in `apps/web` via the tabbed `/industrial-sites` page (URL param `?tab=companies` switches to company list; default = sites list). Company detail at `/industrial-sites/companies/:id`; facility detail at `/industrial-sites/:id`.

## Water Bodies

| Model | Key Fields | Relations |
| --- | --- | --- |
| `WaterBody` | `id`, `name`, `bnName?`, `type WaterBodyType`, `hydrologicalClass HydrologicalClass?`, `description?`, `lat?`, `lng?`, `areaSqKm?`, `length?` | → `WaterBodyUpazila[]`, `WaterBodyStation[]`, `LoticWaterBodyDetails?`, `LenticWaterBodyDetails?` |
| `WaterBodyUpazila` | `id`, `waterBodyId`, `upazilaId` | → `WaterBody`, `Upazila`; unique `(waterBodyId, upazilaId)` — a water body may span multiple upazilas |
| `LoticWaterBodyDetails` | `waterBodyId unique`, `source?`, `mouth?`, `basinArea?`, `avgDischarge?`, `maxDischarge?`, `tributaries String[]` | → `WaterBody` — flowing water specifics (rivers, canals) |
| `LenticWaterBodyDetails` | `waterBodyId unique`, `maxDepth?`, `avgDepth?`, `catchmentArea?`, `waterLevel?` | → `WaterBody` — still water specifics (haors, lakes, reservoirs) |
| `WaterLevelStation` | `id`, `name`, `stationCode?`, `latitude`, `longitude`, `districtId?`, `upazilaId?`, `dangerLevel Float?`, `warningLevel Float?`, `normalLevel Float?` | → `District?`, `Upazila?`, `WaterBodyStation[]`, `StationFloodForecast[]`, `WaterLevelReading[]` |
| `WaterBodyStation` | `waterBodyId`, `stationId` | → `WaterBody`, `WaterLevelStation`; unique `(waterBodyId, stationId)` |
| `WaterLevelReading` | `id`, `stationId`, `readingTime`, `waterLevel Float`, `trend WaterLevelTrend?`, `discharge Float?`, `dataSource?` | → `WaterLevelStation`; unique `(stationId, readingTime)` |

`WaterLevelStation.dangerLevel/warningLevel/normalLevel` are gauge thresholds in metres above datum; null means the threshold has not been configured for that station. Seeded from a CSV via `WaterBodiesService.onModuleInit`. Endpoints: `GET /water-bodies`, `GET /water-bodies/stations`, `GET /water-bodies/:id`. Water level readings are accessed via the flood module: `GET /flood/stations/:stationId/readings` and `GET /flood/stations/:stationId/latest`.

## Flood Forecasting

| Model | Key Fields | Relations |
| --- | --- | --- |
| `StationFloodForecast` | `id`, `stationId`, `forecastDate Date`, `discharge Float?`, `dischargeMin Float?`, `dischargeMax Float?`, `dischargeMedian Float?`, `dischargeQ25 Float?`, `dischargeQ75 Float?`, `unit?`, `forecastedAt` | → `WaterLevelStation`; unique `(stationId, forecastDate)` |

Flood forecasts are now station-based (replaced the earlier district-based `FloodForecast` model). Endpoints: `GET /flood/forecast` (all stations, latest day), `GET /flood/forecast/station/:stationId` (full forecast window), `GET /flood/forecast/district/:districtId` (stations in a district). The `FloodScheduler` runs every six hours and triggers an initial sync on empty table.

## Geospatial

`lat Float?` / `lng Float?` are used on `District`, `CitizenReport`, and `Observation`. `Occurrence` and the 4 weather tables carry non-nullable `lat`/`lng`. **`District.geom`** is now a PostGIS `geography(Point, 4326)` generated column, added by migration `20260901000000_postgis_geometry` — PostGIS is now active for point queries on districts. `coastLat`/`coastLng` on `District` hold the representative coastal coordinate used by the marine module for coastal districts.

Future candidates for proper geometry fields:

- `Alert` / `AlertArea` — affected zone polygon
- `District` — administrative boundary polygon (currently stored as GeoJSON in `boundary Json?`)
- `Upazila` — boundary polygon
- `WaterBody` — shape

## Notable schema decisions

**Climate columns:** All four geography models (`Division`, `District`, `Upazila`, `Union`) carry 11 rolling-average climate columns (`avgTemp30d`, `minTemp30d`, `maxTemp30d`, `avgHumidity30d`, `totalPrecip30d`, `avgWindSpeed30d`, `avgCloudCover30d`, `avgPm25_30d`, `avgPm10_30d`, `avgUvIndex30d`, `climateUpdatedAt`). These are 30-day rolling averages recomputed nightly by `LocationClimateModule` via bulk SQL aggregation bottom-up from union level. Raw daily data per union is stored in `UnionDailyClimate` (one row per union per day). See `docs/integrations/openmeteo-climate.md` for implementation details.

## Planned Models (not yet in schema)

| Model | Phase | Purpose |
| --- | --- | --- |
| `Habitat` | Phase 3 | Habitat records linked to districts |
| `MediaAsset` | Phase 3 | Uploaded photos/files for reports and observations |
| `CampaignPost` | Phase 5 | Community campaigns and education resources |
| `Notification` | ~~Phase 5~~ **Done (Phase 6c, 2026-08-22)** | Built as `AlertSubscription` + `NotificationDelivery` — see schema above |

`Observation`, `Species`, `RestorationProject`, and `WaterBody` were previously listed here and are now in the schema.

Advanced domain models — climate forecasts, carbon footprint, research publications, structured surveys — are planned for Phase 7 and get their schema when that phase starts. Emissions tracking (`NationalEmissionReading`) shipped in Phase 7 as the first domain, initially as user-input (2026-08-28) then rewritten to World Bank API ingestion (2026-09-02). See `docs/roadmap.md` Phase 7 and `docs/architecture/feature-map.md`.

## Status Workflows

### CitizenReport
```
SUBMITTED → UNDER_REVIEW → VERIFIED → RESOLVED
                         ↘ REJECTED
```
Each transition writes a `ReportStatusEvent` + `AuditEvent`. Only moderators and admins can advance status.

### Observation
```
UNVERIFIED → COMMUNITY → RESEARCH_GRADE
          ↘ FLAGGED
```
Not a strict state machine — `PATCH /observations/:id/trust` sets any target level directly. Only `RESEARCHER`/`ADMIN` may call it; each change writes an `OBSERVATION_TRUST_CHANGE` audit event. Public listings exclude `FLAGGED` unless `trustLevel` is filtered explicitly.

### Alert
```
DRAFT → ACTIVE → EXPIRED
              ↘ CANCELLED
```
Schema default is `DRAFT`; the create endpoint sets `ACTIVE`. Cancelled/expired via `PATCH /alerts/:id`.

### RestorationProject
```
PLANNED → ACTIVE → COMPLETED
       ↘ PAUSED ↗
```
Create defaults to `PLANNED`. Only the project creator or an `ADMIN` may update — enforced in `RestorationService.update`, not by a route-level `@Roles` guard.

### DatasetAccessRequest
```
PENDING → APPROVED
       ↘ REJECTED
```
Defined in the schema; no endpoint implements it yet.

### IngestionJob
```
QUEUED → RUNNING → SUCCEEDED
                ↘ FAILED → (retry → QUEUED)
         CANCELLED
```
`IngestionService` writes these transitions. Weather, GBIF, and Flood schedulers call `startJob` (→ `RUNNING`) then `completeJob` (→ `SUCCEEDED`) or `failJob` (→ `FAILED`). No manual trigger, retry endpoint, or `QUEUED`/`CANCELLED` transition is implemented yet — scheduled crons serve as periodic retry.

## Database Setup

Postgres runs locally on port 5432. The docker-compose no longer includes a Postgres container. `DATABASE_URL` in `.env` uses port 5432. When running the API in Docker, set `DATABASE_URL` to `host.docker.internal:5432`.

```bash
docker-compose up -d          # Start Redis 7 on :6379 (Postgres is local-only)
cd packages/database && pnpm run db:migrate   # Create/update schema
pnpm run db:generate          # Regenerate Prisma client after schema changes
pnpm run db:studio            # Open Prisma Studio at localhost:5555
```

**Migrations applied (11):**

| Migration | Adds |
| --- | --- |
| `20260826150548_init` | Full base schema — 39 tables, 23 enums (includes `SatelliteRadiationReading`, `MarineForecast`) |
| `20260828000000_gamification` | Gamification columns on `UserProfile` |
| `20260828010000_auth_tokens` | `PasswordResetToken`, `EmailVerificationToken` |
| `20260831000000_water_bodies_and_stations` | `WaterBody`, `LoticWaterBodyDetails`, `LenticWaterBodyDetails`, `WaterBodyUpazila`, `WaterLevelStation`, `WaterBodyStation`, `StationFloodForecast`, `WaterLevelReading`; `DatasetVersion`; `ObservationMeasurement`; `ProjectTarget`, `ProjectActivity`, `ProjectMetric`; `AlertArea`; new enums: `AlertType`, `WaterBodyType`, `HydrologicalClass`, `WaterLevelTrend`, `MeasurementParameter`, `MeasurementUnit`, `QualityFlag`, `RestorationTargetMetric`; new `AuditAction` values |
| `20260831010000_water_body_upazila_district_fk` | Adds `districtId` FK to `WaterBodyUpazila` |
| `20260831020000_remove_water_body_upazila_district_id` | Removes that FK (schema refinement) |
| `20260831030000_water_level_station_fk` | Updates `WaterLevelStation` to use proper FK references for district and upazila |
| `20260901000000_postgis_geometry` | Adds `District.geom geography(Point, 4326)` — PostGIS point geometry now active; adds `coastLat`/`coastLng` to `District`; adds gauge threshold columns to `WaterLevelStation`; adds upazila FK relations to `CitizenReport`, `Observation`, `RestorationProject`, `AlertArea` |
| `20260902000000_schema_drift_catch_up` | Schema drift catch-up |
| `20260902010000_world_bank_emissions` | Drops `PollutionSource`, `EmissionEntry`, and 3 related enums; removes `emissions.manage`/`emissions.report` permission rows; creates `NationalEmissionReading` |
| `20260902181219_add_company_model` | Creates `Company` table + `CompanyType` enum; creates `IndustrialFacility` table (with `companyId FK`, `establishedYear`, `productionCapacity`, `landArea`, `etpInstalled`, `etpCapacity`); adds `COMPANY_CREATE`, `COMPANY_UPDATE`, `FACILITY_CREATE`, `FACILITY_UPDATE`, `FACILITY_DELETE` to `AuditAction`; adds `companiesHQ` back-relation on `District` |

60 tables live.

The `LocationsService`, `DatasetsService`, `ProvidersService`, `PermissionsService`, `CompaniesService`, and `SeedService` auto-seed data on first boot via `OnModuleInit`. `LocationsService` seeds 8 divisions, 64 districts (all with GeoJSON boundary), 494 upazilas, and 4,540 unions — all with lat/lng. All coordinates are hardcoded in `apps/api/src/locations/seed/bangladesh.ts`; no runtime file reads are required. This file is the source of truth — edit it directly if location data needs updating. `DatasetsService` seeds 9 catalog records (OpenMeteo Weather, OpenMeteo Flood, District Air Quality Index, Water Body Registry, Biodiversity Occurrences, Sundarbans Monitoring, Emissions Inventory, OpenMeteo Marine Weather, OpenMeteo Satellite Radiation). `ProvidersService` seeds the OpenMeteo, GBIF, and World Bank provider records. `PermissionsService` seeds 11 named permissions and default role grants. `CompaniesService` seeds 42 company records (two-pass: parents first, then subsidiaries) and 44 industrial facility records (looks up company by name via `@unique` constraint) on first boot — see `apps/api/src/companies/companies.seed.ts` and `apps/api/src/facilities/facilities.seed.ts`. `SeedService` seeds 6 dev user accounts (one per role) and a seed organization for local development. No separate seed script is required for those tables.
