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

## Session resume notes (last updated 2026-04-28, end of Week 2 day 6)

**Progress:** All planned features built. ~4 days ahead of plan. Remaining work is publishing (deploy, deck, video, submit).

**Latest commits (WSL only — Windows origin still at 2b27899):**
- `e581a6f` — Day 6 W2: Claude preview generator on /post/new
- `10db36c` — Session save (Apr 28): Week 2 day 5 complete
- `1fd5bf2` — Day 5 W2: AI reader script + dev send-usdc helper
- `dfecf98` — Day 4 W2: Creator earnings dashboard
- `3637649` — Day 3 W2: x402-style endpoint /api/x402/[slug]
- `1ad791c` — Day 2 W2: route unlock through Anchor program
- `59359a3` — Day 1 W2: Anchor pay_for_content deployed to devnet
- `f195f72` — Session save: WSL toolchain installed
- (Week 1 history above this in Windows origin)

**End-to-end verified beats:**
- Beat 1–4 (human story): browser → Privy → pay 0.5 USDC → content reveals + cookie persists
- Beat 5 (agent story): `npm run ai-reader -- <slug>` → 402 challenge → on-chain pay → content
- Beat 6 (earnings): dashboard EarningsPanel shows lifetime $ + human/agent pill counts
- Beat 7 (Solscan): every unlock tx visible at `solscan.io/tx/<sig>?cluster=devnet`, program at `solscan.io/account/2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS?cluster=devnet`
- Beat 8 (closer): pure pitch, no code

**Devnet artifacts:**
- Program ID: `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`
- Treasury: `DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP` (= deploy keypair)
- Test post slug: `why-i-m-long-sol-into-fomc-gli90` ($0.50)
- Human reader Privy wallet: `9Y59DuDPLunps2ripujxYUXgytycvfRvwgeJHh8Tm2TZ` (~7.5 USDC remaining)
- Agent keypair file: `~/.config/solana/agent.json`, address `3P6VDakhDkEhweHN6uz96RjtzoevGZNndFU3EoYLVmYB`

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

**Open decisions:** none currently blocking — toolchain decision RESOLVED (Option A, WSL Ubuntu).

## WSL toolchain — INSTALLED + VERIFIED (2026-04-26)

**Canonical workspace is now `~/veloran` inside WSL Ubuntu.** The Windows copy at `C:\Users\User\CLAUDE CODE\Veloran Capital\veloran` is the git origin but no longer where dev happens. To sync the Windows copy with new commits, the user needs to manually `git push` from WSL — but git refuses to push into a non-bare checked-out branch by default. Easier flow: edit CLAUDE.md / docs from Windows (commit there), then `git pull origin main` from WSL on resume.

**Installed in WSL Ubuntu:**
- gcc 13.3.0 (build-essential + libssl-dev + libudev-dev + pkg-config)
- rustc 1.95.0
- solana-cli 3.1.14 (Agave) — config set to devnet, keypair at `~/.config/solana/id.json`, balance 5 SOL (web faucet — devnet airdrop CLI was rate-limited)
- avm + anchor-cli 0.31.1 (NOT 0.30.1 — see version note below)
- node v20.20.2 / npm 10.8.2

**Critical version note:** Plan said Anchor 0.30. **Anchor 0.30.1 does NOT compile on Rust 1.95** — `proc-macro2::Span::source_file` was removed in newer proc-macro2, breaks `anchor-syn 0.30.1`. Pinned to **Anchor 0.31.1** for both CLI (avm) and crate (`anchor-lang = "0.31.1"` in `programs/veloran-paywall/Cargo.toml`). Build succeeds clean.

