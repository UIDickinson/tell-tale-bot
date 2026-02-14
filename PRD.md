# Tell-Tale Bot — Product Requirements Document

**Version:** 1.0
**Date:** February 14, 2026
**Status:** Draft

---

## 1. Overview

**Tell-Tale Bot** is an autonomous AI agent built on Base that analyzes any Base wallet address on demand — delivering fast, accurate reports on transaction history, connected addresses, potential scam links, risky patterns, and suspicious activities. It helps users stay safe in onchain interactions by providing instant, trustworthy wallet intelligence right where they transact.

---

## 2. Problem Statement

Crypto users on Base frequently interact with unknown wallets — before sending funds, trading, or joining a project. Many fall victim to scams like wallet drainers, rug pulls, phishing contracts, or chain-hopping fraud.

**Current pain points:**
- Manual checks via explorers (Basescan, Etherscan, Arkham) are time-consuming and require expertise.
- Existing tools are offchain, paid, enterprise-focused, or not integrated into the Base ecosystem.
- No native, in-app way to quickly assess wallet trustworthiness on Base App.
- Newcomers lack the technical knowledge to interpret raw blockchain data.

---

## 3. Goals & Success Metrics

### Goals
- Provide instant, readable wallet risk assessments on Base App.
- Reduce the time from "I encountered this wallet" to "I know if it's safe" to under 30 seconds.
- Make onchain safety accessible to non-technical users.
- Build a trusted reputation as the go-to wallet scout on Base.

### Success Metrics (Post-Launch)
| Metric | Target (Phase 1) |
|---|---|
| Avg. response time per query | < 15 seconds |
| Daily active queries | 50+ within first month |
| Report accuracy (flagged vs. confirmed scam) | > 85% |
| User retention (repeat queries) | > 40% |

---

## 4. Target Users

| Segment | Description |
|---|---|
| **Everyday Base users** | Traders, memecoin hunters, DeFi participants who want quick safety checks. |
| **Newcomers** | Users new to crypto who need guidance before interacting with unknown wallets. |
| **Communities & Projects** | DAOs, groups wanting due diligence on contributors, whales, or project wallets. |
| **Security-conscious users** | Power users who want a second opinion before approving contracts or large transfers. |

---

## 5. Architecture & Tech Stack

### Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime** | TypeScript / Node.js | Web3 libraries (viem, ethers) are TS-first; CDP SDK has strong TS support; natural fit for bot/agent architecture. |
| **Farcaster SDK** | @neynar/nodejs-sdk (v3.x) | Webhook subscriptions for mentions, casting replies, managed signers. Primary integration layer with Base App / Farcaster. |
| **Framework** | Express.js or Hono | Lightweight HTTP server for Neynar webhooks and API endpoints. |
| **AI / LLM** | OpenAI GPT-4o | Structured analysis, natural language report generation, pattern recognition. |
| **Onchain Data** | CDP APIs (AgentKit/OnchainKit), Basescan API, Base RPC endpoints | Primary data sources for transaction history, contract interactions, and wallet state. |
| **Database** | PostgreSQL (via Supabase or Neon) | Cache analysis results, store flagged addresses, track query history. |
| **Hosting** | Railway / Render / Vercel (serverless functions) | Easy deployment, auto-scaling, free/low-cost tiers. |
| **Wallet Interaction** | viem + Base chain config | Read-only onchain data fetching (no private key management needed for MVP). |

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Base App                       │
│  (User tags @TellTaleBot or sends query)         │
└──────────────────┬──────────────────────────────┘
                   │  Webhook / API call
                   ▼
