# Veloran — Hackathon Handoff for Coding Agent

**Last updated:** 2026-04-29 evening · **Current SHA:** `7c87d1d`
**Hackathon:** Solana Frontier · **Deadline:** 2026-05-10 (target submission 2026-05-09)
**Live URL:** https://veloran-paywall-sage.vercel.app/
**GitHub:** https://github.com/takahibe/veloran

---

## Read this first — what Veloran is

> **The seller-side publishing and settlement layer for paid resources in the agent economy.**
>
> *Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain.*

A Next.js app where:
1. **Sellers** publish paid resources (APIs returning JSON, dataset payloads, premium content) and set a USDC price.
2. **Human buyers** unlock via a Privy checkout flow (email or Phantom wallet).
3. **AI agents** unlock via the same URL through HTTP 402 + an `X-PAYMENT` header.
4. A custom **Anchor program** on Solana enforces a 95/5 split atomically — 95% to the seller, 5% to the platform treasury. The split is on-chain, no facilitator custody.

**Pay.sh framing:** Pay.sh is positioned as **market validation + complementary infrastructure**, NOT as a competitor. Pay.sh focuses on established API marketplaces; Veloran focuses on independent sellers. Don't write any copy that attacks Pay.sh.

**What Veloran is NOT:**
- ❌ "Substack on Solana" (deprecated framing)
- ❌ "Fully official x402 compatible" (we use a custom `exact-veloran` scheme; see `docs/x402-spike.md`)
- ❌ A subscriptions-for-creators product (subscriptions exist as a heavy-buyer flow, not the wedge)
- ❌ A Pay.sh competitor

---

## Current state

### What's shipped + working on devnet
- ✅ Anchor program deployed to **devnet** at `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`
- ✅ Live URL with positioning v2 (commit `b7873f4`): hero, features, use cases, why-now, why-Solana, closing CTA
- ✅ `/for-agents` developer docs page with real x402 wire format
- ✅ `/demo` judge-facing summary page
- ✅ Per-call unlocks via `/api/unlock/[slug]` (Privy-authed humans) and `/api/x402/[slug]` (autonomous agents)
- ✅ Subscription tiers (monthly + yearly) with HMAC cookie gating across all of a seller's posts
- ✅ Email + Phantom wallet sign-in via Privy
- ✅ AI agent reference script: `scripts/ai-reader.ts`
- ✅ Earnings dashboard with per-post + subscription totals + Solscan links
- ✅ All flows verified end-to-end on the live URL

