// ============================================================
// Tell-Tale Bot — Address Parsing Utilities
// ============================================================

import { isAddress, getAddress } from 'viem';

/**
 * Extract the first valid Ethereum address from a text string.
 * Handles checksummed, lowercase, and mixed-case addresses.
 */
export function extractAddress(text: string): string | null {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  if (!match) return null;

  const raw = match[0];
  if (!isAddress(raw, { strict: false })) return null;

  try {
    return getAddress(raw); // checksummed
  } catch {
    return null;
  }
}

/**
 * Check if a string contains a valid Ethereum address.
 */
export function containsAddress(text: string): boolean {
  return extractAddress(text) !== null;
}

/**
 * Shorten an address for display: 0xabcd...ef12
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
