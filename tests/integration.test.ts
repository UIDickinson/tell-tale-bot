// ============================================================
// Integration Test — Full Analysis Pipeline (Offline)
// ============================================================
// Tests the entire pipeline without making external API calls.
// Mocks Basescan, ChainAbuse, OpenAI, and Farcaster.
// ============================================================

import { computeRiskScore } from '../src/services/riskScorer';
import { formatForCast } from '../src/services/reportGenerator';
import { seedLocalDb, checkAddress, getLocalDbSize } from '../src/services/scamDb';
import { extractAddress } from '../src/utils/address';
import { TtlCache, UserRateLimiter } from '../src/utils/rateLimit';
import { WalletData, WalletReport, BasescanTransaction } from '../src/types';
import { scamSeedData } from '../src/data/scamSeeds';

describe('Integration: Full Analysis Pipeline (offline)', () => {
  beforeAll(() => {
    seedLocalDb(scamSeedData);
  });

  it('end-to-end: parse address → score → format report', () => {
    // 1. Parse address from user message
    const userMessage = '@TellTaleBot check 0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1';
    const address = extractAddress(userMessage);
    expect(address).not.toBeNull();

    // 2. Simulate wallet data (as if fetched from Basescan/RPC)
    const walletData: WalletData = {
      address: address!,
      balance: 2500000000000000000n, // 2.5 ETH
      transactionCount: 75,
      transactions: Array.from({ length: 75 }, (_, i) => ({
        blockNumber: String(1000000 + i),
        timeStamp: String(Math.floor(Date.now() / 1000) - (i * 3600)),
        hash: '0x' + i.toString(16).padStart(64, 'a'),
        from: i % 2 === 0 ? address!.toLowerCase() : '0x' + 'b'.repeat(40),
        to: i % 2 === 0 ? '0x' + 'c'.repeat(40) : address!.toLowerCase(),
        value: String(BigInt(100000000000000) * BigInt(i + 1)), // varying values
        gas: '21000',
        gasUsed: '21000',
        isError: '0',
        functionName: '',
        contractAddress: '',
        input: '0x',
      })),
      tokenTransfers: Array.from({ length: 10 }, (_, i) => ({
        blockNumber: String(1000000 + i),
        timeStamp: String(Math.floor(Date.now() / 1000) - i * 3600),
        hash: '0x' + i.toString(16).padStart(64, 'e'),
        from: address!.toLowerCase(),
        to: '0x' + 'f'.repeat(40),
        value: '1000000',
        tokenName: 'USDC',
        tokenSymbol: 'USDC',
        tokenDecimal: '6',
        contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      })),
      internalTransactions: [],
      accountAge: 200 * 86400, // 200 days
      firstTxTimestamp: Math.floor(Date.now() / 1000) - 200 * 86400,
      isContract: false,
      scamFlags: [],
    };

    // 3. Compute risk score
    const { score, level, signals } = computeRiskScore(walletData);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(level);
    expect(signals).toHaveLength(7);

    // 4. Create and format report (skipping AI summary — no OpenAI in test)
    const report: WalletReport = {
      address: address!,
      chain: 'Base',
      riskLevel: level,
      riskScore: score,
      confidence: 85,
      signals,
      summary: `This wallet appears ${level.toLowerCase()}-risk. Normal activity patterns observed.`,
      keyFindings: ['Account age: 200 days', `Total transactions: ${walletData.transactionCount}`],
      topInteractions: [
        { address: '0x' + 'c'.repeat(40), txCount: 38 },
        { address: '0x' + 'b'.repeat(40), txCount: 37 },
      ],
      recommendations: ['No significant red flags detected.'],
      disclaimer: '⚠️ Not financial advice. Onchain data is public but interpretations are probabilistic — DYOR.',
      analyzedAt: new Date().toISOString(),
      responseTimeMs: 1234,
    };

    // 5. Format for Farcaster cast
    const castText = formatForCast(report);
    const castBytes = new TextEncoder().encode(castText).length;

    expect(castBytes).toBeLessThanOrEqual(1024);
    expect(castText).toContain('Tell-Tale Bot');
    expect(castText).toContain('RISK');
    expect(castText).toContain('DYOR');
    expect(castText).toContain('0x742d...b3a1');
  });

  it('end-to-end: flagged scam address triggers HIGH risk', async () => {
    // Use a known address from our scam seed data
    const scamAddress = '0x0000db5c8b030ae20308ac975898e09741e70000'; // Inferno Drainer

    // Check scam DB
    const flags = await checkAddress(scamAddress);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags[0]!.category).toBe('drainer');

    // Build wallet data with the scam flag
    const walletData: WalletData = {
      address: scamAddress,
      balance: 0n,
      transactionCount: 5,
      transactions: [],
      tokenTransfers: [],
      internalTransactions: [],
      accountAge: 3 * 86400, // 3 days
      firstTxTimestamp: Math.floor(Date.now() / 1000) - 3 * 86400,
      isContract: true,
      scamFlags: flags,
    };

    const { score, level } = computeRiskScore(walletData);
    expect(level).toBe('HIGH');
    expect(score).toBeGreaterThan(60);
  });

  it('caching works end-to-end', () => {
    const cache = new TtlCache<WalletReport>(5000);
    
    const report = {
      address: '0xtest',
      chain: 'Base' as const,
      riskLevel: 'LOW' as const,
      riskScore: 10,
      confidence: 90,
      signals: [],
      summary: 'Test',
      keyFindings: [],
      topInteractions: [],
      recommendations: [],
      disclaimer: 'Test disclaimer',
      analyzedAt: new Date().toISOString(),
      responseTimeMs: 100,
    };

    // Miss
    expect(cache.get('0xtest')).toBeUndefined();

    // Set and hit
    cache.set('0xtest', report);
    expect(cache.get('0xtest')).toEqual(report);
  });

  it('rate limiting works end-to-end', () => {
    const limiter = new UserRateLimiter(3, 60000);
    
    // User 1: 3 queries allowed, 4th blocked
    expect(limiter.checkAndRecord(1001)).toBe(true);
    expect(limiter.checkAndRecord(1001)).toBe(true);
    expect(limiter.checkAndRecord(1001)).toBe(true);
    expect(limiter.checkAndRecord(1001)).toBe(false);

    // User 2: independent limit
    expect(limiter.checkAndRecord(1002)).toBe(true);
  });

  it('scam DB is properly seeded with real data', () => {
    expect(getLocalDbSize()).toBe(scamSeedData.length);
  });
});
