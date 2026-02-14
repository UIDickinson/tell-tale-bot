// ============================================================
// Tests — Risk Scoring Engine
// ============================================================

import { computeRiskScore } from '../src/services/riskScorer';
import { WalletData, BasescanTransaction, BasescanTokenTransfer } from '../src/types';

// Helper to create minimal WalletData for testing
function makeWalletData(overrides: Partial<WalletData> = {}): WalletData {
  return {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1',
    balance: 1000000000000000000n, // 1 ETH
    transactionCount: 50,
    transactions: [],
    tokenTransfers: [],
    internalTransactions: [],
    accountAge: 180 * 86400, // 180 days
    firstTxTimestamp: Math.floor(Date.now() / 1000) - 180 * 86400,
    isContract: false,
    scamFlags: [],
    ...overrides,
  };
}

function makeTx(overrides: Partial<BasescanTransaction> = {}): BasescanTransaction {
  return {
    blockNumber: '1000000',
    timeStamp: String(Math.floor(Date.now() / 1000) - 86400),
    hash: '0x' + 'a'.repeat(64),
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1'.toLowerCase(),
    to: '0x' + 'b'.repeat(40),
    value: '100000000000000000', // 0.1 ETH
    gas: '21000',
    gasUsed: '21000',
    isError: '0',
    functionName: '',
    contractAddress: '',
    input: '0x',
    ...overrides,
  };
}

describe('computeRiskScore', () => {
  it('returns LOW risk for a healthy wallet', () => {
    const data = makeWalletData({
      transactionCount: 100,
      accountAge: 365 * 86400, // 1 year
      transactions: Array.from({ length: 100 }, (_, i) => makeTx({
        hash: '0x' + i.toString(16).padStart(64, '0'),
      })),
      tokenTransfers: Array.from({ length: 5 }, () => ({
        blockNumber: '1000000',
        timeStamp: String(Math.floor(Date.now() / 1000)),
        hash: '0x' + 'c'.repeat(64),
        from: '0x' + 'a'.repeat(40),
        to: '0x' + 'b'.repeat(40),
        value: '1000000',
        tokenName: 'USDC',
        tokenSymbol: 'USDC',
        tokenDecimal: '6',
        contractAddress: '0x' + 'd'.repeat(40),
      })),
    });

    const result = computeRiskScore(data);
    expect(result.level).toBe('LOW');
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.signals).toHaveLength(7);
  });

  it('returns HIGH risk for a flagged wallet', () => {
    const data = makeWalletData({
      transactionCount: 2,
      accountAge: 2 * 86400, // 2 days old
      scamFlags: [
        { source: 'local', category: 'drainer', description: 'Known drainer' },
        { source: 'ChainAbuse', category: 'scam', description: 'Reported scam' },
        { source: 'local', category: 'phishing', description: 'Phishing address' },
      ],
    });

    const result = computeRiskScore(data);
    expect(result.level).toBe('HIGH');
    expect(result.score).toBeGreaterThan(60);
  });

  it('returns MEDIUM risk for a suspicious wallet', () => {
    const data = makeWalletData({
      transactionCount: 3,
      accountAge: 15 * 86400, // 15 days
      scamFlags: [
        { source: 'local', category: 'mixer', description: 'Mixer interaction' },
      ],
    });

    const result = computeRiskScore(data);
    expect(result.level).toBe('MEDIUM');
    expect(result.score).toBeGreaterThan(30);
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('always returns exactly 7 signals', () => {
    const result = computeRiskScore(makeWalletData());
    expect(result.signals).toHaveLength(7);
    
    const signalNames = result.signals.map(s => s.name);
    expect(signalNames).toContain('Account Age');
    expect(signalNames).toContain('Transaction Volume');
    expect(signalNames).toContain('Scam Database');
    expect(signalNames).toContain('Large Transfers');
    expect(signalNames).toContain('Contract Approvals');
    expect(signalNames).toContain('Funding Source');
    expect(signalNames).toContain('Token Diversity');
  });

  it('weights sum to 1.0', () => {
    const result = computeRiskScore(makeWalletData());
    const totalWeight = result.signals.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
  });

  it('score is clamped between 0 and 100', () => {
    // Empty wallet
    const low = computeRiskScore(makeWalletData({
      transactionCount: 200,
      accountAge: 730 * 86400,
    }));
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.score).toBeLessThanOrEqual(100);

    // Maximum red flags
    const high = computeRiskScore(makeWalletData({
      transactionCount: 0,
      accountAge: null,
      firstTxTimestamp: null,
      scamFlags: Array.from({ length: 10 }, () => ({
        source: 'local',
        category: 'scam',
        description: 'flag',
      })),
    }));
    expect(high.score).toBeGreaterThanOrEqual(0);
    expect(high.score).toBeLessThanOrEqual(100);
  });

  it('detects large transfer clusters', () => {
    const now = Math.floor(Date.now() / 1000);
    const data = makeWalletData({
      transactionCount: 5,
      transactions: [
        makeTx({ value: '5000000000000000000', timeStamp: String(now - 100) }), // 5 ETH
        makeTx({ value: '3000000000000000000', timeStamp: String(now - 200) }), // 3 ETH, within 1 hour
        makeTx({ value: '2000000000000000000', timeStamp: String(now - 300) }), // 2 ETH
      ],
    });

    const result = computeRiskScore(data);
    const transferSignal = result.signals.find(s => s.name === 'Large Transfers');
    expect(transferSignal).toBeDefined();
    expect(transferSignal!.score).toBeGreaterThanOrEqual(50); // should flag the cluster
  });

  it('detects contract approvals', () => {
    const data = makeWalletData({
      transactions: Array.from({ length: 12 }, (_, i) => makeTx({
        hash: '0x' + i.toString(16).padStart(64, '0'),
        functionName: 'approve',
        input: '0x095ea7b3' + '0'.repeat(128),
      })),
      transactionCount: 12,
    });

    const result = computeRiskScore(data);
    const approvalSignal = result.signals.find(s => s.name === 'Contract Approvals');
    expect(approvalSignal).toBeDefined();
    expect(approvalSignal!.score).toBeGreaterThan(10);
  });

  it('detects unlimited approvals', () => {
    const data = makeWalletData({
      transactions: Array.from({ length: 8 }, (_, i) => makeTx({
        hash: '0x' + i.toString(16).padStart(64, '0'),
        input: '0x095ea7b3' + '0'.repeat(24) + 'f'.repeat(64) + '0'.repeat(40),
      })),
      transactionCount: 8,
    });

    const result = computeRiskScore(data);
    const approvalSignal = result.signals.find(s => s.name === 'Contract Approvals');
    expect(approvalSignal).toBeDefined();
    expect(approvalSignal!.score).toBeGreaterThanOrEqual(70);
  });

  it('handles wallet with no data gracefully', () => {
    const data = makeWalletData({
      transactionCount: 0,
      transactions: [],
      tokenTransfers: [],
      internalTransactions: [],
      accountAge: null,
      firstTxTimestamp: null,
      balance: 0n,
    });

    const result = computeRiskScore(data);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.signals).toHaveLength(7);
    // Should have elevated risk due to lack of data
    expect(result.score).toBeGreaterThan(20);
  });
});
