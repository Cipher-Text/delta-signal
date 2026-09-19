# Public List & Filter Audit

Audit date: 2026-09-02

Scope: `apps/web` routes and the public-read API contracts they consume. Admin routes, dashboards, profile/settings, authentication screens, and detail-only pages are excluded as standalone list pages, although collection sections embedded in detail pages are noted.

Follow-up note: division, district, upazila, and union pages received a shared continuous non-tabbed UX revision on 2026-09-19. Revalidate location-directory recommendations when this audit is next refreshed.

## 1. Executive Summary

Delta Signal has a useful set of environmental collections, but the public discovery surface is currently split between one anonymous homepage and an authenticated app shell. The `(app)` layout calls `getCurrentUser()` and redirects unauthenticated visitors to `/login`; consequently `/data`, `/reports`, `/alerts`, `/observations`, `/biodiversity`, `/restoration`, `/community`, `/water-bodies`, `/locations`, and `/organizations` are public-domain pages backed by `@Public()` APIs, but are not anonymously browsable in the web frontend. This conflicts with `docs/access-model.md` and is the highest-priority discoverability defect.

Current list experiences are mostly server-rendered tables with link/chip filters. Category, severity, district, type, and a few hierarchy filters work through query strings. Search exists only for species. Sorting, explicit result counts, reusable active-filter chips, date filtering, robust pagination on most pages, map-bounds filtering, and mobile filter-drawer behavior are largely absent. The APIs already support more than the UI exposes for reports, observations, restoration, alerts, water bodies, and occurrence records.

The right product direction is a small shared discovery system: location-first citizen controls, progressively disclosed expert controls, and provenance/taxonomy controls for researchers. Keep separate collections for lotic/lentic water bodies and for species versus occurrence records. Do not add climate suitability, IUCN, habitat, or publication filters until those fields and endpoints exist.

Top five improvements:

1. Make intended public read pages anonymously renderable, while keeping submission, joining, downloads, subscriptions, and profile actions gated.
2. Add a shared search/filter toolbar with URL state, dependent Bangladesh location hierarchy, active chips, result count, clear-all, and mobile drawer.
3. Expose already-supported API filters in `/reports`, `/observations`, `/alerts`, `/restoration`, `/biodiversity`, and `/water-bodies`.
4. Add server-side sort and pagination contracts consistently; do not simulate sorting over truncated client data.
5. Create dedicated public weather/history and researcher-facing catalog/observation views rather than burying records in dataset detail and location pages.

## 2. Public Page Inventory

“Public” below means public-facing product intent. “Actual anonymous access” records the current web behavior.

| Route | Entity | Audience | Search | Filters | Sort | Map | Recommendation |
|---|---|---|---|---|---|---|---|
| `/` | Climate snapshot, weather/AQ, districts, alerts, reports, species, restoration, datasets | Citizen first; expert/researcher overview | No global search; district selector in map/conditions components | Map/selected district; section-specific fixed previews | Fixed/latest or API order | Yes; alert/report pins and district markers | Keep as safety-first overview; add “Explore all” links, location handoff, and honest per-section result counts |
| `/locations` | Bangladesh divisions | Citizen, expert | No | None | API order | No | Add division search only when the directory grows; link to district directory |
| `/locations/divisions/:id` | Districts within a division plus climate summaries | Citizen, expert | No | Division is route context | No | No | Add district name search and data-availability indicator if list becomes large |
| `/locations/districts/:id` | District conditions, forecasts, alerts, occurrences, reports, observations, projects, upazilas | Citizen first; expert | No | District is route context | Mixed/latest | No | Preserve as a local environmental board; add section-level “view all” links and date context |
| `/locations/upazilas/:id` | Unions plus local climate/conditions | Citizen, expert | No | Upazila is route context | No | No | Add union search only if necessary; avoid cross-domain filter jungle |
| `/data` | Published datasets and providers | Researcher, expert; citizen transparency | No | Dataset category only; provider list unfiltered | No | No | Add dataset search and metadata filters; split provider directory into its own route |
| `/reports` | Verified/resolved citizen reports | Citizen, government, expert | No | Category chips; API also supports status and district/upazila/union | No | No | Add simple location/status/date/search; keep moderation statuses hidden from citizens |
| `/alerts` | Active alerts plus expired history | Citizen first; government, expert | No | Severity UI; API supports status, severity, alert type, district | No | No | Add hazard type and location; make history an explicit status/date view |
| `/observations` | Public observations (non-flagged) and authenticated submission form | Citizen, expert, researcher | No | Category UI; API supports trust level and district/upazila/union | No | No | Add location, date, trust/source behavior, search; move submission CTA below discovery for guests |
| `/biodiversity` | Species directory and recent GBIF occurrences | Researcher/expert; citizen | Species `search` only | None in UI; occurrence API supports species and district | No | No | Separate species and occurrence tabs/views; add taxonomy/location/date progressively |
| `/restoration` | Restoration projects | Citizen, NGO, expert | No | Category chips; API also supports status and district/upazila/union | No | No | Add status and location; organization filter after API support; keep create/join actions gated |
| `/community` | Community posts, optional polls, district-scoped feed | Citizen, local groups | No | District only | API default order only | No | Add search and recency/activity sort only after product defines ranking; keep poll/status filters out |
| `/water-bodies` | Mixed registry of rivers, lakes, haors, baors, beels, reservoirs, etc. | Citizen, expert, researcher | No | Type and district UI; API also supports hydrological class and upazila | No | No | Label lotic/lentic clearly; add class and hierarchy filters, not river-only attributes to all types |
| `/water-bodies/stations` | Water-level monitoring stations | Citizen, expert, government, researcher | No | Tidal status, district, water body; API also supports upazila | No | No | Add station search and reading-status filter only with API support; expose latest-reading state |
| `/organizations` | Organizations and memberships | NGO, researcher, expert | No | Type; current web route is auth-gated although API list is not `@Public()` | No | No | Decide whether directory is public; if yes, add anonymous read route and name/type/search |
| `/data/:id` | Dataset-specific preview tables: weather, AQ, flood, species, occurrences | Researcher/expert | No | None; fixed slices (`10`/`20`) | Source/API order | No | Treat as a detail page, but add dataset-specific table controls and provenance/version links |

