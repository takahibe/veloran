# Veloran

The payment and access layer for the agent economy.

Sell APIs, datasets, and premium content that humans and AI agents unlock with USDC on Solana. Sellers receive 95% directly, settled on-chain by an Anchor program. Veloran never custodies buyer funds.

**Live demo:** https://veloran-paywall-sage.vercel.app/
**GitHub:** https://github.com/takahibe/veloran

## Hackathon status

Built for the Solana Frontier Hackathon, May 2026.

- ✅ Live on Solana devnet
- ✅ Human checkout via Privy email or Phantom wallet
- ✅ AI-agent unlock flow via HTTP 402 + `X-PAYMENT`
- ✅ Anchor settlement program deployed on devnet
- ✅ 95/5 seller/platform split enforced atomically on-chain
- ✅ Per-call unlocks and seller subscriptions
- 🟡 Mainnet program deploy prepared, pending funding

## How it works

1. A seller signs in and publishes a paid resource: API-style JSON, dataset-shaped text, or premium analysis.
2. Human buyers open the public URL and unlock with Privy checkout.
3. AI agents call `/api/x402/<slug>`, receive HTTP 402 payment instructions, sign a Solana transaction, then re-request with `X-PAYMENT`.
4. The Anchor program transfers 95% to the seller and 5% to Veloran treasury in one atomic SPL-token settlement.
5. The app verifies the transaction and reveals the gated response.

Closing line:

> Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain.

## Reference links

- Live app: https://veloran-paywall-sage.vercel.app/
- Agent docs: https://veloran-paywall-sage.vercel.app/for-agents
- Demo summary: https://veloran-paywall-sage.vercel.app/demo
- Pitch deck source: `docs/pitch-deck.md`
- Demo script: `docs/demo-script.md`
- Submission description: `docs/submission-description.md`
- Handoff: `docs/HANDOFF.md`

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Privy embedded wallets and Phantom sign-in
- Prisma + Vercel Postgres / Neon
- Anchor / Rust on Solana
- `@solana/web3.js` and `@solana/spl-token`

## Deployed program

Devnet Anchor program:

```text
2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS
```

Solscan:

```text
https://solscan.io/account/2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS?cluster=devnet
```

## Run locally

Prerequisites: Node.js, npm, a Postgres database, and Solana devnet RPC access.

```bash
cp .env.example .env.local
# Fill in PRIVY_APP_ID, PRIVY_APP_SECRET, ANTHROPIC_API_KEY,
# NEXT_PUBLIC_HELIUS_RPC_URL, SESSION_SECRET, DATABASE_URL

npm install --legacy-peer-deps
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Useful scripts

```bash
npm run dev
npm run build
npm run lint
VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app \
  AGENT_KEYPAIR_PATH=~/.config/solana/agent.json \
  npm run ai-reader -- <slug>
```

## Notes for judges

Veloran uses a custom `exact-veloran` HTTP 402 payment scheme for the hackathon demo. The app is x402-inspired and agent-readable, but the settlement path is intentionally Solana-native: a custom Anchor instruction verifies the price and executes the 95/5 split directly on-chain.
