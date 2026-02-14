// ============================================================
// Tell-Tale Bot — Farcaster / Neynar Integration Service
// ============================================================

import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { config } from '../config.js';

const neynarConfig = new Configuration({ apiKey: config.neynarApiKey });
const neynar = new NeynarAPIClient(neynarConfig);

/**
 * Post a reply cast on Farcaster.
 * @param text - The reply text (must be <= 1024 bytes)
 * @param parentHash - The hash of the cast being replied to
 */
export async function postReply(text: string, parentHash: string): Promise<void> {
  try {
    await neynar.publishCast({
      signerUuid: config.neynarSignerUuid,
      text,
      parent: parentHash,
    });
    console.log(`[Farcaster] Reply posted to cast ${parentHash.slice(0, 10)}...`);
  } catch (error) {
    console.error('[Farcaster] Failed to post reply:', error);
    throw error;
  }
}

/**
 * Post a standalone cast on Farcaster.
 */
export async function postCast(text: string): Promise<void> {
  try {
    await neynar.publishCast({
      signerUuid: config.neynarSignerUuid,
      text,
    });
    console.log('[Farcaster] Cast posted successfully');
  } catch (error) {
    console.error('[Farcaster] Failed to post cast:', error);
    throw error;
  }
}

/**
 * Verify a Neynar webhook signature.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  if (!config.webhookSecret) {
    console.warn('[Farcaster] No webhook secret configured — skipping verification');
    return true;
  }

  // Neynar uses HMAC-SHA512 for webhook signatures
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha512', config.webhookSecret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
