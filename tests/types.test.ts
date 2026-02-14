// ============================================================
// Tests — Type Definitions & Constants
// ============================================================

import { RISK_EMOJI, RiskLevel } from '../src/types';

describe('RISK_EMOJI', () => {
  it('has emoji for all risk levels', () => {
    expect(RISK_EMOJI.LOW).toBe('🟢');
    expect(RISK_EMOJI.MEDIUM).toBe('🟡');
    expect(RISK_EMOJI.HIGH).toBe('🔴');
  });

  it('covers all RiskLevel values', () => {
    const levels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
    for (const level of levels) {
      expect(RISK_EMOJI[level]).toBeDefined();
      expect(typeof RISK_EMOJI[level]).toBe('string');
    }
  });
});
