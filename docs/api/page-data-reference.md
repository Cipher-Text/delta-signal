# Page data reference for UI redesign

Use this document when redesigning the web or admin UI. It maps each current route to the data the page actually loads, the API response shape expected by its frontend, and relevant mutations. Treat these as the source of truth for data-bearing UI: do not invent fields, metrics, or objects that are not listed here. A new visual element is fine, but its displayed value must come from a listed response, an explicit calculation from listed values, or be labeled as static copy.

## How to read this document

- API paths are relative to `http://localhost:3001/api/v1` and use the HTTP method shown.
- `packages/contracts/src/index.ts` contains shared route constants and many response interfaces. Some pages still define local inline interfaces or call raw paths; those are noted. Backend controllers/services and `docs/api/backend-api-links.md` are authoritative if an inline type disagrees with runtime behavior.
- `PaginatedEnvelope<T>` is `{ data: T[], total: number, page: number, pageSize: number }`. Some endpoints instead use `limit` and `totalPages`; use the endpoint's named response below.
- Most web pages fetch on the server. A failed optional fetch often becomes `[]`, `null`, or an empty state. Do not render fallback values as if they came from the API.
- Query parameters depend on the current page URL/filter state. This reference gives the parameters used by the page; the API may support more filters.
- Authentication: “Public” means no bearer token; “Signed-in” means the page/action sends the current user's access token. Admin pages require an admin session unless stated otherwise.

## Public web pages

| Page | API data used by the page | Response shape / fields available | Notes |
|---|---|---|---|
| `/` Home | Child sections fetch: `GET /alerts?status=ACTIVE&severity=EMERGENCY&pageSize=3`; `GET /weather/current`; `GET /metrics/platform`; `GET /flood/forecast`; `GET /locations/divisions`; `GET /locations/districts`; `GET /weather/air-quality`; species/occurrences summaries; `GET /reports?pageSize=3`; `GET /alerts?pageSize=3`; `GET /datasets?pageSize=5`; `GET /restoration/projects?pageSize=2`. | Alerts/reports/datasets/restoration use `PaginatedEnvelope<T>`; weather/AQ/flood and divisions/districts use arrays; `/metrics/platform` returns `PlatformMetrics`. Biodiversity section reads total counts and top species from one-row/list responses. | The page itself delegates data loading to Server Component sections. **Static values** also exist in `apps/web/lib/static-data.ts`; do not treat those seed arrays as API values. |
| `/map` | `GET /locations/districts`; `GET /alerts?status=ACTIVE&pageSize=100`; `GET /reports?status=VERIFIED&pageSize=100`; `GET /weather/current`; `GET /weather/air-quality`; `GET /water-bodies?limit=100`; `GET /water-bodies/stations?limit=100`; `GET /flood/forecast` | District summaries; paginated alert/report envelopes; arrays of current weather, air quality, and flood forecasts; water body/station paged objects (`data`, `total`, `page`, `limit`, `totalPages`). | Map markers/layers must be based on these records and their coordinates. |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth mutations: `POST /auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`. | Login/register return `AuthResponse`: access token, refresh token, user `{id,email,displayName,role}`. Other flows return success/message responses. | Form fields come from DTOs; these pages are primarily forms, not data dashboards. |
| `/contact`, `/data-deletion`, `/methodology`, `/privacy`, `/terms` | None. | Static content. | Do not imply these pages expose API data. |

## Signed-in web application pages

