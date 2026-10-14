import { Injectable, Logger } from '@nestjs/common';
import type { WorldBankRecord, WorldBankResponse } from './dto/world-bank-response.dto';

const BASE_URL = 'https://api.worldbank.org/v2/country/BGD/indicator';
const PER_PAGE = 50;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1_500];
const FETCH_TIMEOUT_MS = 30_000;
const REQUEST_HEADERS = {
  Accept: 'application/json',
  // Some API gateways reject requests without an identifying User-Agent.
  'User-Agent': 'DeltaSignal/1.0 (World Bank Indicators API client)',
};

/** GHG indicators to sync from the World Bank Climate Change API. */
export const WORLD_BANK_INDICATORS = [
  'EN.GHG.ALL.MT.CE.AR5', // Total GHG
  'EN.GHG.CO2.MT.CE.AR5', // CO2 only
  'EN.GHG.CH4.MT.CE.AR5', // Methane
  'EN.GHG.N2O.MT.CE.AR5', // Nitrous oxide
] as const;

@Injectable()
export class WorldBankClient {
  private readonly logger = new Logger(WorldBankClient.name);

  /**
   * Fetch all records for a given indicator, paging through the API
   * until all pages are consumed.
   */
  async fetchIndicator(indicatorCode: string): Promise<WorldBankRecord[]> {
    const all: WorldBankRecord[] = [];

    // Fetch page 1 to learn total page count
    const first = await this.fetchPage(indicatorCode, 1);
    all.push(...first[1]);

    const totalPages = first[0].pages;
    for (let page = 2; page <= totalPages; page++) {
      const result = await this.fetchPage(indicatorCode, page);
      all.push(...result[1]);
    }

    this.logger.log(`Fetched ${all.length} records for ${indicatorCode}`);
    return all;
  }

  private async fetchPage(indicatorCode: string, page: number): Promise<WorldBankResponse> {
    const url = `${BASE_URL}/${indicatorCode}?format=json&page=${page}&per_page=${PER_PAGE}`;
    return this.getJson<WorldBankResponse>(url);
  }

  private async getJson<T>(url: string): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1] ?? 2_000));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
        if (!res.ok) {
          const detail = (await res.text()).replace(/\s+/g, ' ').slice(0, 300);
          const error = new Error(`HTTP ${res.status} from ${url}${detail ? `: ${detail}` : ''}`);
          // Client errors such as 403 and 404 will not improve with another request.
          if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            throw Object.assign(error, { retryable: false });
          }
          throw error;
        }
        return (await res.json()) as T;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`World Bank fetch attempt ${attempt + 1} failed: ${String(err)}`);
        if (typeof err === 'object' && err !== null && 'retryable' in err && err.retryable === false) {
          break;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastErr;
  }
}
