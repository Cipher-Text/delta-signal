# GBIF

## Status

Implemented in `apps/api/src/biodiversity/`.

GBIF provides biodiversity occurrence data for Bangladesh. The integration is owned by the `biodiversity` module and exposed through public species and occurrence endpoints.

## Provider

| Item | Value |
| --- | --- |
| Provider name | `GBIF` |
| API key | Not required |
| Endpoint | `https://api.gbif.org/v1/occurrence/search` |
| Official API reference | `https://techdocs.gbif.org/en/openapi/v1/occurrence` |
| Client | `apps/api/src/biodiversity/gbif.client.ts` |
| Scheduler | `apps/api/src/biodiversity/biodiversity.scheduler.ts` |

## Query

The current query is:

```text
country=BD&hasCoordinate=true&limit=300&offset=<offset>
```

The sync uses GBIF occurrence search, filtered to Bangladesh records that have coordinates. The bare endpoint URL returns global records, so it should not be used as the Delta Signal production query without these filters.

Query parameters:

- `country=BD` limits records to Bangladesh.
- `hasCoordinate=true` keeps only records with latitude and longitude.
- `limit=300` uses GBIF's maximum page size for occurrence search.
- `offset=<offset>` pages through results.

GBIF's occurrence search API has a 300-record maximum page size and a 100,000-record hard limit for offset-based paging. Larger complete exports should use GBIF's asynchronous download service instead of this live search endpoint.

## Fetched Data

The service stores species taxonomy and occurrence records from the GBIF response.

### Species

Stored fields:

- `gbifKey`
- `canonicalName`
- `vernacularName`
- `kingdom`
- `phylum`
- `class`
- `order`
- `family`
- `genus`
- `iucnStatus`
- `imageUrl`

`iucnStatus` is nullable and intentionally unpopulated in v1. GBIF occurrence search does not return IUCN conservation status, and no separate per-species enrichment call is implemented yet.

### Occurrences

Stored fields:

- `gbifOccurrenceKey`
- `speciesId`
- `districtId`
- `lat`
- `lng`
- `observedAt`
- `recordedBy`
- `basisOfRecord`

`gbifOccurrenceKey` is stored as `BigInt` because real GBIF occurrence keys can exceed the 32-bit integer range.

## Storage

GBIF data is stored in:

- `Species`
- `Occurrence`

Species are upserted by `gbifKey`. Occurrences are upserted by `gbifOccurrenceKey`, which keeps daily re-syncs idempotent.

The browser reads these stored records through the Delta Signal API; it does not call GBIF directly. The `/biodiversity` page shows species and occurrence tables, and the Data Hub detail route `/data/:id` shows a GBIF species and recent-occurrence preview for the Biodiversity Occurrences dataset.

GBIF gives coordinates, not Delta Signal district IDs. The current implementation assigns `districtId` by nearest seeded district centroid. This is an approximation until polygon boundary or PostGIS point-in-polygon matching is added.

## Schedule

| Job | Cron | Cadence |
| --- | --- | --- |
| GBIF occurrence sync | `EVERY_DAY_AT_MIDNIGHT` | Daily at midnight |

Each scheduler run creates an ingestion job when the `GBIF` provider exists. Successful runs update biodiversity dataset `lastSyncedAt` values.

## Public API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/biodiversity/species` | Paginated species catalog, supports `?search` |
| `GET` | `/biodiversity/species/:id` | Species detail |
| `GET` | `/biodiversity/occurrences` | Paginated occurrences, supports `?speciesId` and `?districtId` |

## Verification Notes

The first completed live sync pulled 1000 real occurrence records across 285 species. A second run confirmed idempotency: the counts stayed stable and no duplicate rows were created.

## Known Gaps

- No IUCN enrichment call yet.
- No habitat-pressure data yet.
- No point-in-polygon district assignment yet.
- Sync is capped at about 1000 records per run; it is not a full historical mirror of every GBIF record for Bangladesh.