Current anonymous routes are `/`, `/login`, and `/register`. The public API exposes additional read collections including `/locations/*`, `/datasets`, `/providers`, `/weather/*`, `/flood/*`, `/water-bodies`, `/reports`, `/alerts`, `/observations`, `/biodiversity/*`, `/restoration/projects`, and `/community/posts`. The frontend access mismatch should be resolved before investing in SEO or shareable filtered URLs.

### Cross-page discovery fields

This table makes the remaining requested audit fields explicit. “None” means no page-level mechanism was found in the inspected frontend.

| Page | Pagination / loading | Current URL query state | Mobile filter UX | Map integration |
|---|---|---|---|---|
| `/` | Fixed-size section previews; no list pagination | Anchor links only; selected district/map state is not shareable | Responsive layout, no filter drawer | `MapClient` with district, alert, report layers |
| Locations | No pagination; finite hierarchy lists | IDs live in path segments; no list filters | Responsive links; no filter UI | None |
| `/data` | API paginated envelope, but no controls; providers fixed preview | `category` only | Chips/toolbar, no drawer | None |
| `/reports` | API paginated envelope, but no controls | `category` only | Chips/toolbar, no drawer | None; nearby API unused |
| `/alerts` | API paginated envelope, but no controls; active/history are separate requests | `severity` only | Chips/toolbar, no drawer | None |
| `/observations` | API paginated envelope, but no controls | `category` only | Chips/toolbar, no drawer | None; nearby API unused |
| `/biodiversity` | Species/occurrence fixed page sizes; no controls | Species `search` only | Search row only; no drawer | None |
| `/restoration` | API paginated envelope, but no controls | `category` only | Chips/toolbar, no drawer | None |
| `/community` | API paginated envelope, but no controls | `districtId` only | District control, no drawer | None |
| `/water-bodies` | Server pagination with previous/next | `waterBodyType`, `districtId`, `page` | Inline form; no drawer | None |
| `/water-bodies/stations` | Server pagination with previous/next | `districtId`, `waterBodyId`, `tidalStatus`, `page` | Inline form/chips; no drawer | None |
| `/organizations` | Server pagination with previous/next, but auth-gated | `type`, `page` | Chips; no drawer | None |
| Dataset detail / location detail | Fixed slices or embedded finite sections | Detail ID in path; child queries use IDs internally | Responsive tables; no filter drawer | None |

## 3. Page-by-Page Recommendations

### `/` — public environmental board

**Entity/data:** live emergency banner, flood-risk strip, national/division climate band, platform metrics, district map with active alerts and verified reports, air-quality ranking, dataset preview, biodiversity/restoration/community highlights. The source components are `EmergencyBanner`, `FloodRiskStrip`, `NationalClimateBand`, `MapSection`, `AirQualityGrid`, `DatasetPreview`, and related sections.

**Audience:** citizen primary; experts and researchers use it as an orientation page.

**Current discovery:** no global search; map is the primary location interaction; previews use fixed small page sizes and API/static fallback data. There is no shared URL state for selected district or map viewport. The public nav links to anchors only.

**Problems:** users cannot transfer a selected location into a filtered collection; section counts are not consistently actionable; map contains alerts/reports but no filter controls or legend-driven toggles; a fallback response must remain visibly distinguished from live empty data.

