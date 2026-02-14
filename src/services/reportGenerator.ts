// ============================================================
// Tell-Tale Bot — Report Generator (GPT-4o + Template)
// ============================================================
// Generates human-readable reports using:
// 1. Template-based structure (prevents hallucination)
// 2. GPT-4o for natural language summary (grounded in data)
// 3. Post-generation validation
// ============================================================

import OpenAI from 'openai';
import { config } from '../config.js';
import {
  WalletData,
  WalletReport,
  RiskLevel,
  RiskSignal,
  TopInteraction,
  RISK_EMOJI,
} from '../types/index.js';
import { shortenAddress } from '../utils/address.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/**
 * Generate a full wallet analysis report.
 */
export async function generateReport(
  data: WalletData,
  riskScore: number,
  riskLevel: RiskLevel,
  signals: RiskSignal[],
  startTime: number,
): Promise<WalletReport> {
  const topInteractions = computeTopInteractions(data);
  const keyFindings = extractKeyFindings(data, signals);

  // Generate AI summary (grounded in verified data only)
  const summary = await generateAiSummary(data, riskScore, riskLevel, signals, keyFindings);

  // Generate recommendations
  const recommendations = generateRecommendations(riskLevel, signals);

  // Calculate confidence based on data completeness
  const confidence = calculateConfidence(data);

  const report: WalletReport = {
    address: data.address,
    chain: 'Base',
    riskLevel,
    riskScore,
    confidence,
    signals,
    summary,
    keyFindings,
    topInteractions,
    recommendations,
    disclaimer: config.disclaimer,
    analyzedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - startTime,
  };

  return report;
}

/**
 * Format a WalletReport into a Farcaster-compatible cast string.
 * Must fit within 1024 bytes.
 */
export function formatForCast(report: WalletReport): string {
  const emoji = RISK_EMOJI[report.riskLevel];
  const addr = shortenAddress(report.address);

  // Build the cast, keeping within byte limit
  let cast = `🔍 Tell-Tale Bot — Wallet Report\n\n`;
  cast += `📍 ${addr} | Base\n`;
  cast += `${emoji} ${report.riskLevel} RISK (${report.riskScore}/100)\n\n`;

  // Summary (truncate if needed)
  const maxSummaryLen = 300;
  const summary =
    report.summary.length > maxSummaryLen
      ? report.summary.slice(0, maxSummaryLen - 3) + '...'
      : report.summary;
  cast += `${summary}\n\n`;

  // Top findings (max 3)
  if (report.keyFindings.length > 0) {
    const findings = report.keyFindings
      .slice(0, 3)
      .map((f) => `• ${f}`)
      .join('\n');
    cast += `${findings}\n\n`;
  }

  // Top interactions (max 2)
  if (report.topInteractions.length > 0) {
    const interactions = report.topInteractions
      .slice(0, 2)
      .map((i) => `↔ ${i.label || shortenAddress(i.address)} (${i.txCount} txs)`)
      .join('\n');
    cast += `${interactions}\n\n`;
  }

  // Disclaimer (always included)
  cast += report.disclaimer;

  // Ensure byte limit
  const encoder = new TextEncoder();
  if (encoder.encode(cast).length > config.maxReportLength) {
    cast = truncateToByteLimit(cast, config.maxReportLength);
  }

  return cast;
}

/**
 * Use GPT-4o to generate a natural language summary.
 * CRITICAL: Only pass verified onchain data — never ask LLM to look anything up.
 */
