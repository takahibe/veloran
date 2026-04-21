@AGENTS.md

# Veloran — x402 Creator Paywall

**Brand:** Veloran. **Tagline:** *"Substack for the agent economy."*
**Hackathon:** Solana Frontier — submission due **May 10, 2026**.

## Product (one sentence)
Creators paywall any content (article, API feed, dataset, PDF) with a single link. Readers — human or AI agent — auto-pay $0.05–$5 in USDC via x402 and unlock instantly. Platform takes 5%, split on-chain via an Anchor program.

## Team / who is building
- **Dr. Aditya Saputra** — product owner, directs implementation. Beginner coder (basic HTML, starting Python, no JS/TS). Domain: medical doctor, hospital administration, crypto trader, content creator.
- **Claude (Opus 4.7)** — writes all code. User reviews, tests, learns passively from diffs.

## Framework note

Scaffolded with **Next.js 16.2.4** (newer than training data). Read `node_modules/next/dist/docs/` before writing any page/route code. Respect deprecation notices in that version.

## Non-negotiables from the approved plan

- Everything on **Solana devnet** for the hackathon (no mainnet, no real funds)
- Demo-first: a working 2-minute video is the submission, not a production app
- Scope is locked — no Substack-style subscriptions, no mobile app, no fiat onramp, no comments
- Every decision gets measured against "does this help the demo video land?"

## Tech stack (locked)

| Layer | Choice |
|---|---|
| Frontend | Next.js 16, Tailwind, shadcn/ui |
| Auth/Wallet | Privy embedded wallet (email login, no seed phrase) |
| On-chain (Rust) | Anchor 0.30 — single instruction `pay_for_content` w/ 95/5 split |
| On-chain (TS) | `@solana/web3.js` + Anchor TS client |
| x402 | `@proxies-sx/x402-solana` (primary) or Corbits or hand-rolled (fallback) |
| Data | Helius devnet RPC (free tier) |
| LLM | Vercel AI SDK → Claude Sonnet 4.6 for preview summaries |
| DB | SQLite (Prisma) local, Vercel Postgres in prod |
| Deploy | Vercel + Vercel Cron |

## Repo layout (target)

```
veloran/
├── app/
│   ├── page.tsx                       # Landing
│   ├── dashboard/page.tsx             # Creator: posts + earnings
│   ├── post/new/page.tsx              # Create paywall
│   ├── p/[slug]/page.tsx              # Public paywall page
│   └── api/
│       ├── posts/route.ts
│       ├── unlock/[slug]/route.ts     # x402-gated endpoint (wow demo)
│       ├── preview/route.ts           # Claude preview generator
│       └── earnings/route.ts
├── lib/
│   ├── privy.ts
│   ├── x402.ts
│   ├── anchor-client.ts
│   ├── content-gate.ts                # Signed session tokens
│   └── db.ts
├── anchor/
│   └── programs/veloran-paywall/src/lib.rs
├── prisma/schema.prisma
└── scripts/ai-reader.ts               # Demo AI agent that auto-pays
```

## Schedule (tight — 20 days total)

- **Apr 20–26**: Foundation + human-payment flow
- **Apr 27–May 3**: Anchor program + x402 + AI reader script
- **May 4–10**: Deploy, pitch deck, demo video, submit

Full day-by-day in the approved plan at `~/.claude/plans/c-users-user-claude-code-veloran-capita-eager-jellyfish.md`.

## Open decisions pending

- **WSL vs native Windows for Solana/Anchor** — decide before Apr 27. Native Windows toolchain is painful; WSL Ubuntu is the canonical path.
- **x402 SDK choice** — spike on Apr 29 between `@proxies-sx/x402-solana` and Corbits; fall back to hand-rolled if both flaky.

## Collaboration preferences (from root CLAUDE.md)

- Beginner-friendly explanations. No unexplained jargon.
- Default language: English. Indonesian if user writes Indonesian.
- Ask clarifying questions for discrete choices.
- *This project* is TypeScript/Rust — Claude writes all of it; user directs.

## The demo (what we're ultimately building toward)

Eight beats, two stories (human + AI), one closer. Full script in the plan file's "Verification" section. If every beat works on camera, we submit.

---

## Session resume notes (last updated 2026-04-21)

**Progress:** Day 2 of 20 complete. Committed as `Day 2: Privy auth, Prisma schema, dashboard shell`.

**What exists and works:**
- Next.js 16.2.4 + Tailwind 4 scaffold
- Prisma 6 schema (`Creator`, `Post`, `Unlock`) + SQLite dev.db migrated
- Privy provider on `@privy-io/react-auth@3.22.1` with Solana-only embedded wallets
- `/` landing page with sign-in CTA
- `/dashboard` client component that upserts Creator via `/api/me`
- `POST/GET /api/me` verifies Privy bearer token
- Routes compile: `GET /` and `/dashboard` both return 200

**Known discovery (unverified):** `x402@0.7.3` is a transitive dep of Privy — may obviate separate x402 SDK install. Verify on Apr 29 spike day.

**Known version mismatches from training data:**
- Next.js 16 (not 15) — read `node_modules/next/dist/docs/` before writing page code
- Tailwind 4 (not 3) — different config file structure
- Prisma 6 (downgraded from 7 which requires new `prisma.config.ts` adapter API)

**Blocked on user action when session resumes:**
1. User needs to paste Privy App Secret into `veloran/.env.local` (replacing `PASTE_YOUR_PRIVY_APP_SECRET_HERE`)
2. User needs to test login flow at `localhost:3000` and confirm Creator row is created
3. If step 2 fails, debug before starting Day 3

**Next up (Day 3, Apr 22 per plan):**
- Build `/post/new` form (title, content, price)
- Add `POST /api/posts` route (authed, inserts Post)
- Add post list to `/dashboard`
- No Solana interactions yet — pure CRUD

**How to resume dev server:**
```
cd "C:\Users\User\CLAUDE CODE\Veloran Capital\veloran"
npm run dev
```

**Files created this session:**
- `lib/db.ts` — Prisma singleton
- `lib/privy-server.ts` — token verification helper
- `components/Providers.tsx` — PrivyProvider wrapper
- `components/LoginButton.tsx` — landing page CTA
- `components/DashboardClient.tsx` — gated dashboard client component
- `app/dashboard/page.tsx`, `app/api/me/route.ts`
- `prisma/schema.prisma`, `prisma/dev.db`, `prisma/migrations/20260420162738_init/`
- `.env`, `.env.local`, `.env.example`