**Recommendation:** keep only high-signal controls here: “Choose your district,” “Use my location” when permission is explicitly requested, and map toggles for alerts/reports. Link to `/alerts?districtId=…`, `/reports?districtId=…`, `/observations?districtId=…`, `/biodiversity?districtId=…`, and `/water-bodies?districtId=…`. Do not add scientific sliders to the homepage.

### `/locations`, division pages, and district/upazila collection sections

**Entity/data:** divisions, districts, upazilas, unions, plus local weather, air quality, flood, alerts, biodiversity, reports, observations, projects, and climate summaries on district detail.

**Audience:** citizens seeking local relevance; experts comparing places.

**Current discovery:** hierarchical links only. `/locations` lists divisions; division pages list districts; upazila pages list unions. Detail pages use route context and show mixed tables, not a cross-page directory search. `LocationBreadcrumb` exists; API supports `divisionId`, `districtId`, `upazilaId`, and `isCoastal`/`isThana` on lower-level location endpoints.

**Problems:** no directory search, no visible data availability, no division-level climate comparison controls, and no consistent “all districts/upazilas” entry point. The district detail page has many list sections but no date/sort context and no links to full filtered collections.

**Recommended filters:**

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Division/district context | location hierarchy | Citizen, expert | Core local discovery | A — route/API supported |
| P1 | Name search | search input | Citizen, expert | Find a place quickly | D — frontend/API search needed |
| P1 | Data available | checkbox/chips | Citizen, researcher | Distinguish empty from unavailable | D — requires availability contract |
| P2 | Coastal / thana classification | checkbox | Expert/researcher | Existing location attributes where relevant | A for unions/upazilas; frontend missing |
| P2 | Ecological zone/indicator | select | Expert | Useful only after modeled fields exist | D |

**Sort:** name A–Z; for district comparison, temperature/rainfall/AQI only on a purpose-built weather/conditions view and only with explicit metric/date labels. **Search:** English and Bangla names, aliases, and hierarchy context. **Empty states:** distinguish “No locations match” from “No environmental records available for this place”; offer parent location and all-locations links.

### `/data` — dataset catalog and provider preview

**Entity/data:** published `Dataset` records, categories `WEATHER`, `AIR_QUALITY`, `WATER`, `BIODIVERSITY`, `REPORTS`, `MONITORING`, `GEOSPATIAL`, plus `Provider` records.

**Audience:** researcher primary; environmental expert; citizen transparency.

**Current discovery:** category chips only. API supports `category`, `accessPolicy`, page, and page size. Providers are a fixed 10-item preview and API supports provider `type`. No search, sort, result count presentation, geography/time/license/format controls, or active chips. `/data/:id` renders fixed previews and source endpoints.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Dataset name/keyword | search input | All, especially researcher | Primary catalog discovery | D — API search needed |
| P0 | Environmental domain/category | multi-select or chips | All | Existing domain taxonomy | A — UI currently has category |
| P1 | Access level | select/chips | Researcher, expert | Set expectations before opening detail | A — API supports `accessPolicy`; UI missing |
| P1 | Provider | select/autocomplete | Researcher | Provenance and source comparison | D — catalog needs providerId/provider metadata filter |
| P1 | Geography / temporal coverage | select/date range | Researcher | Reproducibility | D — dataset schema/API fields need confirmation/addition |
| P1 | Download/API availability | checkbox | Researcher | Action-oriented discovery | D — contract should expose distribution capabilities |
| P2 | License, format, update frequency, resolution | multi-select/select | Researcher | Advanced catalog metadata | D — not present in current dataset contract |

**Sort:** relevance, recently updated, name A–Z, newest dataset/version. **Search:** dataset name, description, provider, category, keywords, and external identifier when available; support English/Bangla labels where metadata exists. **Empty:** “No published datasets match” plus clear filters; do not imply no data exists if access policy merely hides download.

### `/reports` — citizen reports

**Entity/data:** public verified/resolved `CitizenReport` records; categories are water pollution, illegal dumping, deforestation, wildlife incident, flooding, air pollution, other. The API supports `status`, `category`, district, upazila, union, pagination, and a separate nearby endpoint.

**Audience:** citizen primary; government responders and experts secondary.

**Current discovery:** category chips only; no search, location controls, status selector, dates, sort, map, or visible pagination. The page also combines list discovery with an authenticated submission form. API status filters are used only for summary counts.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Issue category | chips/multi-select | Citizen | Understandable issue grouping | A — UI/API |
| P0 | Location | location hierarchy | Citizen, expert | Local relevance | B — API supports hierarchy; frontend missing |
| P0 | Status: verified/resolved | radio/chips | Citizen | Explain whether issue is accepted/closed | A — API supports status; default should remain publishable |
| P1 | Reported/updated date | date-range picker | Expert, government | Trend and response review | D — API date query needed |
| P1 | Nearby/current location | nearby control/map bounds | Citizen | Most useful local discovery | A for `/reports/nearby`; frontend missing |
| P2 | Evidence available | checkbox | Expert | Triage confidence | D — API filter/summary needed |

