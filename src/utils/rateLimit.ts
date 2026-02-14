// ============================================================
// Tell-Tale Bot — Rate Limiting Utilities
// ============================================================

/**
 * Simple sliding-window rate limiter for API calls.
 */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private maxCalls: number,
    private windowMs: number,
  ) {}

  /**
   * Wait until a call can be made within rate limits.
   */
  async waitForSlot(): Promise<void> {
    while (true) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

      if (this.timestamps.length < this.maxCalls) {
        this.timestamps.push(now);
        return;
      }

      const oldestInWindow = this.timestamps[0]!;
      const waitTime = this.windowMs - (now - oldestInWindow) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Simple in-memory cache with TTL.
 */
export class TtlCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Per-user rate limiter for bot abuse prevention.
 * Tracks queries per FID within a time window.
 */
export class UserRateLimiter {
  private queries = new Map<number, number[]>();

  constructor(
    private maxQueries: number,
    private windowMs: number,
  ) {}

  /**
   * Check if a user (by FID) is rate-limited.
   * Returns true if allowed, false if rate-limited.
   */
  checkAndRecord(fid: number): boolean {
    const now = Date.now();
    const userTimestamps = (this.queries.get(fid) || []).filter(
      (t) => now - t < this.windowMs,
    );

    if (userTimestamps.length >= this.maxQueries) {
      return false;
    }

    userTimestamps.push(now);
    this.queries.set(fid, userTimestamps);
    return true;
  }
}
