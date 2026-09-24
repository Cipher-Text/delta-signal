import type {
  UserRole,
  AlertSeverity,
  AlertStatus,
  AlertType,
  ReportCategory,
  ReportStatus,
  DatasetCategory,
  DatasetAccessPolicy,
  ObservationCategory,
  ObservationTrustLevel,
  ProjectStatus,
  RestorationCategory,
  ProviderType,
  OrganizationType,
  OrganizationMemberRole,
  Permission,
  PlatformMetrics,
  WaterLevelTrend,
  WaterLevelThresholdStatus,
} from '@delta-signal/shared';

// Re-export shared types that callers expect to find here
export type {
  UserRole,
  AlertSeverity,
  AlertStatus,
  AlertType,
  ReportCategory,
  ReportStatus,
  DatasetCategory,
  DatasetAccessPolicy,
  ObservationCategory,
  ObservationTrustLevel,
  ProjectStatus,
  RestorationCategory,
  ProviderType,
  OrganizationType,
  OrganizationMemberRole,
  Permission,
  PlatformMetrics,
  WaterLevelTrend,
  WaterLevelThresholdStatus,
} from '@delta-signal/shared';

// ─── API Prefix ───────────────────────────────────────────────────────────────

export const apiPrefix = '/api/v1';

// ─── Routes ───────────────────────────────────────────────────────────────────
//
// CONTRACT RULE: The frontend must not call any backend route using a raw
// string literal. Import `routes` from this package and reference the
// appropriate key. Every route used by the frontend must be defined here
// before integration begins.
//
// To add a new route:
//   1. Add it in the relevant group below.
//   2. Add request and response types below the routes object.
//   3. Update `apps/web` or other callers to use the new key.

