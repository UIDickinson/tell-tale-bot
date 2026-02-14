// ============================================================
// Tell-Tale Bot — RPC Provider Fallback Service
// ============================================================

import { createPublicClient, http, type HttpTransport, type Chain } from 'viem';
import { base } from 'viem/chains';
import { config } from '../config.js';

// Exact type for a Base public client
type BasePublicClient = ReturnType<typeof createBaseClient>;
function createBaseClient(url: string) {
  return createPublicClient({
    chain: base,
    transport: http(url, { timeout: 10000 }),
  });
}

let activeClient: BasePublicClient | null = null;
let activeProviderIndex = 0;

/**
 * Get a viem PublicClient with automatic fallback across providers.
 * If the current provider fails, rotates to the next one.
 */
export function getClient(): BasePublicClient {
  if (activeClient) return activeClient;

  const provider = config.rpcProviders[activeProviderIndex];
  if (!provider) {
    throw new Error('No RPC providers available');
  }

  activeClient = createBaseClient(provider.url);

  console.log(`[RPC] Using provider: ${provider.name}`);
  return activeClient;
}

/**
 * Rotate to next RPC provider (called on failure).
 */
export function rotateProvider(): void {
  activeProviderIndex = (activeProviderIndex + 1) % config.rpcProviders.length;
  activeClient = null;
  const next = config.rpcProviders[activeProviderIndex];
  console.log(`[RPC] Rotating to: ${next?.name ?? 'unknown'}`);
}

/**
 * Execute a viem call with automatic provider rotation on failure.
 */
export async function withFallback<T>(
  fn: (client: BasePublicClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = config.rpcProviders.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const client = getClient();
      return await fn(client);
    } catch (error) {
      const providerName = config.rpcProviders[activeProviderIndex]?.name ?? 'unknown';
      console.warn(
        `[RPC] Provider ${providerName} failed:`,
        error instanceof Error ? error.message : error,
      );
      rotateProvider();
    }
  }

  throw new Error('All RPC providers failed');
}

/**
 * Get ETH balance via RPC fallback (alternative to Basescan).
 */
export async function getBalanceViaRpc(address: `0x${string}`): Promise<bigint> {
  return withFallback((client) => client.getBalance({ address }));
}

/**
 * Get transaction count via RPC fallback.
 */
export async function getTxCountViaRpc(address: `0x${string}`): Promise<number> {
  return withFallback((client) => client.getTransactionCount({ address }));
}

/**
 * Check if address is a contract via RPC fallback.
 */
export async function isContractViaRpc(address: `0x${string}`): Promise<boolean> {
  const code = await withFallback((client) =>
    client.getCode({ address }),
  );
  return code !== undefined && code !== '0x';
}