┌─────────────────────────────────────────────────┐
│              Tell-Tale Bot Server                │
│  ┌───────────────────────────────────────────┐   │
│  │  Input Parser                             │   │
│  │  (Extract wallet address from message)    │   │
│  └──────────────┬────────────────────────────┘   │
│                 ▼                                 │
│  ┌───────────────────────────────────────────┐   │
│  │  Data Fetcher Module                      │   │
│  │  • CDP APIs / OnchainKit                  │   │
│  │  • Basescan API                           │   │
│  │  • Base RPC (viem)                        │   │
│  │  • Known Scam DB / Blacklists             │   │
│  └──────────────┬────────────────────────────┘   │
│                 ▼                                 │
│  ┌───────────────────────────────────────────┐   │
│  │  Analysis Engine                          │   │
│  │  • Rule-based checks (heuristics)         │   │
│  │  • Risk scoring algorithm                 │   │
│  │  • GPT-4o analysis (patterns + report)    │   │
│  └──────────────┬────────────────────────────┘   │
│                 ▼                                 │
│  ┌───────────────────────────────────────────┐   │
│  │  Report Generator                         │   │
│  │  • Structured output (verdict, findings)  │   │
│  │  • Format for Base App display             │   │
│  └──────────────┬────────────────────────────┘   │
│                 ▼                                 │
│  ┌───────────────────────────────────────────┐   │
│  │  Response Handler                         │   │
│  │  • Post reply to Base App                 │   │
│  │  • Cache result in DB                     │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 6. Feature Requirements — Phased Approach

### Phase 1: MVP (Lean Core)

**Goal:** Ship a functional wallet analyzer on Base App that delivers basic risk reports.

| Feature | Description | Priority |
|---|---|---|
| **Wallet address parsing** | Extract valid Base wallet addresses from user messages (plain text, tagged, or pasted). | P0 |
| **Transaction history fetch** | Pull recent transactions (last 50–100 txs) for the queried address via Basescan API / CDP. | P0 |
| **Basic risk signals** | Check for: large sudden transfers, interactions with known scam addresses, contract approval patterns, account age, tx frequency. | P0 |
| **Risk score** | Generate a simple Low / Medium / High risk rating based on rule-based heuristics. | P0 |
| **AI-generated report** | Use GPT-4o to produce a concise, readable summary with verdict, key findings, and recommendations. | P0 |
| **Base App integration** | Bot responds to mentions/tags on Base App with the analysis report. | P0 |
| **Known scam DB** | Maintain a local/cached list of known scam addresses, flagged contracts, and drainer addresses (sourced from public databases). | P1 |
| **Result caching** | Cache recent analysis results (TTL-based) to avoid redundant API calls for the same address. | P1 |
| **Rate limiting** | Prevent abuse with per-user rate limits. | P1 |

### Phase 2: Enhanced Analysis

**Goal:** Deeper insights, connected wallet mapping, and richer reports.

| Feature | Description | Priority |
|---|---|---|
| **Connected wallet mapping** | Trace funding sources and top interacting addresses (1-hop graph). Map clustered wallet behavior. | P0 |
| **Contract interaction analysis** | Identify if the address deployed contracts, interacted with known DeFi protocols vs. suspicious contracts. | P0 |
| **Token holdings snapshot** | Show current token balances (ERC-20, ERC-721) and flag suspicious tokens (e.g., honeypot tokens). | P1 |
| **Enhanced risk scoring** | Combine rule-based + GPT-4o pattern recognition for more nuanced scoring. Add confidence level. | P1 |
| **Visual interaction graph** | Generate a simple visual (text-based or image) showing top wallet connections. | P2 |
| **Historical risk tracking** | Track how a wallet's risk score changes over time. | P2 |

### Phase 3: Multi-Platform & Advanced

**Goal:** Expand to Telegram, add community features, and advanced detection.

| Feature | Description | Priority |
|---|---|---|
| **Telegram bot** | Deploy on Telegram with the same core analysis engine. Command-based (`/analyze 0x...`). | P0 |
| **Cross-chain support** | Extend analysis to Ethereum mainnet, Optimism, Arbitrum (chain-hopping detection). | P1 |
| **Community reporting** | Allow users to flag/report wallets, contributing to the scam database. | P1 |
| **Batch analysis** | Analyze multiple addresses in a single query. | P2 |
| **Watchlist / Alerts** | Users can watch addresses and get notified of suspicious activity. | P2 |
| **API access** | Public REST API for third-party integrations. | P2 |

---

## 7. Data Sources & APIs

