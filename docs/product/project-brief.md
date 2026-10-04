# Project Brief

## Mission

Delta Signal exists to make environmental information in Bangladesh easier to collect, verify, analyze, and act on.

Environmental problems in Bangladesh are not hidden — communities see them every day. A river changes color overnight. Fish die in a pond near a garment factory. Air in Dhaka becomes unbreathable in winter. Floods arrive earlier than expected. Forests are cleared quietly over weeks.

The problem is not that this information does not exist. The problem is that it is fragmented. Citizens report on social media. Researchers publish in journals. Government agencies send alerts through separate systems. NGOs log restoration work in spreadsheets. None of it talks to the same map, the same database, or the same public record.

Delta Signal is the shared layer. A single place where all of that comes together: live data, human observation, scientific evidence, and official warnings — organized by location, verified by role, and visible to anyone.

---

## Vision

A trusted civic environmental intelligence platform — starting with Bangladesh, designed to extend to other regions.

Long term, Delta Signal should be the place a district official checks before issuing a flood advisory, the place a journalist links to when writing about Dhaka air quality, the place a school teacher opens to show students what deforestation looks like in their upazila, and the place a USAID partner uses to scope a conservation intervention.

That trust is built through:

- **Public-first design** — everything meaningful is visible without login. The platform is not a data silo.
- **Verified records** — nothing reaches the public map as "verified" without a human reviewer or a validated data pipeline.
- **Geographic depth** — data is anchored to all 4,540 unions of Bangladesh, not just divisions or districts.
- **Provenance** — every record knows where it came from: which provider, which observer, which organization, which ingestion job.

---

## The Problem in Detail

### Data is fragmented

Bangladesh has flood forecasts at BWDB, air quality data scattered across CASE and international APIs, GBIF occurrence records for biodiversity, departmental records for deforestation, NGO project registers, and citizen reports on Facebook. None of this is connected. A researcher comparing flood impact with water quality readings has to pull data from five different places by hand.

### Local context is missing from international datasets

OpenMeteo can return temperature for a coordinate. GBIF can return bird sightings for a bounding box. But neither of them knows that a specific union has a river running through it, that a particular upazila flooded three times last monsoon, or that an NGO has been running a mangrove restoration project 2 km from that coordinate. Delta Signal adds the local layer.

### Citizen knowledge is not captured

Bangladesh has some of the highest population density in the world. People notice environmental changes before any sensor does. A citizen report filed by someone who lives next to a polluted canal carries evidence value that a remote sensor cannot provide — but only if there is a trustworthy place to file it, a workflow to verify it, and a public record for it to join.

### Alerts are isolated

When a cyclone or flood warning is issued, it travels through government channels that many citizens do not have access to. A farmer in a low-lying char area may not receive a warning until it is too late. Delta Signal's alert and notification system is designed to close that gap — subscribe by district, receive by email.

---

## User Personas

### Citizen Reporter — Razia, 34, Narayanganj

Razia lives near the Shitalakshya river. She has watched water quality deteriorate for years as garment factories discharge waste upstream. She photographs dead fish, discolored water, and foam at the bank. She wants to report what she sees to someone who can act on it — but she does not know who that is, and she has no confidence that a Facebook post will do anything.

On Delta Signal, Razia creates a citizen account, files a report with her photos and GPS location, and tracks its status as moderators review it and the district environmental office is notified. Her verified report becomes part of the public record for her area.

### Environmental Researcher — Tanvir, 28, BUET

Tanvir studies wetland habitat changes in the Haor basin. He takes water quality readings and documents vegetation changes across multiple sites over months. His data is scientifically valuable but trapped in spreadsheets and a departmental database that is never public.

On Delta Signal, Tanvir submits structured observations with coordinates, measurement type, and evidence. A moderator validates his work, promoting it to research-grade. His observations feed into the district biodiversity record and become citable evidence for other researchers.

### NGO Project Manager — Farida, 41, Khulna

Farida manages a mangrove restoration project in the Sundarbans buffer zone for a local environmental NGO. Her organization planted 50,000 saplings over the last two years and wants to document progress publicly to attract donor funding and demonstrate impact.

On Delta Signal, Farida's organization has a profile. She creates a restoration project, logs species planted and area covered, and adds periodic update observations. The project shows up publicly on the restoration map with a progress timeline.

### District Official — Karim, 52, Sylhet

Karim works in the district environment office. During monsoon season he needs to issue flood impact warnings quickly, track which unions are affected, and coordinate with upazila officers. Currently he sends WhatsApp messages to a group.

On Delta Signal, Karim has a government role. He creates an alert, selects affected zones, sets severity, and publishes. Alert subscribers in those zones receive email notifications. The alert appears on the public board and stays in the historical record after it expires.

### Academic Field Scientist — Ayesha, 36, Jahangirnagar University

Ayesha studies bird migration patterns in the Tanguar Haor wetland. She uses eBird and GBIF to cross-reference her sightings but wants a local platform that connects her biodiversity data with the reporting and climate data from the same location.

On Delta Signal, Ayesha submits species observations tagged to a specific union. She can cross-reference her sightings against the union's 30-day climate summary (temperature trend, precipitation), nearby citizen reports (water quality issues), and GBIF-synced species occurrence records — all in the same view.

