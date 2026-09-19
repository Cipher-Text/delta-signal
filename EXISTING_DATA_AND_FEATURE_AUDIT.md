# Existing Data and Feature Audit

Audit date: 2026-09-19. Scope: repository state in `apps/api`, `apps/admin`, `apps/web`, `packages/database`, `packages/shared`, and `packages/contracts`.

## Executive finding

Delta Signal already has enough structured, source-labelled data for a human-reviewed social-content workflow. The strongest inputs are district weather/air quality, weather forecasts, station flood-discharge data, existing alerts, GBIF occurrences, verified citizen reports, and national emissions. The repository has no social-content module, no deterministic image renderer, no LLM client, no Meta integration, and no Admin Console chart/map widget to reuse directly.

The existing Admin Console is a server-rendered Next.js App Router application using server actions, URL-driven tabs/filters, plain tables/forms, shared CSS tokens, and an API session cookie. New work should fit those patterns.

## 1. Environmental domains and exact implementation evidence

| Domain | Backend implementation | Persisted entities / fields | Existing routes | Assessment |
|---|---|---|---|---|
| Geography | `locations/LocationsModule`, `LocationsController`, `LocationsService`; `locations/climate/LocationClimateModule` | `Division`, `District`, `Upazila`, `Union`, `UnionDailyClimate`; names in English/Bengali, coordinates, boundary JSON, climate rollups | `/locations/divisions`, `/locations/districts`, `/locations/districts/:id`, `/locations/upazilas`, `/locations/upazilas/:id`, `/locations/unions`, `/locations/unions/:id` | Strong geographic lookup and district-level joins; no social-specific geographic snapshot API |
| Weather | `weather/WeatherModule`, `WeatherService`, `WeatherOpenMeteoClient`, `WeatherScheduler` | `CurrentWeatherReading`, `HourlyWeatherForecast`, `DailyWeatherForecast`, `UnionDailyClimate`; temperature, apparent temperature, humidity, precipitation, wind, weather code, UV, sunrise/sunset | `/weather/current`, `/weather/current/:districtId`, `/weather/hourly/:districtId`, `/weather/daily/:districtId`, `/weather/air-quality`, `/weather/air-quality/:districtId`; dataset shortcuts `/datasets/weather/current`, `/datasets/air-quality/current` | Best MVP source; hourly/current/daily data and district scope exist |
| Air quality | Weather module's Open-Meteo air-quality client/service/scheduler | `HourlyAirQuality`: PM10, PM2.5, CO, NO2, SO2, ozone, UV | `/weather/air-quality`, `/weather/air-quality/:districtId` | Data exists, but an AQI calculation/health band is not evidenced; publish raw metrics with careful wording unless a documented conversion is added |
| Flood / discharge | `flood/FloodModule`, `FloodService`, `FloodOpenMeteoClient`, `FloodScheduler` | `WaterLevelStation`, `WaterLevelReading`, `StationFloodForecast`; station thresholds, observed level/discharge/trend, forecast discharge mean/median/min/max/percentiles | `/flood/forecast`, `/flood/forecast/station/:stationId`, `/flood/forecast/district/:districtId`, `/flood/stations/:stationId/readings`, `/flood/stations/:stationId/latest` | Useful signal; discharge and flood risk must remain distinct |
| Water bodies | `water-bodies/WaterBodiesModule`, `WaterBodiesController`, `WaterBodiesService` | `WaterBody`, `WaterBodyUpazila`, `LoticWaterBodyDetails`, `LenticWaterBodyDetails`, station join tables | `/water-bodies`, `/water-bodies/stations`, `/water-bodies/:id` | Good reference/map metadata; no broad observed water-quality series beyond citizen observations |
| Marine | `marine/MarineModule`, `MarineService`, `MarineOpenMeteoClient`, `MarineScheduler` | `MarineForecast` per coastal district: wave, swell, wind-wave, sea-surface temperature | `/marine/forecast`, `/marine/forecast/:districtId` | Coastal forecast content is possible; inland rows intentionally absent |
| Satellite radiation | `radiation/RadiationModule`, `RadiationService`, `RadiationScheduler` | `SatelliteRadiationReading`: daily shortwave radiation sum | `/radiation/daily`, `/radiation/daily/:districtId` | Suitable for a fact/explainer or solar-weather card, not a public-health claim |
| Biodiversity / GBIF | `biodiversity/BiodiversityModule`, `BiodiversityService`, `GbifClient`, `BiodiversityScheduler` | `Species`, `Occurrence`; canonical name, vernacular name, taxonomy, image URL, IUCN status, coordinates, date, basis of record | `/biodiversity/species`, `/biodiversity/species/:id`, `/biodiversity/occurrences` | Good for observation/species cards; occurrence is not automatically a new population trend |
| National emissions | `emissions/EmissionsModule`, `EmissionsService`, `WorldBankClient`, `EmissionsScheduler` | `NationalEmissionReading`: year, indicator code/name, value, unit, ingestion job | `/emissions`, `/emissions/indicators`, `/emissions/:year` | Historical national fact cards; annual and not district-level |
| Citizen reports | `reports/ReportsModule`, `ReportsService`, `ReportsController` | `CitizenReport`, `ReportStatusEvent`, `ReportComment`, `ReportMedia`; status, category, location, facility link, media URL | `/reports`, `/reports/mine`, `/reports/nearby`, `/reports/:id`, `/reports/:id/status`, comments/media routes | Strong moderation lifecycle; only VERIFIED/RESOLVED reports should be content inputs by default |
| Citizen observations | `observations/ObservationsModule`, `ObservationsService`, `ObservationsController` | `Observation`, `ObservationMeasurement`; category, trust level, description, species, location, observed time, measurements and quality flag | `/observations`, `/observations/mine`, `/observations/nearby`, `/observations/:id`, trust and measurement routes | Use RESEARCH_GRADE or explicitly label COMMUNITY; do not silently promote UNVERIFIED |
| Facilities / companies | `facilities/FacilitiesModule`, `FacilitiesService`, `FacilitiesController`; `companies/CompaniesModule` | `Company`, `IndustrialFacility`; type, active flag, compliance status, district/upazila/union, coordinates | `/industrial-sites`, `/industrial-sites/:id`; `/companies`, `/companies/:id` | Directory and contextual map content only; no evidence of facility emissions measurements in this repository |
| Alerts | `alerts/AlertsModule`, `AlertsService`, `AlertsController` | `Alert`, `AlertArea`; severity, status, alert type, instructions, issue/expiry, scopes | `/alerts`, `/alerts/:id`, admin mutation routes protected by `alerts.manage` | Strongest safe signal for alert cards because it is already editorially issued |
| Restoration | `restoration/RestorationModule`, `RestorationService` | `RestorationProject`, `ProjectTarget`, `ProjectActivity`, `ProjectMetric`, participants | `/restoration/projects` and nested target/activity/metric routes | Supports milestone/project cards, but is outside the first five recommended types |

