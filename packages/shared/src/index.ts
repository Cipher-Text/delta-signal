// ─── Roles ────────────────────────────────────────────────────────────────────

/**
 * All user roles in Delta Signal, from least to most privileged.
 * Matches the Prisma `UserRole` enum exactly — these values are what
 * `request.user.role` actually contains at runtime, so casing must match.
 * `guest` isn't a real Prisma value (unauthenticated requests have no role
 * at all) — it exists here only for documentation/permission-matrix purposes
 * and should never be passed to `@Roles(...)`.
 */
export type UserRole =
  | 'guest'              // unauthenticated public visitor (not a real DB value)
  | 'CITIZEN'
  | 'RESEARCHER'
  | 'ORGANIZATION_ADMIN'
  | 'GOVERNMENT'
  | 'MODERATOR'
  | 'ADMIN';

// ─── Alert / Event Enums ──────────────────────────────────────────────────────
// All enums below match their Prisma counterparts exactly (packages/database/prisma/schema.prisma).

export type AlertSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'EMERGENCY';

export type AlertStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type AlertType =
  | 'FLOOD'
  | 'FLASH_FLOOD'
  | 'CYCLONE'
  | 'STORM_SURGE'
  | 'HEATWAVE'
  | 'AIR_QUALITY'
  | 'WATER_POLLUTION'
  | 'LANDSLIDE'
  | 'DROUGHT'
  | 'WILDFIRE'
  | 'OTHER';

// ─── Report Enums ─────────────────────────────────────────────────────────────

export type ReportStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RESOLVED';

export type ReportCategory =
  | 'WATER_POLLUTION'
  | 'ILLEGAL_DUMPING'
  | 'DEFORESTATION'
  | 'WILDLIFE_INCIDENT'
  | 'FLOODING'
  | 'AIR_POLLUTION'
  | 'OTHER';

// ─── Dataset / Provider Enums ─────────────────────────────────────────────────

export type DatasetCategory =
  | 'WEATHER'
  | 'AIR_QUALITY'
  | 'WATER'
  | 'BIODIVERSITY'
  | 'REPORTS'
  | 'MONITORING'
  | 'GEOSPATIAL';

/**
 * Access policy ladder — each level is a superset of the one above it.
 * `PUBLIC` → `LOGIN_REQUIRED` → `RESEARCHER` → `APPROVED` → `GOVERNMENT`
 */
export type DatasetAccessPolicy =
  | 'PUBLIC'           // any visitor can download
  | 'LOGIN_REQUIRED'   // any authenticated user
  | 'RESEARCHER'       // researcher role or above
  | 'APPROVED'         // explicit per-dataset approval required
  | 'GOVERNMENT';      // government or admin only

export type ProviderType =
  | 'GOVERNMENT_AGENCY'
  | 'RESEARCH_INSTITUTION'
  | 'NGO'
  | 'INTERNATIONAL_ORG'
  | 'CITIZEN_SCIENCE'
  | 'SATELLITE'
  | 'IOT_SENSOR';

/** Organization classifications. ProviderType remains for data-source providers. */
export type OrganizationType =
  | 'GOVERNMENT_AGENCY'
  | 'RESEARCH_INSTITUTION'
  | 'NGO'
  | 'COMMUNITY_GROUP'
  | 'PRIVATE_COMPANY'
  | 'INTERNATIONAL_ORG'
  | 'OTHER';

export type OrganizationMemberRole = 'ADMIN' | 'MEMBER';

export type Permission =
  | 'reports.create'       // Submit citizen reports
  | 'reports.moderate'     // Verify, reject, and resolve citizen reports
  | 'alerts.manage'        // Create, update, and cancel environmental alerts
  | 'restoration.create'   // Register restoration projects
  | 'restoration.join'     // Join restoration projects as a participant
  | 'observations.create'  // Log wildlife and environmental observations
  | 'observations.verify'  // Change trust level on observations
  | 'observations.delete'  // Delete observations
  | 'organizations.access' // View own organization memberships (granted dynamically)
  | 'organizations.manage' // Full organization CRUD in admin console
  | 'users.manage'          // Manage user roles and deactivate accounts
  | 'social_content.create'
  | 'social_content.edit'
  | 'social_content.render'
  | 'social_content.approve'
  | 'social_content.download'
  | 'social_content.manage'
  | 'social_content.publish';

