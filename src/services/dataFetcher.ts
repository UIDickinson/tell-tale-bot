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
  ] = await Promise.allSettled([
    basescan.getTransactions(address),
    basescan.getInternalTransactions(address),
    basescan.getTokenTransfers(address),
    basescan.getBalance(address).catch(() => getBalanceViaRpc(hexAddress)), // Basescan → RPC fallback
    basescan.isContract(address).catch(() => isContractViaRpc(hexAddress)), // Basescan → RPC fallback
    scamDb.checkAddress(address),
  ]);

  // Extract results with safe defaults
  const txs = transactions.status === 'fulfilled' ? transactions.value : [];
  const internalTxs = internalTransactions.status === 'fulfilled' ? internalTransactions.value : [];
  const tokenTxs = tokenTransfers.status === 'fulfilled' ? tokenTransfers.value : [];
  const bal = balance.status === 'fulfilled' ? balance.value : 0n;
  const isContractAddr = contractCheck.status === 'fulfilled' ? contractCheck.value : false;
  const flags = scamFlags.status === 'fulfilled' ? scamFlags.value : [];

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

  // Determine account age from oldest transaction
  const allTimestamps = [
    ...txs.map((tx) => parseInt(tx.timeStamp)),
    ...internalTxs.map((tx) => parseInt(tx.timeStamp)),
  ].filter((t) => !isNaN(t) && t > 0);

  const firstTxTimestamp = allTimestamps.length > 0 ? Math.min(...allTimestamps) : null;
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