**Sort:** newest reported, recently updated, nearest, severity only if a severity field is added; do not call category “severity.” **Search:** title, description, category, and location names; Bangla/English issue labels should normalize to the same category. **Empty:** “No verified reports in this area/filter” with clear filters, broaden-location action, and submission CTA. Never expose submitted/under-review/rejected records through a public filter unless the publication policy changes.

### `/alerts` — active and historical alerts

**Entity/data:** `Alert` records with `AlertType` (flood, cyclone, heatwave, air quality, water pollution, etc.), severity, status, district, issued/expiry dates, instructions.

**Audience:** citizen primary; government and experts secondary.

**Current discovery:** severity chips; active cards plus a separate expired-history table. API supports status, severity, alert type, district, page, and page size. No search, date range, district filter, alert-type filter, sort, map, or explicit result count.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Active/expired | tabs/radio | Citizen, expert | Matches page purpose | A — API already used for status |
| P0 | Severity | chips/radio | Citizen | Safety signal | A |
| P0 | District | location select/autocomplete | Citizen, government | Affected-area discovery | B — API supports district; frontend missing |
| P1 | Hazard type | multi-select | Citizen, expert | Find flood/cyclone/AQ warnings | B — API supports `alertType`; frontend missing |
| P1 | Issued/expiry date | date range | Expert, government | History and validity | D — API query support needed |
| P2 | Issuing authority | select | Expert | Provenance | D — field/filter contract needed |

**Sort:** emergency/highest severity first for active; newest issued; expiring soon; newest history. **Search:** title, description, hazard type, district, issuing authority. **Empty:** active “No active alerts right now” should include last refresh/source context; filtered empty states should offer “show all active alerts.” Expired alerts need clear date labels and should not be mixed with current safety messaging.

### `/observations` — environmental observation feed

**Entity/data:** public non-flagged `Observation` records with categories biodiversity, water quality, air quality, land use, restoration; trust levels include research-grade, community, unverified, flagged. API supports category, trust level, district/upazila/union, pagination, and nearby lat/lng/radius.

**Audience:** citizen and expert; researcher for research-grade records.

**Current discovery:** category chips only; no search, location, trust filter, date, measurement, sort, map, or pagination. The page fetches the district list only for authenticated users because it is currently coupled to the submission form.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Observation category | chips/multi-select | Citizen, expert | Domain entry point | A |
| P0 | Location | location hierarchy | Citizen, expert | Local and field-work discovery | B |
| P1 | Trust level | simple chips; advanced multi-select | Expert, researcher | Quality interpretation | B — API supports; UI missing |
| P1 | Observed date | date range | Expert, researcher | Time-series/reproducibility | D — API query needed |
| P1 | Nearby/map viewport | map bounds or nearby control | Citizen, expert | Spatial observation search | A for nearby; polygon bounds D |
| P2 | Measurement parameter/quality flag | multi-select/range | Expert, researcher | Only where measurement payload is returned | D — list query/contract needed |

**Sort:** newest observed, recently added, nearest, research-grade first only as an explicit quality sort. **Search:** description, species name, location, observer/source, and measurement labels when present. **Empty:** clarify whether no observations exist or all were excluded as flagged; suggest broader location/date and explain trust levels in plain language. Keep submission as a separate CTA/card for guests.

### `/biodiversity` and species occurrence views

**Entity/data:** `Species` directory with canonical/scientific name, vernacular name, family, kingdom/phylum/class/order/genus, GBIF key, IUCN status when populated, and occurrence count; `Occurrence` records with species, district, coordinates, observed date, recordedBy, basis of record. GBIF is synced daily.

**Current discovery:** species search is the only search/filter and is URL-backed as `search`; occurrence preview is fixed to 10 rows and has no controls. The species detail occurrence table is fixed to 20 rows and only scoped by species ID.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Name search | search input/autocomplete | All | Existing core behavior | A — species `search`; improve matching |
| P1 | Taxonomic group/family/genus | tree selector/select | Expert, researcher | Scientific browsing | A for stored fields; API query support D |
| P1 | District | location select | Citizen, expert, researcher | Bangladesh occurrence discovery | B — occurrence API supports district; frontend missing |
| P1 | Observed date | date range | Expert, researcher | Historical occurrence work | D — API query needed |
| P1 | Basis of record/source | multi-select | Researcher | Provenance and reproducibility | D — stored `basisOfRecord`, filter missing |
| P2 | Coordinate availability | checkbox | Researcher | Spatial analysis quality | D — stored coordinate presence, query missing |
| P2 | Conservation status/native-invasive/habitat | select | All as appropriate | Valuable only when authoritative fields exist | D — IUCN enrichment and these fields are not complete/currently supported |

