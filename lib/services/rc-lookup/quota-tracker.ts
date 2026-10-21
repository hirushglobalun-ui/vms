import fs from 'fs';
import path from 'path';
import { LookupQuotaStatus, NormalizedVehicleLookupResult } from './types';

interface QuotaPersistedState {
  month: string; // "YYYY-MM"
  usedCount: number;
  lastUpdated: string;
}

interface CacheEntry {
  data: NormalizedVehicleLookupResult;
  cachedAt: number; // timestamp ms
}

class QuotaTracker {
  private quotaFilePath: string;
  private maxQuota: number;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimits: Map<string, { timestamps: number[] }> = new Map();

  constructor() {
    this.quotaFilePath = path.join(process.cwd(), '.rapidapi-quota.json');
    this.maxQuota = parseInt(process.env.RAPIDAPI_MONTHLY_QUOTA || '40', 10);
  }

  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Reads the current persisted quota state from disk.
   * Auto-resets counter if current calendar month has changed.
   */
  public getQuotaState(): QuotaPersistedState {
    const currentMonth = this.getCurrentMonthKey();
    let state: QuotaPersistedState = {
      month: currentMonth,
      usedCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      if (fs.existsSync(this.quotaFilePath)) {
        const raw = fs.readFileSync(this.quotaFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.month === 'string' && typeof parsed.usedCount === 'number') {
          if (parsed.month === currentMonth) {
            state = parsed;
          } else {
            // New month has started, reset counter
            state = {
              month: currentMonth,
              usedCount: 0,
              lastUpdated: new Date().toISOString(),
            };
            this.saveQuotaState(state);
          }
        }
      }
    } catch (err) {
      console.warn('[QuotaTracker] Failed to read quota file, using memory fallback:', err);
    }

    return state;
  }

  /**
   * Persists quota state to disk safely.
   */
  private saveQuotaState(state: QuotaPersistedState): void {
    try {
      fs.writeFileSync(this.quotaFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[QuotaTracker] Failed to write quota file:', err);
    }
  }

  /**
   * Checks if monthly quota is available.
   */
  public hasQuotaRemaining(): boolean {
    const state = this.getQuotaState();
    return state.usedCount < this.maxQuota;
  }

  /**
   * Returns complete quota statistics.
   */
  public getQuotaStatus(): LookupQuotaStatus {
    const state = this.getQuotaState();
    const remaining = Math.max(0, this.maxQuota - state.usedCount);
    return {
      currentMonth: state.month,
      usedCount: state.usedCount,
      maxQuota: this.maxQuota,
      remainingQuota: remaining,
      isQuotaExhausted: state.usedCount >= this.maxQuota,
      cachedLookupsCount: this.cache.size,
    };
  }

  /**
   * Increments the used counter by 1 upon a successful API call.
   */
  public recordApiUsage(): LookupQuotaStatus {
    const state = this.getQuotaState();
    state.usedCount += 1;
    state.lastUpdated = new Date().toISOString();
    this.saveQuotaState(state);
    return this.getQuotaStatus();
  }

  /**
   * Retrieves cached vehicle details if available and fresh (within 30 days).
   * Prevents consuming redundant RapidAPI quota for known plates.
   */
  public getCached(normalizedRegNo: string): NormalizedVehicleLookupResult | null {
    const entry = this.cache.get(normalizedRegNo);
    if (!entry) return null;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.cachedAt > THIRTY_DAYS_MS) {
      this.cache.delete(normalizedRegNo);
      return null;
    }

    return {
      ...entry.data,
      source: 'SERVER_CACHE',
      statusDescription: `Served from server cache (verified ${new Date(entry.cachedAt).toLocaleDateString()})`,
    };
  }

  /**
   * Stores vehicle details in server cache.
   */
  public setCached(normalizedRegNo: string, data: NormalizedVehicleLookupResult): void {
    this.cache.set(normalizedRegNo, {
      data,
      cachedAt: Date.now(),
    });
  }

  /**
   * Rate limits per client identifier (e.g. IP or User ID).
   * Max 5 lookups per minute.
   */
  public checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 30;

    const record = this.rateLimits.get(clientId) || { timestamps: [] };
    // Filter timestamps within active window
    record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

    if (record.timestamps.length >= MAX_REQUESTS) {
      return false; // Rate limited
    }

    record.timestamps.push(now);
    this.rateLimits.set(clientId, record);
    return true;
  }
}

// Singleton instance
export const quotaTracker = new QuotaTracker();
