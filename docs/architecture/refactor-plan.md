# Refactor Plan

> Historical plan. The refactor and foundation steps described here have been implemented. Use [feature-map.md](feature-map.md), [modules.md](modules.md), and [../progress.md](../progress.md) for the current architecture and status.

Delta Signal should not copy Open Nature file-for-file. The refactor should carry over proven feature logic and discard mock-only coupling.

## Step 1: Documentation and Boundaries

- Define app boundaries.
- Define domain modules.
- Define initial API endpoints.
- Define shared contract ownership.
- Define database direction.

## Step 2: Foundation Implementation

- Set up the NestJS API shell.
- Set up shared TypeScript domain types.
- Set up contract definitions.
- Set up database schema baseline.
- Set up Next.js web/admin shells.

## Step 3: Port Core Backend Features

- Auth and roles.
- Location hierarchy.
- Dataset records.
- OpenMeteo ingestion as the first ingestion provider.
- Weather and air quality summaries.

## Step 4: Replace Mock UI With Real API Integration

- Reports.
- Alerts.
- Data dashboard.
- Profile.
- Admin moderation.

## Step 5: Add Data Worker

- GIS imports.
- Geospatial validation.
- Derived metrics.
- Long-running ingestion transforms.
