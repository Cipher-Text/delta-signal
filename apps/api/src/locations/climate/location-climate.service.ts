import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WeatherOpenMeteoClient } from '../../weather/weather-openmeteo.client';
import {
  OpenMeteoUnionWeatherResponse,
  OpenMeteoUnionAirQualityResponse,
} from '../../weather/dto/open-meteo-response.dto';

/**
 * Granularity rationale:
 *   Weather (temp, precip, wind, humidity, UV) — upazila level (494 points, ≤5 batches of 100).
 *     OpenMeteo ERA5 model resolution ~9 km; upazila diameter ~15–20 km — a good match.
 *   Air quality (PM2.5, PM10) — district level (64 points, 1 batch).
 *     CAMS AQ model resolution ~40 km; district diameter ~40–60 km — a good match.
 *
 * Using past_days=29&forecast_days=1 gives a true 30-day average in one request per location,
 * eliminating the need for a per-union daily history table. These rolling averages refresh daily.
 *
 * Batch size ≤100 keeps GET URLs under ~1.8 KB — well within OpenMeteo's CDN limits.
 */
const BATCH_SIZE = 100;
const INTER_BATCH_DELAY_MS = 500;

function numAvg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function numMin(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
  return valid.length === 0 ? null : Math.min(...valid);
}

function numMax(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
  return valid.length === 0 ? null : Math.max(...valid);
}

function numSum(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
  return valid.length === 0 ? null : valid.reduce((a, b) => a + b, 0);
}

type WithCoords = { id: string; name: string; lat: number; lng: number };

@Injectable()
export class LocationClimateService {
  private readonly logger = new Logger(LocationClimateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openMeteo: WeatherOpenMeteoClient,
  ) {}

  /**
   * Full daily sync:
   *   1. Fetch 30d weather per upazila → set Upazila climate columns.
   *   2. Fetch 30d AQ per district    → set District AQ columns.
   *   3. Aggregate Upazila weather    → District weather columns.
   *   4. Propagate District AQ        → Upazila AQ columns.
   *   5. Propagate Upazila (all)      → Union columns.
   *   6. Aggregate District (all)     → Division columns.
   */
  async syncAll(): Promise<void> {
    await this.syncUpazilaWeather();
    await this.syncDistrictAq();

    this.logger.log('Running aggregation chain…');
    await this.aggregateUpazilaWeatherToDistrict();
    await this.propagateAqDistrictToUpazila();
    await this.propagateUpazilaToUnion();
    await this.aggregateDistrictToDivision();
    this.logger.log('Aggregation complete');
  }

  // ─── Step 1: weather per upazila ─────────────────────────────────────────

