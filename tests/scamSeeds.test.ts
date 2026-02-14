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
    const validCategories = ['burn', 'drainer', 'phishing', 'rugpull', 'mixer', 'exploiter', 'scam'];
    for (const entry of scamSeedData) {
      expect(validCategories).toContain(entry.category);
    }
  });

  it('contains Tornado Cash mixer addresses', () => {
    const mixers = scamSeedData.filter(e => e.category === 'mixer');
    expect(mixers.length).toBeGreaterThanOrEqual(4);
  });

  it('contains drainer kit addresses', () => {
    const drainers = scamSeedData.filter(e => e.category === 'drainer');
    expect(drainers.length).toBeGreaterThanOrEqual(1);
  });

  it('has no duplicate addresses', () => {
    const addresses = scamSeedData.map(e => e.address.toLowerCase());
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });
});
