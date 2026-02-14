// ============================================================
// Tell-Tale Bot — Core Type Definitions
// ============================================================

/** Risk level verdicts */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Risk level emoji mapping */
export const RISK_EMOJI: Record<RiskLevel, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🔴',
};

/** Individual risk signal from analysis */
export interface RiskSignal {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
  evidence?: string[];
}

/** Full wallet analysis result */
export interface WalletReport {
  address: string;
  chain: 'Base';
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  confidence: number; // 0-100
  signals: RiskSignal[];
  summary: string;
  keyFindings: string[];
  topInteractions: TopInteraction[];
  recommendations: string[];
  disclaimer: string;
  analyzedAt: string;
  responseTimeMs: number;
}

/** Top wallet interactions */
export interface TopInteraction {
  address: string;
  label?: string; // e.g., "Uniswap V3 Router"
  txCount: number;
}

/** Raw transaction data from Basescan */
export interface BasescanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  isError: string;
  functionName: string;
  contractAddress: string;
  input: string;
}

/** Token transfer from Basescan */
export interface BasescanTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

/** Wallet data aggregated from all sources */
export interface WalletData {
  address: string;
  balance: bigint;
  transactionCount: number;
  transactions: BasescanTransaction[];
  tokenTransfers: BasescanTokenTransfer[];
  internalTransactions: BasescanTransaction[];
  accountAge: number | null; // seconds since first tx
  firstTxTimestamp: number | null;
  isContract: boolean;
  scamFlags: ScamFlag[];
}

/** Flag from scam database matching */
export interface ScamFlag {
  source: string; // e.g., "ChainAbuse", "Forta", "local"
  category: string; // e.g., "phishing", "drainer", "rugpull"
  description: string;
  reportedAt?: string;
}

/** Neynar webhook cast event (simplified) */
export interface NeynarCastEvent {
  type: string;
  data: {
    hash: string;
    author: {
      fid: number;
      username: string;
      display_name: string;
    };
    text: string;
    parent_hash?: string;
    mentioned_profiles: Array<{
      fid: number;
      username: string;
    }>;
  };
}

/** Config for RPC provider fallback */
export interface RpcProviderConfig {
  name: string;
  url: string;
  priority: number; // lower = try first
}
