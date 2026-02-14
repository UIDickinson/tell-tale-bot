// ============================================================
// Tell-Tale Bot — Risk Scoring Engine
// ============================================================
// Rule-based heuristic scoring based on PRD signal weights:
//   Account age: 10%
//   Transaction volume/frequency: 15%
//   Known scam interactions: 25%
//   Large sudden transfers: 15%
//   Contract approvals: 15%
//   Funding source: 10%
//   Token diversity: 10%
// ============================================================

import { WalletData, RiskSignal, RiskLevel } from '../types/index.js';
import { formatEther } from 'viem';

/**
 * Compute a risk score (0-100) for a wallet based on heuristic signals.
 */
export function computeRiskScore(data: WalletData): {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
} {
  const signals: RiskSignal[] = [];

  // 1. Account Age (10%) — Newer accounts = higher risk
  const ageSignal = scoreAccountAge(data);
  signals.push(ageSignal);

  // 2. Transaction Volume/Frequency (15%)
  const volumeSignal = scoreTransactionVolume(data);
  signals.push(volumeSignal);

  // 3. Known Scam Interactions (25%) — heaviest weight
  const scamSignal = scoreScamInteractions(data);
  signals.push(scamSignal);

  // 4. Large Sudden Transfers (15%)
  const transferSignal = scoreLargeTransfers(data);
  signals.push(transferSignal);

  // 5. Contract Approvals (15%)
  const approvalSignal = scoreContractApprovals(data);
  signals.push(approvalSignal);

  // 6. Funding Source (10%)
  const fundingSignal = scoreFundingSource(data);
  signals.push(fundingSignal);

  // 7. Token Diversity (10%)
  const tokenSignal = scoreTokenDiversity(data);
  signals.push(tokenSignal);

  // Weighted total
  // Boost when multiple independent scam reports exist — a single max-weight
  // signal (0.25 × 100 = 25) can't alone push past the HIGH threshold,
  // but 2+ corroborating flags from different sources are a strong indicator.
  const scamBoost =
    data.scamFlags.length >= 3 ? 20 : data.scamFlags.length >= 2 ? 15 : data.scamFlags.length >= 1 ? 10 : 0;

  const score = Math.round(
    signals.reduce((sum, s) => sum + s.score * s.weight, 0) + scamBoost,
  );
  const clampedScore = Math.max(0, Math.min(100, score));

  const level: RiskLevel =
    clampedScore <= 30 ? 'LOW' : clampedScore <= 60 ? 'MEDIUM' : 'HIGH';

  return { score: clampedScore, level, signals };
}

function scoreAccountAge(data: WalletData): RiskSignal {
  const weight = 0.1;
  let score = 0;
  let description = '';
  const evidence: string[] = [];

  if (data.accountAge === null) {
    score = 70;
    description = 'No transaction history found — unable to determine account age.';
    evidence.push('No transactions on record');
  } else {
    const days = data.accountAge / 86400;
    if (days < 7) {
      score = 90;
      description = `Account is very new (${Math.round(days)} days old).`;
    } else if (days < 30) {
      score = 60;
      description = `Account is relatively new (${Math.round(days)} days old).`;
    } else if (days < 180) {
      score = 30;
      description = `Account is ${Math.round(days)} days old.`;
    } else {
      score = 10;
      description = `Account is ${Math.round(days / 30)} months old — well-established.`;
    }
    evidence.push(`First transaction: ${data.firstTxTimestamp ? new Date(data.firstTxTimestamp * 1000).toISOString().split('T')[0] : 'unknown'}`);
  }

  return { name: 'Account Age', weight, score, description, evidence };
}

function scoreTransactionVolume(data: WalletData): RiskSignal {
  const weight = 0.15;
  let score = 0;
  let description = '';

  const txCount = data.transactionCount;

  if (txCount === 0) {
    score = 50;
    description = 'No transactions found.';
  } else if (txCount < 5) {
    score = 60;
    description = `Very low transaction count (${txCount}).`;
  } else if (txCount < 20) {
    score = 30;
    description = `Low transaction count (${txCount}).`;
  } else if (txCount > 500) {
    // Could be a bot or mixer
    score = 40;
    description = `Unusually high transaction count (${txCount}) — could indicate automated activity.`;
  } else {
    score = 10;
    description = `Normal transaction volume (${txCount} transactions).`;
  }

  return {
    name: 'Transaction Volume',
    weight,
    score,
    description,
    evidence: [`Total transactions analyzed: ${txCount}`],
  };
}

function scoreScamInteractions(data: WalletData): RiskSignal {
  const weight = 0.25;
  const flagCount = data.scamFlags.length;

  if (flagCount === 0) {
    return {
      name: 'Scam Database',
      weight,
      score: 0,
      description: 'No matches in known scam databases.',
    };
  }

  const score = Math.min(100, flagCount * 40);
  const evidence = data.scamFlags.map(
    (f) => `[${f.source}] ${f.category}: ${f.description}`,
  );

  return {
    name: 'Scam Database',
    weight,
    score,
    description: `Found ${flagCount} flag(s) in scam databases.`,
    evidence,
  };
}

