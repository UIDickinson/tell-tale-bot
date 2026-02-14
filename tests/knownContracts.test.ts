// ============================================================
// Tests — Known Contract Registry
// ============================================================

import {
  knownContracts,
  whitelistedAddresses,
  contractLabels,
  isWhitelisted,
  getContractLabel,
} from '../src/data/knownContracts';

describe('knownContracts', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(knownContracts)).toBe(true);
    expect(knownContracts.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const entry of knownContracts) {
      expect(typeof entry.address).toBe('string');
      expect(entry.address.startsWith('0x')).toBe(true);
      expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.category).toBe('string');
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate addresses', () => {
    const addresses = knownContracts.map((c) => c.address.toLowerCase());
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  it('includes Uniswap UniversalRouter', () => {
    const uniswap = knownContracts.find(
      (c) => c.address.toLowerCase() === '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    );
    expect(uniswap).toBeDefined();
    expect(uniswap!.label).toContain('Uniswap');
  });

  it('includes USDC on Base', () => {
    const usdc = knownContracts.find(
      (c) => c.address.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    );
    expect(usdc).toBeDefined();
    expect(usdc!.label).toContain('USDC');
  });
});

describe('isWhitelisted', () => {
  it('returns true for known contracts', () => {
    expect(isWhitelisted('0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad')).toBe(true);
    expect(isWhitelisted('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isWhitelisted('0x3FC91A3AFD70395CD496C647D5A6CC9D4B2B7FAD')).toBe(true);
  });

  it('returns false for unknown addresses', () => {
    expect(isWhitelisted('0x0000000000000000000000000000000000000000')).toBe(false);
    expect(isWhitelisted('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')).toBe(false);
  });
});

describe('getContractLabel', () => {
  it('returns label for known contracts', () => {
    expect(getContractLabel('0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad')).toBe('Uniswap UniversalRouter');
    expect(getContractLabel('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')).toBe('USDC (Base)');
  });

  it('is case-insensitive', () => {
    expect(getContractLabel('0x4200000000000000000000000000000000000006')).toBe('WETH (Base)');
  });

  it('returns undefined for unknown addresses', () => {
    expect(getContractLabel('0x0000000000000000000000000000000000000000')).toBeUndefined();
  });
});

describe('whitelistedAddresses set', () => {
  it('contains all known contract addresses', () => {
    expect(whitelistedAddresses.size).toBe(knownContracts.length);
  });
});

describe('contractLabels map', () => {
  it('contains all known contract labels', () => {
    expect(contractLabels.size).toBe(knownContracts.length);
  });
});