export const routes = {
  health: `${apiPrefix}/health`,

  gamification: {
    me: `${apiPrefix}/gamification/me`,
  },

  auth: {
    register: `${apiPrefix}/auth/register`,
    login: `${apiPrefix}/auth/login`,
    refresh: `${apiPrefix}/auth/refresh`,
    logout: `${apiPrefix}/auth/logout`,
    profile: `${apiPrefix}/auth/profile`,
    forgotPassword: `${apiPrefix}/auth/forgot-password`,
    resetPassword: `${apiPrefix}/auth/reset-password`,
    sendVerification: `${apiPrefix}/auth/send-verification`,
    verifyEmail: `${apiPrefix}/auth/verify-email`,
    // OAuth — browser navigates directly to this API path (not a fetch call)
    google: `${apiPrefix}/auth/google`,
    // Exchange code redemption — POSTed by the Next.js /auth/callback route handler
    exchange: `${apiPrefix}/auth/exchange`,
  },

  locations: {
    divisions: `${apiPrefix}/locations/divisions`,
    districts: `${apiPrefix}/locations/districts`,
    district: (id: string) => `${apiPrefix}/locations/districts/${id}`,
    upazilas: `${apiPrefix}/locations/upazilas`,
    upazila: (id: string) => `${apiPrefix}/locations/upazilas/${id}`,
    unions: `${apiPrefix}/locations/unions`,
    union: (id: string) => `${apiPrefix}/locations/unions/${id}`,
  },

  datasets: {
    list: `${apiPrefix}/datasets`,
    detail: (id: string) => `${apiPrefix}/datasets/${id}`,
    currentWeather: `${apiPrefix}/datasets/weather/current`,
    currentAirQuality: `${apiPrefix}/datasets/air-quality/current`,
    download: (id: string) => `${apiPrefix}/datasets/${id}/download`,
    accessRequest: (id: string) => `${apiPrefix}/datasets/${id}/access-request`,
  },

  reports: {
    list: `${apiPrefix}/reports`,
    mine: `${apiPrefix}/reports/mine`,
    detail: (id: string) => `${apiPrefix}/reports/${id}`,
    create: `${apiPrefix}/reports`,
    updateStatus: (id: string) => `${apiPrefix}/reports/${id}/status`,
    comments: (id: string) => `${apiPrefix}/reports/${id}/comments`,
    addComment: (id: string) => `${apiPrefix}/reports/${id}/comments`,
    media: (id: string) => `${apiPrefix}/reports/${id}/media`,
    addMedia: (id: string) => `${apiPrefix}/reports/${id}/media`,
  },

  alerts: {
    list: `${apiPrefix}/alerts`,
    detail: (id: string) => `${apiPrefix}/alerts/${id}`,
    create: `${apiPrefix}/alerts`,
    update: (id: string) => `${apiPrefix}/alerts/${id}`,
  },

  observations: {
    list: `${apiPrefix}/observations`,
    mine: `${apiPrefix}/observations/mine`,
    detail: (id: string) => `${apiPrefix}/observations/${id}`,
    create: `${apiPrefix}/observations`,
    updateTrust: (id: string) => `${apiPrefix}/observations/${id}/trust`,
  },

  biodiversity: {
    highlights: `${apiPrefix}/biodiversity/highlights`,
    species: `${apiPrefix}/biodiversity/species`,
    speciesDetail: (id: string) => `${apiPrefix}/biodiversity/species/${id}`,
    occurrences: `${apiPrefix}/biodiversity/occurrences`,
  },

  restoration: {
    projects: `${apiPrefix}/restoration/projects`,
    project: (id: string) => `${apiPrefix}/restoration/projects/${id}`,
    create: `${apiPrefix}/restoration/projects`,
    update: (id: string) => `${apiPrefix}/restoration/projects/${id}`,
    join: (id: string) => `${apiPrefix}/restoration/projects/${id}/join`,
  },

  community: {
    posts:         `${apiPrefix}/community/posts`,
    post:          (id: string) => `${apiPrefix}/community/posts/${id}`,
    createPost:    `${apiPrefix}/community/posts`,
    deletePost:    (id: string) => `${apiPrefix}/community/posts/${id}`,
    comments:      (postId: string) => `${apiPrefix}/community/posts/${postId}/comments`,
    addComment:    (postId: string) => `${apiPrefix}/community/posts/${postId}/comments`,
    deleteComment: (postId: string, commentId: string) =>
      `${apiPrefix}/community/posts/${postId}/comments/${commentId}`,
    vote:          (postId: string) => `${apiPrefix}/community/posts/${postId}/poll/vote`,
  },

  providers: {
    list: `${apiPrefix}/providers`,
    detail: (id: string) => `${apiPrefix}/providers/${id}`,
  },

  weather: {
    current: `${apiPrefix}/weather/current`,
    currentByDistrict: (districtId: string) => `${apiPrefix}/weather/current/${districtId}`,
    hourly: (districtId: string) => `${apiPrefix}/weather/hourly/${districtId}`,
    daily: (districtId: string) => `${apiPrefix}/weather/daily/${districtId}`,
    airQuality: `${apiPrefix}/weather/air-quality`,
    airQualityByDistrict: (districtId: string) => `${apiPrefix}/weather/air-quality/${districtId}`,
  },

  flood: {
    forecast: `${apiPrefix}/flood/forecast`,
    forecastByStation: (stationId: string) => `${apiPrefix}/flood/forecast/station/${stationId}`,
    forecastByDistrict: (districtId: string) => `${apiPrefix}/flood/forecast/district/${districtId}`,
    stationLatest: (stationId: string) => `${apiPrefix}/flood/stations/${stationId}/latest`,
  },

  radiation: {
    daily: `${apiPrefix}/radiation/daily`,
    dailyByDistrict: (districtId: string) => `${apiPrefix}/radiation/daily/${districtId}`,
  },

  marine: {
    forecast: `${apiPrefix}/marine/forecast`,
    forecastByDistrict: (districtId: string) => `${apiPrefix}/marine/forecast/${districtId}`,
  },

  waterBodies: {
    list: `${apiPrefix}/water-bodies`,
    detail: (id: string) => `${apiPrefix}/water-bodies/${id}`,
    stations: `${apiPrefix}/water-bodies/stations`,
  },

  emissions: {
    list: `${apiPrefix}/emissions`,
    byYear: (year: number) => `${apiPrefix}/emissions/${year}`,
    indicators: `${apiPrefix}/emissions/indicators`,
  },

  industrialSites: {
    list: `${apiPrefix}/industrial-sites`,
    detail: (id: string) => `${apiPrefix}/industrial-sites/${id}`,
    create: `${apiPrefix}/industrial-sites`,
    update: (id: string) => `${apiPrefix}/industrial-sites/${id}`,
    delete: (id: string) => `${apiPrefix}/industrial-sites/${id}`,
  },

  companies: {
    list: `${apiPrefix}/companies`,
    detail: (id: string) => `${apiPrefix}/companies/${id}`,
    create: `${apiPrefix}/companies`,
    update: (id: string) => `${apiPrefix}/companies/${id}`,
  },

  users: {
    list: `${apiPrefix}/users`,
    detail: (id: string) => `${apiPrefix}/users/${id}`,
    updateRole: (id: string) => `${apiPrefix}/users/${id}/role`,
    deactivate: (id: string) => `${apiPrefix}/users/${id}/deactivate`,
    reactivate: (id: string) => `${apiPrefix}/users/${id}/reactivate`,
    auditEvents: `${apiPrefix}/users/audit-events`,
    researcherApplications: `${apiPrefix}/users/researcher-applications`,
    reviewResearcherApplication: (id: string) => `${apiPrefix}/users/researcher-applications/${id}/review`,
  },

  researcherApplications: {
    mine: `${apiPrefix}/researcher-applications/mine`,
    submit: `${apiPrefix}/researcher-applications`,
  },

  organizations: {
    list: `${apiPrefix}/organizations`,
    detail: (id: string) => `${apiPrefix}/organizations/${id}`,
    manage: `${apiPrefix}/admin/organizations`,
    members: (id: string) => `${apiPrefix}/admin/organizations/${id}/members`,
    member: (organizationId: string, userId: string) =>
      `${apiPrefix}/admin/organizations/${organizationId}/members/${userId}`,
  },

  members: {
    list: `${apiPrefix}/members`,
    districts: `${apiPrefix}/members/districts`,
    detail: (id: string) => `${apiPrefix}/members/${id}`,
  },

  permissions: {
    list: `${apiPrefix}/admin/permissions`,
    roles: `${apiPrefix}/admin/permissions/roles`,
  },

  metrics: {
    platform: `${apiPrefix}/metrics/platform`,
  },

  analytics: {
    citizen: `${apiPrefix}/analytics/citizen`,
    admin: `${apiPrefix}/analytics/admin`,
    moderator: `${apiPrefix}/analytics/moderator`,
    government: `${apiPrefix}/analytics/government`,
    researcher: `${apiPrefix}/analytics/researcher`,
    orgadmin: `${apiPrefix}/analytics/orgadmin`,
  },

  notifications: {
    subscriptions: `${apiPrefix}/notifications/subscriptions`,
    unsubscribe: (id: string) => `${apiPrefix}/notifications/subscriptions/${id}`,
  },

  socialContent: {
    nationalSuggestions: `${apiPrefix}/social-content/suggestions/national`,
    drafts: `${apiPrefix}/social-content/drafts`,
    draft: (id: string) => `${apiPrefix}/social-content/drafts/${id}`,
    render: (id: string) => `${apiPrefix}/social-content/drafts/${id}/render`,
    approve: (id: string) => `${apiPrefix}/social-content/drafts/${id}/approve`,
    archive: (id: string) => `${apiPrefix}/social-content/drafts/${id}/archive`,
    markPublished: (id: string) => `${apiPrefix}/social-content/drafts/${id}/mark-published`,
    download: (id: string) => `${apiPrefix}/social-content/drafts/${id}/download`,
    publish: (draftId: string) => `${apiPrefix}/social-content/drafts/${draftId}/publish`,
    platforms: `${apiPrefix}/social-content/platforms`,
    platformConnect: (platform: string) => `${apiPrefix}/social-content/platforms/${platform}/connect`,
    platformDisconnect: (id: string) => `${apiPrefix}/social-content/platforms/${id}`,
  },
} as const;