**Sort:** name A–Z, occurrence count, recently observed; occurrences newest observed, oldest, name, location. **Search:** canonical/scientific, vernacular/Bangla, aliases, family/genus, GBIF key. Normalize accents/case and show scientific names in italics. **Empty:** distinguish “no species name match” from “species exists but no occurrence in this place/date”; show sync freshness and source. Do not label an occurrence as a “sighting” when the basis may be specimen, observation, or human observation.

### `/restoration` — projects

**Entity/data:** `RestorationProject` records with category (tree planting, wetland restoration, riverbank protection, mangrove, waste management, other), status, organization, district/upazila/union, participant count, description and impact summary. API supports category, status, hierarchy, pagination.

**Current discovery:** category chips only; no location/status/search/sort/pagination UI. Creation and join actions are mixed into the collection and are gated by authentication/role.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Project category | chips/multi-select | Citizen, NGO | Understand action type | A |
| P0 | Status | chips/radio | Citizen, NGO | Find active opportunities | B — API supports; UI missing |
| P0 | Location | hierarchy | Citizen, NGO, expert | Join/find local work | B |
| P1 | Organization | autocomplete | NGO, researcher | Attribution and partnership | D — API query/field contract needed |
| P1 | Start year/updated date | select/date range | Expert, researcher | Portfolio/history | D — query and field exposure needed |
| P2 | Ecosystem/impact metric | select/range | Expert | Compare outcomes | D — current project list does not expose normalized ecosystem metrics |

**Sort:** active first, recently updated, newest start, participant count, name. **Search:** title, description, organization, location, category. **Empty:** “No projects match” with broaden location/status and a “register a project” CTA only for eligible users. Keep factual project records separate from modeled restoration impact or suitability.

### `/community` — local discussion feed

**Entity/data:** public `CommunityPost` summaries with title/body excerpt, author, district, timestamps, poll indicator and comments/votes on detail.

**Current discovery:** district filter is URL-backed; no search or sort; default API order is used. List has create form and detail has poll/comment actions.

**Recommendation:** P0 district; P1 title/body search; P1 newest/recent activity sort if the API defines deterministic ranking; P2 topic/tag only if tags are added. Do not add environmental measurement filters to a conversation feed. Search should match title, body, author, and district; Bangla tokenization matters. Empty states should distinguish “no posts in this district” from a service failure and offer “all districts” and “start a discussion.”

### `/water-bodies` — mixed hydrological registry

**Entity/data:** `WaterBody` records with hydrological class, water-body type, English/Bangla names, river-specific fields, lentic fields, upazila coverage, and associated stations. API supports `class`, `waterBodyType`, upazila, district, page, limit.

**Current discovery:** type and district selects; pagination; no search, class filter, upazila filter, sort, map, or active chips. The page mixes rivers and wetlands but the detail page conditionally renders river versus wetland/lake fields.

| Priority | Filter | UI Control | Audience | Reason | Data/API Available? |
|---|---|---|---|---|---|
| P0 | Lotic/lentic hydrological class | tabs/select | All | Prevent incompatible filters | A — API supports `class`; UI missing |
| P0 | Water-body type | multi-select | All | Meaningful domain grouping | A |
| P0 | District | location select | Citizen, expert | Local discovery | A |
| P1 | Upazila | dependent location select | Expert, researcher | Precise field work | A — API supports; frontend missing |
| P1 | Name search | search input | All | Registry lookup | D — API search needed |
| P2 | Area/length, permanence, protected status, basin | range/select | Expert, researcher | Relevant but attributes differ by class | D — fields/query support must be added; show class-specific controls |

**Sort:** name A–Z, area descending for lentic records, length descending for rivers, recently updated. Do not show length on a lake-focused result or area on a river-focused result unless the value is defined. Search English/Bangla name, alias, code, river system when present. Empty state should retain class/type context and explain “no records” versus “not mapped.”

### `/water-bodies/stations` — monitoring stations

**Entity/data:** `WaterLevelStation` records with name, station code, river, tidal status, serial, district, linked water bodies; detail exposes latest reading, threshold status, trend, and 30-day forecast.

**Current discovery:** tidal chips, district and water-body selects, server pagination, URL query state. No station search, upazila selector despite API support, sort, map, current threshold/readings filter, or result count.

**Recommended filters:** P0 district, tidal status, latest threshold status once list endpoint exposes it; P1 water body and upazila (already supported); P1 search by station/name/code; P2 reading date/availability. Sort by danger/warning first, rising trend, newest reading, station name. Search station name, code, river, water body, district. Empty state should offer reset and explain that registry presence does not guarantee a current reading.

### Embedded weather, climate, flood, and air-quality records

There is no dedicated public weather-history route. Weather is shown in the homepage, location detail pages, dataset detail previews, and station forecast detail. APIs support current all-district readings, district current readings, hourly/daily `from`/`to`, air quality current, flood forecast windows, and station reading history.

The missing product is a dedicated `/weather` or `/conditions` page with two modes:

