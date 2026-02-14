// ============================================================
// Tell-Tale Bot — Scam Database Service
// ============================================================
// Checks addresses against known scam databases:
// 1. Local cached list (seeded from Forta labeled datasets)
// 2. ChainAbuse API (real-time community reports)
// ============================================================

import axios from 'axios';
import { ScamFlag } from '../types/index.js';
import { isWhitelisted } from '../data/knownContracts.js';

/**
 * Local scam address set — loaded from seed data at startup.
 * Key: lowercase address, Value: category/description
 */
const localScamDb = new Map<string, { category: string; description: string }>();

/**
 * Seed the local database from a list of known scam addresses.
 * Call this at startup with data from Forta datasets, CryptoScamDB, etc.
 */
export function seedLocalDb(
  entries: Array<{ address: string; category: string; description: string }>,
): void {
  for (const entry of entries) {
    localScamDb.set(entry.address.toLowerCase(), {
      category: entry.category,
      description: entry.description,
    });
  }
  console.log(`[ScamDB] Seeded ${entries.length} addresses into local database`);
}

/**
 * Check an address against all scam databases.
 * Returns an array of flags (empty = no matches).
 */
export async function checkAddress(address: string): Promise<ScamFlag[]> {
  const flags: ScamFlag[] = [];
  const normalizedAddress = address.toLowerCase();

  // 1. Check local database (fast)
  const localMatch = localScamDb.get(normalizedAddress);
  if (localMatch) {
    flags.push({
      source: 'local',
      category: localMatch.category,
      description: localMatch.description,
    });
  }

  // 2. Check ChainAbuse (real-time, best-effort)
  try {
    const chainAbuseFlags = await checkChainAbuse(address);
    flags.push(...chainAbuseFlags);
  } catch (error) {
    console.warn('[ScamDB] ChainAbuse check failed (non-critical):', error);
  }

  return flags;
}

/**
 * Check a list of interacted addresses against local scam DB.
 * Fast batch check — no API calls.
 */
export function batchCheckLocal(addresses: string[]): Map<string, ScamFlag> {
  const results = new Map<string, ScamFlag>();
  for (const addr of addresses) {
    // Skip known-good contracts (Uniswap, USDC, bridges, etc.)
    if (isWhitelisted(addr)) continue;

    const match = localScamDb.get(addr.toLowerCase());
    if (match) {
      results.set(addr, {
        source: 'local',
        category: match.category,
        description: match.description,
      });
    }
  }
  return results;
}

/**
 * Check an address against ChainAbuse API.
 * This is a best-effort check — failures are non-critical.
 */
async function checkChainAbuse(address: string): Promise<ScamFlag[]> {
  try {
    const response = await axios.get(
      `https://www.chainabuse.com/api/v0/reports`,
      {
        params: {
          address,
          chain: 'BASE',
        },
        timeout: 5000,
        // ChainAbuse may require API key in the future
        // headers: { 'Authorization': `Bearer ${config.chainAbuseApiKey}` }
      },
    );

    if (response.data && Array.isArray(response.data.reports)) {
      return response.data.reports.map((report: any) => ({
        source: 'ChainAbuse',
        category: report.category || 'scam',
        description: report.description || 'Reported on ChainAbuse',
        reportedAt: report.createdAt,
      }));
    }
    return [];
  } catch {
    // ChainAbuse API may not be publicly accessible — fail silently
    return [];
  }
}

/**
 * Get the count of locally known scam addresses.
 */
export function getLocalDbSize(): number {
  return localScamDb.size;
}