| Page | API data used by the page | Response shape / fields available | Notes |
|---|---|---|---|
| `/dashboard` | Role-specific `GET /analytics/{citizen,admin,moderator,government,researcher,orgadmin}` | Role-specific contracts `CitizenDashboard`, `AdminDashboard`, `ModeratorDashboard`, `GovernmentDashboard`, `ResearcherDashboard`, `OrgAdminDashboard`; all have `meta`, then role-specific aggregates, breakdowns, rankings, and trends. See interfaces in contracts for exact nested fields. | The signed-in user's role selects one dashboard response/view. Aggregate counts/charts must use returned values. |
| `/alerts` | `GET /alerts` with current filters/pagination; `GET /alerts?status=EXPIRED...` for history; `GET /locations/districts` for filter options | `PaginatedEnvelope<Alert>` plus district `{id,name}` options. `Alert` includes title/description/type/severity/status, time bounds, location/district and issuer fields as declared in contracts. | |
| `/alerts/[id]` | `GET /alerts/:id` | `Alert` object (same entity fields as above). | Subscribe/unsubscribe uses `POST /notifications/subscriptions` and `DELETE /notifications/subscriptions/:id`; subscription response is `AlertSubscription`. |
| `/reports` | `GET /reports` with filters/page; extra one-row requests for VERIFIED and RESOLVED totals; `GET /locations/districts` | `PaginatedEnvelope<CitizenReport>` and district options. `CitizenReport`: id, title, description, category, status, summary, districtId, lat/lng, timestamps, reporter `{id,displayName}`, district. | |
| `/reports/[id]` | `GET /reports/:id`; `GET /reports/:id/comments`; `GET /reports/:id/media` | `ReportDetail`; `ReportComment[]` (`body`, `isInternal`, timestamp, author); `ReportMedia[]` (url, mime type, file size, caption, timestamp, uploader). | Comment/create report actions are authenticated; report status changes are role-gated. |
| `/observations` | `GET /observations` with filters/page; `GET /locations/districts` | `PaginatedEnvelope<Observation>` and district filter options. | |
| `/observations/[id]` | `GET /observations/:id` | `Observation` interface/entity. | |
| `/biodiversity` | `GET /biodiversity/species` with search/page; `GET /biodiversity/occurrences` with district/page; `GET /locations/districts` | Two `PaginatedEnvelope`s: `Species` and `Occurrence`; district `{id,name}` options. | |
| `/biodiversity/species/[id]` | `GET /biodiversity/species/:id`; `GET /biodiversity/occurrences?speciesId=...&pageSize=20` | `Species`; `PaginatedEnvelope<Occurrence>`. | |
| `/community` | `GET /community/posts` with `hasPoll`, page, pageSize; `GET /locations/districts` | `PaginatedEnvelope<CommunityPostSummary>`; each post has author, optional district, comment count, optional poll and vote counts. Districts include division. | |
| `/community/[id]` | `GET /community/posts/:id` | `CommunityPostDetail`: post summary, comments, optional full poll/options and `userVotedOptionId`. Authenticated read is used when signed in. | Create/delete post, comment, and poll vote are mutations; they do not provide extra dashboard fields. |
| `/data` | `GET /datasets` with filters/page; `GET /providers?pageSize=10` | `PaginatedEnvelope<Dataset>` and `PaginatedEnvelope<Provider>`. | |
| `/data/[id]` | `GET /datasets/:id`; data preview endpoints vary with dataset category: weather/current and air quality, flood forecast, biodiversity species and occurrences | `Dataset`; preview responses are current-weather/AQ arrays, flood forecast array, or paginated `Species`/`Occurrence`. | Preview content is category-specific and may be empty if optional source fetch fails. |
| `/locations` | `GET /locations/divisions` | `DivisionWithClimate[]`: geography summary plus 30-day average/min/max temperature, humidity, precipitation, wind, PM2.5/PM10, UV and update timestamp. | |
| `/locations/divisions/[id]` | `GET /locations/divisions`; filtered `GET /locations/districts?divisionId=...`; active alerts, current weather, AQ, flood forecast, verified reports, observations, biodiversity occurrences and restoration projects | Division/district climate summaries plus endpoint-specific arrays/envelopes: `Alert`, `CurrentWeatherReading`, `HourlyAirQualityReading`, `StationFloodForecast`, `CitizenReport`, `Observation`, `Occurrence`, `RestorationProject`. | Several pages fetch national datasets and filter them client-side by division. |
| `/locations/districts/[id]` | `GET /locations/districts/:id`; current weather, AQ, daily forecast, flood forecast, active district alerts, optional marine forecast, radiation, occurrences, reports, observations, restoration projects | `DistrictDetail`; `CurrentWeatherReading`; `HourlyAirQualityReading`; `DailyForecast[]`; `StationFloodForecast[]`; paginated `Alert`, `Occurrence`, `CitizenReport`, `Observation`, `RestorationProject`; optional `MarineForecast[]`; `SatelliteRadiationReading[]`. | Many ancillary fetches fail soft and may render empty sections. |
| `/locations/upazilas/[id]`, `/locations/unions/[id]` | `GET /locations/upazilas/:id`; `GET /locations/unions/:id` | Local `UpazilaDetail` and `UnionDetail` types. | See page files for the exact included child geography fields; don't infer climate data unless the response has it. |
| `/marine` | `GET /locations/districts`; `GET /marine/forecast` or `/marine/forecast/:districtId` | District summaries; `MarineForecast[]` (date, coordinates, wave height/direction/period, wind-wave, swell, sea surface temperature; optional district). | |
| `/radiation` | `GET /locations/districts`; `GET /radiation/daily` or `/radiation/daily/:districtId` | District summaries; `SatelliteRadiationReading[]` (date, coordinates, shortwave radiation sum, optional district). | |
| `/emissions` | `GET /emissions` with optional year/indicator filters; `GET /emissions/indicators` | `NationalEmissionReading[]` (`year`, `indicatorCode`, `indicatorName`, nullable `value`, `unit`, `updatedAt`); `EmissionIndicator[]`. | Years and indicator choices are also derived from returned readings. |
| `/water-bodies` | `GET /water-bodies` with filters/page; districts; upazilas optionally filtered by district | `WaterBodyPagedResponse` (`data`, `total`, `page`, `limit`, `totalPages`); geography option arrays. | |
| `/water-bodies/[id]` | `GET /water-bodies/:id` | `WaterBody`: identity/names/type/class/coordinates/transboundary data, upazila coverage, lotic/lentic detail, optional stations. | |
| `/water-bodies/stations` | `GET /water-bodies/stations` with limit/page and filters; districts; upazilas; water bodies | `WaterLevelStationPagedResponse`; location option arrays; `WaterBodyPagedResponse`. | |
| `/water-bodies/stations/[id]` | `GET /flood/stations/:id/latest`; `GET /flood/forecast/station/:id` | `StationLatestReadingResponse` (`station`, nullable `latestReading`, nullable `thresholdStatus`); `StationFloodForecast[]`. | Historical readings are not fetched by this page. |
| `/industrial-sites` | `GET /locations/districts`; `GET /facilities` or `GET /companies`, depending on selected view and filters | `FacilityPagedResponse` (`data: FacilitySummary[]`, total/page/pageSize) or `CompanyPagedResponse` (`data: CompanySummary[]`, total/page/pageSize). | |
| `/industrial-sites/[id]` | `GET /facilities/:id` | `FacilityDetail`: facility summary, description/capacity/ETP, location, company and report summaries. | |
| `/industrial-sites/companies/[id]` | `GET /companies/:id` | `CompanyDetail`: company summary/contact/description, subsidiaries, facility summaries. | |
| `/organizations` | `GET /organizations?page=...&pageSize=20&type=...` (bearer token when signed in) | Local `OrgListResponse`, containing organizations and paging metadata. | |
| `/organizations/[id]` | `GET /organizations/:id` | `Organization` with organization metadata and providers. | |
| `/restoration` | `GET /restoration/projects` with filters/page; districts; organizations for signed-in users | `PaginatedEnvelope<RestorationProject>`; district options; optional `PaginatedEnvelope<Organization>` options. | Create/join actions mutate projects. |
| `/restoration/[id]` | `GET /restoration/projects/:id` | `RestorationProject`. | |
| `/profile` | Auth profile (via current-user helper); own reports; own observations; notification subscriptions; districts; gamification summary | Current user profile; `PaginatedEnvelope<CitizenReport>`; `PaginatedEnvelope<Observation>`; `AlertSubscription[]`; district options; `GamificationSummary` (points/level/completeness/missing fields/badges). | Profile fields and badges must be sourced from these responses. |
| `/members` | Signed-in `GET /members` with filters/page; `GET /members/districts` | `PaginatedEnvelope<MemberSummary>` and district-name options. | |
| `/members/[id]` | Signed-in `GET /members/:id` | `MemberDetail`. | |
| `/researcher-application` | Signed-in `GET /researcher-applications/mine` | `ResearcherApplication | null`. | Submit is `POST /researcher-applications`; application requires profile publication link. |

