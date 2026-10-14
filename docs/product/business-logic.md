# Business Logic

This document explains the domain rules behind Delta Signal and the reasoning for each. It is written for people who need to understand what the system does and why — not just how the code works.

---

## Core Principles

### Public records carry trust state for a reason

When a citizen reports a polluted river, that report is not immediately shown as verified fact on a public map. It starts as `submitted` — it happened, someone filed it, but it has not been reviewed. Moderators or admins move it through a workflow. A record only reaches the public as `verified` after a human has reviewed the evidence.

This distinction matters because Delta Signal aggregates data that is used for real decisions — by journalists, researchers, and government officials. A false or duplicate report shown as verified damages the platform's credibility. Unverified reports are still stored and visible to moderators; they just do not appear as validated public evidence.

### Reports and observations are different things

A **citizen report** describes an environmental problem that someone witnessed and wants documented and acted on. It is inherently subjective and location-specific. Example: "There is foam and discolored water at the canal near Jashore Road, looks like factory discharge."

An **observation** describes what was measured or methodically documented at a location. It is intended to be reproducible, citable evidence. Example: "Water sample at GPS point 23.4516, 90.3765 shows pH 5.2, DO 2.1 mg/L, taken 2026-08-10 09:30."

Reports trigger a moderation workflow because they describe incidents needing action. Observations trigger a trust-level workflow because they accumulate into scientific or statistical records. The two systems coexist because both kinds of knowledge matter — citizen testimony and measured evidence are not the same thing, and conflating them would undermine both.

### Geography is first-class

Every record in the system is anchored to a geographic location. A citizen report without a district is not useful for a district official. A restoration project without a union cannot contribute to local biodiversity records. Climate data is fetched at union level so that upazila, district, and division summaries are built from real local readings, not crude approximations.

The 4-level hierarchy (Division → District → Upazila → Union) reflects Bangladesh's actual administrative structure. Data aggregates upward so that a division-level climate summary is the average of its districts, which are the averages of their upazilas, which are the averages of their unions. This means granular local data is always the source of truth.

### Provenance is mandatory

Every record knows where it came from. For citizen reports, that is the user who filed it. For observations, that is the observer and (if promoted) the validator. For ingested data, that is the provider, the ingestion job, and the timestamp. For mutations, that is an `AuditEvent` record.

This is not bureaucratic overhead. It is what makes the data trustworthy. If a dataset later turns out to have a bug in the ingestion pipeline, provenance tells you which records to correct. If a moderator approves something that turns out to be false, the audit log shows who did it and when.

---

## Citizen Report Logic

### What a report is

A citizen report is an incident record. Someone saw something — water turning brown, trash being dumped, a dead animal — and filed it. Reports have a type, location, description, and optionally photos. They are not scientific measurements and do not need to be precise. Their value is as local testimony that places an incident on the map.

### Report types and what they mean

| Type | What it covers |
|---|---|
| `WATER_POLLUTION` | Visible contamination of rivers, canals, ponds, or groundwater — discoloration, foam, dead fish, smell |
| `AIR_POLLUTION` | Smoke, dust, industrial fumes, or visible haze beyond normal conditions |
| `ILLEGAL_DUMPING` | Solid waste disposal in non-designated locations — open land, rivers, roadways |
| `DEFORESTATION` | Tree cutting, land clearing, or habitat removal — especially near protected areas |
| `WILDLIFE_INCIDENT` | Injured, trapped, or dead wildlife; poaching evidence; human-wildlife conflict |
| `FLOODING` | Local flood conditions, damage, or displacement not yet captured by official alerts |
| `OTHER` | Environmental issues that do not fit the above categories |

These are the seven values in the `ReportCategory` Prisma enum. The categories should not be extended without a schema migration.

These categories exist so that reports can be filtered, clustered, and analyzed by type. A district with twenty water-pollution reports in one month is a signal worth investigating. A category structure makes that pattern visible.

### Report status flow

```
submitted
  → under_review  (moderator opens the report)
  → verified      (moderator confirms the report describes a real incident)
  → resolved      (issue addressed or officially acknowledged)

submitted
  → under_review
  → rejected      (duplicate, false, or insufficient evidence)
```

Why these steps?

- `submitted` means the system received it. The reporter can see their report exists.
- `under_review` signals that a moderator has seen it and is evaluating. Prevents the reporter from thinking it was ignored.
- `verified` means the report enters the public record. It can now appear in maps, analytics, and the district environmental overview.
- `resolved` means something was done — a government agency responded, the issue was cleaned up, or it was officially documented. This closes the feedback loop for the reporter.
- `rejected` keeps the record for audit purposes but removes it from public-facing counts. A rejected report should carry a note explaining why — it may be a duplicate of a verified report, not an environmental issue, or without sufficient evidence.