async function generateAiSummary(
  data: WalletData,
  riskScore: number,
  riskLevel: RiskLevel,
  signals: RiskSignal[],
  keyFindings: string[],
): Promise<string> {
  const signalSummaries = signals
    .map((s) => `- ${s.name} (${s.score}/100): ${s.description}`)
    .join('\n');

  const prompt = `You are a blockchain security analyst. Generate a 1-2 sentence summary of this wallet analysis.

RULES:
- ONLY state facts present in the data below. Do NOT invent or assume anything.
- Use hedging language: "indicators suggest", "patterns consistent with", "appears to"
- If data is insufficient, say so.
- Keep it under 200 characters.

VERIFIED DATA:
Address: ${data.address}
Chain: Base
Risk Score: ${riskScore}/100 (${riskLevel})
Transaction Count: ${data.transactionCount}
Account Age: ${data.accountAge ? Math.round(data.accountAge / 86400) + ' days' : 'unknown'}
Is Contract: ${data.isContract}
Scam Flags: ${data.scamFlags.length}
Signals:
${signalSummaries}
Key Findings:
${keyFindings.join('; ')}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3, // Low temperature for factual consistency
    });

    const aiSummary = response.choices[0]?.message?.content?.trim();
    if (!aiSummary) throw new Error('Empty AI response');

    // Post-generation validation: basic check that AI didn't invent addresses/hashes
    return validateAiOutput(aiSummary, data);
  } catch (error) {
    console.error('[ReportGen] AI summary failed, using template fallback:', error);
    return generateFallbackSummary(riskLevel, riskScore, data);
  }
}

/**
 * Validate AI output doesn't contain hallucinated data.
 */
function validateAiOutput(text: string, data: WalletData): string {
  // Check for invented addresses (0x... patterns not in our data)
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const mentions = text.match(addressPattern) || [];
  const knownAddresses = new Set([
    data.address.toLowerCase(),
    ...data.transactions.map((tx) => tx.from.toLowerCase()),
    ...data.transactions.map((tx) => tx.to.toLowerCase()),
  ]);

  for (const addr of mentions) {
    if (!knownAddresses.has(addr.toLowerCase())) {
      console.warn(`[ReportGen] AI hallucinated address ${addr} — removing from output`);
      return text.replace(addr, '[address removed]');
    }
  }

  return text;
}

/**
 * Template-based fallback summary (no AI needed).
 */
function generateFallbackSummary(
  level: RiskLevel,
  score: number,
  data: WalletData,
): string {
  const age = data.accountAge
    ? `${Math.round(data.accountAge / 86400)} days old`
    : 'unknown age';

  switch (level) {
    case 'LOW':
      return `This wallet appears low-risk (${score}/100). ${age}, ${data.transactionCount} transactions, no known scam links detected.`;
    case 'MEDIUM':
      return `This wallet shows some concerning indicators (${score}/100). ${age}, ${data.transactionCount} transactions. Proceed with caution.`;
    case 'HIGH':
      return `This wallet has multiple red flags (${score}/100). ${age}, ${data.transactionCount} transactions, ${data.scamFlags.length} scam database match(es). Exercise extreme caution.`;
  }
}

/**
 * Compute top interacting addresses by transaction count.
 */
function computeTopInteractions(data: WalletData): TopInteraction[] {
  const counterparties = new Map<string, number>();
  const myAddr = data.address.toLowerCase();

  for (const tx of data.transactions) {
    const other = tx.from.toLowerCase() === myAddr
      ? tx.to
      : tx.from;
    if (other) {
      const key = other.toLowerCase();
      counterparties.set(key, (counterparties.get(key) || 0) + 1);
    }
  }

  return Array.from(counterparties.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr, count]) => ({
      address: addr,
      txCount: count,
    }));
}

/**
 * Extract human-readable key findings from signals.
 */
function extractKeyFindings(data: WalletData, signals: RiskSignal[]): string[] {
  const findings: string[] = [];

  // High-scoring signals first
  const sorted = [...signals].sort((a, b) => b.score * b.weight - a.score * a.weight);
  for (const signal of sorted) {
    if (signal.score > 30) {
      findings.push(signal.description);
    }
  }

  // Scam flags always reported
  for (const flag of data.scamFlags) {
    findings.push(`[${flag.source}] ${flag.category}: ${flag.description}`);
  }

  // Account basics
  if (data.accountAge !== null) {
    findings.push(
      `Account age: ${Math.round(data.accountAge / 86400)} days`,
    );
  }
  findings.push(`Total transactions: ${data.transactionCount}`);

  return [...new Set(findings)].slice(0, 6); // Deduplicate and limit
}

/**
 * Generate recommendations based on risk level.
 */
/**
 * Calculate confidence level based on data completeness.
 */
function calculateConfidence(data: WalletData): number {
  let confidence = 100;

  if (data.transactionCount === 0) confidence -= 30;
  if (data.accountAge === null) confidence -= 20;
  if (data.tokenTransfers.length === 0) confidence -= 10;
  if (data.internalTransactions.length === 0) confidence -= 5;
  if (data.scamFlags.length === 0) confidence -= 0; // no penalty — absence of flags is fine

  // Low tx count = less data to work with
  if (data.transactionCount > 0 && data.transactionCount < 10) confidence -= 15;

  return Math.max(10, Math.min(100, confidence));
}

function generateRecommendations(level: RiskLevel, signals: RiskSignal[]): string[] {
  const recs: string[] = [];

  switch (level) {
    case 'LOW':
      recs.push('No significant red flags detected.');
      recs.push('Standard activity patterns observed.');
      break;
    case 'MEDIUM':
      recs.push('Proceed with caution — verify the wallet through other sources.');
      recs.push('Avoid large transactions without further due diligence.');
      break;
    case 'HIGH':
      recs.push('Exercise extreme caution — multiple risk indicators present.');
      recs.push('Do NOT send funds or approve tokens without thorough verification.');
      recs.push('Consider reporting this address if you believe it is malicious.');
      break;
  }

  return recs;
}

/**
 * Truncate a string to fit within a byte limit.
 */
function truncateToByteLimit(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const disclaimer = '\n\n' + config.disclaimer;
  const disclaimerBytes = encoder.encode(disclaimer).length;
  const availableBytes = maxBytes - disclaimerBytes - 3; // 3 for "..."

  let truncated = text;
  while (encoder.encode(truncated).length > availableBytes) {
    truncated = truncated.slice(0, -10);
  }

  // Find last newline to avoid cutting mid-line
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > truncated.length * 0.7) {
    truncated = truncated.slice(0, lastNewline);
  }

  return truncated + '...' + disclaimer;
}