## Admin pages

Admin page responses often use interfaces declared in the page file rather than `packages/contracts`. Preserve the observed response keys when redesigning.

| Page | API data used by the page | Response shape / fields available | Mutations / notes |
|---|---|---|---|
| `/login` | `POST /auth/login`; `GET /auth/profile` after session setup | `AuthResponse`; admin profile. | |
| `/reports` | `GET /reports` with status/page; one-row counts per status | Local paged shape `{data,total,page,pageSize}` containing report records. | `PATCH /reports/:id/status` with status/note. |
| `/observations` | `GET /observations` with filters/page | Local paged shape `{data,total,page,pageSize}` containing observation records. | `PATCH /observations/:id/trust`; `DELETE /observations/:id`. |
| `/alerts` | `GET /alerts` with status/page; one-row counts per status; `GET /locations/districts` | Local paged alert shape and district options. | Create with `POST /alerts`; update/cancel via `PATCH /alerts/:id`. |
| `/datasets` | `GET /datasets/admin` | Local `{data: Dataset[]}` shape. | `PATCH /datasets/:id` updates publication or access policy. |
| `/users` | `GET /users` with filters/page | Local paged user records `{data,total,page,pageSize}`. | Change role, deactivate/reactivate via user endpoints. |
| `/researcher-applications` | `GET /users/researcher-applications` with status/page | Local result `{data,total,page,pageSize}` with applicant, profile/publication links, application details. | `PATCH /users/researcher-applications/:id/review`. |
| `/organizations` | `GET /admin/organizations`; `GET /admin/organizations/users` | `Organization[]` and eligible `User[]`. | Create/edit org; add/change/remove members. |
| `/permissions` | `GET /admin/permissions` | `PermissionRow[]` (permission and role assignments). | Add/remove role permission via `/admin/permissions/roles`. |
| `/restoration` | `GET /restoration/projects` with status/page | Local paged project shape `{data,total,page,pageSize}`. | `PATCH /restoration/projects/:id` status. |
| `/audit` | `GET /users/audit-events` with filters/page | Local paged audit event records `{data,total,page,pageSize}`. | Read-only. |
| `/ingestion` | `GET /ingestion/jobs` with status/page; one-row status counts | Local paged ingestion job records. | Read-only from this page. |
| `/social-content` | Draft list; districts; active alerts; biodiversity occurrences; flood forecasts; national suggestions; connected platform accounts | `Draft[]`, district array, endpoint-specific option arrays, `NationalSuggestion[]`, `PlatformAccount[]`. Some option fetches fall back to `[]`. | Draft create/edit/approve/archive/publish/download and platform connect/disconnect actions. See `apps/admin/lib/social-content-actions.ts` for request bodies. |
| `/system` | `GET /health`; recent ingestion jobs | Local `HealthResponse` and paged job records. | Cron job labels/timing shown on screen are static frontend configuration, not API response data. |
| `/settings` | `GET /auth/profile` | `AdminUser` profile. | Other visible settings/navigation/theme details are frontend configuration. |
| `/` | Redirects to `/reports`. | No data response. | |

