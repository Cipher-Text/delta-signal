import { Injectable, Logger } from '@nestjs/common';
import {
  OpenMeteoAirQualityResponse,
  OpenMeteoCurrentResponse,
  OpenMeteoDailyResponse,
  OpenMeteoHourlyResponse,
  OpenMeteoUnionAirQualityResponse,
  OpenMeteoUnionWeatherResponse,
} from './dto/open-meteo-response.dto';

const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const CURRENT_PARAMS =
  'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,precipitation,weather_code,cloud_cover';
const HOURLY_PARAMS =
  'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover';
const DAILY_PARAMS =
  'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset';
const AIR_QUALITY_PARAMS =
  'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index';

const HOURLY_FORECAST_DAYS = 3;
const DAILY_FORECAST_DAYS = 7;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2_000, 5_000];
const MIN_REQUEST_INTERVAL_MS = 250;
const FETCH_TIMEOUT_MS = 30_000;

@Injectable()
export class WeatherOpenMeteoClient {
  private readonly logger = new Logger(WeatherOpenMeteoClient.name);
  private requestQueue = Promise.resolve();
  private lastRequestAt = 0;

  fetchCurrent(lat: number, lng: number): Promise<OpenMeteoCurrentResponse> {
    const url = `${FORECAST_BASE_URL}?latitude=${lat}&longitude=${lng}&current=${CURRENT_PARAMS}&timezone=auto`;
    return this.getJson(url);
  }

  fetchHourly(lat: number, lng: number): Promise<OpenMeteoHourlyResponse> {
    const url = `${FORECAST_BASE_URL}?latitude=${lat}&longitude=${lng}&hourly=${HOURLY_PARAMS}&forecast_days=${HOURLY_FORECAST_DAYS}&timezone=auto`;
    return this.getJson(url);
  }

  fetchDaily(lat: number, lng: number): Promise<OpenMeteoDailyResponse> {
    const url = `${FORECAST_BASE_URL}?latitude=${lat}&longitude=${lng}&daily=${DAILY_PARAMS}&forecast_days=${DAILY_FORECAST_DAYS}&timezone=auto`;
    return this.getJson(url);
  }

  fetchAirQuality(lat: number, lng: number): Promise<OpenMeteoAirQualityResponse> {
    const url = `${AIR_QUALITY_BASE_URL}?latitude=${lat}&longitude=${lng}&hourly=${AIR_QUALITY_PARAMS}&forecast_days=${HOURLY_FORECAST_DAYS}&timezone=auto`;
    return this.getJson(url);
  }

  /**
   * Fetch 30-day weather history for a batch of upazilas (≤100 per call to stay under URL limits).
   * Returns 30 daily values per location (past_days=29 + today) — caller averages them.
   * OpenMeteo returns a single object for 1 coord, an array for multiple.
   */
  fetchWeatherBatch30d(
    lats: string,
    lngs: string,
  ): Promise<OpenMeteoUnionWeatherResponse | OpenMeteoUnionWeatherResponse[]> {
    const url =
      `${FORECAST_BASE_URL}?latitude=${lats}&longitude=${lngs}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max` +
      `&hourly=relative_humidity_2m,cloud_cover` +
      `&past_days=29&forecast_days=1&timezone=auto`;
    return this.getJson(url);
  }

  /**
   * Fetch 30-day air quality history for a batch of districts (all 64 fit in one call).
   * Returns 30×24=720 hourly values per location — caller averages them.
   */
  fetchAqBatch30d(
    lats: string,
    lngs: string,
  ): Promise<OpenMeteoUnionAirQualityResponse | OpenMeteoUnionAirQualityResponse[]> {
    const url =
      `${AIR_QUALITY_BASE_URL}?latitude=${lats}&longitude=${lngs}` +
      `&hourly=pm10,pm2_5` +
      `&past_days=29&forecast_days=1&timezone=auto`;
    return this.getJson(url);
  }

  private async getJson<T>(url: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await this.waitForRequestSlot();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) {
          const retryAfterMs = this.getRetryAfterMs(response);
          const error = new Error(`OpenMeteo request failed: ${response.status} ${response.statusText}`);
          Object.assign(error, { status: response.status, retryAfterMs });
          throw error;
        }
        return (await response.json()) as T;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < MAX_ATTEMPTS - 1) {
          const retryAfterMs = this.getErrorRetryAfterMs(err);
          const delay = Math.max(retryAfterMs ?? 0, RETRY_DELAYS_MS[attempt]);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    this.logger.error(
      `Giving up on ${new URL(url).pathname} after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`,
    );
    throw lastError;
  }

  /** Serialize requests from all schedulers in this process to avoid burst rate limits. */
  private async waitForRequestSlot(): Promise<void> {
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.requestQueue;
    this.requestQueue = previous.then(async () => {
      const waitMs = MIN_REQUEST_INTERVAL_MS - (Date.now() - this.lastRequestAt);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.lastRequestAt = Date.now();
      release();
    });
    await turn;
  }

  private getRetryAfterMs(response: Response): number | undefined {
    const value = response.headers.get('retry-after');
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
  }

  private getErrorRetryAfterMs(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const retryAfterMs = (error as { retryAfterMs?: unknown }).retryAfterMs;
    return typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) ? retryAfterMs : undefined;
  }
}
