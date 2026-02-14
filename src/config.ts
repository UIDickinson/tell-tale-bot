// ============================================================
// Tell-Tale Bot — Configuration
// ============================================================

import dotenv from 'dotenv';
import { RpcProviderConfig } from './types/index.js';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  // Server
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  // Neynar / Farcaster
  neynarApiKey: requireEnv('NEYNAR_API_KEY'),
  neynarSignerUuid: requireEnv('NEYNAR_SIGNER_UUID'),
  botFid: parseInt(requireEnv('BOT_FID'), 10),
  webhookSecret: optionalEnv('WEBHOOK_SECRET', ''),

  // OpenAI
  openaiApiKey: requireEnv('OPENAI_API_KEY'),

  // Basescan
  basescanApiKey: requireEnv('BASESCAN_API_KEY'),
  basescanBaseUrl: 'https://api.basescan.org/api',
  basescanRateLimit: 5, // calls per second

  // Base RPC fallback chain (ordered by priority)
  rpcProviders: [
    {
      name: 'Base Public',
      url: optionalEnv('BASE_RPC_URL', 'https://mainnet.base.org'),
      priority: 1,
    },
    process.env.ALCHEMY_API_KEY
      ? {
          name: 'Alchemy',
          url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
          priority: 2,
        }
      : null,
    {
      name: 'Ankr',
      url: 'https://rpc.ankr.com/base',
      priority: 3,
    },
    {
      name: '1RPC',
      url: 'https://1rpc.io/base',
      priority: 4,
    },
  ].filter(Boolean) as RpcProviderConfig[],

  // Analysis
  maxTransactionsToFetch: 100,
  cacheTtlSeconds: 300, // 5 minutes
  maxReportLength: 1024, // Farcaster cast byte limit

  // Disclaimer appended to every report
  disclaimer:
    '⚠️ Not financial advice. Onchain data is public but interpretations are probabilistic — DYOR.',
} as const;