## Design constraints for Claude

1. Use exact fields from the named contract or page-local response type. `null` means unknown/unavailable; do not replace it with a guessed value.
2. Counts and chart series should use API aggregate fields or be calculated transparently from records returned to that page. A paginated page only has the current page's records; its total comes from `total`.
3. Do not infer a response from the database model alone. The API may select only a subset, and relationships can be nullable or omitted.
4. The homepage's numbers, conditions, and preview cards in `static-data.ts` are seed copy and do not represent current API values.
5. If a redesign requires a field not present in the mapped response, call it out as a proposed API gap instead of silently adding it to the UI data model.
6. UI labels, explanatory copy, icons, and calculated presentation values are allowed; do not present them as backend fields.

## Exact shared response fields

The following are the frontend's declared response bodies, copied as field-level schemas from `packages/contracts/src/index.ts`. These are TypeScript shapes (not fabricated sample records): `string` timestamps are serialized API timestamps; `T | null` is explicitly nullable; `?` means the response field may be omitted. Enum values are defined in `packages/shared` and should be used as supplied.

```ts
type PaginatedEnvelope<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type DivisionSummary = {
  id: string; name: string; bnName?: string | null; slug?: string | null;
  lat?: number | null; lng?: number | null; areaSqKm?: number | null;
  _count?: { districts: number };
};
type DivisionWithClimate = DivisionSummary & {
  avgTemp30d: number | null; minTemp30d: number | null; maxTemp30d: number | null;
  avgHumidity30d: number | null; totalPrecip30d: number | null; avgWindSpeed30d: number | null;
  avgPm25_30d: number | null; avgPm10_30d: number | null; avgUvIndex30d: number | null;
  climateUpdatedAt: string | null;
};
type DistrictSummary = {
  id: string; name: string; bnName?: string | null; slug?: string | null;
  lat?: number | null; lng?: number | null; areaSqKm?: number | null;
  division?: { id: string; name: string }; _count?: { upazilas: number };
};
type DistrictWithClimate = DistrictSummary & {
  avgTemp30d: number | null; maxTemp30d: number | null; totalPrecip30d: number | null;
  avgPm25_30d: number | null; avgPm10_30d: number | null; avgUvIndex30d: number | null;
  climateUpdatedAt: string | null;
};

type CitizenReport = {
  id: string; title: string; description: string; category: ReportCategory; status: ReportStatus;
  summary: string | null; districtId: string | null; lat: number | null; lng: number | null;
  createdAt: string; updatedAt: string;
  reporter: { id: string; displayName: string } | null; district: DistrictSummary | null;
};
type ReportComment = {
  id: string; body: string; isInternal: boolean; createdAt: string;
  author: { id: string; displayName: string };
};
type ReportMedia = {
  id: string; url: string; mimeType: string | null; fileSize: number | null;
  caption: string | null; createdAt: string; uploadedBy: { id: string; displayName: string };
};
type Alert = {
  id: string; title: string; description: string; alertType: AlertType | null;
  severity: AlertSeverity; status: AlertStatus; instructions: string | null;
  issuedAt: string; expiresAt: string | null; createdAt: string; district: DistrictSummary | null;
};
type Observation = {
  id: string; category: ObservationCategory; trustLevel: ObservationTrustLevel;
  description: string; districtId: string | null; lat: number | null; lng: number | null;
  species: string | null; observedAt: string; createdAt: string; updatedAt: string;
  observer: { id: string; displayName: string } | null; district: DistrictSummary | null;
};

type Species = {
  id: string; gbifKey: number; canonicalName: string; vernacularName: string | null;
  kingdom: string | null; phylum: string | null; class: string | null; order: string | null;
  family: string | null; genus: string | null; iucnStatus: string | null; imageUrl: string | null;
  _count: { occurrences: number };
};
type Occurrence = {
  id: string; speciesId: string; districtId: string | null; lat: number; lng: number;
  observedAt: string | null; recordedBy: string | null; basisOfRecord: string | null; createdAt: string;
  species: Species; district: DistrictSummary | null;
};
type CurrentWeatherReading = {
  id: string; districtId: string; lat: number; lng: number; readingTime: string;
  temperature2m: number | null; relativeHumidity2m: number | null; apparentTemperature: number | null;
  windSpeed10m: number | null; windDirection10m: number | null; windGusts10m: number | null;
  surfacePressure: number | null; precipitation: number | null; weatherCode: number | null;
  cloudCover: number | null; isDay: boolean | null; district?: { id: string; name: string };
};
type HourlyAirQualityReading = {
  id: string; districtId: string; lat: number; lng: number; forecastTime: string;
  pm10: number | null; pm25: number | null; carbonMonoxide: number | null;
  nitrogenDioxide: number | null; sulphurDioxide: number | null; ozone: number | null;
  uvIndex: number | null; district?: { id: string; name: string };
};
type StationFloodForecast = {
  id: string; stationId: string; lat: number; lng: number; forecastDate: string;
  riverDischarge: number | null; riverDischargeMean: number | null; riverDischargeMedian: number | null;
  riverDischargeMax: number | null; riverDischargeMin: number | null; riverDischargeP25: number | null;
  riverDischargeP75: number | null; riverDischargeP10: number | null; riverDischargeP90: number | null;
  createdAt: string;
  station?: { id: string; serial: number; stationCode: string; name: string; riverName: string | null;
    tidalStatus: string | null; districtId: string | null; district?: { id: string; name: string } | null };
};

type Provider = {
  id: string; name: string; type: ProviderType; country: string; isActive: boolean;
  organization: { id: string; name: string } | null;
};
type Dataset = {
  id: string; name: string; category: DatasetCategory; accessPolicy: DatasetAccessPolicy; source: string;
  providerId: string | null; provider: { id: string; name: string; type: string } | null;
  description: string | null; recordCount: number | null; lastSyncedAt: string | null;
  isPublished: boolean; createdAt: string; updatedAt: string;
};
type RestorationProject = {
  id: string; title: string; description: string; category: RestorationCategory; status: ProjectStatus;
  organizationId: string | null; districtId: string | null; startDate: string | null; endDate: string | null;
  impactSummary: string | null; createdById: string; createdAt: string; updatedAt: string;
  organization: { id: string; name: string } | null; district: DistrictSummary | null;
  _count: { participants: number };
};
type Organization = {
  id: string; name: string; type: OrganizationType; description: string | null; website: string | null;
  country: string; isVerified: boolean; createdAt: string;
  providers?: Array<{ id: string; name: string; type: ProviderType; isActive: boolean }>;
};
type MemberSummary = {
  id: string; displayName: string; role: UserRole; createdAt: string;
  profile: { avatarUrl: string | null; occupation: string | null; bio: string | null;
    institution: string | null; locationDistrict: string | null; locationCountry: string;
    earnedBadges: string[]; contributionPoints: number } | null;
};
type MemberDetail = {
  id: string; displayName: string; role: UserRole; createdAt: string;
  profile: { avatarUrl: string | null; occupation: string | null; bio: string | null;
    institution: string | null; education: string | null; expertise: string[]; researchInterests: string[];
    locationDistrict: string | null; locationCountry: string; earnedBadges: string[];
    contributionPoints: number } | null;
  socialLinks: Array<{ platform: string; url: string }>;
};
type ResearcherApplication = {
  id: string; status: 'PENDING' | 'NEEDS_INFORMATION' | 'APPROVED' | 'DECLINED';
  reviewerNote: string | null; reviewedAt: string | null; createdAt: string; updatedAt: string;
};
type AlertSubscription = {
  id: string; userId: string; districtId: string | null; channel: string; minSeverity: AlertSeverity;
  createdAt: string; district: { id: string; name: string } | null;
};
type GamificationSummary = {
  completeness: number;
  missingFields: Array<{ key: string; label: string; hint: string; weight: number; href: string }>;
  badges: Array<{ key: string; category: string; tier: string; label: string; tierLabel: string;
    emoji: string; description: string; earned: boolean; current: number; threshold: number; points: number }>;
  points: number; level: number; levelLabel: string; nextLevelPoints: number;
};

type CommunityPostSummary = {
  id: string; title: string; body: string; createdAt: string; updatedAt: string;
  author: { id: string; displayName: string }; district: { id: string; name: string } | null;
  _count: { comments: number };
  poll: { id: string; question: string; endsAt: string | null;
    options: Array<{ _count: { votes: number } }> } | null;
};
type CommunityPostDetail = CommunityPostSummary & {
  comments: Array<{ id: string; body: string; createdAt: string; author: { id: string; displayName: string } }>;
  poll: { id: string; question: string; endsAt: string | null; createdAt: string;
    options: Array<{ id: string; text: string; order: number; _count: { votes: number } }>;
    userVotedOptionId: string | null } | null;
};
type WaterBody = {
  id: string; code: string; slug: string; nameEn: string; nameBn: string | null;
  hydrologicalClass: HydrologicalClass; waterBodyType: WaterBodyType; waterBodySubtype: string | null;
  latitude: number | null; longitude: number | null; transboundaryFlag: boolean;
  transboundaryCountries: string | null;
  upazilas: Array<{ upazila: { id: string; name: string; district: { id: string; name: string } } }>;
  loticDetails: LoticDetails | null; lenticDetails: LenticDetails | null;
  stations?: Array<{ station: WaterLevelStation }>;
};
type WaterBodyPagedResponse = { data: WaterBody[]; total: number; page: number; limit: number; totalPages: number };
type WaterLevelStationPagedResponse = { data: WaterLevelStation[]; total: number; page: number; limit: number; totalPages: number };
type StationLatestReadingResponse = {
  station: WaterLevelStation; latestReading: WaterLevelReading | null;
  thresholdStatus: WaterLevelThresholdStatus | null;
};
type NationalEmissionReading = {
  id: string; year: number; indicatorCode: string; indicatorName: string;
  value: number | null; unit: string; updatedAt: string;
};
type EmissionIndicator = { indicatorCode: string; indicatorName: string };
type MarineForecast = {
  id: string; districtId: string; lat: number; lng: number; forecastDate: string;
  waveHeightMax: number | null; waveDirectionDominant: number | null; wavePeriodMax: number | null;
  windWaveHeightMax: number | null; windWaveDirectionDominant: number | null; windWavePeriodMax: number | null;
  swellWaveHeightMax: number | null; swellWaveDirectionDominant: number | null; swellWavePeriodMax: number | null;
  swellWavePeakPeriodMax: number | null; seaSurfaceTemp: number | null; district?: { id: string; name: string };
};
type SatelliteRadiationReading = {
  id: string; districtId: string; lat: number; lng: number; readingDate: string;
  shortwaveRadiationSum: number | null; district?: { id: string; name: string };
};
type ReportDetail = CitizenReport & {
  statusHistory: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
};
type DistrictDetail = {
  id: string; name: string; bnName: string | null; areaSqKm: number | null; isCoastal: boolean;
  coastLat: number | null; coastLng: number | null; division: { id: string; name: string };
  upazilas: Array<{ id: string; name: string; bnName: string | null }>;
  avgTemp30d: number | null; minTemp30d: number | null; maxTemp30d: number | null;
  avgHumidity30d: number | null; totalPrecip30d: number | null; avgWindSpeed30d: number | null;
  avgCloudCover30d: number | null; avgPm25_30d: number | null; avgPm10_30d: number | null;
  avgUvIndex30d: number | null; climateUpdatedAt: string | null;
};
type DailyForecast = {
  id: string; forecastDate: string; weatherCode: number | null; temperature2mMax: number | null;
  temperature2mMin: number | null; precipitationSum: number | null;
  precipitationProbabilityMax: number | null; windSpeed10mMax: number | null; uvIndexMax: number | null;
};
type UpazilaDetail = {
  id: string; name: string; bnName: string | null; areaSqKm: number | null;
  district: { id: string; name: string; division: { id: string; name: string } };
  unions: Array<{ id: string; name: string; bnName: string | null }>;
  avgTemp30d: number | null; minTemp30d: number | null; maxTemp30d: number | null;
  avgHumidity30d: number | null; totalPrecip30d: number | null; avgWindSpeed30d: number | null;
  avgCloudCover30d: number | null; avgPm25_30d: number | null; avgPm10_30d: number | null;
  avgUvIndex30d: number | null; climateUpdatedAt: string | null;
};
type UnionDetail = {
  id: string; name: string; bnName: string | null;
  upazila: { id: string; name: string; district: { id: string; name: string; division: { id: string; name: string } } };
  avgTemp30d: number | null; minTemp30d: number | null; maxTemp30d: number | null;
  avgHumidity30d: number | null; totalPrecip30d: number | null; avgWindSpeed30d: number | null;
  avgCloudCover30d: number | null; avgPm25_30d: number | null; avgPm10_30d: number | null;
  avgUvIndex30d: number | null; climateUpdatedAt: string | null;
};
type CompanySummary = {
  id: string; name: string; bnName: string | null; companyType: CompanyType;
  registrationNumber: string | null; establishedYear: number | null; employeeCount: number | null;
  website: string | null; isActive: boolean; headquarterDistrictId: string | null;
  headquarterDistrict: { id: string; name: string } | null; parentCompanyId: string | null;
  parentCompany: { id: string; name: string; companyType: CompanyType } | null;
  _count: { facilities: number; subsidiaries: number }; createdAt: string; updatedAt: string;
};
type CompanyDetail = CompanySummary & {
  description: string | null; contactEmail: string | null; contactPhone: string | null;
  subsidiaries: Array<{ id: string; name: string; companyType: CompanyType; isActive: boolean }>;
  facilities: Array<{ id: string; name: string; facilityType: FacilityType;
    complianceStatus: ComplianceStatus; isActive: boolean; district: { id: string; name: string } }>;
};
type FacilitySummary = {
  id: string; name: string; bnName: string | null; facilityType: FacilityType;
  complianceStatus: ComplianceStatus; isActive: boolean; lat: number | null; lng: number | null;
  districtId: string; upazilaId: string | null; companyId: string | null;
  company: CompanyInline | null; createdAt: string; updatedAt: string;
  district: { id: string; name: string }; upazila: { id: string; name: string } | null;
};
type FacilityDetail = FacilitySummary & {
  description: string | null; establishedYear: number | null; productionCapacity: string | null;
  landArea: number | null; etpInstalled: boolean; etpCapacity: number | null; unionId: string | null;
  union: { id: string; name: string } | null;
  reports: Array<{ id: string; title: string; status: ReportStatus; category: ReportCategory; createdAt: string }>;
};
type AdminDashboard = {
  meta: DashboardMeta; users: { total: number; byRole: Array<{ role: string; count: number }> };
  reports: { pendingReview: number; byStatus: Array<{ status: string; count: number }> };
  alerts: { activeBySeverity: Array<{ severity: string; count: number }> };
  platform: { organizations: number; publishedDatasets: number; speciesRecorded: number;
    observationsThisMonth: number; auditEventsToday: number };
};
type CitizenDashboard = {
  meta: DashboardMeta; reports: { total: number; byStatus: Array<{ status: string; count: number }> };
  observations: { total: number; byCategory: Array<{ category: string; count: number }> };
  restoration: { joinedProjects: number }; community: { posts: number };
};
type ModeratorDashboard = {
  meta: DashboardMeta; queue: { pending: number; underReview: number; totalPending: number; reviewedToday: number };
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  submissionTrend: Array<{ day: string; count: number }>;
};
type GovernmentDashboard = {
  meta: DashboardMeta;
  alerts: { total: number; bySeverity: Array<{ severity: string; count: number }>;
    byDivision: Array<{ division: string; count: number }> };
  reports: { verifiedLast30d: number; byCategory: Array<{ category: string; count: number }>;
    topDistricts: Array<{ district: string; division: string; count: number }> };
  climate: { divisions: Array<{ name: string; avgTemp: number | null; avgPm25: number | null;
    totalPrecip: number | null; avgHumidity: number | null }> };
  flood: { totalStations: number; stationsWithForecast: number; highRiskStations: number;
    elevatedRiskStations: number; risingStations: number; latestReadingAt: string | null;
    highestRisk: Array<{ stationId: string; stationName: string; riverName: string | null;
      district: string | null; discharge: number | null; historicalMean: number | null; ratio: number | null;
      risk: 'HIGH' | 'ELEVATED'; waterLevel: number | null;
      thresholdStatus: 'DANGER' | 'WARNING' | 'NORMAL' | 'UNKNOWN';
      trend: 'RISING' | 'FALLING' | 'STEADY' | null; forecastDate: string }> };
};
type ResearcherDashboard = {
  meta: DashboardMeta;
  biodiversity: { totalSpecies: number; totalOccurrences: number;
    topSpecies: Array<{ name: string; occurrences: number }>;
    monthlyTrend: Array<{ month: string; count: number }> };
  observations: { total: number; researchGrade: number; researchGradePct: number;
    byCategory: Array<{ category: string; count: number }>;
    byTrust: Array<{ trustLevel: string; count: number }> };
};
type OrgAdminDashboard = {
  meta: DashboardMeta;
  projects: { total: number; active: number; newLast30d: number;
    byStatus: Array<{ status: string; count: number }>;
    byCategory: Array<{ category: string; count: number }> };
  engagement: { totalParticipants: number; avgParticipantsPerProject: number;
    topProjects: Array<{ id: string; title: string; participants: number }> };
};
type DashboardMeta = {
  generatedAt: string;
  sources: Array<{ name: string; status: 'FRESH' | 'STALE' | 'UNKNOWN'; lastSuccessfulSync: string | null }>;
};
```

