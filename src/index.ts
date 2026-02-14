// ============================================================
// Tell-Tale Bot — Main Entry Point
// ============================================================

import express from 'express';
import { config } from './config.js';
import { extractAddress } from './utils/address.js';
import { TtlCache, UserRateLimiter } from './utils/rateLimit.js';
import { fetchWalletData } from './services/dataFetcher.js';
import { computeRiskScore } from './services/riskScorer.js';
import { generateReport, formatForCast } from './services/reportGenerator.js';
import { postReply, verifyWebhookSignature } from './services/farcaster.js';
import { NeynarCastEvent, WalletReport } from './types/index.js';

// ── Cache & Rate Limiting ──────────────────────────────────
const reportCache = new TtlCache<WalletReport>(config.cacheTtlSeconds * 1000);
const userLimiter = new UserRateLimiter(10, 60 * 60 * 1000); // 10 queries per hour per user

// ── Express App ────────────────────────────────────────────
const app = express();

// Raw body for webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', bot: 'Tell-Tale Bot', version: '1.0.0' });
});

// ── Neynar Webhook Endpoint ────────────────────────────────
app.post('/webhook/neynar', async (req: any, res) => {
  // Verify webhook signature
  const signature = req.headers['x-neynar-signature'] as string;
  if (signature && !verifyWebhookSignature(req.rawBody, signature)) {
    console.warn('[Webhook] Invalid signature — rejecting');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately (process async)
  res.status(200).json({ status: 'processing' });

  try {
    const event = req.body as NeynarCastEvent;

    // Only process cast.created events that mention our bot
    if (event.type !== 'cast.created') return;

    const isMentioned = event.data.mentioned_profiles?.some(
      (p) => p.fid === config.botFid,
    );
    if (!isMentioned) return;

    const castHash = event.data.hash;
    const authorFid = event.data.author.fid;
    const text = event.data.text;

    console.log(
      `[Webhook] Mention from @${event.data.author.username} (FID: ${authorFid}): ${text.slice(0, 80)}...`,
    );

    // Rate limit check
    if (!userLimiter.checkAndRecord(authorFid)) {
      await postReply(
        '⏳ You\'ve reached the query limit (10/hour). Please try again later.',
        castHash,
      );
      return;
    }

    // Extract wallet address from the cast text
    const address = extractAddress(text);
    if (!address) {
      await postReply(
        '❓ I couldn\'t find a valid wallet address in your message. Please tag me with a Base wallet address (e.g., @TellTaleBot 0xabc...def).',
        castHash,
      );
      return;
    }

    // Check cache
    const cached = reportCache.get(address);
    if (cached) {
      console.log(`[Cache] Hit for ${address}`);
      const castText = formatForCast(cached);
      await postReply(castText, castHash);
      return;
    }

    // Analyze the wallet
    await analyzeAndReply(address, castHash);
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
  }
});

// ── Manual Analysis Endpoint (for testing) ─────────────────
app.get('/analyze/:address', async (req, res) => {
  const address = extractAddress(req.params.address);
  if (!address) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  // Check cache
  const cached = reportCache.get(address);
  if (cached) {
    return res.json({ cached: true, report: cached, cast: formatForCast(cached) });
  }

  try {
    const report = await runAnalysis(address);
    return res.json({ cached: false, report, cast: formatForCast(report) });
  } catch (error) {
    console.error(`[API] Analysis failed for ${address}:`, error);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

// ── Core Analysis Pipeline ─────────────────────────────────
async function runAnalysis(address: string): Promise<WalletReport> {
  const startTime = Date.now();

  // 1. Fetch all wallet data (parallelized)
  console.log(`[Analysis] Starting analysis for ${address}`);
  const walletData = await fetchWalletData(address);

  // 2. Compute risk score (rule-based heuristics)
  const { score, level, signals } = computeRiskScore(walletData);

  // 3. Generate report (AI summary + template)
  const report = await generateReport(walletData, score, level, signals, startTime);

  // 4. Cache the result
  reportCache.set(address, report);

  console.log(
    `[Analysis] Complete for ${address}: ${level} (${score}/100) in ${report.responseTimeMs}ms`,
  );

  return report;
}

async function analyzeAndReply(address: string, castHash: string): Promise<void> {
  try {
    const report = await runAnalysis(address);
    const castText = formatForCast(report);
    await postReply(castText, castHash);
  } catch (error) {
    console.error(`[Analysis] Failed for ${address}:`, error);
    await postReply(
      `❌ Analysis failed for ${address}. Please try again later.\n\n${config.disclaimer}`,
      castHash,
    );
  }
}

// ── Start Server ───────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🔍 Tell-Tale Bot v1.0.0`);
  console.log(`   Listening on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   RPC providers: ${config.rpcProviders.map((p) => p.name).join(', ')}`);
  console.log(`   Bot FID: ${config.botFid}\n`);
});

export default app;