// ─── Response Envelopes ───────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ─── Common Query Params ──────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface LocationFilterParams {
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ExchangeCodeRequest {
  code: string;
}

// ─── Geography ────────────────────────────────────────────────────────────────

export interface DivisionSummary {
  id: string;
  name: string;
  bnName?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  areaSqKm?: number | null;
  _count?: { districts: number };
}

/** Returned by GET /api/v1/locations/divisions — includes 30-day rolling climate columns */
export interface DivisionWithClimate extends DivisionSummary {
  avgTemp30d: number | null;
  minTemp30d: number | null;
  maxTemp30d: number | null;
  avgHumidity30d: number | null;
  totalPrecip30d: number | null;
  avgWindSpeed30d: number | null;
  avgPm25_30d: number | null;
  avgPm10_30d: number | null;
  avgUvIndex30d: number | null;
  climateUpdatedAt: string | null;
}

export interface DistrictSummary {
  id: string;
  name: string;
  bnName?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  areaSqKm?: number | null;
  division?: { id: string; name: string };
  _count?: { upazilas: number };
}

/** Returned by GET /api/v1/locations/districts — includes 30-day rolling climate columns */
export interface DistrictWithClimate extends DistrictSummary {
  avgTemp30d: number | null;
  maxTemp30d: number | null;
  totalPrecip30d: number | null;
  avgPm25_30d: number | null;
  avgPm10_30d: number | null;
  avgUvIndex30d: number | null;
  climateUpdatedAt: string | null;
}