The exact common station and water-body nested schemas (`WaterLevelStation`, `WaterLevelReading`, `LoticDetails`, `LenticDetails`) are defined in `packages/contracts/src/index.ts`; the water body response above contains those complete schema references. The browser redesign should use the source definitions for any field not repeated in the block above.

## Exact page-local response fields

These response types are currently declared inside page files rather than in the shared contracts package. Admin endpoints below return these fields as expected by the page. `Report` and `Project` here are admin list projections and therefore differ from the public contract types.

```ts
type AdminReportListResponse = {
  data: Array<{ id: string; title: string; category: string;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESOLVED';
    summary: string | null; createdAt: string; updatedAt: string;
    reporter: { id: string; displayName: string } | null;
    district: { id: string; name: string; division: { id: string; name: string } } | null }>;
  total: number; page: number; pageSize: number;
};
type AdminAlertListResponse = {
  data: Array<{ id: string; title: string; description: string;
    severity: 'INFO' | 'WATCH' | 'WARNING' | 'EMERGENCY';
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'; instructions: string | null;
    issuedAt: string; expiresAt: string | null; createdAt: string;
    district: { id: string; name: string; division: { id: string; name: string } } | null }>;
  total: number; page: number; pageSize: number;
};
type AdminObservationListResponse = {
  data: Array<{ id: string; category: 'BIODIVERSITY' | 'WATER_QUALITY' | 'AIR_QUALITY' | 'LAND_USE' | 'RESTORATION';
    trustLevel: 'RESEARCH_GRADE' | 'COMMUNITY' | 'UNVERIFIED' | 'FLAGGED'; description: string;
    species: string | null; lat: number | null; lng: number | null; observedAt: string; createdAt: string;
    observer: { id: string; displayName: string } | null;
    district: { id: string; name: string; division?: { name: string } } | null }>;
  total: number; page: number; pageSize: number;
};
type AdminUserListResponse = {
  data: Array<{ id: string; email: string; displayName: string;
    role: 'CITIZEN' | 'RESEARCHER' | 'ORGANIZATION_ADMIN' | 'GOVERNMENT' | 'MODERATOR' | 'ADMIN';
    isActive: boolean; createdAt: string; lastLoginAt: string | null }>;
  total: number; page: number; pageSize: number;
};
type AdminResearcherApplicationListResponse = {
  data: Array<{ id: string; status: 'PENDING' | 'NEEDS_INFORMATION' | 'APPROVED' | 'DECLINED';
    reviewerNote: string | null; createdAt: string;
    user: { id: string; email: string; displayName: string; role: string; isEmailVerified: boolean;
      socialLinks: Array<{ platform: string; url: string }> } }>;
  total: number; page: number; pageSize: number;
};
type AdminRestorationListResponse = {
  data: Array<{ id: string; title: string; description: string;
    category: 'TREE_PLANTING' | 'WETLAND_RESTORATION' | 'RIVERBANK_PROTECTION' | 'MANGROVE' | 'WASTE_MANAGEMENT' | 'OTHER';
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED'; startDate: string | null; endDate: string | null;
    createdAt: string; organization: { id: string; name: string } | null;
    district: { id: string; name: string; division?: { name: string } } | null;
    _count: { participants: number } }>;
  total: number; page: number; pageSize: number;
};
type AdminAuditEventListResponse = {
  data: Array<{ id: string; action: string; userId: string | null; entityType: string | null;
    entityId: string | null; meta: Record<string, unknown> | null; ipAddress: string | null;
    createdAt: string; user: { displayName: string; email: string; role: string } | null }>;
  total: number; page: number; pageSize: number;
};
type AdminIngestionJobListResponse = {
  data: Array<{ id: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    startedAt: string | null; endedAt: string | null; errorMsg: string | null; createdAt: string;
    provider: { id: string; name: string; type: string } }>;
  total: number; page: number; pageSize: number;
};
type AdminDatasetListResponse = {
  data: Array<{ id: string; name: string;
    category: 'WEATHER' | 'AIR_QUALITY' | 'WATER' | 'BIODIVERSITY' | 'MONITORING' | 'REPORTS';
    accessPolicy: 'PUBLIC' | 'LOGIN_REQUIRED' | 'RESEARCHER' | 'APPROVED' | 'GOVERNMENT';
    source: string; description: string; recordCount: number | null; lastSyncedAt: string | null;
    isPublished: boolean; createdAt: string; updatedAt: string;
    provider: { id: string; name: string; type: string } | null }>;
  total: number;
};
type AdminOrganizationListResponse = Array<{ id: string; name: string; type: string; description: string | null;
    website: string | null; country: string; isVerified: boolean;
    memberships: Array<{ userId: string; role: 'ADMIN' | 'MEMBER';
      user: { id: string; displayName: string; email: string; isActive: boolean } }> }>;
type AdminEligibleUsersResponse = Array<{ id: string; displayName: string; email: string; isActive: boolean }>;
type AdminPermissionListResponse = Array<{ id: string; key: string; description: string; roles: string[] }>;
type HealthResponse = { status: string; service: string; timestamp: string; version: string };
type AdminSocialDraft = {
  id: string; type: string; status: string; format: string; locale: string; headline: string;
  summary: string | null; caption: string | null; disclaimer: string | null; sourceLabel: string;
  sourceObservedAt: string | null; publishedAt: string | null;
  district: { id: string; name: string; bnName: string | null } | null;
  renderedAssets: Array<{ publicUrl: string; format: string; width: number; height: number }>;
  publications: Array<{ id: string; status: string; externalUrl: string | null; error: string | null;
    createdAt: string; platformAccount: { id: string; platform: string; displayName: string } }>;
};
type NationalSuggestion = {
  id: string; cadence: string; series: string; headline: string; reason: string; quality: string;
  sourceLabel: string; windowStart: string; windowEnd: string;
  coverage: { available: number; expected: number; percentage: number };
  sourceSnapshot: { rows: Array<Record<string, unknown>> };
};
type OrganizationDetailPageResponse = {
  id: string; name: string; type: string; description: string | null; website: string | null;
  country: string; isVerified: boolean; createdAt: string; updatedAt: string;
  providers: Array<{ id: string; name: string; type: string; isActive: boolean }>;
  memberships: Array<{ role: string; user: { id: string; displayName: string } }>;
  restorationProjects: Array<{ id: string; title: string; category: string; status: string;
    district: { id: string; name: string } | null }>;
  _count: { memberships: number; restorationProjects: number };
};
type PlatformMetrics = {
  activeAlerts: number; emergencyAlerts: number; verifiedReports: number; publicDatasets: number;
  researchGradeObservations: number; districtsWithResearchGradeObservations: number;
  activeRestorationProjects: number; reportsByCategory: Array<{ category: ReportCategory; count: number }>;
  restorationVolunteers: number; restorationAreaHa: number;
};
```

Other page-local schemas are small projections visible directly in their page modules: `/organizations` list (`data: Organization[]`, `total`, `page`, `pageSize` where each organization has `id`, `name`, `type`, nullable `description`, nullable `website`, `country`, `isVerified`, `createdAt`, `updatedAt`), social-content option types described on the page, and admin settings profile (`id`, `email`, `displayName`, `role`). These local declarations are the current UI expectations; promote them into `packages/contracts` if the redesign makes them shared API contracts.

## Source files

- Shared routes and response types: `packages/contracts/src/index.ts`
- Current endpoint catalog: `docs/api/backend-api-links.md`
- Page fetches: `apps/web/app/` and `apps/admin/app/`
- Server fetch helpers: `apps/web/lib/api.ts`, `apps/admin/lib/api.ts`
- Static homepage seed data: `apps/web/lib/static-data.ts`
