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

## Session resume notes (last updated 2026-04-25)

**Progress:** Week 1 complete (Days 1–6 + creator bypass). Human-payment story is real on devnet — demo beats 1–4 bookable.

**Latest commits:**
- `1100b26` — Creator bypass on /p/[slug]
- `094fc0c` — Day 6: signed unlock cookie (refresh-safe)
- `22e0752` — Fix Privy solana:devnet RPC config
- `d1c48ae` — Day 5: real USDC unlock on devnet
- `a661c8e` — Day 4: public paywall page
- (Day 3 + earlier)

**What works end-to-end:**
- Privy email login → embedded Solana devnet wallet (auto-created)
- `/dashboard`: creator profile + post list + unlock counts
- `/post/new`: title/preview/content/price form, slug auto-generated
- `/p/[slug]`: public paywall page; creator sees content directly (banner), reader sees blurred + Unlock button
- Real USDC SPL transfer reader → creator on devnet via `useSignAndSendTransaction`
- Server verifies tx (creator ATA delta + reader ATA debit), creates `Unlock` row, sets HMAC-signed cookie `vlr_unlock_<slug>` (7d TTL)
- Refresh-safe: server reads cookie, renders unlocked
- Solscan tx link shown after fresh unlock
- Existing test post: slug `why-i-m-long-sol-into-fomc-gli90`, $0.50

**Known infra notes:**
- `NEXT_PUBLIC_HELIUS_RPC_URL` still has placeholder — falls back to `api.devnet.solana.com`. User can drop key in for better rate limits.
- `SESSION_SECRET` still the dev-only string — fine until prod
- `ANTHROPIC_API_KEY` still placeholder — needed when we build the Claude preview generator
- `x402@0.7.3` transitive dep of Privy — verify on Apr 29 SDK spike

**Version notes (still relevant):**
- Next.js 16.2.4 (Promise params, async cookies()) — read `node_modules/next/dist/docs/` before page code
- Tailwind 4 (PostCSS plugin, no tailwind.config.js)
- Prisma 6 (NOT 7 — schema.prisma has `url` directly)
- React 19 / Privy 3.22.1 / @solana/web3.js 1.98 / @solana/spl-token 0.4

**Open decisions:**
- WSL vs native Windows for Solana/Anchor toolchain — must decide before Apr 27 (Week 2 starts)

**Next up (user picked Option C: lower-effort polish before Anchor):**
Pending choice between:
1. Landing page glow-up (~60 min, high demo value)
2. Claude preview generator (~45 min)
3. Earnings card on dashboard (~45 min, high demo value)
4. Delete post button (~30 min)

Recommended order for demo video impact: 1 → 3 → 2 → 4. User to confirm on resume.

**Punted / known UX gaps:**
- No edit post route (delete-and-recreate is the workaround)
- Dashboard route is shown to any logged-in user, not just creators (fine for MVP)
- No rate limiting on `/api/posts` or `/api/unlock` (acceptable for hackathon devnet demo)

**How to resume dev server:**
```
cd "C:\Users\User\CLAUDE CODE\Veloran Capital\veloran"
npm run dev
```

**Key files (current map):**
- Pages: `app/page.tsx`, `app/dashboard/page.tsx`, `app/post/new/page.tsx`, `app/p/[slug]/page.tsx`
- API: `app/api/me/route.ts`, `app/api/posts/route.ts`, `app/api/unlock/[slug]/route.ts`
- Lib: `lib/db.ts`, `lib/privy-server.ts`, `lib/solana.ts`, `lib/content-gate.ts`, `lib/slug.ts`
- Components: `Providers.tsx`, `LoginButton.tsx`, `DashboardClient.tsx`, `NewPostClient.tsx`, `PaywallGate.tsx`
- Schema: `prisma/schema.prisma` (Creator, Post, Unlock)