export interface UpazilaSummary {
  id: string;
  name: string;
  bnName?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  areaSqKm?: number | null;
  isThana: boolean;
  district?: { id: string; name: string };
  _count?: { unions: number };
}

export interface UnionSummary {
  id: string;
  name: string;
  bnName?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  upazila?: {
    id: string;
    name: string;
    district: { id: string; name: string };
  };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface CitizenReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  summary: string | null;
  districtId: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; displayName: string } | null;
  district: DistrictSummary | null;
}

export interface CreateReportRequest {
  title: string;
  category: ReportCategory;
  description: string;
  locationId?: string;
  coordinates?: { lat: number; lng: number };
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
  note?: string;
}

export interface ReportComment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; displayName: string };
}

export interface CreateReportCommentRequest {
  body: string;
  isInternal?: boolean;
}

export interface ReportMedia {
  id: string;
  url: string;
  mimeType: string | null;
  fileSize: number | null;
  caption: string | null;
  createdAt: string;
  uploadedBy: { id: string; displayName: string };
}

export interface AddReportMediaRequest {
  url: string;
  mimeType?: string;
  fileSize?: number;
  caption?: string;
}

export interface ReportListParams extends PaginationParams, LocationFilterParams {
  status?: ReportStatus;
  category?: ReportCategory;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  title: string;
  description: string;
  alertType: AlertType | null;
  severity: AlertSeverity;
  status: AlertStatus;
  instructions: string | null;
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
  district: DistrictSummary | null;
}

export interface CreateAlertRequest {
  title: string;
  severity: AlertSeverity;
  description: string;
  instructions?: string;
  locationId?: string;
  expiresAt?: string;
}

export interface UpdateAlertRequest {
  status?: AlertStatus;
  instructions?: string;
  expiresAt?: string;
}

export interface AlertListParams extends PaginationParams, LocationFilterParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
}

// ─── Observations ─────────────────────────────────────────────────────────────

export interface Observation {
  id: string;
  category: ObservationCategory;
  trustLevel: ObservationTrustLevel;
  description: string;
  districtId: string | null;
  lat: number | null;
  lng: number | null;
  species: string | null;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
  observer: { id: string; displayName: string } | null;
  district: DistrictSummary | null;
}

export interface CreateObservationRequest {
  category: ObservationCategory;
  description: string;
  districtId?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateObservationTrustRequest {
  trustLevel: ObservationTrustLevel;
}

export interface ObservationListParams extends PaginationParams, LocationFilterParams {
  category?: ObservationCategory;
  trustLevel?: ObservationTrustLevel;
}

// ─── Datasets ─────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  description: string | null;
  website: string | null;
  country: string;
  isVerified: boolean;
  createdAt: string;
  providers?: Array<{ id: string; name: string; type: ProviderType; isActive: boolean }>;
}

export interface UserProfile {
  avatarUrl: string | null;
  phone: string | null;
  preferredLanguage: string;
  occupation: string | null;
  bio: string | null;
  expertise: string[];
  researchInterests: string[];
  education: string | null;
  institution: string | null;
  locationDistrict: string | null;
  locationCountry: string;
  profileVisibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'PRIVATE';
  contactVisibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'PRIVATE';
  linksVisibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'PRIVATE';
}

export interface UserSocialLink {
  platform: string;
  url: string;
}