---

## Value Proposition by Audience

| Audience | What Delta Signal gives them |
|---|---|
| Citizens | A trusted place to file environmental reports with real verification and public follow-through |
| Researchers | A public platform for validated observations connected to geography, climate, and other domain data |
| NGOs | A public record of project work, progress, and impact that builds credibility with donors and partners |
| Government / agencies | A shared alerting system and a platform to receive verified on-the-ground intelligence before agencies can deploy |
| General public | A free environmental dashboard for their division, district, and union — no login required |
| Journalists and advocates | A citable, timestamped, verified public record of environmental conditions and incidents |

---

## Geographic Focus

### Bangladesh first

Bangladesh's 4-level administrative hierarchy — Division → District → Upazila → Union — is the primary geographic frame for all data in the platform.

| Level | Count | Role in Delta Signal |
|---|---|---|
| Division | 8 | Highest-level climate aggregation; alert zones |
| District | 64 | Alert targeting; climate summaries; restoration project scope |
| Upazila | 494 | Mid-level aggregation; report clustering |
| Union | 4,540 | Base unit for climate data; the leaf node for all geographic anchoring |

Every citizen report, observation, restoration project, and climate reading is anchored to a specific union or district. This is what makes local search meaningful — a citizen in Sunamganj District can see reports, alerts, and climate conditions relevant to their area without filtering through national-level noise.

### Why Bangladesh

- Extreme climate vulnerability: Bangladesh is in the top 5 most climate-vulnerable countries in the world by most indices.
- High environmental reporting demand: dense population, major river system, garment industry pollution, mangrove pressure, annual flood cycle.
- Rich biodiversity: the Sundarbans is the world's largest mangrove forest; the Haor basin is a Ramsar-listed wetland; Cox's Bazar has the world's longest natural sea beach.
- Administrative clarity: the division/district/upazila/union hierarchy is well-defined and all 4,540 unions have geocoordinates.
- Data gap: despite the need, no single public platform connects citizen reports, scientific observations, government alerts, and live climate data for Bangladesh.

---

## Core Product Areas

### Public Environmental Board (`/`)

The entry point for everyone. Shows a snapshot of what is happening environmentally right now — active alerts, recent verified reports, live weather and air quality, biodiversity highlights, and restoration work. Works without login. Designed to be the page a journalist, student, or curious citizen opens to understand the environmental condition of Bangladesh at a glance.

### Alerts

Official warnings issued by government users or moderators. Typed by hazard (flood, cyclone, heatwave, severe air quality, water pollution, etc.), graded by severity (info / watch / warning / emergency), and scoped to a specific zone. Subscribers receive email notifications when an alert becomes active. Alerts stay in the historical record after they expire.

### Citizen Reports

Anyone can file a report after logging in. Reports describe environmental problems — water pollution, illegal dumping, deforestation, wildlife incidents, flood impact. Each report carries a type, location, description, and optionally photos. Moderators review submitted reports and move them through a verified/rejected/resolved workflow. Verified reports are public.

### Observations

More structured than reports. Observations describe what was measured or observed at a location — a water quality reading, a species sighting, an air quality sample, habitat condition. Trust levels distinguish citizen submissions from researcher-validated or research-grade records. Research-grade observations are scientifically citable and can feed into datasets.

### Biodiversity

Species occurrence records synced daily from GBIF, augmented by researcher-submitted sightings. Organized by species, location, and observation date. The goal is a local biodiversity record that knows about the Sundarbans fishing cat and the Haor migratory ducks, not just what GBIF has globally.

### Climate and Weather

Live weather conditions (OpenMeteo) updated every 15 minutes. Daily climate summaries at union level — temperature, precipitation, humidity, wind, UV index, PM2.5, PM10, ozone. 30-day rolling averages aggregated bottom-up from union to division. This is the environmental baseline that gives all other data in the platform its climate context.

### Restoration Projects

Organizations log active conservation and restoration projects — tree planting, wetland restoration, community cleanups, reforestation campaigns. Projects have a location, target species/habitat, organization owner, and progress observations. Publicly visible to support donor accountability and awareness.

### Datasets

The data catalog. Covers weather, air quality, water quality, biodiversity, reports, alerts, and geospatial reference data. Summary previews are public. Downloads and advanced access require login and the appropriate role. Every dataset has a source, owner, refresh policy, and access policy.

### Admin Console (`apps/admin`)

Separate app for moderators and admins. Report moderation queue, user role management, alert publishing, dataset management. Only accessible to `MODERATOR` and `ADMIN` roles. Mirrors the public site structure but gives operational control over every content type.

---

## What Makes This Different

Delta Signal is not:

- A data warehouse. It does not store raw sensor streams or satellite imagery (yet).
- A government portal. It is not affiliated with any ministry and is not an official alert system.
- A social network. Reports and observations are verified before they are public, not crowdsourced by vote.
- A research database. Research-grade observations are a layer on top of a broader civic platform, not the core product.

Delta Signal is a civic intelligence layer. It aggregates live data, human evidence, scientific observations, and official warnings into a coherent, verifiable, public-first picture of environmental conditions in Bangladesh — at the resolution of a union, the accuracy of a verified reviewer, and the timeliness of a nightly climate sync.