## 2. External providers, datasets, and ingestion

`ProvidersService` seeds exactly three providers: `OpenMeteo` (international org, Germany), `GBIF` (international org, Denmark), and `World Bank` (international org, United States). The provider routes are public: `/providers` and `/providers/:id`.

External clients found:

- `WeatherOpenMeteoClient`: Open-Meteo forecast and air-quality APIs.
- `FloodOpenMeteoClient`: Open-Meteo flood API/GloFAS-style discharge forecasts.
- `MarineOpenMeteoClient`: Open-Meteo marine API.
- `GbifClient`: GBIF occurrence API.
- `WorldBankClient`: World Bank Climate Change API for Bangladesh indicator history.

`Dataset` is a catalogue/metadata entity, not a generic measurement table. It includes category, source, provider, description, record count, last sync, license, refresh cron, version, spatial extent, temporal coverage, and access policy. `DatasetVersion` provides version/publish metadata. Dataset routes include public listing/detail/versions, admin create/update/publish, access requests, and downloads.

Every ingestion-capable data table stores an optional `ingestionJobId` where appropriate. `IngestionJob` records provider, status (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`), timestamps, and error message. `IngestionController` exposes `/ingestion/jobs` and `/ingestion/jobs/:id` to MODERATOR/ADMIN.

## 3. Historical, forecast, aggregated, and location data

- Historical: `UnionDailyClimate` has daily union climate history. `NationalEmissionReading` has annual World Bank history. GBIF `Occurrence` stores dated observations where available. `WaterLevelReading` is timestamped station history. Weather current readings and forecast rows are also retained, subject to provider refresh/upsert behavior.
- Forecast: `HourlyWeatherForecast`, `DailyWeatherForecast`, `StationFloodForecast`, `MarineForecast`, and hourly air-quality rows are stored. Forecast rows are keyed by district/station and forecast time/date.
- Aggregated/statistical: `Division`, `District`, `Upazila`, and `Union` have 30-day rolling climate fields (`avgTemp30d`, min/max temperature, humidity, precipitation, wind, cloud cover, PM2.5/PM10, UV) with `climateUpdatedAt`. `AnalyticsService` also computes dashboard groupings, report/observation trends, climate summaries, and flood ratios/risk classifications.
- District/location level: district is the primary key for weather, air quality, daily forecasts, marine and radiation. Station data is more precise for rivers. Union climate history is the finest structured climate history. District boundary JSON and coordinates exist for future map cards.
- Missing: no general-purpose historical climate aggregation service for arbitrary comparison windows, no time-series API for every metric, no social-ready source snapshot object, and no map-image export endpoint.

## 4. Alerts, notifications, files, maps, charts, and jobs

Alerts use `AlertSeverity` (`INFO`, `WATCH`, `WARNING`, `EMERGENCY`), `AlertStatus` (`DRAFT`, `ACTIVE`, `EXPIRED`, `CANCELLED`), and typed domains such as `FLOOD`, `HEATWAVE`, and `AIR_QUALITY`. Activating an alert calls `NotificationsService.dispatchForAlert`, creates `NotificationDelivery` rows, and enqueues email work through BullMQ. Notification channels currently contain `EMAIL`; no social channel exists.

`MediaModule` provides authenticated `POST /media/upload` and `POST /media/presign`. `StorageService` uses S3-compatible storage (MinIO/S3 configuration), allowed image MIME types, upload folders, 10 MB server-proxy limit, and 15-minute presigned PUT URLs. `ReportMedia` stores report-linked media URLs. There is no persistent generic `MediaAsset` table and no rendered-card folder/type yet.

The public web app has a Leaflet/react-leaflet map (`apps/web/components/map-client.tsx`, loaded by `map-section.tsx`) and map data for districts, alerts, and reports. It has presentation components for weather, flood-risk, metrics, biodiversity, and reports. The Admin Console has no map library, chart library, or canvas/image rendering implementation. `AnalyticsService` returns arrays suitable for charts but does not render charts itself.

Scheduled jobs are Nest `@Cron` jobs protected by PostgreSQL advisory-style locks in `common/pg-cron-lock`:

- weather current every 15 minutes, hourly/AQ every 2 hours, daily every 12 hours;
- GBIF daily at midnight;
- union climate rollup daily at midnight;
- satellite radiation daily at 01:00;
- marine forecasts daily at 02:00;
- flood forecasts daily at 03:00;
- World Bank emissions weekly Sunday at 03:00;
- refresh-token/OAuth-code cleanup daily;
- BullMQ processors for email, gamification, and other existing asynchronous work.

The Admin System Health page lists only a subset of cron jobs and provides ingestion history; there is no manual trigger UI.

## 5. Admin Console and access control

Admin routes are under `apps/admin/app/(admin)` and use `AdminLayout`, `AdminNav`, `apiGet`, server actions, and the `ADMIN_ACCESS_TOKEN_COOKIE`. Existing pages are `/reports`, `/alerts`, `/observations`, `/ingestion`, `/system`, `/permissions`, `/datasets`, `/users`, `/organizations`, `/restoration`, `/audit`, and `/settings`.

The design system is in `apps/admin/app/globals.css`: dark sidebar, teal accent `#3d9fa8`, pale page background, surface cards, tabs, badges/tags, tables, forms, flash messages, and pagination. Existing moderation pages use status tabs and inline actions. New Social Content should use the same page header, tab bar, data-table, create-panel, badges, and server-action patterns.

Backend authorization combines JWT, `RolesGuard`, `PermissionsGuard`, `@Roles`, and `@Permissions`. Shared permissions currently include `reports.moderate`, `alerts.manage`, `observations.verify`, `observations.delete`, `users.manage`, and others; there is no social-content permission. `ADMIN` bypasses permission checks. `AuditEvent` stores action, actor, entity type/id, JSON metadata, IP, and timestamp. Social mutations need new audit actions or a stable entity/action convention.

## 6. Explicitly not found

- No `social`, `photocard`, `content-candidate`, `template`, `rendered-asset`, `publication`, or `LLM` module/entity/service/controller.
- No OpenAI, Anthropic, Gemini, or other model SDK/client/prompt service.
- No Facebook Graph API, Instagram publishing, OAuth token vault, or external publication log.
- No deterministic server-side SVG/canvas/HTML-to-image renderer.
- No Admin Console preview/download workflow for generated images.
- No general AQI derivation, no evidence-based facility pollution measurements, no broad river flood-history baseline beyond stored forecast percentile/mean fields, and no arbitrary historical comparison endpoint.