**Project state in WSL (~/veloran):**
- Full repo cloned from Windows path. `git log` matches Windows up to commit `2b27899`.
- `npm install --legacy-peer-deps` completed (1188 packages, 23 non-critical vulns ignored).
- `.env.local`, `.env`, `prisma/dev.db` copied over from Windows.
- Anchor workspace scaffolded at `~/veloran/anchor/`:
  - `programs/veloran-paywall/src/lib.rs` — default scaffold with `declare_id!("KrJCJYARa5cW1jXe9ojLRPAiaWKMddmCZLiKHm5oYSU")` and empty `initialize` instruction
  - `Anchor.toml` — cluster: Devnet; `[programs.devnet]` references `veloran_paywall = "KrJC..."` (note: program ID is the Anchor-generated default; user's deploy keypair will not match — must regenerate ID with `anchor keys list` + `anchor keys sync` before first deploy)
  - `programs/veloran-paywall/Cargo.toml` — pinned `anchor-lang = "0.31.1"`, package name `veloran-paywall`, lib name `veloran_paywall`
- `anchor build` ✅ succeeds, produces `target/deploy/veloran_paywall.so`

**Important: program ID needs regeneration before first deploy.** The default `KrJC...` ID came from the Anchor scaffold; the actual ID is derived from the deploy keypair Anchor generates at `target/deploy/veloran_paywall-keypair.json`. Run `anchor keys list` to see the real one, then `anchor keys sync` to update both `lib.rs` `declare_id!` and `Anchor.toml`. Do this before writing the program logic so the ID is stable.

**No commits made in WSL yet.** All Anchor scaffold files are uncommitted in `~/veloran`.

**Polish pass results (Apr 25 session):**
- ✅ Landing page glow-up (commit 707777f)
- ✅ Delete post button (same commit)
- ⏭️ Still available: Claude preview generator (~45 min) — needs ANTHROPIC_API_KEY in .env.local

**Next session — publishing phase:**
1. **GitHub repo + Vercel deploy** (~60–90 min) — biggest risk surface. SQLite → Vercel Postgres migration, env-var checklist, build/runtime fixes. **Resolve the WSL-vs-Windows origin issue here**: create GitHub repo, push WSL → GitHub, set both Windows + WSL clones to use GitHub as origin. Stop using the file:// remote.
2. **Internal dress rehearsal** — full demo end-to-end on the live URL
3. **Pitch deck** (~90 min) — 10 slides per the plan's "Verification (the demo script)" section
4. **Demo video** (~60 min) — 2-min Loom, scripted voiceover, 8 beats
5. **Submit** (target May 9, deadline May 10)

**Vercel deploy gotchas to remember:**
- Env vars only load on boot — every change = redeploy
- ANTHROPIC_API_KEY, NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET, NEXT_PUBLIC_HELIUS_RPC_URL, SESSION_SECRET, DATABASE_URL all need to land in Vercel project settings
- DATABASE_URL switches from `file:./dev.db` to a Vercel Postgres connection string. Schema's `provider` line in `prisma/schema.prisma` will need to flip from `sqlite` to `postgresql`
- The `prisma/dev.db` file is local only — production starts with empty DB; user needs to log in fresh + create demo posts on prod
- Build command: `prisma generate && next build` (currently just `next build` — Vercel may need `prisma generate` before build)
- The Anchor `target/` directory is gitignored; Vercel doesn't need it (the Next.js app only imports the IDL JSON, which IS committed at lib/idl/)

**Optional polish still on the shelf (none blocking):**
- Agent earnings PDA on-chain (current dashboard pulls from SQLite; "off-chain" reading)
- Bring `dev/send-usdc` behind an admin gate (currently anyone logged in can send their OWN USDC — actually fine UX)
- Multi-post AI reader: `npm run ai-reader -- --all` reads every paywall in sequence
- Rename Windows folder from "Veloran Capital" to just "Veloran"

**Demo dependencies that must work on the live URL:**
- Privy login flow (test with both fresh + existing emails)
- Helius RPC (or fall back to api.devnet.solana.com — already coded)
- USDC faucets (Circle's was flaky Apr 28; `/dev/send-usdc` is the bypass)
- AI reader script connects to live URL via `VELORAN_BASE_URL=<vercel-url>`

**Faucet pain note:** Circle's devnet USDC faucet (https://faucet.circle.com) was unreachable on Apr 28. Fallback `/dev/send-usdc` lets the human Privy wallet bankroll any test address. Use this whenever a fresh test wallet needs USDC.

**Demo artifacts to remember:**
- Test post: `/p/why-i-m-long-sol-into-fomc-gli90` ($0.50)
- Program ID: `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`
- Treasury: `DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP`
- Agent address: `3P6VDakhDkEhweHN6uz96RjtzoevGZNndFU3EoYLVmYB` (~1.5 USDC remaining after Apr 28 testing)
- Human reader Privy wallet: `9Y59DuDPLunps2ripujxYUXgytycvfRvwgeJHh8Tm2TZ` (~5.5 USDC remaining)

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