### Rules

- Reports require title, type, description, and approximate location. Media is optional but prioritized by moderators.
- Moderators can change status and add review notes at any step.
- Rejected reports remain visible to admins and moderators for audit purposes.
- A report can only be `verified` or `resolved` after passing through `under_review`. Moderators cannot skip the review step.

---

## Observation Logic

### What an observation is

An observation is a measurement or documented finding at a specific point and time. It may be as simple as "I saw a Spotted Eagle Ray here today" or as formal as "Water temperature 31.4°C, salinity 18 ppt, sampling method manual probe." The system supports both because citizen biodiversity sightings and researcher water-quality readings both belong in the environmental record.

### Observation types and what they mean

| Type | What it covers |
|---|---|
| `BIODIVERSITY_SIGHTING` | A species observed at a location — bird, fish, mammal, plant, reptile. Contributes to the biodiversity module. |
| `WATER_QUALITY_READING` | Measured water parameters — pH, dissolved oxygen, turbidity, temperature, salinity, conductivity |
| `AIR_QUALITY_READING` | Measured air parameters — PM2.5, PM10, CO, NO2, ozone, at a specific location and time |
| `WEATHER_IMPACT` | Locally observed weather events — hail, unusual wind, flash flooding, drought conditions |
| `HABITAT_CONDITION` | Assessment of habitat state — vegetation density, soil condition, invasive species presence, erosion |
| `RESTORATION_EVIDENCE` | Documentation of restoration activity or outcome — planted saplings survival, wetland recovery |

### Trust levels and what they mean

```
UNVERIFIED          → Submitted but not yet reviewed
COMMUNITY_SUPPORTED → Multiple credible submissions agree; not yet researcher-validated
RESEARCH_GRADE      → Validated by a researcher or moderator; citable as scientific evidence
FLAGGED             → Something about this observation needs review — possible error, contradiction, or dispute
```

These levels exist because not all observations are equal, and conflating a casual citizen sighting with a verified lab reading would mislead anyone using the data scientifically.

A `RESEARCH_GRADE` observation can be linked as evidence in reports, cited in restoration project records, and included in published datasets. An `UNVERIFIED` observation contributes to counts and mapping but is clearly marked.

Only `RESEARCHER` and `ADMIN` roles can promote an observation to `RESEARCH_GRADE`. This is intentional — the trust level is a scientific claim, not a moderation opinion.

### Rules

- Observations can be citizen-submitted, researcher-submitted, organization-submitted, or system-ingested (e.g. from GBIF).
- Any authenticated user can submit an observation. The submitter's role does not determine initial trust level — all new submissions start as `UNVERIFIED`.
- An observation that is `FLAGGED` can be reviewed and either moved back to `UNVERIFIED` for correction or promoted to `COMMUNITY_SUPPORTED` or `RESEARCH_GRADE`.
- Observations can be linked to reports, biodiversity records, datasets, and restoration projects as supporting evidence.

---

## Alert Logic

### What an alert is

An alert is an official warning issued by a government user, moderator, or admin. It covers a specific type of environmental hazard, a defined geographic zone, and a validity window. Alerts are not reports — they are not describing a past incident, they are communicating a present or imminent risk.

### Alert types and what they mean

| Type | What it covers |
|---|---|
| `FLOOD` | River flooding affecting a district or set of unions |
| `FLASH_FLOOD` | Rapid onset flooding with little warning — typically rainfall-driven in low-lying or upstream-confined areas |
| `CYCLONE` | Tropical cyclone, depression, or severe storm system |
| `STORM_SURGE` | Coastal inundation driven by cyclone or high winds — distinct from river flooding |
| `HEATWAVE` | Sustained extreme heat index above safe thresholds |
| `AIR_QUALITY` | Air quality index at a level posing health risk — typically PM2.5 > 150 or AQI > 200 |
| `WATER_POLLUTION` | Water body contamination serious enough to warn against contact or use |
| `LANDSLIDE` | Slope failure risk or active landslide — common in hill district areas during monsoon |
| `DROUGHT` | Prolonged moisture deficit affecting agriculture, water supply, or human health |
| `WILDFIRE` | Active fire in a forested or agricultural zone |
| `OTHER` | Official environmental warning not covered by the above |

### Severity and what each level means operationally

| Level | Meaning |
|---|---|
| `INFO` | Awareness notice. Conditions may develop; no immediate action required. "Mild flooding possible in low-lying areas." |
| `WATCH` | Elevated risk. Prepare, monitor, and be ready to act. "Flood watch in effect for Sunamganj district." |
| `WARNING` | Serious and imminent. Take action now. "Evacuate low-lying char areas in Gaibandha." |
| `EMERGENCY` | Life-threatening. Maximum urgency and public broadcast. Requires elevated permissions to publish. |

