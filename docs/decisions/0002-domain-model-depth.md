# 0002. Domain Model Depth

## Status

Proposed

## Context

Delta Signal is an environmental intelligence platform, not only a CRUD application. The current scaffold includes broad modules such as reports, observations, datasets, alerts, biodiversity, organizations, media, and ingestion. That is enough for a first skeleton, but several environmental domains need stronger modeling before serious backend implementation.

Important under-modeled concepts include:

- environmental monitoring
- stations and sensors
- observed properties and units
- measurements and datastreams
- data providers and provenance
- dataset versions/distributions/licenses/lineage
- environmental events/hazards
- evidence, verification, and audit
- restoration/conservation projects
- subscriptions and notifications
- broader geospatial features beyond administrative hierarchy

## Decision

Delta Signal should evolve toward a domain model centered on place, time, evidence, measurement, events, action, and outcomes.

The conceptual model is:

```text
Place + Time
  -> Observation
  -> Measurement
  -> Environmental Event
  -> Evidence
  -> Report
  -> Alert
  -> Project / Action
  -> Outcome
```

The first serious backend milestone should prioritize these domain improvements:

1. Geography/PostGIS properly.
2. Provider/provenance as first-class.
3. Environmental monitoring model: station, sensor, observed property, unit, measurement, datastream, quality flag.
4. Evidence, verification, and audit.
5. Richer dataset model: version, distribution, license, access policy, refresh policy, quality, lineage.
6. Restoration/project domain.

## Consequences

- Generic `Observation` should not become a dumping ground for sensor measurements, reports, biodiversity occurrences, and project evidence.
- Dataset `source` should not remain a simple string.
- Verification should be explainable through evidence, review decisions, reviewer identity, method, confidence, and audit trail.
- Alerts should eventually be linked to environmental events/hazards.
- Projects should be modeled so the platform can show action and outcomes, not only problems.

## Non-Goals

- Do not build all advanced domains immediately.
- Do not split into microservices now.
- Do not implement full OGC SensorThings, DCAT, Darwin Core, or CAP compliance at the start.

## Implementation Timing

Accept the direction before replacing the placeholder Prisma schema and before implementing major backend workflows.