- Citizen: district selector, current condition, 7-day forecast, AQI/rainfall warnings, simple “today/this week” controls.
- Expert/researcher: district hierarchy, date range, metric selector, source, freshness, downloadable dataset link, and explicit units.

Do not put temperature/rainfall sliders on unrelated pages. Current APIs support date ranges only for district forecasts and station history; a historical weather/AQ list needs new backend contracts.

## 4. Filter Matrix

Most useful filters by audience. “—” means the filter should not be prominent on that page.

| Page | Citizen | Environment Expert | Researcher |
|---|---|---|---|
| Home/map | District/current location; alert/report toggle | District; map viewport; alert/report type | Map viewport; source/freshness links |
| Locations | Division → district → upazila; nearby | Hierarchy; coastal/ecological/data availability | Hierarchy; data availability |
| Data | Domain; access expectation | Domain; provider; update status | Domain; provider; geography; temporal coverage; license; format; access |
| Reports | Issue category; district; active/verified/resolved | Category; hierarchy; date; evidence | Category; hierarchy; date; provenance/evidence |
| Alerts | Active/expired; severity; hazard; district | Hazard; severity; district; date; issuer | Hazard; district; lifecycle dates; issuer/source |
| Observations | Category; district; nearby | Category; hierarchy; trust; date; nearby; measurement type | Taxon/parameter; hierarchy; date; trust; source; coordinate availability |
| Biodiversity | Species/common name; district | Taxonomy; habitat when authoritative; district; date | Taxonomy; basis/source; date; coordinates; dataset |
| Restoration | Category; active status; district | Category; status; hierarchy; organization; ecosystem | Status/history; organization; geography; impact/provenance |
| Water bodies | Class; type; district | Class-specific type; hierarchy; protected status if available | Class; type; hierarchy; basin/system; area/length; source |
| Stations | District; tidal status; water body | District/upazila; tidal; threshold/trend; reading date | Station/source; date; threshold; trend; coordinates |
| Community | District; search | District; recency/activity | District; author/source; recency |

## 5. Shared Filter Components

Existing equivalents: `DistrictSelect` is used in report/observation/restoration submission forms; `LocationBreadcrumb` presents hierarchy; `MapClient` renders district, alert, and report map layers; `.search-row`, `.toolbar`, chips, `.table`, and `.empty-state` styles exist in `apps/web/app/globals.css`. There is no reusable discovery filter component yet.

Recommended shared components:

- `SearchInput` — debounced or submit-based, accessible label, clear button, bilingual placeholder.
- `LocationFilter` — dependent Country → Division → District → Upazila → Union; only show levels relevant to the page.
- `DateRangeFilter` — presets for today/7 days/30 days plus explicit range; timezone and inclusive-end semantics.
- `TaxonomyFilter` — progressive tree for species/occurrences only.
- `SourceFilter` / `ProviderFilter` — datasets, observations, biodiversity provenance.
- `StatusFilter` — alerts, reports, restoration, with citizen-safe labels.
- `VerificationFilter` — observations/reports only; explain trust versus moderation status.
- `MapBoundsFilter` — map-specific and opt-in; never silently changes a list without a visible “map area” chip.
- `ActiveFilterChips` and `ClearAll` — canonical labels and removable values.
- `FilterDrawer` — mobile bottom sheet/drawer with Apply and Reset.
- `SortSelector` — only renders domain-valid options and preserves URL state.
- `Pagination` — shared page/pageSize behavior with result count and scroll restoration.

Desktop standard: search at top; P0 controls visible; P1/P2 in “More filters”; active chips and result count below; sort at the result header. Mobile standard: search remains visible; Filter button shows active count; drawer has Apply and Reset; selected controls remain in URL state.

Canonical terminology: use “District,” “Upazila,” and “Union”; “Observation” for structured records, “Report” for citizen issue submissions, “Occurrence” for biodiversity records, “Provider” for organizations supplying datasets, and “Source” only for provenance or origin. Provide English and Bangla labels for public taxonomy/category/location terms; keep API enum values out of visible UI.

## 6. Backend/API Gaps

Status codes used here: A = backend and frontend support; B = backend supports, frontend missing; C = frontend field exists but backend support is unclear; D = neither is complete and requires API/data work.

