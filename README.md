# 🔍 Tell-Tale Bot

An autonomous AI agent built on Base that analyzes any Base wallet address on demand — delivering fast, accurate risk reports on transaction history, scam links, and suspicious activity patterns. Built on Farcaster protocol, deployed on the Base App.

## Features (Phase 1 MVP)

- **Wallet address parsing** — extracts valid Base addresses from Farcaster casts
- **Transaction history analysis** — fetches last 100 transactions via Basescan API
- **7-signal risk scoring** — account age, tx volume, scam interactions, large transfers, contract approvals, funding source, token diversity
- **AI-generated reports** — GPT-4o summaries grounded in verified onchain data with hallucination guards
- **Farcaster integration** — responds to @mentions on Base App via Neynar webhooks
- **Scam database** — local cached DB seeded from Forta/ChainAbuse + real-time ChainAbuse lookups
- **RPC fallback chain** — automatic rotation: Base Public → Alchemy → Ankr → 1RPC
- **Caching & rate limiting** — TTL-based result cache, per-user query limits
- **Legal disclaimers** — every report includes "not financial advice" disclaimer

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | TypeScript / Node.js |
| Framework | Express.js |
| AI | OpenAI GPT-4o |
| Farcaster | @neynar/nodejs-sdk v3 |
| Onchain Data | Basescan API, viem (Base RPC) |
| Scam Detection | ChainAbuse API, Forta datasets, local DB |

## Project Structure

```
src/
├── index.ts                 # Express server, webhook handler, analysis pipeline
├── config.ts                # Environment config with validation
├── types/index.ts           # TypeScript type definitions
├── data/
│   └── scamSeeds.ts         # Seed data for known scam addresses
├── services/
│   ├── basescan.ts          # Basescan API client (rate-limited)
│   ├── dataFetcher.ts       # Aggregates data from all sources
│   ├── farcaster.ts         # Neynar SDK integration (cast/reply)
│   ├── reportGenerator.ts   # GPT-4o report generation + formatting
│   ├── riskScorer.ts        # Rule-based 7-signal risk scoring
│   ├── rpcFallback.ts       # Multi-provider RPC rotation
│   └── scamDb.ts            # Scam database (local + ChainAbuse)
└── utils/
    ├── address.ts           # Address parsing & validation (viem)
    └── rateLimit.ts         # Rate limiter, TTL cache, user limiter
```

## Setup

### Prerequisites

- Node.js 18+
- A Farcaster account for the bot (get a FID via [Warpcast](https://warpcast.com))
- API keys: Neynar, OpenAI, Basescan

### 1. Clone & Install

```bash
git clone https://github.com/UIDickinson/tell-tale-bot.git
cd tell-tale-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

| Variable | Required | Description |
|---|---|---|
| `NEYNAR_API_KEY` | ✅ | Neynar API key ([neynar.com](https://neynar.com)) |
| `NEYNAR_SIGNER_UUID` | ✅ | Managed signer UUID from Neynar |
| `BOT_FID` | ✅ | Your bot's Farcaster ID |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `BASESCAN_API_KEY` | ✅ | Basescan API key ([basescan.org](https://basescan.org)) |
| `WEBHOOK_SECRET` | ⬜ | Neynar webhook HMAC secret |
| `BASE_RPC_URL` | ⬜ | Custom Base RPC (default: mainnet.base.org) |
| `ALCHEMY_API_KEY` | ⬜ | Alchemy key for RPC fallback |
| `PORT` | ⬜ | Server port (default: 3000) |

### 3. Build & Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Set Up Neynar Webhook

1. Go to [Neynar Dashboard](https://dev.neynar.com) → Webhooks
2. Create a webhook pointing to `https://your-server.com/webhook/neynar`
3. Subscribe to `cast.created` events
4. Filter by your bot's FID mentions
5. Copy the webhook secret to `WEBHOOK_SECRET` in `.env`

## Usage

### On Base App / Farcaster

Tag the bot with a wallet address:

```
@TellTaleBot 0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1
```

The bot replies with a risk report:

```
🔍 Tell-Tale Bot — Wallet Report

📍 0x742d...b3a1 | Base
🟢 LOW RISK (18/100)

This wallet appears low-risk. Normal DeFi activity
patterns with no known scam links detected.

• Account age: 245 days
• Total transactions: 347
• No flagged addresses in transaction history

↔ Uniswap V3 Router (89 txs)
↔ USDC Contract (28 txs)

⚠️ Not financial advice. Onchain data is public
but interpretations are probabilistic — DYOR.
```

### REST API (Testing)

```bash
# Health check
curl http://localhost:3000/health

# Analyze a wallet
curl http://localhost:3000/analyze/0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1
```

## Risk Scoring

| Signal | Weight | What It Checks |
|---|---|---|
| Account Age | 10% | Newer = higher risk |
| Transaction Volume | 15% | Abnormal patterns (spikes, too-uniform) |
| Scam Interactions | 25% | Transactions with flagged addresses |
| Large Transfers | 15% | Sudden large outflows |
| Contract Approvals | 15% | Excessive/unlimited token approvals |
| Funding Source | 10% | Funded by mixers or flagged wallets |
| Token Diversity | 10% | Spam/scam token interactions |

**Risk Levels:** 🟢 Low (0-30) · 🟡 Medium (31-60) · 🔴 High (61-100)

## Anti-Hallucination Measures

- LLM receives only verified, fetched onchain data — never asked to look anything up
- Structured prompts with explicit constraints ("only report findings present in the data")
- Post-generation validation checks for invented addresses/hashes
- Template-based fallback if GPT-4o fails
- Confidence score reflects data completeness
- Low-temperature generation (0.3) for factual consistency

## Deployment

### Railway / Render

1. Connect your GitHub repo
2. Set environment variables in the dashboard
3. Build command: `npm run build`
4. Start command: `npm start`
5. Set up Neynar webhook to point to your deployed URL

### Vercel (Serverless)

Note: The webhook handler processes async — serverless may time out for complex analyses. Prefer Railway/Render for production.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm run typecheck` to verify
5. Submit a PR

## License

ISC

---

*Built for the Base Builder Programme. Tell-Tale Bot helps users stay safe in onchain interactions by providing instant wallet intelligence right where they transact.*
