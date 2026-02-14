// ============================================================
// Tell-Tale Bot — Basescan API Service
// ============================================================

import axios from 'axios';
import { config } from '../config.js';
import { BasescanTransaction, BasescanTokenTransfer } from '../types/index.js';
import { RateLimiter } from '../utils/rateLimit.js';

const rateLimiter = new RateLimiter(config.basescanRateLimit, 1000);

interface BasescanApiResponse<T> {
  status: string;
  message: string;
  result: T;
}

async function basescanGet<T>(params: Record<string, string>): Promise<T> {
  await rateLimiter.waitForSlot();

  // Build query params — only include apikey if configured
  const queryParams: Record<string, string> = { ...params };
  if (config.basescanApiKey) {
    queryParams.apikey = config.basescanApiKey;
  }

  const response = await axios.get<BasescanApiResponse<T>>(config.basescanBaseUrl, {
    params: queryParams,
    timeout: 10000,
  });

  if (response.data.status !== '1' && response.data.message !== 'No transactions found') {
    throw new Error(`Basescan API error: ${response.data.message} (${JSON.stringify(params)})`);
  }

  return response.data.result;
}

/**
 * Fetch normal transactions for an address.
 */
export async function getTransactions(
  address: string,
  limit = config.maxTransactionsToFetch,
): Promise<BasescanTransaction[]> {
  try {
    const result = await basescanGet<BasescanTransaction[] | string>({
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(limit),
      sort: 'desc',
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Basescan] Failed to fetch transactions for ${address}:`, error);
    return [];
  }
}

/**
 * Fetch internal transactions for an address.
 */
export async function getInternalTransactions(
  address: string,
  limit = 50,
): Promise<BasescanTransaction[]> {
  try {
    const result = await basescanGet<BasescanTransaction[] | string>({
      module: 'account',
      action: 'txlistinternal',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(limit),
      sort: 'desc',
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Basescan] Failed to fetch internal txs for ${address}:`, error);
    return [];
  }
}

/**
 * Fetch ERC-20 token transfers for an address.
 */
export async function getTokenTransfers(
  address: string,
  limit = 50,
): Promise<BasescanTokenTransfer[]> {
  try {
    const result = await basescanGet<BasescanTokenTransfer[] | string>({
      module: 'account',
      action: 'tokentx',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(limit),
      sort: 'desc',
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Basescan] Failed to fetch token transfers for ${address}:`, error);
    return [];
  }
}

/**
 * Get ETH balance for an address.
 */
export async function getBalance(address: string): Promise<bigint> {
  try {
    const result = await basescanGet<string>({
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    });
    return BigInt(result);
  } catch (error) {
    console.error(`[Basescan] Failed to fetch balance for ${address}:`, error);
    return 0n;
  }
}

/**
 * Check if address is a contract.
 */
export async function isContract(address: string): Promise<boolean> {
  try {
    const result = await basescanGet<string>({
      module: 'proxy',
      action: 'eth_getCode',
      address,
      tag: 'latest',
    });
    return result !== '0x';
  } catch (error) {
    console.error(`[Basescan] Failed to check contract status for ${address}:`, error);
    return false;
  }
}

/**
 * Fetch the very first transaction for an address (sort=asc, limit=1).
 * Used to accurately determine account age regardless of total tx count.
 */
export async function getFirstTransaction(
  address: string,
): Promise<BasescanTransaction | null> {
  try {
    const result = await basescanGet<BasescanTransaction[] | string>({
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '1',
      sort: 'asc',
    });
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`[Basescan] Failed to fetch first transaction for ${address}:`, error);
    return null;
  }
}