export const ENVIRONMENTAL_EXPERTISE = [
  'Biodiversity monitoring',
  'Bird identification',
  'Wildlife conservation',
  'Species identification',
  'Water quality',
  'Air quality',
  'Climate science',
  'Flood risk',
  'Weather analysis',
  'Remote sensing',
  'GIS and mapping',
  'Land-use analysis',
  'Forest conservation',
  'Wetland restoration',
  'Mangrove restoration',
  'River and watershed management',
  'Waste management',
  'Environmental policy',
  'Citizen science',
  'Environmental education',
] as const;

export type EnvironmentalExpertise = typeof ENVIRONMENTAL_EXPERTISE[number];

export const ENVIRONMENTAL_RESEARCH_INTERESTS = [
  'Biodiversity conservation',
  'Species distribution and habitat',
  'Wildlife population trends',
  'Wetland ecosystems',
  'River and watershed health',
  'Groundwater and water security',
  'Air pollution and public health',
  'Climate change impacts',
  'Extreme weather and flood risk',
  'Sea-level rise and coastal resilience',
  'Deforestation and land-use change',
  'Mangrove and blue carbon ecosystems',
  'Urban ecology',
  'Agricultural sustainability',
  'Environmental restoration',
  'Waste and plastic pollution',
  'Environmental justice',
  'Community-based conservation',
  'Citizen science methods',
  'Environmental governance',
] as const;

export type EnvironmentalResearchInterest = typeof ENVIRONMENTAL_RESEARCH_INTERESTS[number];

// ─── Observation Enums ────────────────────────────────────────────────────────

export type ObservationTrustLevel =
  | 'RESEARCH_GRADE'  // validated by researcher
  | 'COMMUNITY'       // community-submitted, not yet validated
  | 'UNVERIFIED'      // newly submitted
  | 'FLAGGED';        // needs review

export type ObservationCategory =
  | 'BIODIVERSITY'
  | 'WATER_QUALITY'
  | 'AIR_QUALITY'
  | 'LAND_USE'
  | 'RESTORATION';

export type MeasurementParameter =
  // Water quality
  | 'PH'
  | 'DISSOLVED_OXYGEN'
  | 'WATER_TEMPERATURE'
  | 'TURBIDITY'
  | 'CONDUCTIVITY'
  | 'SALINITY'
  | 'NITRATE_N'
  | 'PHOSPHATE_P'
  | 'BOD'
  | 'COD'
  | 'TOTAL_DISSOLVED_SOLIDS'
  | 'TOTAL_SUSPENDED_SOLIDS'
  | 'ARSENIC'
  | 'FECAL_COLIFORM'
  | 'WATER_DEPTH'
  | 'FLOW_VELOCITY'
  // Air quality
  | 'PM25'
  | 'PM10'
  | 'CO2'
  | 'CO'
  | 'NOX'
  | 'SOX'
  | 'OZONE'
  | 'VOC'
  | 'AQI'
  | 'AMBIENT_TEMPERATURE'
  | 'RELATIVE_HUMIDITY'
  // Biodiversity / habitat
  | 'SPECIES_COUNT'
  | 'INDIVIDUAL_COUNT'
  | 'CANOPY_COVER'
  | 'VEGETATION_DENSITY'
  // Soil / land
  | 'SOIL_PH'
  | 'SOIL_MOISTURE'
  | 'AREA_AFFECTED'
  | 'OTHER';

export type MeasurementUnit =
  | 'MG_PER_L'
  | 'UG_PER_L'
  | 'NTU'
  | 'US_PER_CM'
  | 'PPT'
  | 'PH_UNITS'
  | 'CELSIUS'
  | 'PPM'
  | 'PPB'
  | 'UG_PER_M3'
  | 'PERCENT'
  | 'COUNT'
  | 'METERS'
  | 'METERS_PER_SECOND'
  | 'CFU_PER_100ML'
  | 'HECTARES'
  | 'INDEX'
  | 'OTHER';

export type QualityFlag =
  | 'GOOD'       // validated, reliable reading
  | 'SUSPECT'    // needs verification
  | 'BAD'        // likely erroneous
  | 'ESTIMATED'; // interpolated or modelled

// ─── Water Level Enums ───────────────────────────────────────────────────────

export type WaterLevelTrend = 'RISING' | 'FALLING' | 'STEADY';