/** Directory entry returned by GET /members — a privacy-filtered subset of User + UserProfile. */
export interface MemberSummary {
  id: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  profile: {
    avatarUrl: string | null;
    occupation: string | null;
    bio: string | null;
    institution: string | null;
    locationDistrict: string | null;
    locationCountry: string;
    earnedBadges: string[];
    contributionPoints: number;
  } | null;
}

/** GET /members/:id — richer than MemberSummary; phone is never included (PII, no public use case). */
export interface MemberDetail {
  id: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  profile: {
    avatarUrl: string | null;
    occupation: string | null;
    bio: string | null;
    institution: string | null;
    education: string | null;
    expertise: string[];
    researchInterests: string[];
    locationDistrict: string | null;
    locationCountry: string;
    earnedBadges: string[];
    contributionPoints: number;
  } | null;
  socialLinks: UserSocialLink[];
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  country: string;
  isActive: boolean;
  organization: { id: string; name: string } | null;
}

export interface Dataset {
  id: string;
  name: string;
  category: DatasetCategory;
  accessPolicy: DatasetAccessPolicy;
  source: string;
  providerId: string | null;
  provider: { id: string; name: string; type: string } | null;
  description: string | null;
  recordCount: number | null;
  lastSyncedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetListParams extends PaginationParams {
  category?: DatasetCategory;
  accessPolicy?: DatasetAccessPolicy;
}

// ─── Restoration ──────────────────────────────────────────────────────────────

export interface RestorationProject {
  id: string;
  title: string;
  description: string;
  category: RestorationCategory;
  status: ProjectStatus;
  organizationId: string | null;
  districtId: string | null;
  startDate: string | null;
  endDate: string | null;
  impactSummary: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string } | null;
  district: DistrictSummary | null;
  _count: { participants: number };
}

