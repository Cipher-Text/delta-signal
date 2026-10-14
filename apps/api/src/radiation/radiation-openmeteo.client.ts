import { Injectable, Logger } from '@nestjs/common';
import type {
  SatelliteArchiveRawResponse,
  OpenMeteoRadiationResponse,
} from './dto/open-meteo-radiation-response.dto';

const SATELLITE_BASE_URL = 'https://satellite-api.open-meteo.com/v1/archive';
const LOOK_BACK_DAYS      = 7;
const MAX_ATTEMPTS        = 3;
const RETRY_DELAYS_MS     = [500, 1500];
const FETCH_TIMEOUT_MS    = 30_000;
const DAILY_VARIABLES = [
  'sunrise', 'sunset', 'daylight_duration', 'sunshine_duration', 'shortwave_radiation_sum',
].join(',');
const HOURLY_VARIABLES = [
  'shortwave_radiation', 'direct_radiation', 'diffuse_radiation',
  'direct_normal_irradiance', 'shortwave_radiation_clear_sky',
  'global_tilted_irradiance', 'terrestrial_radiation',
  'shortwave_radiation_instant', 'direct_radiation_instant',
  'diffuse_radiation_instant', 'direct_normal_irradiance_instant',
  'global_tilted_irradiance_instant', 'terrestrial_radiation_instant',
  'shortwave_radiation_clear_sky_instant', 'is_day',
].join(',');

// ── Client ────────────────────────────────────────────────────────────────────

@Injectable()
export class RadiationOpenMeteoClient {
  private readonly logger = new Logger(RadiationOpenMeteoClient.name);

  /**
   * Fetches the last {@link LOOK_BACK_DAYS} days of satellite-observed
   * shortwave radiation for a coordinate. Open-Meteo provides the daily
   * aggregate directly in MJ/m² alongside the native-resolution hourly data.
   */
  async fetch(lat: number, lng: number): Promise<OpenMeteoRadiationResponse> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: DAILY_VARIABLES,
      hourly: HOURLY_VARIABLES,
      models: 'satellite_radiation_seamless',
      past_days: String(LOOK_BACK_DAYS),
      forecast_days: '0',
      temporal_resolution: 'native',
      timezone: 'UTC',
    });
    const url = `${SATELLITE_BASE_URL}?${params.toString()}`;

    const raw = await this.getJson<SatelliteArchiveRawResponse>(url);

    return {
      latitude:  raw.latitude,
      longitude: raw.longitude,
      daily: raw.daily,
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
