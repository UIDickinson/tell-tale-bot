// ============================================================
// Tests — Rate Limiting Utilities
// ============================================================

import { RateLimiter, TtlCache, UserRateLimiter } from '../src/utils/rateLimit';

describe('RateLimiter', () => {
  it('allows calls within rate limit', async () => {
    const limiter = new RateLimiter(5, 1000);
    const start = Date.now();

    // 5 calls should go through immediately
    for (let i = 0; i < 5; i++) {
      await limiter.waitForSlot();
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // should be nearly instant
  });

  it('delays calls beyond rate limit', async () => {
    const limiter = new RateLimiter(2, 200); // 2 calls per 200ms
    const start = Date.now();

    await limiter.waitForSlot();
    await limiter.waitForSlot();
    // 3rd call should wait
    await limiter.waitForSlot();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(150); // should wait ~200ms
  });
});

describe('TtlCache', () => {
  it('stores and retrieves values', () => {
    const cache = new TtlCache<string>(5000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing keys', () => {
    const cache = new TtlCache<string>(5000);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('expires entries after TTL', async () => {
    const cache = new TtlCache<string>(50); // 50ms TTL
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    await new Promise((r) => setTimeout(r, 80));
    expect(cache.get('key1')).toBeUndefined();
  });

  it('has() returns true for valid entries', () => {
    const cache = new TtlCache<string>(5000);
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('clear() removes all entries', () => {
    const cache = new TtlCache<string>(5000);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('handles different value types', () => {
    const numCache = new TtlCache<number>(5000);
    numCache.set('count', 42);
    expect(numCache.get('count')).toBe(42);

    const objCache = new TtlCache<{ name: string }>(5000);
    objCache.set('user', { name: 'test' });
    expect(objCache.get('user')).toEqual({ name: 'test' });
  });
});

describe('UserRateLimiter', () => {
  it('allows queries within limit', () => {
    const limiter = new UserRateLimiter(3, 60000);
    expect(limiter.checkAndRecord(100)).toBe(true);
    expect(limiter.checkAndRecord(100)).toBe(true);
    expect(limiter.checkAndRecord(100)).toBe(true);
  });

  it('blocks queries beyond limit', () => {
    const limiter = new UserRateLimiter(2, 60000);
    expect(limiter.checkAndRecord(200)).toBe(true);
    expect(limiter.checkAndRecord(200)).toBe(true);
    expect(limiter.checkAndRecord(200)).toBe(false); // blocked
  });

  it('tracks different users independently', () => {
    const limiter = new UserRateLimiter(1, 60000);
    expect(limiter.checkAndRecord(300)).toBe(true);
    expect(limiter.checkAndRecord(300)).toBe(false); // user 300 blocked
    expect(limiter.checkAndRecord(400)).toBe(true);  // user 400 still ok
  });

  it('allows queries again after window expires', async () => {
    const limiter = new UserRateLimiter(1, 50); // 50ms window
    expect(limiter.checkAndRecord(500)).toBe(true);
    expect(limiter.checkAndRecord(500)).toBe(false);

    await new Promise((r) => setTimeout(r, 80));
    expect(limiter.checkAndRecord(500)).toBe(true); // allowed again
  });
});
