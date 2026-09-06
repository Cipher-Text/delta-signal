/**
 * Compile-time contract enforcement.
 *
 * This file has no runtime effect — it is never imported by production code.
 * Its only job is to be checked by `tsc --noEmit` (which CI runs on every PR).
 * If a service changes its return shape in a way that breaks the frontend
 * contract, the relevant assignment below will produce a type error and the
 * build fails before any code ships.
 *
 * How to read the checks:
 *
 *   declare const result: Jsonified<Awaited<ReturnType<SomeService['method']>>>;
 *   const _check: ContractType = result;
 *
 * The assignment fails if `result` is missing a field that `ContractType`
 * requires, or has the wrong type for a field. Extra fields on `result` are
 * fine — TypeScript's structural typing allows subtyping.
 *
 * `Jsonified<T>` converts Date → string to match what NestJS sends over the
 * wire (JSON.stringify turns every Date into an ISO-8601 string).
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  PaginatedEnvelope,
  CitizenReport,
  Alert,
  Observation,
  Dataset,
  RestorationProject,
  Species,
  Occurrence,
  CurrentWeatherReading,
  HourlyAirQualityReading,
  PlatformMetrics,
  AdminDashboard,
  ModeratorDashboard,
  GovernmentDashboard,
  ResearcherDashboard,
  OrgAdminDashboard,
  FacilityPagedResponse,
  FacilityDetail,
} from '@delta-signal/contracts';

import type { ReportsService } from '../reports/reports.service';
import type { AlertsService } from '../alerts/alerts.service';
import type { ObservationsService } from '../observations/observations.service';
import type { DatasetsService } from '../datasets/datasets.service';
import type { RestorationService } from '../restoration/restoration.service';
import type { BiodiversityService } from '../biodiversity/biodiversity.service';
import type { WeatherService } from '../weather/weather.service';
import type { MetricsService } from '../metrics/metrics.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { FacilitiesService } from '../facilities/facilities.service';

// ─── Jsonified utility ────────────────────────────────────────────────────────
//
// NestJS serialises every Date to an ISO-8601 string before sending the HTTP
// response.  The contracts package uses `string` for all date fields, but
// Prisma returns `Date`.  This utility maps Date→string so that the Prisma
// inferred return type can be compared directly to the contract type.

type Jsonified<T> =
  T extends Date        ? string
  : T extends null      ? null
  : T extends undefined ? undefined
  : T extends (infer U)[]  ? Jsonified<U>[]
  : T extends object    ? { [K in keyof T]: Jsonified<T[K]> }
  : T;

// ─── Reports ─────────────────────────────────────────────────────────────────

declare const _reportList: Jsonified<Awaited<ReturnType<ReportsService['list']>>>;
const _checkReportList: PaginatedEnvelope<CitizenReport> = _reportList;

declare const _reportDetail: Jsonified<Awaited<ReturnType<ReportsService['getById']>>>;
// getById intentionally returns statusHistory in addition to the contract
// fields — the extra field is not a problem (structural subtyping).
const _checkReportDetail: CitizenReport = _reportDetail;

// ─── Alerts ──────────────────────────────────────────────────────────────────

declare const _alertList: Jsonified<Awaited<ReturnType<AlertsService['list']>>>;
const _checkAlertList: PaginatedEnvelope<Alert> = _alertList;

declare const _alertDetail: Jsonified<Awaited<ReturnType<AlertsService['getById']>>>;
const _checkAlertDetail: Alert = _alertDetail;

// ─── Observations ─────────────────────────────────────────────────────────────

declare const _observationList: Jsonified<Awaited<ReturnType<ObservationsService['list']>>>;
const _checkObservationList: PaginatedEnvelope<Observation> = _observationList;

// ─── Datasets ────────────────────────────────────────────────────────────────

declare const _datasetList: Jsonified<Awaited<ReturnType<DatasetsService['list']>>>;
const _checkDatasetList: PaginatedEnvelope<Dataset> = _datasetList;

declare const _datasetDetail: Jsonified<Awaited<ReturnType<DatasetsService['getById']>>>;
const _checkDatasetDetail: Dataset = _datasetDetail;

// ─── Restoration ─────────────────────────────────────────────────────────────

declare const _projectList: Jsonified<Awaited<ReturnType<RestorationService['list']>>>;
const _checkProjectList: PaginatedEnvelope<RestorationProject> = _projectList;

// ─── Biodiversity ─────────────────────────────────────────────────────────────

declare const _speciesList: Jsonified<Awaited<ReturnType<BiodiversityService['list']>>>;
const _checkSpeciesList: PaginatedEnvelope<Species> = _speciesList;

declare const _occurrenceList: Jsonified<Awaited<ReturnType<BiodiversityService['listOccurrences']>>>;
const _checkOccurrenceList: PaginatedEnvelope<Occurrence> = _occurrenceList;

// ─── Weather ─────────────────────────────────────────────────────────────────

declare const _currentWeather: Jsonified<Awaited<ReturnType<WeatherService['getLatestCurrent']>>>;
// getLatestCurrent may return null (no data yet for a district)
const _checkCurrentWeather: CurrentWeatherReading | null = _currentWeather;

declare const _airQuality: Jsonified<Awaited<ReturnType<WeatherService['getLatestAirQuality']>>>;
const _checkAirQuality: HourlyAirQualityReading | null = _airQuality;

// ─── Metrics ─────────────────────────────────────────────────────────────────

declare const _metrics: Awaited<ReturnType<MetricsService['getPlatformMetrics']>>;
const _checkMetrics: PlatformMetrics = _metrics;

// ─── Analytics ────────────────────────────────────────────────────────────────

declare const _adminDashboard: Jsonified<Awaited<ReturnType<AnalyticsService['getAdminDashboard']>>>;
const _checkAdminDashboard: AdminDashboard = _adminDashboard;

declare const _moderatorDashboard: Jsonified<Awaited<ReturnType<AnalyticsService['getModeratorDashboard']>>>;
const _checkModeratorDashboard: ModeratorDashboard = _moderatorDashboard;

declare const _governmentDashboard: Jsonified<Awaited<ReturnType<AnalyticsService['getGovernmentDashboard']>>>;
const _checkGovernmentDashboard: GovernmentDashboard = _governmentDashboard;

declare const _researcherDashboard: Jsonified<Awaited<ReturnType<AnalyticsService['getResearcherDashboard']>>>;
const _checkResearcherDashboard: ResearcherDashboard = _researcherDashboard;

declare const _orgAdminDashboard: Jsonified<Awaited<ReturnType<AnalyticsService['getOrgAdminDashboard']>>>;
const _checkOrgAdminDashboard: OrgAdminDashboard = _orgAdminDashboard;

// ─── Facilities ────────────────────────────────────────────────────────────────

declare const _facilityList: Jsonified<Awaited<ReturnType<FacilitiesService['list']>>>;
const _checkFacilityList: FacilityPagedResponse = _facilityList;

declare const _facilityDetail: Jsonified<Awaited<ReturnType<FacilitiesService['getById']>>>;
const _checkFacilityDetail: FacilityDetail = _facilityDetail;
