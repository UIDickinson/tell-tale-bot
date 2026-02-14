// ============================================================
// Tell-Tale Bot — Known Contract Registry (Base)
// ============================================================
// Verified, trusted contracts on Base that should:
//   1. Never trigger scam-DB false positives
//   2. Provide human-readable labels in reports
//
// Sources:
//   - Official protocol deployments
//   - base.blockscout.com verified contracts
//   - Uniswap/Aave/Compound governance docs
//
// This file should be periodically updated as new protocols
// deploy on Base.
// ============================================================

export interface KnownContract {
  address: string;   // lowercase
  label: string;     // human-readable name
  category: string;  // 'dex' | 'lending' | 'bridge' | 'token' | 'nft' | 'infra'
}

/**
 * Verified contracts on Base that are known-good.
 * Used for:
 *  - Whitelist filtering in scam DB batch checks
 *  - Labeling top interactions in reports
 */
export const knownContracts: KnownContract[] = [
  // ── DEX / Swap Routers ─────────────────────────────────────
  {
    address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    label: 'Uniswap UniversalRouter',
    category: 'dex',
  },
  {
    address: '0x2626664c2603336e57b271c5c0b26f421741e481',
    label: 'Uniswap V3 SwapRouter02',
    category: 'dex',
  },
  {
    address: '0x198ef79f1f515f02dfe9e3115ed9fc07183f02fc',
    label: 'Uniswap V2 Router',
    category: 'dex',
  },
  {
    address: '0x6cdda07560f6c01c3f9ee090e98368b06c1405cb',
    label: 'Aerodrome Router',
    category: 'dex',
  },
  {
    address: '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43',
    label: 'Aerodrome V2 Router',
    category: 'dex',
  },

  // ── Stablecoins ────────────────────────────────────────────
  {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    label: 'USDC (Base)',
    category: 'token',
  },
  {
    address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
    label: 'DAI (Base)',
    category: 'token',
  },
  {
    address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
    label: 'USDbC (Base)',
    category: 'token',
  },

  // ── Wrapped Native ─────────────────────────────────────────
  {
    address: '0x4200000000000000000000000000000000000006',
    label: 'WETH (Base)',
    category: 'token',
  },

  // ── Bridge ─────────────────────────────────────────────────
  {
    address: '0x4200000000000000000000000000000000000010',
    label: 'Base L2StandardBridge',
    category: 'bridge',
  },
  {
    address: '0x4200000000000000000000000000000000000007',
    label: 'Base L2CrossDomainMessenger',
    category: 'bridge',
  },
  {
    address: '0x49048044d57e1c92a77f79988d21fa8faf74e97e',
    label: 'Base Portal (L1)',
    category: 'bridge',
  },

  // ── Lending / DeFi Protocols ───────────────────────────────
  {
    address: '0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
    label: 'Aave V3 Pool (Base)',
    category: 'lending',
  },
  {
    address: '0x46e6b214b524310239732d51387075e0e70970bf',
    label: 'Moonwell USDC Market',
    category: 'lending',
  },

  // ── Infrastructure ─────────────────────────────────────────
  {
    address: '0x4200000000000000000000000000000000000015',
    label: 'Base L1Block',
    category: 'infra',
  },
  {
    address: '0x420000000000000000000000000000000000000f',
    label: 'Base GasPriceOracle',
    category: 'infra',
  },
];

// ── Lookup Maps (built once at import time) ──────────────────

/** Set of lowercase whitelisted addresses for O(1) lookups */
export const whitelistedAddresses: Set<string> = new Set(
  knownContracts.map((c) => c.address.toLowerCase()),
);

/** Map of lowercase address → label for O(1) label lookups */
export const contractLabels: Map<string, string> = new Map(
  knownContracts.map((c) => [c.address.toLowerCase(), c.label]),
);

/**
 * Check if an address is a known-good contract.
 */
export function isWhitelisted(address: string): boolean {
  return whitelistedAddresses.has(address.toLowerCase());
}

/**
 * Get the label for a known contract, or undefined.
 */
export function getContractLabel(address: string): string | undefined {
  return contractLabels.get(address.toLowerCase());
}
