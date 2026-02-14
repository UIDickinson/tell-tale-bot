// ============================================================
// Tell-Tale Bot — Data Fetcher Module
// ============================================================
// Aggregates wallet data from all sources:
// - Basescan API (primary)
// - RPC fallback (when Basescan rate-limited)
// - Scam databases
// ============================================================

import { WalletData } from '../types/index.js';
import * as basescan from './basescan.js';
import * as scamDb from './scamDb.js';
import { getBalanceViaRpc, isContractViaRpc } from './rpcFallback.js';

/**
 * Fetch balance: try Basescan first, fall back to RPC if Basescan returns
 * the zero-default (which it does when the API errors out).
 */
async function fetchBalanceWithFallback(
  address: string,
  hexAddress: `0x${string}`,
): Promise<bigint> {
  const basescanBalance = await basescan.getBalance(address);
  // basescan.getBalance catches errors internally and returns 0n.
  // A real zero balance is indistinguishable, so always try RPC as a
  // cross-check when Basescan returns 0.
  if (basescanBalance === 0n) {
    try {
      return await getBalanceViaRpc(hexAddress);
    } catch {
      return basescanBalance;
    }
  }
  return basescanBalance;
}

/**
 * Fetch contract status: try Basescan first, fall back to RPC.
 * Basescan returns false on error, so also check via RPC when false.
 */
async function fetchIsContractWithFallback(
  address: string,
  hexAddress: `0x${string}`,
): Promise<boolean> {
  const basescanResult = await basescan.isContract(address);
  if (!basescanResult) {
    try {
      return await isContractViaRpc(hexAddress);
    } catch {
      return basescanResult;
    }
  }
  return basescanResult;
}

/**
 * Fetch all available data for a wallet address.
 * Parallelizes independent API calls for speed.
 */
export async function fetchWalletData(address: string): Promise<WalletData> {
  const startTime = Date.now();
  const hexAddress = address as `0x${string}`;

  // Parallelize all independent data fetches
  const [
    transactions,
    internalTransactions,
    tokenTransfers,
    balance,
    contractCheck,
    scamFlags,
    firstTx,
  ] = await Promise.allSettled([
    basescan.getTransactions(address),
    basescan.getInternalTransactions(address),
    basescan.getTokenTransfers(address),
    fetchBalanceWithFallback(address, hexAddress),
    fetchIsContractWithFallback(address, hexAddress),
    scamDb.checkAddress(address),
    basescan.getFirstTransaction(address),
  ]);

  // Extract results with safe defaults
  const txs = transactions.status === 'fulfilled' ? transactions.value : [];
  const internalTxs = internalTransactions.status === 'fulfilled' ? internalTransactions.value : [];
  const tokenTxs = tokenTransfers.status === 'fulfilled' ? tokenTransfers.value : [];
  const bal = balance.status === 'fulfilled' ? balance.value : 0n;
  const isContractAddr = contractCheck.status === 'fulfilled' ? contractCheck.value : false;
  const flags = scamFlags.status === 'fulfilled' ? scamFlags.value : [];
  const firstTransaction = firstTx.status === 'fulfilled' ? firstTx.value : null;

  // Check interacted addresses against local scam DB
  const interactedAddresses = [
    ...new Set([
      ...txs.map((tx) => tx.to),
      ...txs.map((tx) => tx.from),
      ...tokenTxs.map((tx) => tx.to),
      ...tokenTxs.map((tx) => tx.from),
    ].filter(Boolean)),
  ];
  const interactionFlags = scamDb.batchCheckLocal(interactedAddresses);

  // Add flags for interacted scam addresses
  for (const [addr, flag] of interactionFlags) {
    flags.push({
      ...flag,
      description: `Interacted with flagged address ${addr}: ${flag.description}`,
    });
  }

  // Determine account age from the dedicated first-transaction query.
  // This is accurate even when the address has >100 txs (the main batch
  // only fetches the most recent 100 sorted desc, so its min-timestamp
  // may not be the real first tx).
  let firstTxTimestamp: number | null = null;
  if (firstTransaction) {
    const ts = parseInt(firstTransaction.timeStamp);
    if (!isNaN(ts) && ts > 0) {
      firstTxTimestamp = ts;
    }
  }

  // Fallback: use the oldest timestamp from the fetched batches
  if (firstTxTimestamp === null) {
    const allTimestamps = [
      ...txs.map((tx) => parseInt(tx.timeStamp)),
      ...internalTxs.map((tx) => parseInt(tx.timeStamp)),
    ].filter((t) => !isNaN(t) && t > 0);
    firstTxTimestamp = allTimestamps.length > 0 ? Math.min(...allTimestamps) : null;
  }

  const accountAge = firstTxTimestamp
    ? Math.floor(Date.now() / 1000) - firstTxTimestamp
    : null;

  const elapsed = Date.now() - startTime;
  console.log(`[DataFetcher] Fetched data for ${address} in ${elapsed}ms (${txs.length} txs, ${tokenTxs.length} token txs, ${flags.length} flags)`);

  return {
    address,
    balance: bal,
    transactionCount: txs.length,
    transactions: txs,
    tokenTransfers: tokenTxs,
    internalTransactions: internalTxs,
    accountAge,
    firstTxTimestamp,
    isContract: isContractAddr,
    scamFlags: flags,
  };
}