Severity levels are not decorative. They determine notification priority, display prominence on the public board, and email urgency for alert subscribers.

### Alert status flow

```
draft   → active     (reviewer publishes the alert)
draft   → cancelled  (cancelled before going live)
active  → expired    (validity window passed)
active  → cancelled  (retracted before expiry)
```

Why a draft step? Alerts should be reviewed before going live — especially `WARNING` and `EMERGENCY` levels. A draft can be prepared by a government user, reviewed by a moderator, and published when confirmed. This prevents accidental or erroneous alerts from reaching subscribers.

Why keep expired alerts? Historical alert records are the platform's evidence base for disaster patterns. A researcher studying flood frequency in Sylhet Division can look at the alert history and see which zones were under `WARNING` in each of the last five monsoon seasons. Deleting expired alerts would erase this record.

### Rules

- Alerts require type, severity, title, affected location/zone, start time, and source.
- Publishing a live alert writes an `AuditEvent` record — who issued it, when, and from which IP address.
- `EMERGENCY` alerts should require elevated permission before publication (planned; not yet enforced in code).
- Subscribers receive email on `active` transition. Failed deliveries are recorded in `NotificationDelivery` with an error message, so no failure is silent.

---

## Climate Data Logic

### What climate data is in Delta Signal

Delta Signal fetches daily environmental readings for every union from OpenMeteo's forecast API (weather) and air-quality API. This is operational data — today's conditions and the recent trend — not long-range climate projections.

**What is stored per union per day (`UnionDailyClimate`):**

| Field | What it represents |
|---|---|
| `avgTemp` | Average temperature derived from daily max and min (°C) |
| `minTemp` | Lowest temperature recorded that day (°C) |
| `maxTemp` | Highest temperature recorded that day (°C) |
| `avgHumidity` | Mean relative humidity across 24 hourly readings (%) |
| `totalPrecip` | Total precipitation that day (mm) |
| `avgWindSpeed` | Mean wind speed across the day (km/h) |
| `maxWindSpeed` | Peak wind gust or maximum wind speed that day (km/h) |
| `avgCloudCover` | Mean cloud cover percentage across 24 hours (%) |
| `avgPm25` | Mean PM2.5 concentration across 24 hours (µg/m³) |
| `avgPm10` | Mean PM10 concentration across 24 hours (µg/m³) |
| `avgUvIndex` | Mean UV index across daylight hours |
| `avgOzone` | Mean ozone concentration across 24 hours (µg/m³) |

**What 30-day rolling averages mean (`avgTemp30d`, `avgHumidity30d`, etc.):**

Each geography level (Union, Upazila, District, Division) stores 11 rolling-average columns computed from the last 30 days of daily records. These are the numbers shown on location summary pages.

- `avgTemp30d` — the mean daily average temperature for the past 30 days. Tells you what temperatures have been like recently, not just today.
- `minTemp30d` — the mean of the daily minimums. Relevant for crop stress and cold exposure.
- `maxTemp30d` — the mean of the daily maximums. Relevant for heat stress and heatwave context.
- `totalPrecip30d` — the sum (not average) of all precipitation over 30 days. Relevant for flood risk and drought assessment.
- `avgHumidity30d` — the mean relative humidity. Relevant for heat index and crop disease risk.
- `avgWindSpeed30d` — the mean wind speed. Relevant for storm context and agriculture.
- `avgCloudCover30d` — the mean cloud cover. Relevant for solar radiation and photosynthesis context.
- `avgPm25_30d` — the mean PM2.5. A 30-day PM2.5 average above 15 µg/m³ exceeds the WHO annual guideline — showing whether an area has a chronic air quality problem, not just a bad day.
- `avgPm10_30d` — the mean PM10 (coarser particulates including dust and construction particles).
- `avgUvIndex30d` — the mean UV index. Relevant for agricultural and public health context.
- `climateUpdatedAt` — when the aggregation last ran successfully. Tells data consumers whether the numbers are fresh.

### Why bottom-up aggregation

District-level data is the average of its upazilas, which are averages of their unions. This means a Dhaka District climate summary reflects the actual distribution of temperature and air quality across the unions that make up Dhaka — not a single central coordinate. A coastal upazila with persistently high humidity will pull its district's humidity average up. A forested upazila with lower PM2.5 will pull it down. Bottom-up aggregation preserves this spatial truth.

---

## Dataset Logic

### What a dataset is

A dataset is a catalog record describing a collection of environmental data — what kind, where it came from, who owns it, how it is refreshed, and who can access it.

### Dataset categories and what they mean

