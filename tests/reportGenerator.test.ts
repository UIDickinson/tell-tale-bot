// ============================================================
// Tests — Report Generator
// ============================================================

import { formatForCast } from '../src/services/reportGenerator';
import { WalletReport, RiskLevel } from '../src/types';

function makeReport(overrides: Partial<WalletReport> = {}): WalletReport {
  return {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1',
    chain: 'Base',
    riskLevel: 'LOW' as RiskLevel,
    riskScore: 15,
    confidence: 85,
    signals: [
      { name: 'Account Age', weight: 0.1, score: 10, description: 'Well-established account.' },
      { name: 'Transaction Volume', weight: 0.15, score: 10, description: 'Normal volume.' },
      { name: 'Scam Database', weight: 0.25, score: 0, description: 'No matches.' },
      { name: 'Large Transfers', weight: 0.15, score: 5, description: 'No large transfers.' },
      { name: 'Contract Approvals', weight: 0.15, score: 5, description: 'Normal approvals.' },
      { name: 'Funding Source', weight: 0.1, score: 10, description: 'Clean funding.' },
      { name: 'Token Diversity', weight: 0.1, score: 10, description: 'Normal tokens.' },
    ],
    summary: 'This wallet appears low-risk with normal DeFi activity patterns.',
    keyFindings: [
      'Account age: 245 days',
      'Total transactions: 347',
      'No flagged addresses',
    ],
    topInteractions: [
      { address: '0x' + 'a'.repeat(40), label: 'Uniswap V3', txCount: 89 },
      { address: '0x' + 'b'.repeat(40), txCount: 34 },
    ],
    recommendations: ['No significant red flags detected.'],
    disclaimer: '⚠️ Not financial advice. Onchain data is public but interpretations are probabilistic — DYOR.',
    analyzedAt: new Date().toISOString(),
    responseTimeMs: 2500,
    ...overrides,
  };
}

describe('formatForCast', () => {
  it('produces output within 1024 byte limit', () => {
    const report = makeReport();
    const cast = formatForCast(report);
    const bytes = new TextEncoder().encode(cast).length;
    expect(bytes).toBeLessThanOrEqual(1024);
  });

  it('includes the risk emoji and level', () => {
    const lowCast = formatForCast(makeReport({ riskLevel: 'LOW', riskScore: 10 }));
    expect(lowCast).toContain('🟢');
    expect(lowCast).toContain('LOW RISK');

    const medCast = formatForCast(makeReport({ riskLevel: 'MEDIUM', riskScore: 45 }));
    expect(medCast).toContain('🟡');
    expect(medCast).toContain('MEDIUM RISK');

    const highCast = formatForCast(makeReport({ riskLevel: 'HIGH', riskScore: 85 }));
    expect(highCast).toContain('🔴');
    expect(highCast).toContain('HIGH RISK');
  });

  it('includes shortened address', () => {
    const cast = formatForCast(makeReport());
    expect(cast).toContain('0x742d...b3a1');
  });

  it('includes the disclaimer', () => {
    const cast = formatForCast(makeReport());
    expect(cast).toContain('Not financial advice');
    expect(cast).toContain('DYOR');
  });

  it('includes summary text', () => {
    const cast = formatForCast(makeReport({ summary: 'Test summary here.' }));
    expect(cast).toContain('Test summary here.');
  });

  it('includes key findings', () => {
    const cast = formatForCast(makeReport({
      keyFindings: ['Finding 1', 'Finding 2'],
    }));
    expect(cast).toContain('• Finding 1');
    expect(cast).toContain('• Finding 2');
  });

  it('limits key findings to 3', () => {
    const cast = formatForCast(makeReport({
      keyFindings: ['A', 'B', 'C', 'D', 'E'],
    }));
    expect(cast).toContain('• A');
    expect(cast).toContain('• C');
    expect(cast).not.toContain('• D');
  });

  it('includes top interactions', () => {
    const cast = formatForCast(makeReport());
    expect(cast).toContain('Uniswap V3');
    expect(cast).toContain('89 txs');
  });

  it('handles report with no interactions', () => {
    const cast = formatForCast(makeReport({ topInteractions: [] }));
    expect(cast).toContain('Tell-Tale Bot');
    expect(cast).toContain('RISK');
  });

  it('handles report with no findings', () => {
    const cast = formatForCast(makeReport({ keyFindings: [] }));
    expect(cast).toContain('Tell-Tale Bot');
  });

  it('truncates very long summaries', () => {
    const longSummary = 'X'.repeat(500);
    const cast = formatForCast(makeReport({ summary: longSummary }));
    const bytes = new TextEncoder().encode(cast).length;
    expect(bytes).toBeLessThanOrEqual(1024);
  });

  it('handles all risk levels consistently', () => {
    const levels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
    for (const level of levels) {
      const cast = formatForCast(makeReport({ riskLevel: level }));
      expect(cast).toContain('Tell-Tale Bot');
      expect(cast).toContain('Base');
      expect(cast).toContain(level);
    }
  });
});
