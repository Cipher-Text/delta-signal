import { Injectable, Logger } from '@nestjs/common';
import type {
  SatelliteArchiveRawResponse,
  OpenMeteoRadiationResponse,
} from './dto/open-meteo-radiation-response.dto';

const SATELLITE_BASE_URL = 'https://satellite-api.open-meteo.com/v1/satellite';
const LOOK_BACK_DAYS      = 7;
const MAX_ATTEMPTS        = 3;
const RETRY_DELAYS_MS     = [500, 1500];
const FETCH_TIMEOUT_MS    = 30_000;

// ── Aggregation helper ────────────────────────────────────────────────────────

/**
 * Groups sub-hourly (e.g. 10-min) W/m² samples into daily MJ/m² sums.
 *
 * Formula: Σ(W/m²) × step_seconds / 1 000 000  →  MJ/m²
 *
 * The time-step is inferred from the gap between the first two timestamps,
 * so it handles both native 10-min resolution and any other interval.
 */
function aggregateDailySums(
  times:  string[],
  values: (number | null)[],
): { dates: string[]; sums: (number | null)[] } {
  if (!times.length) return { dates: [], sums: [] };

  // Detect interval in seconds from consecutive timestamps.
  let stepSeconds = 3_600; // fall back to 1 h if only one sample
  if (times.length >= 2) {
    stepSeconds = (Date.parse(times[1]) - Date.parse(times[0])) / 1_000;
  }

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < times.length; i++) {
    const date = times[i].slice(0, 10); // 'YYYY-MM-DD'
    const v    = values[i];
    if (v != null && Number.isFinite(v) && v >= 0) {
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + v);
    }
  }

  const dates = [...dailyMap.keys()].sort();
  const sums  = dates.map((d) => {
    const sumW = dailyMap.get(d);
    if (sumW == null) return null;
    // Round to 4 significant figures — consistent with forecast API output.
    return Math.round(sumW * stepSeconds / 1_000_000 * 10_000) / 10_000;
  });

  return { dates, sums };
}

// ── Client ────────────────────────────────────────────────────────────────────

@Injectable()
export class RadiationOpenMeteoClient {
  private readonly logger = new Logger(RadiationOpenMeteoClient.name);

  /**
   * Fetches the last {@link LOOK_BACK_DAYS} days of satellite-observed
   * shortwave radiation for a coordinate, aggregates native 10-minute
   * W/m² samples into daily MJ/m² sums, and returns the result in the
   * same daily shape that the service and scheduler expect.
   */
  async fetch(lat: number, lng: number): Promise<OpenMeteoRadiationResponse> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: 'shortwave_radiation',
      past_days: String(LOOK_BACK_DAYS),
      forecast_days: '0',
      temporal_resolution: 'native',
      timezone: 'UTC',
    });
    const url = `${SATELLITE_BASE_URL}?${params.toString()}`;

    const raw = await this.getJson<SatelliteArchiveRawResponse>(url);

    const { dates, sums } = aggregateDailySums(
      raw.hourly.time,
      raw.hourly.shortwave_radiation,
    );

    return {
      latitude:  raw.latitude,
      longitude: raw.longitude,
      daily: {
        time:                    dates,
        shortwave_radiation_sum: sums,
        // sunshine_duration and daylight_duration are not available from the
        // satellite archive API — the service stores them as null.
      },
    };
  }

  private async getJson<T>(url: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) {
          throw new Error(
            `OpenMeteo Satellite request failed: ${response.status} ${response.statusText}`,
          );
        }
        return (await response.json()) as T;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        }
      }
    }
    this.logger.error(`Giving up on ${url} after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
    throw lastError;
  }
}