| Page | Filter/behavior | Required API change | Priority |
|---|---|---|---|
| All discovery pages | Consistent `sort`, stable default order, `page/pageSize`, total/result metadata | Add validated sort enum and deterministic ordering to list endpoints | P0 |
| All public app routes | Anonymous read rendering | Fix web `(app)` layout/access boundary; keep write actions gated | P0 |
| Reports | Search, date range, evidence, sort, map bounds | Add `search`, `from/to`, evidence predicate, `sort`, and preferably geospatial bounds; `/nearby` already exists | P1 |
| Alerts | Search, date range, issuer, sort | Add query contract for title/text, issued/expiry range, issuer, sort | P1 |
| Observations | Search, date range, basis/source, measurement filters, sort | Add query contract and selected measurement joins; `/nearby` already exists | P1 |
| Biodiversity species | Taxonomy filters, sort, aliases/Bangla search | Add normalized search fields and taxon query parameters | P1 |
| Biodiversity occurrences | Date, basis, source, coordinate availability, map bounds | Add query parameters and geospatial filtering | P1 |
| Restoration | Search, organization, start year/date, ecosystem, sort | Add query fields where data exists and organization relation filter | P1 |
| Community | Search and explicit ranking/sort | Add full-text search and documented ranking semantics | P2 |
| Water bodies | Name search, class-specific area/length/permanence/protected/basin | Add validated fields and class-aware query parameters; current class/type/location filters exist | P1/P2 |
| Stations | Search, upazila UI exposure, latest threshold/trend/reading availability, sort | Add station search/status joins and sort; upazila already supported by API but omitted in frontend | P1 |
| Datasets | Search, provider, geography, temporal coverage, format/license/update frequency, distribution flags | Extend dataset metadata and list query contract; current category/accessPolicy only | P1 |
| Locations | Name search and data availability | Add search and per-location availability/coverage summary | P2 |
| Weather/AQ history | Historical list endpoint | Add persisted reading query with district, date range, metric, source, sort, pagination | P1 |
| Research | Publications/researchers | Add models and public list endpoints; no publication/researcher module exists | P2 |
| Map | Polygon boundaries and viewport query | Complete planned PostGIS polygon geometry and bbox queries; districts currently have point geometry | P2 |

Important existing API/frontend mismatches: reports, observations, restoration, alerts, occurrence records, water-body class, station upazila, and dataset access policy are available or partly available in backend contracts but not exposed in the corresponding UI. `/organizations` is a special case: its API full list is authenticated while the access model describes organizations as public; decide and align policy before labeling it a public directory.

## 7. Missing Public Pages

### Essential

**`/weather` or `/conditions`** — a location-first current and historical weather/AQ directory. Audience: citizen and expert. Entity: district readings/forecasts. Top filters: district, current/7-day/history mode, date range where supported, metric. This is required because weather is currently scattered across homepage and detail/previews.

**`/observations/map` or a map mode on `/observations`** — public spatial observation discovery. Audience: citizen, expert, researcher. Entity: observations/occurrences. Top filters: category/taxon, district, date, trust, map viewport. Start with nearby endpoint and add bbox support later.

**Public provider directory (`/providers`)** — provenance-first list linked from Data Hub. Audience: researcher and expert. Entity: providers. Top filters: provider type, country, name, dataset count. API already has public provider list/detail and type filtering.

### Useful

**`/biodiversity/occurrences`** — a dedicated occurrence explorer separate from the species directory. Top filters: taxon, district, date, basis, dataset/source, coordinate availability. This avoids overloading `/biodiversity` with two unrelated tables.

**`/water-bodies/map` or map mode on `/water-bodies`** — registry map after polygon/geometry coverage is reliable. Top filters: lotic/lentic class, type, district, protected status if available.

**`/datasets/:id/versions` public provenance view** — version history, last sync, coverage, license, and distribution metadata. The API has a public versions endpoint, but the frontend detail does not expose it consistently.

### Future

**`/research` / publications and `/researchers`** — valuable for researcher discovery but not justified by current data: roadmap says publication records are planned and no researcher list endpoint/model exists.

**`/agriculture`** — only when factual crop/season data or a validated suitability model exists. Do not present modeled suitability as current observation data.

**`/protected-areas` and `/forests`** — genuinely useful Bangladesh directories, but neither entity/API/frontend route exists. Build only with authoritative records, boundaries, managing authority, and protection/type fields.

## 8. Implementation Priority

### Phase 1 — Essential

- P0 — Public route access boundary: make read-only collection pages render without login; keep forms/actions gated. Route: all `(app)` discovery pages. Reuse: public/app shell split. API dependency: none. Complexity: M.
- P0 — Shared URL-backed `SearchInput`, `LocationFilter`, `ActiveFilterChips`, `SortSelector`, `Pagination`. Routes: reports, alerts, observations, restoration, water bodies, stations, data. API dependency: existing parameters first; complexity L.
- P0 — Reports citizen discovery: category + district + publishable status + nearby entry point. API dependency: existing except search/date. Complexity M.
- P0 — Alerts safety discovery: active/history, severity, district, hazard type; newest/severity sort. API dependency: existing filters; sort is new. Complexity M.
- P0 — Water-body class separation: hydrological class, type, district, pagination; clear lotic/lentic labels. API dependency: existing. Complexity S/M.
- P0 — Bilingual canonical labels and empty-state taxonomy across all public lists. API dependency: none initially. Complexity M.