  private async syncUpazilaWeather(): Promise<void> {
    const all = await this.prisma.upazila.findMany({
      select: { id: true, name: true, lat: true, lng: true },
    });
    const upazilas: WithCoords[] = all
      .filter((u) => u.lat != null && u.lng != null)
      .map((u) => ({ id: u.id, name: u.name, lat: u.lat as number, lng: u.lng as number }));

    const total = Math.ceil(upazilas.length / BATCH_SIZE);
    this.logger.log(`Fetching 30d weather for ${upazilas.length} upazilas in ${total} batch(es)…`);

    let ok = 0, fail = 0;
    for (let i = 0; i < upazilas.length; i += BATCH_SIZE) {
      const batch = upazilas.slice(i, i + BATCH_SIZE);
      const num = Math.floor(i / BATCH_SIZE) + 1;
      try {
        await this.syncWeatherBatch(batch);
        ok += batch.length;
        this.logger.log(`Weather batch ${num}/${total} done (${batch.length} upazilas)`);
      } catch (err) {
        fail += batch.length;
        this.logger.error(`Weather batch ${num}/${total} failed: ${String(err)}`);
      }
      if (i + BATCH_SIZE < upazilas.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }
    this.logger.log(`Upazila weather done — ${ok} ok, ${fail} errors`);
  }

  private async syncWeatherBatch(batch: WithCoords[]): Promise<void> {
    const lats = batch.map((u) => u.lat).join(',');
    const lngs = batch.map((u) => u.lng).join(',');

    const raw = await this.openMeteo.fetchWeatherBatch30d(lats, lngs);
    const arr: OpenMeteoUnionWeatherResponse[] = Array.isArray(raw) ? raw : [raw];

    if (arr.length !== batch.length) {
      throw new Error(`Weather response size mismatch: expected ${batch.length}, got ${arr.length}`);
    }

    const updates = batch
      .map((upazila, i) => {
        const w = arr[i];
        if (!w) return null;

        const maxTemps = w.daily.temperature_2m_max ?? [];
        const minTemps = w.daily.temperature_2m_min ?? [];
        const dailyAvgTemps = maxTemps.map((max, j) => {
          const min = minTemps[j];
          return max != null && min != null ? (max + min) / 2 : null;
        });

        return this.prisma.upazila.update({
          where: { id: upazila.id },
          data: {
            avgTemp30d:       numAvg(dailyAvgTemps),
            minTemp30d:       numMin(minTemps),
            maxTemp30d:       numMax(maxTemps),
            avgHumidity30d:   numAvg(w.hourly.relative_humidity_2m ?? []),
            totalPrecip30d:   numSum(w.daily.precipitation_sum ?? []),
            avgWindSpeed30d:  numAvg(w.daily.wind_speed_10m_max ?? []),
            avgCloudCover30d: numAvg(w.hourly.cloud_cover ?? []),
            avgUvIndex30d:    numAvg(w.daily.uv_index_max ?? []),
            climateUpdatedAt: new Date(),
          },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }

  // ─── Step 2: AQ per district ──────────────────────────────────────────────

  private async syncDistrictAq(): Promise<void> {
    const all = await this.prisma.district.findMany({
      select: { id: true, name: true, lat: true, lng: true },
    });
    const districts: WithCoords[] = all
      .filter((d) => d.lat != null && d.lng != null)
      .map((d) => ({ id: d.id, name: d.name, lat: d.lat as number, lng: d.lng as number }));

    const total = Math.ceil(districts.length / BATCH_SIZE);
    this.logger.log(`Fetching 30d AQ for ${districts.length} districts in ${total} batch(es)…`);

    let ok = 0, fail = 0;
    for (let i = 0; i < districts.length; i += BATCH_SIZE) {
      const batch = districts.slice(i, i + BATCH_SIZE);
      const num = Math.floor(i / BATCH_SIZE) + 1;
      try {
        await this.syncAqBatch(batch);
        ok += batch.length;
        this.logger.log(`AQ batch ${num}/${total} done (${batch.length} districts)`);
      } catch (err) {
        fail += batch.length;
        this.logger.error(`AQ batch ${num}/${total} failed: ${String(err)}`);
      }
      if (i + BATCH_SIZE < districts.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }
    this.logger.log(`District AQ done — ${ok} ok, ${fail} errors`);
  }

  private async syncAqBatch(batch: WithCoords[]): Promise<void> {
    const lats = batch.map((d) => d.lat).join(',');
    const lngs = batch.map((d) => d.lng).join(',');

    const raw = await this.openMeteo.fetchAqBatch30d(lats, lngs);
    const arr: OpenMeteoUnionAirQualityResponse[] = Array.isArray(raw) ? raw : [raw];

    if (arr.length !== batch.length) {
      throw new Error(`AQ response size mismatch: expected ${batch.length}, got ${arr.length}`);
    }

    const updates = batch
      .map((district, i) => {
        const aq = arr[i];
        if (!aq) return null;

        return this.prisma.district.update({
          where: { id: district.id },
          data: {
            avgPm25_30d:      numAvg(aq.hourly.pm2_5 ?? []),
            avgPm10_30d:      numAvg(aq.hourly.pm10 ?? []),
            climateUpdatedAt: new Date(),
          },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }

  // ─── Aggregation chain (raw SQL) ──────────────────────────────────────────
  // WARNING: column names below are hardcoded strings — not caught by tsc if
  // schema.prisma is renamed. If you rename any column used here, update these
  // SQL statements to match.

  /** Step 3: Roll upazila weather up into district weather columns. */
  private aggregateUpazilaWeatherToDistrict() {
    return this.prisma.$executeRaw`
      UPDATE "District" d
      SET
        "avgTemp30d"       = sub.avg_temp,
        "minTemp30d"       = sub.min_temp,
        "maxTemp30d"       = sub.max_temp,
        "avgHumidity30d"   = sub.avg_humidity,
        "totalPrecip30d"   = sub.total_precip,
        "avgWindSpeed30d"  = sub.avg_wind,
        "avgCloudCover30d" = sub.avg_cloud,
        "avgUvIndex30d"    = sub.avg_uv,
        "climateUpdatedAt" = NOW()
      FROM (
        SELECT
          "districtId",
          AVG("avgTemp30d")       AS avg_temp,
          MIN("minTemp30d")       AS min_temp,
          MAX("maxTemp30d")       AS max_temp,
          AVG("avgHumidity30d")   AS avg_humidity,
          AVG("totalPrecip30d")   AS total_precip,
          AVG("avgWindSpeed30d")  AS avg_wind,
          AVG("avgCloudCover30d") AS avg_cloud,
          AVG("avgUvIndex30d")    AS avg_uv
        FROM "Upazila"
        WHERE "avgTemp30d" IS NOT NULL
        GROUP BY "districtId"
      ) sub
      WHERE d.id = sub."districtId"
    `;
  }

  /** Step 4: Push district AQ down to child upazilas. */
  private propagateAqDistrictToUpazila() {
    return this.prisma.$executeRaw`
      UPDATE "Upazila" up
      SET
        "avgPm25_30d"      = d."avgPm25_30d",
        "avgPm10_30d"      = d."avgPm10_30d",
        "climateUpdatedAt" = NOW()
      FROM "District" d
      WHERE up."districtId" = d.id
        AND d."avgPm25_30d" IS NOT NULL
    `;
  }

  /** Step 5: Copy all upazila climate columns down to child unions. */
  private propagateUpazilaToUnion() {
    return this.prisma.$executeRaw`
      UPDATE "Union" u
      SET
        "avgTemp30d"       = up."avgTemp30d",
        "minTemp30d"       = up."minTemp30d",
        "maxTemp30d"       = up."maxTemp30d",
        "avgHumidity30d"   = up."avgHumidity30d",
        "totalPrecip30d"   = up."totalPrecip30d",
        "avgWindSpeed30d"  = up."avgWindSpeed30d",
        "avgCloudCover30d" = up."avgCloudCover30d",
        "avgPm25_30d"      = up."avgPm25_30d",
        "avgPm10_30d"      = up."avgPm10_30d",
        "avgUvIndex30d"    = up."avgUvIndex30d",
        "climateUpdatedAt" = NOW()
      FROM "Upazila" up
      WHERE u."upazilaId" = up.id
        AND up."avgTemp30d" IS NOT NULL
    `;
  }

  /** Step 6: Aggregate all district climate columns up to division. */
  private aggregateDistrictToDivision() {
    return this.prisma.$executeRaw`
      UPDATE "Division" dv
      SET
        "avgTemp30d"       = sub.avg_temp,
        "minTemp30d"       = sub.min_temp,
        "maxTemp30d"       = sub.max_temp,
        "avgHumidity30d"   = sub.avg_humidity,
        "totalPrecip30d"   = sub.total_precip,
        "avgWindSpeed30d"  = sub.avg_wind,
        "avgCloudCover30d" = sub.avg_cloud,
        "avgPm25_30d"      = sub.avg_pm25,
        "avgPm10_30d"      = sub.avg_pm10,
        "avgUvIndex30d"    = sub.avg_uv,
        "climateUpdatedAt" = NOW()
      FROM (
        SELECT
          "divisionId",
          AVG("avgTemp30d")       AS avg_temp,
          MIN("minTemp30d")       AS min_temp,
          MAX("maxTemp30d")       AS max_temp,
          AVG("avgHumidity30d")   AS avg_humidity,
          AVG("totalPrecip30d")   AS total_precip,
          AVG("avgWindSpeed30d")  AS avg_wind,
          AVG("avgCloudCover30d") AS avg_cloud,
          AVG("avgPm25_30d")      AS avg_pm25,
          AVG("avgPm10_30d")      AS avg_pm10,
          AVG("avgUvIndex30d")    AS avg_uv
        FROM "District"
        WHERE "avgTemp30d" IS NOT NULL
        GROUP BY "divisionId"
      ) sub
      WHERE dv.id = sub."divisionId"
    `;
  }
}
