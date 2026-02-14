// ============================================================
// Tests — Scam Seed Data
// ============================================================

import { scamSeedData, ScamSeedEntry } from '../src/data/scamSeeds';

describe('scamSeedData', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(scamSeedData)).toBe(true);
    expect(scamSeedData.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const entry of scamSeedData) {
      expect(typeof entry.address).toBe('string');
      expect(entry.address.startsWith('0x')).toBe(true);
      expect(typeof entry.category).toBe('string');
      expect(entry.category.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe('string');
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('addresses are valid hex format (0x + 40 hex chars)', () => {
    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    for (const entry of scamSeedData) {
      expect(entry.address).toMatch(hexPattern);
    }
  });

  it('has recognized categories', () => {
    const validCategories = ['burn', 'mixer', 'scam'];
    for (const entry of scamSeedData) {
      expect(validCategories).toContain(entry.category);
    }
  });

  it('contains Tornado Cash mixer addresses', () => {
    const mixers = scamSeedData.filter(e => e.category === 'mixer');
    expect(mixers.length).toBeGreaterThanOrEqual(4);
  });

  it('does not contain known false positives', () => {
    const addresses = scamSeedData.map(e => e.address.toLowerCase());
    // Uniswap UniversalRouter must NOT be in scam DB
    expect(addresses).not.toContain('0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad');
    // USDC template must NOT be in scam DB
    expect(addresses).not.toContain('0xb0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    // Placeholder rugpull must NOT be in scam DB
    expect(addresses).not.toContain('0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001');
  });

  it('has no duplicate addresses', () => {
    const addresses = scamSeedData.map(e => e.address.toLowerCase());
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });
});
