// ============================================================
// Tests — Configuration
// ============================================================

import { config } from '../src/config';

describe('config', () => {
  it('loads all required config values', () => {
    expect(config.neynarApiKey).toBe('test-neynar-key');
    expect(config.neynarSignerUuid).toBe('test-signer-uuid');
    expect(config.botFid).toBe(12345);
    expect(config.openaiApiKey).toBe('test-openai-key');
    expect(config.basescanApiKey).toBe('test-basescan-key');
  });

  it('has correct defaults for optional values', () => {
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('test');
    expect(config.basescanRateLimit).toBe(5);
    expect(config.maxTransactionsToFetch).toBe(100);
    expect(config.cacheTtlSeconds).toBe(300);
    expect(config.maxReportLength).toBe(1024);
  });

  it('has Basescan base URL', () => {
    expect(config.basescanBaseUrl).toBe('https://base.blockscout.com/api');
  });

  it('has RPC providers configured', () => {
    expect(config.rpcProviders.length).toBeGreaterThanOrEqual(1);
    for (const provider of config.rpcProviders) {
      expect(provider.name).toBeTruthy();
      expect(provider.url).toBeTruthy();
      expect(typeof provider.priority).toBe('number');
    }
  });

  it('includes Base Public RPC as first provider', () => {
    const first = config.rpcProviders[0];
    expect(first).toBeDefined();
    expect(first!.name).toBe('Base Public');
    expect(first!.url).toContain('base.org');
  });

  it('has the disclaimer text', () => {
    expect(config.disclaimer).toContain('Not financial advice');
    expect(config.disclaimer).toContain('DYOR');
  });
});