function scoreLargeTransfers(data: WalletData): RiskSignal {
  const weight = 0.15;
  const txs = data.transactions;

  if (txs.length === 0) {
    return {
      name: 'Large Transfers',
      weight,
      score: 20,
      description: 'No transactions to analyze for large transfers.',
    };
  }

  // Find outgoing transactions with large values (> 1 ETH equivalent)
  const outgoing = txs.filter(
    (tx) => tx.from.toLowerCase() === data.address.toLowerCase(),
  );
  const largeOutgoing = outgoing.filter((tx) => {
    const valueEth = parseFloat(formatEther(BigInt(tx.value)));
    return valueEth > 1;
  });

  // Check for sudden large outflows (multiple large txs in short time)
  const largeTimestamps = largeOutgoing
    .map((tx) => parseInt(tx.timeStamp))
    .sort((a, b) => a - b);

  let hasCluster = false;
  for (let i = 1; i < largeTimestamps.length; i++) {
    const current = largeTimestamps[i]!;
    const previous = largeTimestamps[i - 1]!;
    if (current - previous < 3600) {
      // Multiple large txs within 1 hour
      hasCluster = true;
      break;
    }
  }

  let score: number;
  let description: string;

  if (hasCluster) {
    score = 80;
    description = `Detected cluster of ${largeOutgoing.length} large outgoing transfers in short succession.`;
  } else if (largeOutgoing.length > 5) {
    score = 50;
    description = `${largeOutgoing.length} large outgoing transfers detected.`;
  } else if (largeOutgoing.length > 0) {
    score = 20;
    description = `${largeOutgoing.length} large outgoing transfer(s) — within normal range.`;
  } else {
    score = 5;
    description = 'No large outgoing transfers detected.';
  }

  return {
    name: 'Large Transfers',
    weight,
    score,
    description,
    evidence: largeOutgoing.slice(0, 3).map(
      (tx) => `${formatEther(BigInt(tx.value))} ETH → ${tx.to.slice(0, 10)}... (tx: ${tx.hash.slice(0, 10)}...)`,
    ),
  };
}

function scoreContractApprovals(data: WalletData): RiskSignal {
  const weight = 0.15;

  // Look for approve() calls in transaction data
  const approveTxs = data.transactions.filter(
    (tx) =>
      tx.functionName?.toLowerCase().includes('approve') ||
      tx.input?.startsWith('0x095ea7b3'), // approve(address,uint256) selector
  );

  // Unlimited approvals (max uint256)
  const unlimitedApprovals = data.transactions.filter(
    (tx) =>
      tx.input?.startsWith('0x095ea7b3') &&
      tx.input?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
  );

  let score: number;
  let description: string;

  if (unlimitedApprovals.length > 5) {
    score = 70;
    description = `${unlimitedApprovals.length} unlimited token approvals — elevated risk of drainer interaction.`;
  } else if (approveTxs.length > 10) {
    score = 50;
    description = `${approveTxs.length} contract approval transactions detected.`;
  } else if (approveTxs.length > 0) {
    score = 15;
    description = `${approveTxs.length} contract approval(s) — normal DeFi usage.`;
  } else {
    score = 5;
    description = 'No contract approvals detected.';
  }

  return { name: 'Contract Approvals', weight, score, description };
}

function scoreFundingSource(data: WalletData): RiskSignal {
  const weight = 0.1;

  // Check first few incoming transactions for funding source
  const incoming = data.transactions.filter(
    (tx) => tx.to.toLowerCase() === data.address.toLowerCase(),
  );

  if (incoming.length === 0) {
    return {
      name: 'Funding Source',
      weight,
      score: 40,
      description: 'No incoming transactions found — unable to analyze funding source.',
    };
  }

  // Check if funded from flagged sources
  const flaggedFunders = incoming.filter((tx) =>
    data.scamFlags.some(
      (f) =>
        f.description.toLowerCase().includes(tx.from.toLowerCase()),
    ),
  );

  if (flaggedFunders.length > 0) {
    return {
      name: 'Funding Source',
      weight,
      score: 90,
      description: `Received funds from ${flaggedFunders.length} flagged address(es).`,
      evidence: flaggedFunders.map((tx) => `From: ${tx.from.slice(0, 10)}... — ${formatEther(BigInt(tx.value))} ETH`),
    };
  }

  return {
    name: 'Funding Source',
    weight,
    score: 10,
    description: 'Funding sources appear normal — no known flagged origins.',
  };
}

function scoreTokenDiversity(data: WalletData): RiskSignal {
  const weight = 0.1;

  const uniqueTokens = new Set(
    data.tokenTransfers.map((t) => t.contractAddress.toLowerCase()),
  );
  const tokenCount = uniqueTokens.size;

  let score: number;
  let description: string;

  if (tokenCount > 50) {
    score = 60;
    description = `Interacted with ${tokenCount} unique tokens — may include scam/airdrop tokens.`;
  } else if (tokenCount > 20) {
    score = 30;
    description = `Interacted with ${tokenCount} unique tokens.`;
  } else if (tokenCount > 0) {
    score = 10;
    description = `Interacted with ${tokenCount} unique token(s) — normal range.`;
  } else {
    score = 15;
    description = 'No token transfer activity detected.';
  }

  return { name: 'Token Diversity', weight, score, description };
}
