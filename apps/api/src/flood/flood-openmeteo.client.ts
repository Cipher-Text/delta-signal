import { Injectable, Logger } from '@nestjs/common';
import { OpenMeteoFloodResponse } from './dto/open-meteo-flood-response.dto';

const FLOOD_BASE_URL = 'https://flood-api.open-meteo.com/v1/flood';
const FLOOD_PARAMS = [
  'river_discharge',
  'river_discharge_mean',
  'river_discharge_median',
  'river_discharge_max',
  'river_discharge_min',
  'river_discharge_p25',
  'river_discharge_p75',
  // Note: OpenMeteo's flood API only exposes p25/p75 percentiles — p10/p90
  // are not valid daily variables and make the whole request fail with 400.
].join(',');
const FLOOD_FORECAST_DAYS = 30;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1500];
const FETCH_TIMEOUT_MS = 30_000;

@Injectable()
export class FloodOpenMeteoClient {
  private readonly logger = new Logger(FloodOpenMeteoClient.name);

  fetch(lat: number, lng: number): Promise<OpenMeteoFloodResponse> {
    const url = `${FLOOD_BASE_URL}?latitude=${lat}&longitude=${lng}&daily=${FLOOD_PARAMS}&forecast_days=${FLOOD_FORECAST_DAYS}&cell_selection=nearest`;
    return this.getJson(url);
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
          throw new Error(`OpenMeteo Flood request failed: ${response.status} ${response.statusText}`);
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