/** Computed threshold status for a station at a given water level. */
export type WaterLevelThresholdStatus = 'NORMAL' | 'WARNING' | 'DANGER';

export type FloodRiskLevel = 'HIGH' | 'ELEVATED';

/**
 * Compares simulated river discharge with the station's historical reference.
 * Null means there is not enough comparison data to classify the signal.
 */
export function classifyFloodRisk(
  discharge: number | null,
  historicalMean: number | null,
  p75: number | null,
): FloodRiskLevel | null {
  if (discharge == null || historicalMean == null || historicalMean === 0) return null;
  const ratio = discharge / historicalMean;
  if (ratio >= 2 || (p75 != null && discharge > p75 * 1.5)) return 'HIGH';
  if (ratio >= 1.5 || (p75 != null && discharge > p75)) return 'ELEVATED';
  return null;
}

// ─── Ingestion Enum ───────────────────────────────────────────────────────────

export type IngestionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

// ─── Restoration / Projects ───────────────────────────────────────────────────
// RestorationProject shipped 2026-08-17 (M11) — matches Prisma exactly.

export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';

export type RestorationCategory =
  | 'TREE_PLANTING'
  | 'WETLAND_RESTORATION'
  | 'RIVERBANK_PROTECTION'
  | 'MANGROVE'
  | 'WASTE_MANAGEMENT'
  | 'OTHER';

export type RestorationTargetMetric =
  | 'TREES_PLANTED'
  | 'AREA_RESTORED_HA'
  | 'SEEDLINGS_SURVIVED'
  | 'SPECIES_REINTRODUCED'
  | 'WATER_QUALITY_SCORE'
  | 'CARBON_SEQUESTERED_T'
  | 'VOLUNTEER_HOURS'
  | 'OTHER';

// ─── Location Types ───────────────────────────────────────────────────────────

export interface LocationRef {
  id: string;
  name: string;
  country: string;
  division?: string;
  district?: string;
  upazila?: string;
}

export interface DivisionSummary {
  id: string;
  name: string;
  districtCount: number;
}

export interface DistrictSummary {
  id: string;
  name: string;
  divisionId: string;
  division: string;
}

// ─── Platform Metrics ─────────────────────────────────────────────────────────

export interface PlatformMetrics {
  activeAlerts: number;
  emergencyAlerts: number;
  verifiedReports: number;
  publicDatasets: number;
  researchGradeObservations: number;
  districtsWithResearchGradeObservations: number;
  // T2+T8
  activeRestorationProjects: number;
  // T10
  reportsByCategory: Array<{ category: ReportCategory; count: number }>;
  // T11
  restorationVolunteers: number;
  restorationAreaHa: number;
}

// ─── Dataset DTO ──────────────────────────────────────────────────────────────

export interface DatasetSummary {
  id: string;
  name: string;
  category: DatasetCategory;
  source: string;
  accessPolicy: DatasetAccessPolicy;
  recordCount?: number;
  lastUpdated?: string;
  description?: string;
}

// ─── Report DTOs ──────────────────────────────────────────────────────────────

export interface CitizenReport {
  id: string;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  location?: LocationRef;
  createdAt: string;
  summary?: string;
}

// ─── Alert DTO ────────────────────────────────────────────────────────────────

export interface EnvironmentalAlert {
  id: string;
  title: string;
  status: AlertStatus;
  severity: AlertSeverity;
  location?: LocationRef;
  issuedAt: string;
  expiresAt?: string;
  instructions?: string;
}

// ─── Observation DTO ──────────────────────────────────────────────────────────

export interface ObservationSummary {
  id: string;
  category: ObservationCategory;
  trustLevel: ObservationTrustLevel;
  location?: LocationRef;
  observedAt: string;
  species?: string;
}

// ─── Provider DTO ─────────────────────────────────────────────────────────────

export interface ProviderSummary {
  id: string;
  name: string;
  type: ProviderType;
  country: string;
  isActive: boolean;
}

// ─── Restoration / Community DTOs ─────────────────────────────────────────────

export interface RestorationProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  location?: LocationRef;
  participantCount: number;
  startDate: string;
}

export interface CommunityActivityItem {
  id: string;
  type: 'campaign' | 'education' | 'observation' | 'report';
  title: string;
  authorName: string;
  authorInitials: string;
  publishedAt: string;
}