### What's prepared but not yet deployed
- 🟡 **Mainnet keypairs generated, awaiting funding:**
  - Deployer + treasury (mainnet): `41iGsC9mV9FfN9fuua7asQBa5oLLcM13gPCcCnhDvuJL`
  - Mainnet program (planned): `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz`
  - Keypair files at `~/.config/solana/veloran-mainnet-{deployer,program}.json` (WSL Ubuntu, on the user's local machine)
  - Funding required: ≥1.05 SOL on mainnet to deployer
  - **GATING CONSTRAINT:** Until the deployer is funded, blocks 4-8 of the mainnet runbook cannot run.

### What still needs work before May 9
- 🟡 README still says "This is a Next.js project bootstrapped with create-next-app" — needs replacement
- 🟡 `docs/pitch-deck.md` slide 4 needs Pay.sh validation framing
- 🟡 `docs/pitch-deck.md` slide 8 has placeholder `$XB` — needs Postman/IBM stats
- 🟡 `docs/pitch-deck.md` slide 10 needs locked closing one-liner
- 🟡 `docs/demo-script.md` Beat 9 closer voiceover needs locked one-liner
- 🟡 Pitch deck visual design (user-led in Claude artifacts using `docs/pitch-deck.md` as content source)
- 🟡 Demo video recording on Loom (using `docs/demo-script.md`)
- 🟡 200-500 word submission description
- 🟡 Submission to hackathon portal (May 9)

---

## Locked decisions — DO NOT re-litigate

These were resolved through grilling sessions with the user. Treat them as fixed.

| Decision | Locked answer |
|---|---|
| Tagline | *"Veloran — the payment and access layer for the agent economy."* |
| Subhead | *"Sell APIs, datasets, and premium content that humans and AI agents unlock with USDC on Solana."* |
| Closing one-liner (deck slide 10 + demo Beat 9) | *"Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain."* |
| Mainnet scope | **Hybrid** — program deployed on both networks, demo recording on devnet only. NOT full mainnet recording. NOT roadmap-only. |
| Hero use case | Paid API endpoint (crypto/trading vertical for the demo) |
| Existing per-post written-content path | Kept, reframed as "analyst posts bundled with the API" |
| Pay.sh | Validation + complementary, NOT competition |
| Subscriptions in the product | Stay (heavy-buyer flow). Don't remove. |
| Code change for API framing | Zero — content-only ("publish a JSON-shaped post") |
| Deck format | External tool (Pitch.com / Canva / Google Slides / Claude artifacts) → PDF. NOT in-app `/deck` route. |
| Demo recording target | Devnet (zero real-money risk during takes) |
| Native file delivery (CSV/PDF binary) | Out of scope for hackathon. Roadmap only. |
| `/api/catalog` discovery endpoint | Out of scope for hackathon. Roadmap only. |
| Anchor program audit | Out of scope for hackathon. Acceptable risk (100 LOC of Rust, no real users yet). |
| Privy production app for mainnet | Out of scope. Devnet Privy app continues to be used. |
| Frontend wiring to mainnet | Out of scope. Live URL stays devnet. |

---

## Critical files

### Source-of-truth content + scripts
- `docs/pitch-deck.md` — 10-slide content source for the visual deck
- `docs/demo-script.md` — 2:30 voiceover with timing marks for Loom recording
- `docs/x402-spike.md` — rationale for the custom `exact-veloran` scheme
- `docs/specs/2026-04-28-wallet-signin-verification.md` — wallet sign-in verification spec (already complete)
- `CLAUDE.md` — full session-resume notes; first section is the latest state

### Frontend (don't change behavior, only copy if needed)
- `app/page.tsx` — landing
- `app/for-agents/page.tsx` — agent docs
- `app/demo/page.tsx` — judge summary
- `components/PaywallGate.tsx` — human unlock flow
- `components/SubscribeButton.tsx` — human subscribe flow
- `components/CreatorTierEditor.tsx` — seller tier setup
- `components/DashboardClient.tsx` — seller dashboard with EarningsPanel
- `components/AuthRefresh.tsx` — re-renders server pages on Privy login

### API routes (don't change — verified working)
- `app/api/unlock/[slug]/route.ts` — Privy-authed human unlock + cookie set
- `app/api/x402/[slug]/route.ts` — agent x402 endpoint (HTTP 402 + X-PAYMENT)
- `app/api/subscriptions/[creatorId]/route.ts` — subscribe + idempotent verify
- `app/api/subscription-tiers/route.ts` — seller tier upsert
- `app/api/posts/route.ts` — post CRUD (POST + GET)
- `app/api/posts/[id]/route.ts` — DELETE post (owner-only, cascades unlocks)
- `app/api/earnings/route.ts` — dashboard earnings aggregator
- `app/api/preview/route.ts` — Claude-generated post preview helper
- `app/api/me/route.ts` — Privy session → Creator row upsert

### Library
- `lib/x402.ts` — payment requirements builder + on-chain verification (recipient-shaped)
- `lib/anchor-client.ts` — hand-encoded `pay_for_content` instruction builder
- `lib/solana.ts` — devnet constants (USDC mint, program ID, treasury). Hybrid scope keeps these devnet — DO NOT switch to mainnet.
- `lib/content-gate.ts` — HMAC unlock + subscription cookie helpers
- `lib/privy-server.ts` — Privy token verification helpers
- `lib/db.ts` — Prisma client singleton
- `lib/slug.ts` — slug generation + USD↔micro-USDC conversion

### On-chain
- `anchor/programs/veloran-paywall/src/lib.rs` — Rust program (`pay_for_content` instruction)
- `anchor/programs/veloran-paywall/Cargo.toml` — Anchor 0.31.1, no features yet
- `anchor/Anchor.toml` — only has `[programs.devnet]` block currently

### Schema
- `prisma/schema.prisma` — Creator, Post, Unlock, SubscriptionTier, Subscription
- Production DB: Vercel Postgres (Neon), schema synced via `prisma db push`

### Reference scripts
- `scripts/ai-reader.ts` — autonomous agent that exercises `/api/x402/[slug]`

---

## Tasks in execution order

### Block A — Funding-independent prep (P1, ~1 hour, can run NOW)

These don't need mainnet funding. Run them first to advance the schedule.

#### A1. Replace boilerplate README

Edit `README.md`. Replace the create-next-app boilerplate with project content. Suggested structure:

```markdown
# Veloran

The payment and access layer for the agent economy.

Sell APIs, datasets, and premium content that humans and AI agents unlock
with USDC on Solana. 95% direct to you, settled on-chain by an Anchor
program. No facilitator. No custody. No KYC.

**Live demo:** https://veloran-paywall-sage.vercel.app/

## Status
- ✅ Live on Solana devnet
- ✅ Built for the Solana Frontier Hackathon (May 2026)
- 🟡 Mainnet program deploy: pending funding

## How it works
- Humans → Privy email or Phantom wallet checkout
- Agents → HTTP 402 + X-PAYMENT header (custom `exact-veloran` scheme)
- Settlement: Anchor program splits 95/5 atomically in one CPI
- Subscriptions: monthly/yearly tiers via HMAC cookies

## Reference
- Agent docs: https://veloran-paywall-sage.vercel.app/for-agents
- Demo walkthrough: https://veloran-paywall-sage.vercel.app/demo
- Pitch deck content: docs/pitch-deck.md
- Demo script: docs/demo-script.md
- Architect handoff: docs/HANDOFF.md (this file)

## Stack
- Next.js 16 (App Router)
- Tailwind 4 + shadcn-style primitives
- Privy embedded wallets (Solana-only)
- Prisma + Vercel Postgres (Neon)
- Anchor 0.31.1 (Rust)
- @solana/web3.js + @solana/spl-token

## Devnet program
2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS

## Run locally
See AGENTS.md for the Next.js 16 specifics. Standard:
1. cp .env.example .env.local — fill in PRIVY_APP_ID, PRIVY_APP_SECRET,
   ANTHROPIC_API_KEY, NEXT_PUBLIC_HELIUS_RPC_URL, SESSION_SECRET, DATABASE_URL
2. npm install --legacy-peer-deps
3. npx prisma db push  (only on first run)
4. npm run dev
```

**Verify:** `cat README.md | head -10` doesn't say "This is a Next.js project bootstrapped with create-next-app".

#### A2. Update `docs/pitch-deck.md` slide 4 — Pay.sh validation framing

Locate the existing **Slide 4 — Solution** section. Replace its body with:

```markdown
## Slide 4 — Solution + market validation

**Headline:** Pay.sh proved the demand. Veloran fills the seller-side gap.

**Bullets:**
- Pay.sh (Solana Foundation + Google Cloud) lets agents discover and pay for established APIs — proves agent-paid commerce works on Solana
- Cloudflare Pay-Per-Crawl proves content owners want to charge machine traffic
- Postman 2025: 65% of orgs generate API revenue; APIs are revenue products, not just plumbing
- Veloran wedge: publishing + paywall + access + on-chain settlement for *independent sellers* — analysts, researchers, indie API builders, data curators

**Speaker note:** Pay.sh is validation, not competition. Their market is established APIs + agent buyers; ours is independent sellers + sovereign settlement. Both can exist; both are needed for the full agent economy stack.
```

**Verify:** `grep -i "pay.sh" docs/pitch-deck.md` returns at least one hit in slide 4.

#### A3. Update `docs/pitch-deck.md` slide 8 — real stats

Locate **Slide 8 — Market direction / opportunity**. Replace placeholder `$XB` with concrete numbers from the architect handoff prompt:

- Postman 2025 State of the API Report: 5,700+ surveyed, 82% API-first adoption, 65% generate API revenue, 25% derive >50% from APIs (https://www.postman.com/state-of-api/)
- IBM AI Agents Study June 2025: 2,900 execs surveyed, AI workflows growing from 3% to 25% by EOY 2025, 70% say agentic AI essential, 83% expect agents to improve efficiency by 2026 (https://newsroom.ibm.com/2025-06-10-IBM-Study-Businesses-View-AI-Agents-as-Essential,-Not-Just-Experimental)
- Solana stablecoin supply: ~$15.8B per DefiLlama (https://stablecoins.llama.fi/stablecoins?includePrices=true) — used to support Solana as viable settlement infrastructure

Drop any bullet you can't source.

**Verify:** No `$XB` or `$X+ billion` placeholders remain in `docs/pitch-deck.md`.

#### A4. Lock the closing one-liner in slide 10 + demo Beat 9

In `docs/pitch-deck.md` slide 10, ensure the closing line reads exactly:

> *"Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain."*

Same line in `docs/demo-script.md` Beat 9 (closer slide voiceover) — replace whatever's there with the locked one-liner.

**Verify:** `grep -F "Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain." docs/pitch-deck.md docs/demo-script.md` returns at least one match in each file.

#### A5. Commit + push Block A

Single commit:

```bash
cd ~/veloran
git add README.md docs/pitch-deck.md docs/demo-script.md
git commit -m "Pre-mainnet prep: README rewrite, deck slides 4/8/10, demo closer"
git push
```

---

### Block B — Mainnet program deploy (P0, ~1.5 hours, GATED on funding)

**Pre-condition:** the deployer keypair (`~/.config/solana/veloran-mainnet-deployer.json`, pubkey `41iGsC9mV9FfN9fuua7asQBa5oLLcM13gPCcCnhDvuJL`) has been funded with ≥1.05 SOL on mainnet by the user. Verify with:

```bash
solana balance ~/.config/solana/veloran-mainnet-deployer.json --url mainnet-beta
# Expected: ≥1.05 SOL. If 0, STOP — funding hasn't landed yet.
```

The keypair files are on the user's WSL Ubuntu at `~/.config/solana/`. Do NOT exfiltrate them or print their contents. Use them only as referenced by file path.

#### B1. Apply Cargo features to the Rust program

Edit `anchor/programs/veloran-paywall/src/lib.rs`. Wrap the three constants in `#[cfg(...)]` gates:

```rust
#[cfg(not(feature = "mainnet"))]
declare_id!("2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS");
#[cfg(not(feature = "mainnet"))]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
#[cfg(not(feature = "mainnet"))]
pub const TREASURY: Pubkey = pubkey!("DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP");

#[cfg(feature = "mainnet")]
declare_id!("Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz");
#[cfg(feature = "mainnet")]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
#[cfg(feature = "mainnet")]
pub const TREASURY: Pubkey = pubkey!("41iGsC9mV9FfN9fuua7asQBa5oLLcM13gPCcCnhDvuJL");
```

Edit `anchor/programs/veloran-paywall/Cargo.toml`. Add `mainnet = []` to the `[features]` block:

```toml
[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]
mainnet = []
```

Edit `anchor/Anchor.toml`. Add a `[programs.mainnet]` block:

```toml
[programs.devnet]
veloran_paywall = "2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS"

[programs.mainnet]
veloran_paywall = "Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz"
```

#### B2. Back up the existing devnet program keypair

The existing devnet program keypair is at `anchor/target/deploy/veloran_paywall-keypair.json`. Back it up so we can restore it after the mainnet deploy:

```bash
cp anchor/target/deploy/veloran_paywall-keypair.json \
   anchor/target/deploy/veloran_paywall-keypair.devnet-backup.json
```

#### B3. Swap in the mainnet program keypair + build

```bash
cp ~/.config/solana/veloran-mainnet-program.json \
   anchor/target/deploy/veloran_paywall-keypair.json
solana-keygen pubkey anchor/target/deploy/veloran_paywall-keypair.json
# Expected: Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz
```

Build with the `mainnet` feature:

```bash
cd anchor
anchor build -- --features mainnet
```

**Verify:** the build succeeds and `target/deploy/veloran_paywall.so` exists. The compiled binary is now mainnet-flavored (different program ID + USDC mint + treasury embedded).

#### B4. Deploy to mainnet

```bash
anchor deploy \
  --provider.cluster mainnet \
  --provider.wallet ~/.config/solana/veloran-mainnet-deployer.json \
  --program-name veloran-paywall
```

Expected output: `Program Id: Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz`. If RPC times out, retry — `anchor deploy` is resumable.

**Verify:** open https://solscan.io/account/Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz — should show a deployed program. **No `?cluster=` in the URL — that's mainnet by default.**

#### B5. Restore devnet keypair so future devnet builds work

```bash
cp anchor/target/deploy/veloran_paywall-keypair.devnet-backup.json \
   anchor/target/deploy/veloran_paywall-keypair.json
solana-keygen pubkey anchor/target/deploy/veloran_paywall-keypair.json
# Expected: 2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS
```

Verify a clean devnet build still works:

```bash
cd anchor
anchor build
solana-keygen pubkey target/deploy/veloran_paywall-keypair.json
# Expected: 2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS
```

#### B6. Mainnet smoke test

Verify the mainnet program actually works with one tiny `pay_for_content` invocation. Write a script `scripts/mainnet-smoke-test.ts` that:

1. Loads the deployer keypair from `~/.config/solana/veloran-mainnet-deployer.json`
2. Constructs a `pay_for_content(50_000)` instruction (= $0.05 USDC) targeting the mainnet program ID
3. The "creator" and "treasury" are both the deployer (it sends to itself for testing — net zero except fees)
4. Sends + confirms on mainnet
5. Prints the Solscan link

Pre-requisite: deployer wallet has ≥0.10 USDC on mainnet. User funds this from their trading wallet (~$0.10 of real money).

Cost: ~0.0001 SOL in tx fees. USDC stays in the deployer wallet (creator + treasury are both you).

**Verify:** Solscan link from the script shows a successful tx with token-balance changes consistent with a 95/5 split (~$0.0475 to creator ATA, ~$0.0025 to treasury ATA — both the same account, so it nets out, but the program log should show the split).

#### B7. Update doc surfaces with mainnet program ID

Edit:

- `docs/pitch-deck.md` slide 9 — add a bullet: *"Anchor program also deployed on Solana mainnet — `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz`. Devnet used for the demo recording for testability."*
- `docs/demo-script.md` Beat 8 voiceover — *"This is our Anchor program. Deployed on devnet for the recording, AND on mainnet at `Bybn483…` for production-readiness."*
- `app/for-agents/page.tsx` — in the "Reference implementation" section, add: *"Same program deployed on devnet (`2CtnLfde…`) for the demo and mainnet (`Bybn483…`) for production-readiness."*
- `app/demo/page.tsx` — in the "Try it yourself" section, add a bullet for the mainnet program with its Solscan link.
- `CLAUDE.md` first session-resume section — record the mainnet program ID + smoke-test tx signature.

#### B8. Commit + push Block B

```bash
git add anchor/ docs/ app/ CLAUDE.md scripts/mainnet-smoke-test.ts
git commit -m "Mainnet program deploy: Bybn483…, hybrid scope (demo stays devnet)"
git push
```

**Verify:** `git status -s` is clean. Vercel auto-redeploys on push (only doc/copy changes — no behavior change).

---

### Block C — Pitch deck visual design (USER-LED, ~4-6 hours)

User does this in Claude artifacts (or Pitch.com / Canva / Google Slides). The coding agent doesn't author slides; the agent's job is to ensure `docs/pitch-deck.md` is the clean source content (already done by Block A).

**Output:** PDF export of the 10-slide deck. Save to `docs/pitch-deck.pdf` (or wherever; doesn't have to be in the repo).

---

### Block D — Demo video recording (USER-LED, ~3 hours including re-takes)

User does this on Loom following `docs/demo-script.md`. The coding agent doesn't record; the agent's job is to ensure the demo content (a JSON-shaped flagship post) exists on the live URL.

**Pre-recording task for the agent:** create a JSON-shaped flagship post on the live URL (or instruct the user to). Suggested:

- Slug: `sol-alpha-signal-2026-04-29` (or current date)
- Price: $0.50
- Content (paste into the gated content field — preserved by `whitespace-pre-wrap`):

```json
{
  "signal": "long",
  "asset": "SOL",
  "confidence": 0.78,
  "thesis": "Three reasons SOL outperforms majors into Wednesday's FOMC: (1) low CME open interest, (2) treasury inflows from MEME drag, (3) BTC dominance topping at 58.2.",
  "expires": "2026-05-15T12:00:00Z",
  "publisher": "dr.adityasaputra"
}
```

**Output:** Loom URL (unlisted) for the final cut.

---

### Block E — Submission package + portal submit (~1 hour, May 9)

#### E1. Draft 200-500 word submission description

The agent writes this. Borrow heavily from pitch deck slides 1, 4, 5, 10. Save to `docs/submission-description.md`. Hit:

1. One-liner (slide 1)
2. Problem (slide 2)
3. Pay.sh validation framing (slide 4)
4. Product mechanics (slide 5)
5. On-chain settlement moat (slide 6)
6. Locked closing one-liner (slide 10)

Word count: 200-500.

#### E2. Pre-flight rehearsal

Run the verification checklist below end-to-end on the live URL. ~30 min. Catch any rough edges before submitting.

#### E3. Submit to portal

User submits. The agent assembles the final package:

- [ ] **Demo video URL** — Loom unlisted link
- [ ] **Live app URL** — `https://veloran-paywall-sage.vercel.app`
- [ ] **GitHub URL** — `https://github.com/takahibe/veloran` (verify it's public)
- [ ] **Pitch deck** — PDF (from Block C) or share link
- [ ] **Project description** — `docs/submission-description.md` contents pasted
- [ ] **Both program IDs** — devnet `2CtnLfde…` + mainnet `Bybn483…`
- [ ] **Submitter info** — Asta Takahibe / `dr.adityasaputra@gmail.com` / GitHub `takahibe`

---

## Verification checklist (run before submission, ~30 min)

End-to-end on the live URL — every item must pass.

- [ ] `https://veloran-paywall-sage.vercel.app/` renders with positioning v2 hero ("payment and access layer for the agent economy")
- [ ] `/for-agents` renders, mentions devnet AND mainnet program IDs
- [ ] `/demo` renders, mentions devnet AND mainnet program IDs
- [ ] Sign in (email path via Privy) → reach `/dashboard`
- [ ] Sign in (Phantom wallet path) → reach `/dashboard`, shows correct wallet address
- [ ] Create a JSON-shaped flagship post — appears in dashboard with `0 unlocks`
- [ ] Open post in incognito → click Unlock → tx confirms → JSON content reveals + Solscan link
- [ ] Run `npm run ai-reader -- <slug>` against live URL → terminal shows 402 → pay → 200 → JSON parsed
- [ ] Subscribe monthly on `/c/<seller-address>` → "Subscribed · monthly · until …" card appears
- [ ] Subscribed reader visits another post by same seller → unlocks without per-post pay
- [ ] Earnings panel shows per-post + subscription totals + correct counts (1 human, 1 agent, 1 active sub)
- [ ] Solscan link on each unlock points to a real devnet tx with 95/5 token-balance changes
- [ ] Mainnet program at `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz` visible on Solscan (no `?cluster=`)
- [ ] Mainnet smoke-test tx visible on Solscan
- [ ] `git status` clean; `main` branch pushed to GitHub
- [ ] `npx tsc --noEmit` clean (no TypeScript errors)
- [ ] No "Substack" wording anywhere in `app/`, `docs/`, or `README.md`
- [ ] No "fully official x402 compatible" claims anywhere

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Mainnet deploy spends $200 SOL with no functional gain | High | Cargo feature changes are minimal (3 constants). Smoke test (Block B6) catches any miscompile before claiming production-readiness. |
| User sends SOL to wrong address while funding | Catastrophic | Send 0.01 SOL probe first; confirm Solscan; then send remainder. |
| Mainnet RPC times out during deploy | Medium | `anchor deploy` is resumable. Retry with Helius mainnet RPC if `api.mainnet-beta.solana.com` flakes. |
| Cargo feature flag breaks devnet build | Medium | Block B5 explicitly verifies devnet build still produces `2CtnLfde…`. Default behavior (no flag) stays devnet. |
| Demo recording disrupted by RPC lag | Medium | Buffer May 6-8 covers re-recordings. Pre-flight rehearsal in Block E2 is mandatory. |
| GitHub PAT expires | Low | User regenerates at github.com/settings/tokens with 30-day expiration. |
| Wallet sign-in regression | Low | Already verified all 5 flows (see `docs/specs/2026-04-28-wallet-signin-verification.md`). |
| Prisma schema drift on Vercel Postgres | Low | Schema has not changed since `b7873f4`. No migration needed. |
| Submission portal has unexpected fields | Medium | Check portal requirements May 8 (one day before submit). 200-word description already drafted in E1. |
| Subscription cookie collides with unlock cookie | Negligible | Different name prefixes (`vlr_unlock_*` vs `vlr_sub_*`). Both can co-exist. |

---

## Definition of done (May 9 EOD)

The submission ships if and only if **all** of these are true:

1. **Live URL** loads, all 16 verification-checklist items pass.
2. **Mainnet program** at `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz` shows as a deployed program on Solscan with a successful smoke-test transaction.
3. **Devnet program** at `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS` continues to function for the demo recording.
4. **Demo video** is ≤2:35, all 9 beats land, JSON content is readable on screen, Solscan link visible at least once.
5. **Pitch deck PDF** is ≤10 slides, mentions both program IDs on slide 9, closes with the locked one-liner on slide 10.
6. **GitHub repo** is public, README is the new content (not create-next-app boilerplate).
7. **Submission portal** has all 6 fields filled (video, live URL, GitHub, deck, description, submitter info).
8. **Positioning** uses the locked one-liner consistently. Pay.sh framed as validation. No "Substack" or "fully official x402" language.

If any of these fail by May 9 EOD: drop the failing element if non-critical. Use May 10 only as last-resort recovery for portal-submission issues — do NOT re-record the demo on May 10.

---

## Where to read more

- `~/.claude/plans/c-users-user-claude-code-veloran-capita-eager-jellyfish.md` — full plan history (Claude Code internal). The `Veloran Hackathon Finalization Plan (Architect Handoff, Apr 29 evening)` section is the source for this handoff.
- `docs/pitch-deck.md` — slide content
- `docs/demo-script.md` — voiceover script + recording checklist
- `docs/specs/2026-04-28-wallet-signin-verification.md` — completed verification spec
- `docs/x402-spike.md` — rationale for the custom `exact-veloran` scheme
- `CLAUDE.md` — chronological session notes
- `AGENTS.md` — Next.js 16 specifics for AI coding agents

---

*This handoff is current as of commit `7c87d1d`. Update it on each significant state change.*
