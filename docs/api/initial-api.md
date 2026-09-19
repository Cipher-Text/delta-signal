# Initial API Baseline

> Historical planning document. For the current API surface, use [backend-api-links.md](backend-api-links.md).

The first API should reproduce Open Nature's useful backend surface while preparing for the broader Delta Signal domain model.

## Auth

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/profile
```

## Locations

```text
GET /api/v1/locations/divisions
GET /api/v1/locations/districts
GET /api/v1/locations/districts/:id
GET /api/v1/locations/upazilas
GET /api/v1/locations/unions
```

## Datasets

```text
GET /api/v1/datasets
GET /api/v1/datasets/:id
GET /api/v1/datasets/weather/current
GET /api/v1/datasets/air-quality/current
```

## Weather

```text
GET /api/v1/weather/current
GET /api/v1/weather/current/:districtId
GET /api/v1/weather/hourly/:districtId
GET /api/v1/weather/daily/:districtId
GET /api/v1/weather/air-quality
GET /api/v1/weather/air-quality/:districtId
```

Done — OpenMeteo current/hourly/daily/air-quality, cron-scheduled. Not part of the original "initial API" scope this doc covers, but added here since it's the first live external-data integration. See `docs/api/backend-api-links.md` for full status detail.

## Reports

```text
POST /api/v1/reports
GET  /api/v1/reports
GET  /api/v1/reports/:id
PATCH /api/v1/reports/:id/status
```

## Alerts

```text
GET /api/v1/alerts
GET /api/v1/alerts/:id
POST /api/v1/alerts
PATCH /api/v1/alerts/:id
```

## Contract Rule

Every route must have a schema in `packages/contracts` before frontend integration.
