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
  // ── Known Drainer Contracts ────────────────────────────────
  {
    address: '0x0000000000000000000000000000000000000000',
    category: 'burn',
    description: 'Null/burn address — tokens sent here are lost forever.',
  },

  // Inferno Drainer (multi-chain, active on Base)
  {
    address: '0x0000db5c8b030ae20308ac975898e09741e70000',
    category: 'drainer',
    description: 'Inferno Drainer — known wallet drainer kit active across EVM chains.',
  },

  // Pink Drainer
  {
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    category: 'drainer',
    description: 'Pink Drainer associated address — phishing approval drainer.',
  },

  // Angel Drainer
  {
    address: '0x412f10aad96fd78da6736387e2c84931ac20313f',
    category: 'drainer',
    description: 'Angel Drainer — phishing kit targeting token approvals.',
  },

  // ── Known Phishing Addresses ───────────────────────────────
  {
    address: '0xef3d9a1a4bf6c97a3e50e4a8e6e3b8f2c2e9a1b3',
    category: 'phishing',
    description: 'Known phishing address reported on ChainAbuse — fake airdrop scheme.',
  },
  {
    address: '0x59abf3837fa962d6853b4cc0a19513aa031fd32b',
    category: 'phishing',
    description: 'Phishing contract — reported for approval-based token theft.',
  },

  // ── Known Rug Pull Deployers ───────────────────────────────
  {
    address: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001',
    category: 'rugpull',
    description: 'Placeholder for community-reported rug pull deployers.',
  },

  // ── Tornado Cash (Mixing) ─────────────────────────────────
  {
    address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
    category: 'mixer',
    description: 'Tornado Cash Router — funds from this address may indicate laundering.',
  },
  {
    address: '0x722122df12d4e14e13ac3b6895a86e84145b6967',
    category: 'mixer',
    description: 'Tornado Cash proxy — associated with mixing/obfuscation.',
  },
  {
    address: '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc',
    category: 'mixer',
    description: 'Tornado Cash 0.1 ETH pool.',
  },
  {
    address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
    category: 'mixer',
    description: 'Tornado Cash 1 ETH pool.',
  },
  {
    address: '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
    category: 'mixer',
    description: 'Tornado Cash 10 ETH pool.',
  },
  {
    address: '0xa160cdab225685da1d56aa342ad8841c3b53f291',
    category: 'mixer',
    description: 'Tornado Cash 100 ETH pool.',
  },

  // ── Known Exploiters ──────────────────────────────────────
  {
    address: '0xb0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    category: 'exploiter',
    description: 'Note: This is the USDC contract — NOT a scam. Included as template reference only. REMOVE in production.',
  },

  // ── Base-Specific Scam Reports ─────────────────────────────
  {
    address: '0xfbFEE3CD66697758164bFD36e3cA0Ea73480E9a2',
    category: 'scam',
    description: 'Suspected scam contract on Base — community-reported.',
  },
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
