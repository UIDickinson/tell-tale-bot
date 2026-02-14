// ============================================================
// Tell-Tale Bot — Scam Address Seed Data
// ============================================================
// Sourced from:
//   - Forta labeled datasets (github.com/forta-network/labelled-datasets)
//   - CryptoScamDB (cryptoscamdb.org, archived)
//   - Community-reported phishing/drainer contracts on Base
//
// Format: { address, category, description }
// This file should be periodically updated with fresh data.
// ============================================================

export interface ScamSeedEntry {
  address: string;
  category: string;
  description: string;
}

/**
 * Known scam/phishing/drainer addresses on Base and Ethereum.
 * These are verified, publicly-reported malicious addresses.
 *
 * Categories:
 *   - phishing: Social engineering, fake sites, approval scams
 *   - drainer: Wallet drainer contracts
 *   - rugpull: Rug pull deployer addresses
 *   - exploiter: Known exploit/hack addresses
 *   - mixer: Tornado Cash / mixing service addresses
 *   - scam: General scam/fraud
 */
export const scamSeedData: ScamSeedEntry[] = [
  // ── Special Addresses ──────────────────────────────────────
  {
    address: '0x0000000000000000000000000000000000000000',
    category: 'burn',
    description: 'Null/burn address — tokens sent here are lost forever.',
  },

  // ── Tornado Cash (Mixing) — Ethereum mainnet contracts ────
  // These are cross-chain references: the contracts live on Ethereum
  // but funds bridged from them to Base indicate mixing/laundering.
  {
    address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
    category: 'mixer',
    description: 'Tornado Cash Router (Ethereum) — funds from this address may indicate laundering.',
  },
  {
    address: '0x722122df12d4e14e13ac3b6895a86e84145b6967',
    category: 'mixer',
    description: 'Tornado Cash Proxy (Ethereum) — associated with mixing/obfuscation.',
  },
  {
    address: '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc',
    category: 'mixer',
    description: 'Tornado Cash 0.1 ETH pool (Ethereum).',
  },
  {
    address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
    category: 'mixer',
    description: 'Tornado Cash 1 ETH pool (Ethereum).',
  },
  {
    address: '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
    category: 'mixer',
    description: 'Tornado Cash 10 ETH pool (Ethereum).',
  },
  {
    address: '0xa160cdab225685da1d56aa342ad8841c3b53f291',
    category: 'mixer',
    description: 'Tornado Cash 100 ETH pool (Ethereum).',
  },

  // ── Base-Specific Scam Reports ─────────────────────────────
  {
    address: '0xfbFEE3CD66697758164bFD36e3cA0Ea73480E9a2',
    category: 'scam',
    description: 'Suspected scam contract on Base — community-reported.',
  },

  // ────────────────────────────────────────────────────────────
  // REMOVED (verified false positives / placeholders):
  // - 0x3fc91a...7fad: Was labeled "Pink Drainer" but is actually
  //   Uniswap UniversalRouter (verified contract on Base).
  // - 0xb0b86991...eb48: USDC placeholder — description said "REMOVE
  //   in production."
  // - 0xdeaddead...0001: Rugpull placeholder address.
  // - 0x0000db5c...70000: Inferno Drainer — not a contract on Base,
  //   unverifiable.
  // - 0x412f10aa...0313f: Angel Drainer — not a contract on Base,
  //   unverifiable.
  // - 0xef3d9a1a...9a1b3: Phishing 1 — not a contract on Base,
  //   unverifiable.
  // - 0x59abf383...fd32b: Phishing 2 — not a contract on Base,
  //   unverifiable.
  // ────────────────────────────────────────────────────────────
];

/**
 * Load additional addresses from a JSON file at runtime.
 * Use this to load community-reported addresses or Forta datasets.
 */
export function loadAdditionalSeeds(jsonPath: string): ScamSeedEntry[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require(jsonPath);
    if (Array.isArray(data)) {
      return data.map((entry: any) => ({
        address: String(entry.address || '').toLowerCase(),
        category: String(entry.category || 'scam'),
        description: String(entry.description || 'Community-reported address'),
      }));
    }
    return [];
  } catch (error) {
    console.warn(`[ScamDB] Could not load additional seeds from ${jsonPath}:`, error);
    return [];
  }
}
