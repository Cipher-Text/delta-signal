# Delta Signal

Delta Signal is a civic environmental intelligence platform for Bangladesh. It connects citizens, researchers, NGOs, and government agencies around a shared picture of the country's environmental health — bringing together live weather, air quality, biodiversity records, citizen reports, and official alerts into one public grid.

The homepage at `/` is a complete public environmental board. No login required to see what is happening. Login is needed only to contribute, download data, or access advanced workflows.

Full product brief: [docs/project-brief.md](docs/project-brief.md)

---

## Why This Exists

Bangladesh faces some of the most concentrated environmental pressures in the world. Floods, poor air quality, water contamination, deforestation in the Sundarbans, and climate-driven agricultural stress affect hundreds of millions of people. Yet environmental data is fragmented — scattered across government departments, academic institutions, NGOs, and international datasets, rarely visible in one place and rarely actionable at the local level.

Delta Signal is built to change that. It is not a scientific data warehouse and not a government portal. It is a platform where a citizen in Sylhet can report a polluted canal, a researcher at BUET can submit a validated water-quality observation, an NGO in Khulna can log a mangrove restoration project, and the district office can issue a flood warning — all in the same system, all connected to the same geography.

---

## Who Uses It

**Citizens** — anyone who notices something worth reporting: a factory dumping into a river, sudden fish deaths, air heavy with smoke, land being cleared illegally. Citizens submit reports with a location and description. Verified reports become part of the public record.

**Researchers and environmental scientists** — collect structured observations (biodiversity sightings, water readings, air quality samples, habitat condition) and submit them for peer or moderator validation. Research-grade observations feed into datasets and reports.

**NGOs and community organizations** — manage restoration and conservation projects, track progress over time, coordinate volunteer contributions, and publish verified work publicly.

**Government and agency users** — issue disaster and environmental alerts (flood, cyclone, heatwave, severe air/water pollution) tied to specific zones and severity levels. Alert subscribers receive email notifications.

**Moderators and platform admins** — review submitted reports, update status, validate observations, manage datasets, manage organizations, and maintain the integrity of public-facing records.

**The general public** — reads public alerts, browses verified reports, explores biodiversity highlights, and sees live climate conditions for their district — without creating an account.

---

## What the Platform Shows Publicly

The home page (`/`) surfaces:

- Live weather conditions and 30-day climate summaries for each of Bangladesh's 8 divisions, 64 districts, 494 upazilas, and 4,540 unions
- Active environmental alerts with severity and affected zone
- Recent verified citizen reports from across the country
- Biodiversity highlights — species sightings and occurrence records from GBIF
- Restoration project highlights — active conservation work by NGOs and organizations
- Air quality and solar radiation readings from OpenMeteo, updated regularly
- Marine wave and swell forecasts for coastal districts (Cox's Bazar, Chattogram, Khulna, etc.)
- River discharge flood forecasts via OpenMeteo/GloFAS
- Dataset summaries for weather, air quality, water, marine, biodiversity, and geospatial reference data

---

## Geographic Structure

All data is anchored to Bangladesh's administrative geography:

| Level | Count | Example |
|---|---|---|
| Division | 8 | Dhaka, Chittagong, Sylhet |
| District | 64 | Gazipur, Cox's Bazar, Sunamganj |
| Upazila | 494 | Kapasia, Teknaf, Dowarabazar |
| Union | 4,540 | Mawna, Shah Porir Dwip |

Climate data (temperature, humidity, precipitation, wind, air quality) is fetched nightly at union level and aggregated bottom-up to each higher level.

---

## Architecture

Nx monorepo with pnpm workspaces. Three independently deployable TypeScript apps share packages via path aliases.

```
apps/api        NestJS modular monolith    :3001
apps/web        Next.js 15 public site     :3000
apps/admin      Next.js 15 admin console   :3002
apps/data-worker  Python GIS skeleton      (no active jobs yet)

packages/database  Prisma schema + migrations + client
packages/shared    Enum values (canonical source)
packages/contracts Route map + DTOs (web only)
```

**Database:** PostgreSQL on port 5432 (local only — the docker-compose no longer runs a Postgres container). Prisma ORM with CUIDs.

**Data ingestion:** OpenMeteo (weather, air quality, flood/GloFAS, satellite radiation, marine wave/swell) and GBIF (biodiversity occurrences) are ingested by self-contained NestJS modules with cron schedulers. Emissions tracking (factories, power plants, vehicle fleets) is user-submitted via the `emissions` module.

Detailed architecture: [docs/architecture/](docs/architecture/)

---

## Getting Started

### Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL 16 with PostGIS (or Docker)
- A `JWT_SECRET` of at least 32 characters

### Local development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run the initial migration and seed data (divisions, districts, providers, datasets)
pnpm db:migrate

# Start all apps
pnpm dev
```

PostgreSQL 16 must be running locally on port 5432 before running migrations. Copy `.env.example` to `.env` in `apps/api` and fill in `DATABASE_URL` and `JWT_SECRET`. Generate a secret with:

```bash
openssl rand -base64 48
```

### Common commands

```bash
pnpm dev            # Start all apps
pnpm build          # Build all apps
pnpm test           # Run all tests
pnpm lint           # Lint all apps

pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev
pnpm db:push        # prisma db push (no migration file)
pnpm db:studio      # prisma studio
```

Run API tests from `apps/api`:

```bash
pnpm exec jest                                  # All tests
pnpm exec jest --testPathPattern=auth.service   # Single spec file
pnpm exec jest --coverage                       # Coverage report
```

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/project-brief.md](docs/project-brief.md) | Mission, vision, user personas, product areas |
| [docs/business-logic.md](docs/business-logic.md) | Domain rules and the reasoning behind them |
| [docs/access-model.md](docs/access-model.md) | What is public, login-gated, and role-gated |
| [docs/roles-and-permissions.md](docs/roles-and-permissions.md) | Role matrix and permission gates |
| [docs/flows.md](docs/flows.md) | Key user and system flows |
| [docs/roadmap.md](docs/roadmap.md) | Phase-by-phase delivery history and plan |
| [docs/progress.md](docs/progress.md) | Detailed implementation changelog |
| [docs/architecture/data-model.md](docs/architecture/data-model.md) | Schema, models, and field reference |
| [docs/architecture/modules.md](docs/architecture/modules.md) | API module map and endpoints |
| [docs/integrations/](docs/integrations/) | OpenMeteo, GBIF, and other provider docs |
| [docs/decisions/](docs/decisions/) | Architecture decision records |