| Source | Purpose | Access |
|---|---|---|
| **Basescan API** | Transaction history, contract info, internal txs, token transfers | Free tier (5 calls/sec) — API key required |
| **CDP (Coinbase Developer Platform)** | AgentKit for agent execution, OnchainKit for data, wallet management | CDP API key required |
| **Base RPC (via viem)** | Direct chain reads — balances, contract calls, block data | Public RPC endpoints (Base Public, PublicNode, Ankr, 1RPC) |
| **Known Scam Databases** | Cross-reference addresses against known scam lists | ChainAbuse API, Forta alerts, community-maintained lists |
| **OpenAI API** | GPT-4o for analysis synthesis and report generation | API key required |

---

## 8. Risk Scoring System (Phase 1)

### Signals & Weights

| Signal | Weight | Description |
|---|---|---|
| Account age | 10% | Newer accounts = higher risk |
| Transaction volume/frequency | 15% | Abnormal patterns (sudden spikes, very low, or suspiciously uniform) |
| Known scam interactions | 25% | Direct transactions with flagged addresses/contracts |
| Large sudden transfers | 15% | Unusual large outflows (potential drain) |
| Contract approvals | 15% | Excessive or suspicious token approvals |
| Funding source | 10% | Funded by known risky sources (mixers, flagged wallets) |
| Token diversity | 10% | Holding many worthless/scam tokens |

### Risk Levels

| Level | Score Range | Meaning |
|---|---|---|
| 🟢 **Low Risk** | 0–30 | No significant red flags detected. Normal activity patterns. |
| 🟡 **Medium Risk** | 31–60 | Some concerning signals. Proceed with caution. |
| 🔴 **High Risk** | 61–100 | Multiple red flags. Strong indicators of scam/malicious activity. |

---

## 9. Report Output Format (Phase 1)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Tell-Tale Bot — Wallet Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Address: 0xabc...def
🔗 Chain: Base

━━ VERDICT ━━━━━━━━━━━━━━━━━━━
🟢 LOW RISK (Score: 18/100)
No known scam links detected.

━━ KEY FINDINGS ━━━━━━━━━━━━━━
• Account age: 8 months
• Total transactions: 347
• Interacted with 12 verified contracts
• No flagged addresses in transaction history
• Normal transfer patterns

━━ TOP INTERACTIONS ━━━━━━━━━━
1. Uniswap V3 Router — 89 txs
2. 0x742d...8f3a — 34 txs
3. USDC Contract — 28 txs

━━ RECOMMENDATIONS ━━━━━━━━━━━
✅ This wallet shows normal usage patterns.
   Standard DeFi activity detected.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱ Analyzed in 4.2s | Powered by Tell-Tale Bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Response time** | < 15 seconds end-to-end |
| **Availability** | 99%+ uptime |
| **Security** | No private keys stored; read-only chain access; API keys stored securely (env vars / secrets manager) |
| **Scalability** | Handle 1000+ queries/day by Phase 2 |
| **Privacy** | No user data stored beyond query logs; no wallet tracking without consent |
| **Cost efficiency** | Operate within free/low-cost API tiers for MVP |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| API rate limits (Basescan, OpenAI) | Slow/failed responses | Caching, batched calls, fallback data sources |
| False positives (legitimate wallet flagged) | User trust erosion | Clear confidence levels, "this is informational" disclaimer, feedback mechanism |
| False negatives (scam wallet missed) | User financial loss | Conservative scoring, regular scam DB updates, community reporting |
| Base App API changes | Bot breaks | Modular integration layer, version monitoring |
| LLM hallucination in reports | Incorrect findings | Ground GPT-4o output with structured data; only pass verified onchain data as context |

---

## 12. Implementation Milestones

| Milestone | Deliverable | Est. Timeline |
|---|---|---|
| **M1: Project Setup** | Repo, TS config, dependencies, env setup, basic project structure | Day 1–2 |
| **M2: Data Layer** | Basescan API integration, viem setup, transaction fetching, known scam DB seed | Day 3–5 |
| **M3: Analysis Engine** | Risk scoring algorithm, signal extraction, rule-based checks | Day 6–8 |
| **M4: AI Report Generation** | GPT-4o integration, prompt engineering, structured report output | Day 9–10 |
| **M5: Base App Integration** | Webhook setup, message parsing, reply posting on Base App | Day 11–13 |
| **M6: Polish & Deploy** | Caching, rate limiting, error handling, deployment, testing | Day 14–16 |
| **M7: Phase 2 Kickoff** | Connected wallet mapping, enhanced analysis | Post-launch |