export interface CreateRestorationProjectRequest {
  title: string;
  description: string;
  category: RestorationCategory;
  organizationId?: string;
  districtId?: string;
  startDate?: string;
  endDate?: string;
  impactSummary?: string;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export interface PermissionWithRoles {
  id: string;
  key: string;
  description: string;
  /** Roles that currently hold this permission. ADMIN is always excluded from this list. */
  roles: string[];
}

export interface UpdateRestorationProjectRequest {
  status?: ProjectStatus;
  impactSummary?: string;
  endDate?: string;
}

export interface RestorationProjectListParams extends PaginationParams, LocationFilterParams {
  status?: ProjectStatus;
  category?: RestorationCategory;
}

// ─── Biodiversity ─────────────────────────────────────────────────────────────

export interface Species {
  id: string;
  gbifKey: number;
  canonicalName: string;
  vernacularName: string | null;
  kingdom: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  /** Not populated in v1 — no per-species GBIF/IUCN enrichment call yet. */
  iucnStatus: string | null;
  imageUrl: string | null;
  _count: { occurrences: number };
}

export interface Occurrence {
  id: string;
  speciesId: string;
  districtId: string | null;
  lat: number;
  lng: number;
  observedAt: string | null;
  recordedBy: string | null;
  basisOfRecord: string | null;
  createdAt: string;
  species: Species;
  district: DistrictSummary | null;
}

export interface SpeciesListParams extends PaginationParams {
  search?: string;
}

export interface OccurrenceListParams extends PaginationParams, LocationFilterParams {
  speciesId?: string;
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface CurrentWeatherReading {
  id: string;
  districtId: string;
  lat: number;
  lng: number;
  readingTime: string;
  temperature2m: number | null;
  relativeHumidity2m: number | null;
  apparentTemperature: number | null;
  windSpeed10m: number | null;
  windDirection10m: number | null;
  windGusts10m: number | null;
  surfacePressure: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  cloudCover: number | null;
  isDay: boolean | null;
  district?: { id: string; name: string };
}

export interface HourlyAirQualityReading {
  id: string;
  districtId: string;
  lat: number;
  lng: number;
  forecastTime: string;
  pm10: number | null;
  pm25: number | null;
  carbonMonoxide: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  ozone: number | null;
  uvIndex: number | null;
  district?: { id: string; name: string };
}

export interface StationFloodForecast {
  id: string;
  stationId: string;
  lat: number;
  lng: number;
  forecastDate: string;
  riverDischarge: number | null;
  riverDischargeMean: number | null;
  riverDischargeMedian: number | null;
  riverDischargeMax: number | null;
  riverDischargeMin: number | null;
  riverDischargeP25: number | null;
  riverDischargeP75: number | null;
  riverDischargeP10: number | null;
  riverDischargeP90: number | null;
  createdAt: string;
  station?: {
    id: string;
    serial: number;
    stationCode: string;
    name: string;
    riverName: string | null;
    tidalStatus: string | null;
    districtId: string | null;
    district?: { id: string; name: string } | null;
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AlertSubscription {
  id: string;
  userId: string;
  districtId: string | null;
  channel: string;
  minSeverity: AlertSeverity;
  createdAt: string;
  district: { id: string; name: string } | null;
}

export interface CreateSubscriptionRequest {
  districtId?: string;
  minSeverity?: AlertSeverity;
  channel?: string;
}

// ─── Analytics Dashboards ─────────────────────────────────────────────────────

export interface ResearcherApplication {
  id: string;
  status: 'PENDING' | 'NEEDS_INFORMATION' | 'APPROVED' | 'DECLINED';
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DashboardFreshnessStatus = 'FRESH' | 'STALE' | 'UNKNOWN';

export interface DashboardDataSource {
  name: string;
  status: DashboardFreshnessStatus;
  lastSuccessfulSync: string | null;
}

export interface DashboardMeta {
  generatedAt: string;
  sources: DashboardDataSource[];
}

export interface AdminDashboard {
  meta: DashboardMeta;
  users: {
    total: number;
    byRole: Array<{ role: string; count: number }>;
  };
  reports: {
    pendingReview: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  alerts: {
    activeBySeverity: Array<{ severity: string; count: number }>;
  };
  platform: {
    organizations: number;
    publishedDatasets: number;
    speciesRecorded: number;
    observationsThisMonth: number;
    auditEventsToday: number;
  };
}

export interface CitizenDashboard {
  meta: DashboardMeta;
  reports: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  observations: {
    total: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  restoration: {
    joinedProjects: number;
  };
  community: {
    posts: number;
  };
}

export interface ModeratorDashboard {
  meta: DashboardMeta;
  queue: {
    pending: number;
    underReview: number;
    totalPending: number;
    reviewedToday: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  submissionTrend: Array<{ day: string; count: number }>;
}

export interface GovernmentDashboard {
  meta: DashboardMeta;
  alerts: {
    total: number;
    bySeverity: Array<{ severity: string; count: number }>;
    byDivision: Array<{ division: string; count: number }>;
  };
  reports: {
    verifiedLast30d: number;
    byCategory: Array<{ category: string; count: number }>;
    topDistricts: Array<{ district: string; division: string; count: number }>;
  };
  climate: {
    divisions: Array<{
      name: string;
      avgTemp: number | null;
      avgPm25: number | null;
      totalPrecip: number | null;
      avgHumidity: number | null;
    }>;
  };
  flood: {
    totalStations: number;
    stationsWithForecast: number;
    highRiskStations: number;
    elevatedRiskStations: number;
    risingStations: number;
    latestReadingAt: string | null;
    highestRisk: Array<{
      stationId: string;
      stationName: string;
      riverName: string | null;
      district: string | null;
      discharge: number | null;
      historicalMean: number | null;
      ratio: number | null;
      risk: 'HIGH' | 'ELEVATED';
      waterLevel: number | null;
      thresholdStatus: 'DANGER' | 'WARNING' | 'NORMAL' | 'UNKNOWN';
      trend: 'RISING' | 'FALLING' | 'STEADY' | null;
      forecastDate: string;
    }>;
  };
}

export interface ResearcherDashboard {
  meta: DashboardMeta;
  biodiversity: {
    totalSpecies: number;
    totalOccurrences: number;
    topSpecies: Array<{ name: string; occurrences: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
  };
  observations: {
    total: number;
    researchGrade: number;
    researchGradePct: number;
    byCategory: Array<{ category: string; count: number }>;
    byTrust: Array<{ trustLevel: string; count: number }>;
  };
}

export interface OrgAdminDashboard {
  meta: DashboardMeta;
  projects: {
    total: number;
    active: number;
    newLast30d: number;
    byStatus: Array<{ status: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
  };
  engagement: {
    totalParticipants: number;
    avgParticipantsPerProject: number;
    topProjects: Array<{ id: string; title: string; participants: number }>;
  };
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface MissingField {
  key:    string;
  label:  string;
  hint:   string;
  weight: number;
  href:   string;
}

export interface BadgeSummary {
  key:         string;
  category:    string;
  tier:        string;
  label:       string;
  tierLabel:   string;
  emoji:       string;
  description: string;
  earned:      boolean;
  current:     number;
  threshold:   number;
  points:      number;
}

export interface GamificationSummary {
  completeness:    number;
  missingFields:   MissingField[];
  badges:          BadgeSummary[];
  points:          number;
  level:           number;
  levelLabel:      string;
  nextLevelPoints: number; // -1 means max level reached
}

// ─── Water Bodies ─────────────────────────────────────────────────────────────

export type HydrologicalClass = 'LOTIC' | 'LENTIC';
export type WaterBodyType = 'RIVER' | 'WETLAND' | 'LAKE';

export interface LoticDetails {
  id: string;
  waterBodyId: string;
  lengthKmBd: number | null;
  averageWidthM: number | null;
  maxDepthM: number | null;
  meanDischargeM3s: number | null;
  hydrologicalOrigin: string | null;
  outfallTo: string | null;
  flowRegime: string | null;
  divisionsTraversed: string | null;
  districtsTraversed: string | null;
  bwdbGaugingStations: string | null;
  banglapediaMatchName: string | null;
  banglapediaLengthKm: number | null;
  banglapediaAreaCoveredOldDistricts: string | null;
  banglapediaSource: string | null;
}

export interface LenticDetails {
  id: string;
  waterBodyId: string;
  areaMonsoonSqKm: number | null;
  areaDrySqKm: number | null;
  waterVolumeEst: number | null;
  seasonality: string | null;
}

export interface WaterLevelStation {
  id: string;
  serial: number;
  stationCode: string;
  name: string;
  riverName: string | null;
  tidalStatus: string | null;
  districtId: string | null;
  upazilaId: string | null;
  latitude: number | null;
  longitude: number | null;
  dangerLevel: number | null;
  warningLevel: number | null;
  normalLevel: number | null;
  district?: { id: string; name: string } | null;
  waterBodies?: Array<{ waterBody: { id: string; code: string; nameEn: string } }>;
}

export interface WaterLevelReading {
  id: string;
  stationId: string;
  readingAt: string;
  waterLevel: number;
  discharge: number | null;
  trend: WaterLevelTrend | null;
  createdAt: string;
}

export interface StationLatestReadingResponse {
  station: WaterLevelStation;
  latestReading: WaterLevelReading | null;
  thresholdStatus: WaterLevelThresholdStatus | null;
}

export interface WaterBody {
  id: string;
  code: string;
  slug: string;
  nameEn: string;
  nameBn: string | null;
  hydrologicalClass: HydrologicalClass;
  waterBodyType: WaterBodyType;
  waterBodySubtype: string | null;
  latitude: number | null;
  longitude: number | null;
  transboundaryFlag: boolean;
  transboundaryCountries: string | null;
  upazilas: Array<{
    upazila: { id: string; name: string; district: { id: string; name: string } };
  }>;
  loticDetails: LoticDetails | null;
  lenticDetails: LenticDetails | null;
  stations?: Array<{ station: WaterLevelStation }>;
}

export interface WaterBodyPagedResponse {
  data: WaterBody[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WaterLevelStationPagedResponse {
  data: WaterLevelStation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


// ─── Emissions ────────────────────────────────────────────────────────────────
// National-level GHG data ingested from the World Bank Climate Change API.

export interface NationalEmissionReading {
  id: string;
  year: number;
  indicatorCode: string;
  indicatorName: string;
  value: number | null;
  unit: string;
  updatedAt: string;
}

export interface EmissionIndicator {
  indicatorCode: string;
  indicatorName: string;
}

// ─── Marine ───────────────────────────────────────────────────────────────────

export interface MarineForecast {
  id: string;
  districtId: string;
  lat: number;
  lng: number;
  forecastDate: string;
  waveHeightMax: number | null;
  waveDirectionDominant: number | null;
  wavePeriodMax: number | null;
  windWaveHeightMax: number | null;
  windWaveDirectionDominant: number | null;
  windWavePeriodMax: number | null;
  swellWaveHeightMax: number | null;
  swellWaveDirectionDominant: number | null;
  swellWavePeriodMax: number | null;
  swellWavePeakPeriodMax: number | null;
  seaSurfaceTemp: number | null;
  district?: { id: string; name: string };
}

// ─── Radiation ────────────────────────────────────────────────────────────────

export interface SatelliteRadiationReading {
  id: string;
  districtId: string;
  lat: number;
  lng: number;
  readingDate: string;
  shortwaveRadiationSum: number | null;
  district?: { id: string; name: string };
}

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyType =
  | 'PRIVATE' | 'STATE_OWNED' | 'JOINT_VENTURE'
  | 'MULTINATIONAL' | 'CONGLOMERATE' | 'CLUSTER';

export interface CompanyInline {
  id: string;
  name: string;
  bnName: string | null;
  companyType: CompanyType;
  website: string | null;
}

export interface CompanySummary {
  id: string;
  name: string;
  bnName: string | null;
  companyType: CompanyType;
  registrationNumber: string | null;
  establishedYear: number | null;
  employeeCount: number | null;
  website: string | null;
  isActive: boolean;
  headquarterDistrictId: string | null;
  headquarterDistrict: { id: string; name: string } | null;
  parentCompanyId: string | null;
  parentCompany: { id: string; name: string; companyType: CompanyType } | null;
  _count: { facilities: number; subsidiaries: number };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDetail extends CompanySummary {
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subsidiaries: Array<{ id: string; name: string; companyType: CompanyType; isActive: boolean }>;
  facilities: Array<{
    id: string;
    name: string;
    facilityType: FacilityType;
    complianceStatus: ComplianceStatus;
    isActive: boolean;
    district: { id: string; name: string };
  }>;
}

export interface CompanyPagedResponse {
  data: CompanySummary[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Facilities ───────────────────────────────────────────────────────────────

export type FacilityType =
  | 'GARMENT' | 'TANNERY' | 'BRICK_FIELD' | 'POWER_PLANT' | 'SHIPBREAKING'
  | 'TEXTILE' | 'CEMENT' | 'STEEL' | 'CHEMICAL' | 'PHARMACEUTICAL'
  | 'FERTILIZER' | 'PAPER_MILL' | 'FOOD_PROCESSING' | 'OIL_REFINERY' | 'OTHER';

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'UNKNOWN';

export interface FacilitySummary {
  id: string;
  name: string;
  bnName: string | null;
  facilityType: FacilityType;
  complianceStatus: ComplianceStatus;
  isActive: boolean;
  lat: number | null;
  lng: number | null;
  districtId: string;
  upazilaId: string | null;
  companyId: string | null;
  company: CompanyInline | null;
  createdAt: string;
  updatedAt: string;
  district: { id: string; name: string };
  upazila: { id: string; name: string } | null;
}

export interface FacilityDetail extends FacilitySummary {
  description: string | null;
  establishedYear: number | null;
  productionCapacity: string | null;
  landArea: number | null;
  etpInstalled: boolean;
  etpCapacity: number | null;
  unionId: string | null;
  union: { id: string; name: string } | null;
  reports: Array<{
    id: string;
    title: string;
    status: ReportStatus;
    category: ReportCategory;
    createdAt: string;
  }>;
}

export interface FacilityPagedResponse {
  data: FacilitySummary[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Community ────────────────────────────────────────────────────────────────

export interface CommunityPostSummary {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string };
  district: { id: string; name: string } | null;
  _count: { comments: number };
  poll: {
    id: string;
    question: string;
    endsAt: string | null;
    options: { _count: { votes: number } }[];
  } | null;
}

export interface PollOptionWithCount {
  id: string;
  text: string;
  order: number;
  _count: { votes: number };
}

export interface PollDetail {
  id: string;
  question: string;
  endsAt: string | null;
  createdAt: string;
  options: PollOptionWithCount[];
  userVotedOptionId: string | null;
}

export interface PostCommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string };
}

export interface CommunityPostDetail extends CommunityPostSummary {
  comments: PostCommentItem[];
  poll: PollDetail | null;
}