| Category | What it covers |
|---|---|
| `WEATHER` | Temperature, precipitation, wind, humidity, UV — from OpenMeteo or stations |
| `AIR_QUALITY` | PM2.5, PM10, ozone, CO, NO2 — from OpenMeteo air quality API or sensors |
| `WATER` | River levels, water quality readings, flood inundation maps |
| `BIODIVERSITY` | Species occurrence records, habitat surveys, GBIF-synced data |
| `REPORTS` | Aggregated or exported citizen report data |
| `ALERTS` | Historical alert records and affected zone data |
| `GEOSPATIAL_REFERENCE` | Bangladesh administrative boundaries, union centroids, river networks, land use |

### Dataset source types and what they mean

| Source type | Meaning |
|---|---|
| `EXTERNAL_API` | Fetched from a third-party provider (OpenMeteo, GBIF, BWDB) by a scheduled job |
| `UPLOADED_FILE` | A file uploaded manually by a researcher or admin — CSV, GeoJSON, shapefile |
| `MANUAL_ENTRY` | Data entered directly through the admin interface or API |
| `DERIVED_COMPUTATION` | Calculated from other datasets — e.g. 30-day climate averages derived from daily records |
| `SENSOR_FEED` | Live or near-live stream from an IoT sensor, water quality probe, or weather station |

### Access policies

- `PUBLIC` — anyone can view and download.
- `REGISTERED` — requires login.
- `RESEARCHER` — requires a researcher-role account.
- `RESTRICTED` — requires explicit approval, typically for sensitive or embargoed datasets.

Why bother with access policies on environmental data? Some datasets contain personally identifiable location data (a citizen's report location, for example). Some datasets are embargoed before publication. Some are high-resolution sensor data that a partner organization has licensed with restrictions. Not everything should be fully public even on a public-first platform.

---

## Organization Logic

### What an organization is

Organizations in Delta Signal represent institutions that act as environmental stakeholders — NGOs, academic departments, government agencies, community groups, or private environmental partners. They own projects, campaigns, datasets, and observations.

An organization is not the same as a user. A user is an individual account. An organization is an institutional actor. One person can be a member of multiple organizations.

### Membership roles

- `ADMIN` — can manage the organization's profile, projects, and member list.
- `MEMBER` — can act on behalf of the organization for submissions and project contributions.

### Why organizations do not control platform permissions

A user who is an `ORGANIZATION_ADMIN` within their NGO cannot issue alerts, manage other organizations, or promote observations to research-grade. Those capabilities are controlled by the platform `ADMIN` and `MODERATOR` roles, which are separate.

This separation exists because organizations in Bangladesh vary enormously in quality and accountability. An NGO membership should not automatically confer the ability to publish an emergency alert or validate scientific observations. Those capabilities require explicit platform-level trust, not just organizational affiliation.

---

## Ingestion Logic

### What ingestion jobs are

Ingestion jobs are records of every external data fetch that runs as a scheduled job. When the weather cron runs at midnight, it writes an `IngestionJob` record marking `RUNNING`, fetches from OpenMeteo, writes the results, and updates the record to `SUCCEEDED` or `FAILED`.

### Why track jobs

- **Visibility:** An admin can see exactly when the last weather sync ran, whether it succeeded, and how many records it wrote.
- **Diagnosis:** If climate data stops updating, the ingestion log shows which batch failed and with what error.
- **Audit:** The ingestion log is the lineage record for machine-ingested datasets. A dataset marked as derived from OpenMeteo on a specific date is traceable back to the job that created it.

### Job statuses

| Status | Meaning |
|---|---|
| `QUEUED` | Scheduled but not yet started |
| `RUNNING` | Active — data is being fetched or processed |
| `SUCCEEDED` | Completed without errors; records were written |
| `FAILED` | Terminated with errors; error details stored on the record |
| `CANCELLED` | Stopped before completion by an admin |

---

## Audit Events

Every mutation in the system writes an `AuditEvent` record. The event stores the action taken, the user who took it, the entity affected, a metadata blob, and the IP address. This is not optional and is not configurable — it is a platform invariant.

### Why audit every write

Environmental data is used for legal, scientific, and policy purposes. If a verified report is later challenged, the audit log shows exactly when it was verified, by whom, and from which IP. If a dataset is published and later retracted, the audit log has the history. If an emergency alert goes out in error, the audit log shows who published it.

Audit events are append-only. No code in the system deletes or updates audit records.

### What is currently audited

All significant mutations: user registration, login (including failed logins), logout, report status changes, observation trust changes, alert creation and cancellation, dataset publish/unpublish, organization management, user role changes. `USER_LOGIN_FAILED` is written before throwing a 401, so brute-force attempts leave a traceable record.