### Phase 2 — Expert Discovery

- P1 — Observation filters and map mode: location hierarchy, trust, date, nearby, measurement-aware advanced filters. Reuse: `LocationFilter`, `MapBoundsFilter`. API dependency: date/search/measurement query additions. Complexity L.
- P1 — Biodiversity species/occurrence split with taxonomy, district, date, basis/source, pagination and sort. API dependency: occurrence/taxonomy query additions. Complexity L.
- P1 — Dedicated weather/conditions page with current/forecast/history modes. Reuse: `LocationFilter`, `DateRangeFilter`. API dependency: historical weather/AQ list contract. Complexity L.
- P1 — Restoration discovery: status, location, organization, active-first sort. API dependency: organization/search/sort additions. Complexity M.
- P1 — Stations: search, upazila, latest threshold/trend, sort, result freshness. API dependency: station status/search additions. Complexity M.
- P1 — Data catalog metadata controls and provider directory. API dependency: dataset metadata/search additions; provider type already exists. Complexity L.

### Phase 3 — Research Discovery

- P2 — Provenance/version UI for datasets and occurrence/observation source quality. API dependency: distribution metadata, source IDs, version presentation. Complexity M.
- P2 — Polygon/bbox map exploration and export-ready URL state. API dependency: planned PostGIS polygon geometry and spatial queries. Complexity L.
- P2 — Publications, researchers, protected areas, forests, and agriculture only after domain models/APIs exist. API dependency: new modules. Complexity L per domain.

## 9. Consistency Rules

- Search: match only fields meaningful for the entity; normalize case, punctuation, accents, and Bangla/English aliases. Search submits to the server for large collections and is represented as `search=` in the URL.
- Filters: show no more than 3–4 P0 controls by default. Use `More filters` for P1/P2. Dependent location controls clear child values when a parent changes.
- Sort: every sortable list needs a deterministic default, visible label, and URL `sort=`. Never sort only the currently loaded slice.
- Pagination: prefer server pagination with `page`, `pageSize`, total, and accessible previous/next controls. Reset to page 1 when a filter changes. Use infinite scroll only for a feed such as Community, with a fallback pagination/accessibility path.
- URL state: use `?page=1&search=...&divisionId=...&districtId=...&type=...&sort=...`; omit defaults, preserve unrelated filters, and keep query keys aligned with backend names. URLs must be shareable and safe; never expose private/internal moderation fields.
- Map behavior: list and map must share filters. A map viewport is an explicit contextual filter chip, not a silent global state change. Show loading, stale-data, source, and last-updated status.
- Bilingual UX: visible labels use English + Bangla where available; enum values remain implementation details. Scientific names use italic styling; common names remain plain-language.
- Empty/no-result behavior: distinguish API failure, successful zero results, unavailable data, and filtered zero results. Provide clear filters, broaden location/date, parent-location link, and relevant contribution CTA.
- Mobile: search visible; Filter button with active count opens drawer/bottom sheet; Apply and Reset are sticky; chips wrap/scroll accessibly; result count and sort stay near results.
- Audience progressive disclosure: citizen defaults are location, current status, category, and simple time presets. Expert controls add spatial/time/quality dimensions. Researcher controls add taxonomy, provenance, coverage, license, source, and reproducibility metadata only where the data model supports them.

## Proposed Backlog Summary

| Priority | Route/page | Change | Reusable component | API dependency | Complexity |
|---|---|---|---|---|---|
| P0 | `(app)` public collections | Anonymous read access with gated actions | PublicAppShell | None | M |
| P0 | `/reports`, `/alerts` | Location/status/type/search/safety sorting | LocationFilter, StatusFilter, SortSelector | Existing filters; add sort/search/date later | M |
| P0 | `/water-bodies` | Separate lotic/lentic discovery; expose class/upazila | LocationFilter, ActiveFilterChips | Existing | S |
| P0 | All lists | URL state, counts, reset, empty states, mobile drawer | FilterDrawer, Pagination | Consistent pagination/sort | L |
| P1 | `/observations` | Trust/location/date/nearby/map discovery | LocationFilter, MapBoundsFilter, DateRangeFilter | Date/search/measurement filters | L |
| P1 | `/biodiversity` | Species/occurrence explorers with taxonomy/provenance | TaxonomyFilter, SourceFilter | Taxon/date/basis/bbox filters | L |
| P1 | `/weather` | New current/forecast/history page | LocationFilter, DateRangeFilter | Historical reading list API | L |
| P1 | `/data`, `/providers` | Catalog search, metadata filters, provider directory | SearchInput, ProviderFilter | Dataset metadata/search | L |
| P2 | `/research`, `/researchers` | New publication/researcher directories | SearchInput, SourceFilter | New domain APIs | L |
| P2 | forests/protected areas/agriculture | Add only with authoritative domain datasets | Domain-specific | New models/APIs | L |