---

## 13. Open Questions — RESOLVED

| # | Question | Answer |
|---|---|---|
| 1 | What is the exact Base App integration mechanism? | **Neynar API** (v2) — the standard way to build Farcaster bots. Neynar provides webhook subscriptions to listen for @mentions (filter `cast.created` by bot FID), and `POST /v2/farcaster/cast` to reply. SDK: `@neynar/nodejs-sdk` (v3.134.0+, TypeScript-first). Bot needs its own Farcaster account (FID), created via Warpcast or Neynar managed signers. Alternative (lower-level): `@farcaster/hub-nodejs` for direct Hub connection, but Neynar is recommended for bot use cases. |
| 2 | Are there specific scam DB APIs with free tiers we should prioritize? | **Primary:** ChainAbuse (public address lookup, community reports across EVM chains). **Secondary:** Forta Network labeled datasets (`forta-network/labelled-datasets` on GitHub — free download for local cache) + Forta API (`api.forta.network`, free tier for alert queries by address). **Supplementary:** MetaMask's `eth-phishing-detect` (open-source phishing domain list), CryptoScamDB (archived but useful seed data), public Etherscan/Basescan labels (editorial, not API-accessible but observable in responses). |
| 3 | Do we need user authentication, or is it fully open/anonymous? | **Fully open/anonymous.** Any Farcaster user can tag @TellTaleBot with a wallet address. No auth, no login, no gating. |
| 4 | What's the maximum report length Base App supports in a single post/reply? | **1024 bytes** per Farcaster cast (protocol limit). For ASCII text this is ~1024 characters; with emojis/UTF-8 it's fewer. The original 320 figure was the old Farcaster limit — protocol upgraded to 1024 bytes. Reports must be designed to fit within this. Multi-cast threading can be used for longer reports. |
| 5 | Should the bot have a landing page / website? | **Yes — minimal landing page** (e.g., telltalebot.xyz via Vercel/Render). Contents: usage guide (@mentions in Base App), methodology/transparency, disclaimers, example reports, GitHub link, feedback form. **Built after bot is functional** (Phase 2/3). |

---

## 14. Additional Requirements (User-Specified)

### a. Hallucination & False Negative Mitigation
- **Data-grounded analysis only:** LLM receives only verified, fetched onchain data — never asked to "look up" anything.
- **Structured output:** Use JSON mode to force GPT-4o into specific report fields (verdict, findings, score).
- **Explicit prompt constraints:** "Only report findings present in the provided data. If insufficient data, state that — do not guess."
- **Post-generation validation:** Cross-reference LLM output against raw input data (check cited tx hashes, addresses exist).
- **Template-based reports:** LLM fills in sections of a predefined template, not free-form.
- **Confidence levels:** Report includes confidence score; low-confidence = "insufficient data" rather than a definitive verdict.
- **Separation of concerns:** Data fetching (deterministic, verified) is strictly separated from analysis (LLM stage).

### b. Basescan Rate Limit Fallbacks
- **Basescan free tier:** 5 calls/sec, 100k calls/day — primary source for tx history, token transfers, internal txs.
- **Fallback chain:**
  1. **Public Base RPC:** `https://mainnet.base.org` (rate-limited but free) via `viem`.
  2. **PublicNode:** `https://base-rpc.publicnode.com` (public Base endpoint, no API key).
  3. **Ankr public RPC:** Free Base endpoint, no API key needed.
  4. **1RPC (Automata):** Privacy-preserving free Base RPC.
- **Implementation:** RPC provider rotation with automatic failover. Cache aggressively (TTL-based) to minimize API calls.

### c. Legal/Trust Disclaimers
- **Every report must include:** *"⚠️ This is not financial advice. Onchain data is public but interpretations are probabilistic — always DYOR (Do Your Own Research)."*
- **Landing page:** Detailed methodology transparency, limitations, and full legal disclaimer.
- **In-report language:** Use hedging language ("indicators suggest", "patterns consistent with") rather than definitive claims.

---

*This is a living document. Updated Feb 14, 2026 with resolved open questions and additional requirements.*
