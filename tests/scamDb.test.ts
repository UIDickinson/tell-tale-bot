// ============================================================
// Tests — Scam Database Service
// ============================================================

import { seedLocalDb, checkAddress, batchCheckLocal, getLocalDbSize } from '../src/services/scamDb';

// Reset the module-level Map between tests
beforeEach(() => {
  // Re-seed with test data for each test
});

describe('seedLocalDb', () => {
  it('seeds addresses into the local database', () => {
    const entries = [
      { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', category: 'scam', description: 'Test scam' },
      { address: '0x1111111111111111111111111111111111111111', category: 'phishing', description: 'Phishing addr' },
    ];
    seedLocalDb(entries);
    expect(getLocalDbSize()).toBeGreaterThanOrEqual(2);
  });

  it('normalizes addresses to lowercase', () => {
    seedLocalDb([
      { address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', category: 'drainer', description: 'Test drainer' },
    ]);
    const results = batchCheckLocal(['0xabcdef1234567890abcdef1234567890abcdef12']);
    expect(results.size).toBe(1);
  });
});

describe('checkAddress', () => {
  beforeAll(() => {
    seedLocalDb([
      { address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', category: 'scam', description: 'Known scam wallet' },
    ]);
  });

  it('finds a flagged address in local DB', async () => {
    const flags = await checkAddress('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    expect(flags.length).toBeGreaterThanOrEqual(1);
    const localFlag = flags.find(f => f.source === 'local');
    expect(localFlag).toBeDefined();
    expect(localFlag!.category).toBe('scam');
    expect(localFlag!.description).toBe('Known scam wallet');
  });

  it('returns empty array for clean address', async () => {
    const flags = await checkAddress('0x9999999999999999999999999999999999999999');
    // Should not have local flags (ChainAbuse may fail silently in test env)
    const localFlags = flags.filter(f => f.source === 'local');
    expect(localFlags.length).toBe(0);
  });

  it('is case-insensitive', async () => {
    const flags = await checkAddress('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF');
    const localFlag = flags.find(f => f.source === 'local');
    expect(localFlag).toBeDefined();
  });
});

describe('batchCheckLocal', () => {
  beforeAll(() => {
    seedLocalDb([
      { address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', category: 'mixer', description: 'Mixer service' },
      { address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', category: 'drainer', description: 'Wallet drainer' },
    ]);
  });

  it('batch checks multiple addresses', () => {
    const results = batchCheckLocal([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // match
      '0xcccccccccccccccccccccccccccccccccccccccc', // no match
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // match
    ]);
    expect(results.size).toBe(2);
    expect(results.has('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(true);
    expect(results.has('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')).toBe(true);
  });

  it('returns empty map when no matches', () => {
    const results = batchCheckLocal(['0x1234567890123456789012345678901234567890']);
    expect(results.size).toBe(0);
  });

  it('handles empty input', () => {
    const results = batchCheckLocal([]);
    expect(results.size).toBe(0);
  });
});

describe('getLocalDbSize', () => {
  it('returns the number of seeded addresses', () => {
    const size = getLocalDbSize();
    expect(size).toBeGreaterThan(0);
    expect(typeof size).toBe('number');
  });
});
