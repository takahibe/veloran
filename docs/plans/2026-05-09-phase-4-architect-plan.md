# Veloran Phase 4 — Architect Plan

**Author:** Architect Coding Planner (Claude)
**Created:** 2026-05-09
**Repo (production):** `/root/veloran-astachain-clean` on VPS
**Repo (planning copy):** `~/veloran` (WSL Ubuntu, where this plan was authored)
**Branch:** `main`
**Reference commit (per brief):** `9627a18 fix: use server payment memo for intent-bound payments`
**Reference plan:** `/root/veloran-astachain-clean/.hermes/plans/2026-05-09_001616-veloran-phase-4-hardening.md`
**Production alias:** `https://veloran-paywall-sage.vercel.app`

> **Author's caveat:** the Phase 4 code base — `lib/payment-intents.ts`, `lib/payment-memo.ts`, `app/api/payment-intents/[slug]/route.ts`, `scripts/payment-safety-smoke.ts`, and the `PaymentIntent` / `PaymentReceipt` Prisma models — was developed on the VPS. The architect produced this plan from the Phase 4 hardening brief, the prior architecture (intent-less devnet flow), and inferred design from the brief's bug-fix description (server memo formerly used random nonce; clients now use the server-provided `memo` field directly). Where this plan describes a function or shape that was inferred rather than read from source, it is flagged as **[INFERRED — VERIFY]**. Treat those as the first thing to validate before executing.

---

## 1. Executive summary

**What Phase 4 hardens, in one paragraph:**
The devnet payment path works, but it is not boring enough for mainnet. Phase 4 closes five categorical gaps: (a) public-facing copy still describes the old idempotent-replay semantics rather than the new consumed-intent rejection, (b) the payment-safety smoke test is too thin to be a baseline for mainnet readiness, (c) Prisma migration history for production was applied through a temporary protected runtime endpoint and lacks a real baseline, (d) network-aware boot guards do not yet prevent a mainnet deployment from accidentally booting with devnet constants, and (e) the subscription path was built earlier than the intent-bound model and may not be replay-safe under the new rules. Phase 4 also adds the structured logs and `/api/health` surface needed for ops to be quietly trustworthy. After Phase 4 passes, Veloran is in a position to make a **single tiny-value mainnet smoke** decision; not before.

**Key non-negotiables (from the brief):**

1. No mainnet shortcut. Mainnet only after migration baseline + payment audit + monitoring gates pass.
2. No private secrets in chat, docs, commits, logs. Use `[REDACTED]` everywhere.
3. No destructive Prisma migration against production. Baseline carefully.
4. No blind admin/migration endpoints. If unavoidable, protect → use → remove → confirm 404.
5. Security over convenience. If a flow is not provably replay-safe, disable it for mainnet.
6. Devnet remains the default until all gates pass.
7. Next.js 16.2.4 caution — read `node_modules/next/dist/docs/` before changing framework behavior.

**Architect's stance on the path forward:**
The brief and observed code progression point to a clean path. The single highest-value batch is **Batch 1 (stale replay copy)** — it removes the gap between what the product does and what the docs claim, and unblocks an honest pitch deck on submission day. The single highest-risk batch is **Batch 6 (Prisma baseline)** — propose, then **pause for explicit user approval** before executing.

For mainnet activation: **disable subscriptions in mainnet mode for the first smoke** (Option A in section 8). Subscriptions stay on devnet. Per-call payments only on mainnet first, with a hard cap (≤ $1 USDC per intent) until Phase 5 hardens the subscription path.

---

## 2. Current architecture map

> Names below match the brief. Where files were not read directly, behavior is described from the brief's text.

### 2.1 Agent x402 flow (intent-bound, post-9627a18)

```
[Agent]                                      [Server]                          [Solana devnet]
  │
  │  GET /api/x402/<slug>
  ├──────────────────────────────────────────►
  │                                            │ create PaymentIntent row
  │                                            │ generate server memo (intent.id-derived)
  │                                            │
  │  402 + { x402Version, accepts: [...],     │
  │         intentId, memo, payTo, ... }      │
  │◄──────────────────────────────────────────┤
  │
  │  build pay_for_content tx
  │  embed memo from response
  │  sign + send
  ├──────────────────────────────────────────────────────────────────────────►
  │                                                                            │
  │                                            tx confirmed                    │
  │◄──────────────────────────────────────────────────────────────────────────┘
  │
  │  GET /api/x402/<slug>
  │  X-PAYMENT: <base64url JSON>
  ├──────────────────────────────────────────►
  │                                            │ fetch tx from RPC
  │                                            │ verify program invocation
  │                                            │ verify memo matches intent
  │                                            │ verify payer matches header
  │                                            │ verify recipient/platform deltas
  │                                            │ mark intent CONSUMED, write PaymentReceipt
  │                                            │ create Unlock row
  │
  │  200 + content                            │
  │◄──────────────────────────────────────────┤
  │
  │  (replay attempt with same X-PAYMENT)
  ├──────────────────────────────────────────►
  │                                            │ intent already CONSUMED
  │  409 { error: "Payment intent already consumed" }
  │◄──────────────────────────────────────────┤
```

**Critical post-9627a18 invariant:** the agent now uses the `memo` field from the 402 response directly (not derived locally). The server's verification function checks that the on-chain memo matches `intent.memo`. This closes the bug where the server used a random nonce while clients tried to derive memo from `intent.id`.

### 2.2 Human unlock flow

`PaywallGate.tsx` → `/api/unlock/[slug]` (Privy-authed). **[INFERRED — VERIFY]** that the human path also goes through `PaymentIntent` now (i.e., the human flow creates an intent on PaywallGate mount and submits the same memo). If it does NOT, the human flow lives in a different replay-safety regime than the agent flow. **First file to read on resume:** `app/api/unlock/[slug]/route.ts` to confirm intent integration.

### 2.3 Subscription flow

`SubscribeButton.tsx` + `app/api/subscriptions/[creatorId]/route.ts`. As of `b7873f4` (the last commit I have direct access to), this flow uses a transaction signature as the idempotency key — the OLD model. Whether it has been migrated to the intent-bound model in Phase 4 is unknown. **Default assumption: NOT migrated.** This is why the brief asks for a disable-or-harden decision (section 8).

### 2.4 Database

Models: `Creator`, `Post`, `Unlock`, `SubscriptionTier`, `Subscription`, `PaymentIntent`, `PaymentReceipt`.

`PaymentIntent` shape **[INFERRED — VERIFY]**:
- `id` (cuid)
- `slug` (the resource)
- `memo` (server-generated, intent-bound; this is the canonical memo clients embed)
- `state` enum: `PENDING | CONSUMED | EXPIRED | FAILED`
- `createdAt`, `expiresAt`
- `payerAddress` (set on consumption)
- `txSignature` (set on consumption, unique)
- relation → `PaymentReceipt`

`PaymentReceipt` shape **[INFERRED — VERIFY]**:
- `id`
- `intentId` (1:1 with PaymentIntent)
- `txSignature` (unique)
- `creatorDelta`, `platformDelta` (recorded for audit)
- `consumedAt`

### 2.5 Solana verification

`lib/x402.ts` exposes `verifyOnChainPayment({ tx, recipientAddress, amountUsdc, expectedPayerAddress })` that walks the parsed transaction and asserts:

1. `tx.meta.err === null`
2. Account keys include `VELORAN_PROGRAM_ID`
3. recipient ATA delta ≥ expected creator share
4. platform ATA delta ≥ expected platform share
5. (creator + platform) delta ≥ price
6. claimed payer's ATA was actually debited ≥ price

Phase 4 adds: **memo verification** (the server-issued memo must appear in the tx as a Memo program instruction or program log, **[INFERRED — VERIFY]** which one). This is the linchpin of the new intent-bound model.

### 2.6 Deployment

- **Production:** Vercel auto-deploy on push to `main`. Environment variables stored in Vercel.
- **Database:** Vercel Postgres (Neon).
- **VPS:** `/root/veloran-astachain-clean` is the development repo where Phase 4 code currently lives, not yet pushed to origin.
- **Solana:** devnet only. Anchor program at `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`. Mainnet program at `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz` deployed but NOT yet wired in (per session notes pre-Phase-4).

---

## 3. Risk register

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Stale replay docs reach a judge or grant reviewer who tests the API and is confused by the 409 response | High | High | Batch 1: replace all "idempotent / same signature returns content" language with "consumed-intent rejection" language. |
| R2 | A real malicious payer crafts an X-PAYMENT with a stale memo from a different intent, and the verification accepts it because memo binding is half-implemented | Catastrophic (real funds) | Low (devnet) → Medium (mainnet) | Batch 2: fixture-based test that wrong memo is rejected; manual code review of the verification path; refuse mainnet boot until this test is green. |
| R3 | Prisma `migrate deploy` against the existing production DB fails because there is no baseline migration | High | High | Batch 6: `prisma migrate diff --from-empty --to-schema-datamodel` to author a baseline; `prisma migrate resolve` to mark applied; tested on a snapshot. **PAUSE for user approval.** |
| R4 | Mainnet deployment boots with devnet USDC mint or devnet program ID via env-var oversight | Catastrophic | Medium | Batch 3: server-side assertion at boot (`process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'` ⇒ require mainnet constants; throw otherwise). |
| R5 | Subscriptions exposed on mainnet but lack intent-bound replay protection; double-charge possible | Catastrophic | Medium | Batch 5: disable subscription routes when `NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'` until Phase 5. **PAUSE for user approval.** |
| R6 | Temporary admin/migration endpoint left enabled in production | High | Medium | Batch 6 cleanup includes "remove endpoint, remove its secret, redeploy, confirm 404". |
| R7 | Logs leak X-PAYMENT contents, intent memos, or DB URLs | Medium | Medium | Batch 4: structured logger that allowlists keys; never log raw headers, raw env, or full request bodies. |
| R8 | RPC rate-limited mid-pay; agent retries the same memo multiple times → multiple PaymentIntents in `PENDING`, none consumed → looks like a leak | Medium | Low | Batch 4: short-lived intents (suggested 5 min `expiresAt`) plus a `cron`/cleanup script that marks expired intents `EXPIRED`. |
| R9 | Wallet-sign-in UI promises Phantom on mainnet but the program ID is hardcoded to devnet | High | Medium | Batch 3: every place that builds a tx checks the network mode and selects program ID + USDC mint accordingly. |
| R10 | Demo video recorded on devnet still works, but `docs/HANDOFF.md` and `docs/demo-script.md` reference outdated devnet-only flow text | Low | High | Batch 1 also touches `docs/`. |
| R11 | First mainnet smoke fails because of an unforeseen mainnet-specific issue (RPC, ATA rent, wallet setup) and burns the SOL deploy fee with no signal to recover | Medium | Medium | Run the smoke against a self-loop (deployer pays self-creator); cap value at ≤ $0.10 USDC for the first call. |

---

## 4. Recommended execution batches

Each batch is sized so it can be implemented, tested, committed, and deployed independently. Each batch ends with `tsc --noEmit` clean + the relevant smoke test green + a single commit. **PAUSE markers** are mandatory.

### Batch 1 — Stale replay copy (low risk, high signal)

**Scope:** Replace "replay returns content / idempotent" language with "consumed-intent rejection" everywhere user-facing.

**Files (likely):**
- `README.md`
- `docs/HANDOFF.md` — section "Verification checklist" mentions replay; rewrite
- `docs/pitch-deck.md` — slide 6 (on-chain split) and slide 9 (proof) may say "idempotent"
- `docs/demo-script.md` — Beat 5 voiceover and the failure-recovery section
- `app/for-agents/page.tsx` — "Step 4 — A successful unlock" and idempotency note
- `app/demo/page.tsx` — "What's happening on-chain" section
- `components/PaywallGate.tsx` — comments
- `scripts/ai-reader.ts` — terminal output line "Replay this same signature anytime → server returns the same content idempotently."

**Verification:** `rg -n "idempotent|replay.*content|same txSignature|same signature" README.md app docs components scripts` returns zero hits with the old semantics.

**Commit message:** `Phase 4 (1/N): replace stale replay-idempotency copy with consumed-intent rejection`

### Batch 2 — Fixture-based payment-safety tests

**Scope:** Replace `scripts/payment-safety-smoke.ts`'s static guard with a fixture-driven suite that exercises the verification invariants.

**Test cases (from the brief plus inferred):**

1. ✅ **Correct memo accepted** — happy path; current behavior baseline.
2. ❌ **Wrong memo rejected** — fixture: tx with a memo from a different intent; assert verification returns failure with a specific error code.
3. ❌ **Missing Veloran program rejected** — fixture: a vanilla SPL transferChecked tx with no Veloran CPI; assert reject.
4. ❌ **Wrong payer rejected** — fixture: tx where `expectedPayerAddress` ATA is not the funder; assert reject.
5. ❌ **Missing recipient ATA rejected** — fixture: tx that doesn't include the post creator's ATA in account keys; assert reject.
6. ❌ **Missing platform ATA rejected** — same shape, treasury ATA missing.
7. ❌ **Missing payer ATA rejected** — same shape, payer ATA missing.
8. ❌ **Insufficient creator delta rejected** — fixture: tx where the recipient ATA receives < 95% of the price.
9. ❌ **Insufficient platform delta rejected** — fixture: tx where the platform ATA receives < 5%.
10. ❌ **Duplicate signature / consumed intent rejected** — DB-level test: insert a `CONSUMED` PaymentIntent with a known `txSignature`; route should return 409.
11. ❌ **Expired intent rejected** — DB-level: insert a `PENDING` PaymentIntent with `expiresAt` in the past; route should return 410 (or whatever the chosen status).

**Approach:** use Solana's `Connection` + a fake `getParsedTransaction` mock OR pre-recorded fixture JSON. Inferred: the existing `verifyOnChainPayment` is a pure function of `{ tx, recipientAddress, amountUsdc, expectedPayerAddress }` — fixture-friendly.

**File:** `scripts/payment-safety-smoke.ts` (extend, don't replace) or new `scripts/payment-verification.test.ts` if the project moves to a real test runner.

**Verification:** `npm run test:payment-safety` shows N tests passing, none skipped, tests 2-11 each fail with a distinct, asserted error reason (not just "rejected" — the wrong-memo test fails with a `MEMO_MISMATCH` code, etc.).

**Commit message:** `Phase 4 (2/N): fixture-based payment verification tests`

### Batch 3 — Network-aware boot + Solscan helper

**Scope:** Make it impossible to boot mainnet with devnet constants, and centralize Solscan link generation.

**File changes:**

- `lib/solana.ts` — read `process.env.NEXT_PUBLIC_SOLANA_NETWORK` (`devnet` | `mainnet`), select the correct USDC mint, program ID, and treasury per-network. Throw at module load if the network is `mainnet` but constants point to devnet values.
- `lib/network.ts` (new) — `solscanTxUrl(sig)`, `solscanAccountUrl(addr)`, `currentNetwork()` helpers; never hardcode `?cluster=devnet`.
- Find every hardcoded `?cluster=devnet`: `rg -n "cluster=devnet|cluster=mainnet"` and replace with the helper.
- Find every hardcoded mint or program ID that should switch by network: `rg -n "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU|EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v|2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS|Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz"` and centralize.
- Vercel env vars (no commit needed; document in `docs/HANDOFF.md`):
  - `NEXT_PUBLIC_SOLANA_NETWORK=devnet | mainnet`
  - `NEXT_PUBLIC_HELIUS_RPC_URL` — must match the network
  - Server-only RPC URL for verification: `SOLANA_RPC_URL_SERVER` (private; fallback to `NEXT_PUBLIC_HELIUS_RPC_URL`)

**Verification:** local boot with `NEXT_PUBLIC_SOLANA_NETWORK=mainnet` + devnet-shaped env should fail loudly, NOT silently fall through to devnet.

**Commit message:** `Phase 4 (3/N): network-aware constants + Solscan helper; refuse boot on mismatch`

### Batch 4 — Structured logs + `/api/health`

**Scope:** Add allowlist-based structured logger; emit five well-defined events; surface a coarse health endpoint.

**File changes:**

- `lib/log.ts` (new) — `log.event(name, payload)` that JSON-stringifies an allowlisted set of fields. Reject keys not on the allowlist. Never serialize `process.env`.
- `app/api/x402/[slug]/route.ts` and `app/api/payment-intents/[slug]/route.ts` — emit:
  - `payment_challenge_created` (intentId, slug, network, expectedAmount)
  - `payment_tx_lookup_failed` (intentId, signaturePrefix6, network, errorCode)
  - `payment_verification_failed` (intentId, reason: "memo_mismatch" | "wrong_payer" | "insufficient_delta" | ...)
  - `payment_accepted` (intentId, signaturePrefix6, network, creatorDeltaMicro, platformDeltaMicro)
  - `payment_replay_rejected` (intentId, signaturePrefix6, network)
- `app/api/health/route.ts` (new) — GET returns:
  ```json
  {
    "app": "ok",
    "db": "ok" | "fail",
    "rpc": "ok" | "fail",
    "network": "devnet" | "mainnet"
  }
  ```
  No env dump, no version, no env vars. Pings DB with a SELECT 1 and RPC with a `getLatestBlockhash` to determine status.

**Verification:** `curl https://veloran-paywall-sage.vercel.app/api/health` returns the JSON above. Vercel logs after a manual `/api/x402/<slug>` show all five event names from a single test flow.

**Commit message:** `Phase 4 (4/N): structured payment logs + /api/health`

### Batch 5 — Subscription decision (PAUSE before implementing)

**Scope:** Audit `components/SubscribeButton.tsx` and `app/api/subscriptions/[creatorId]/route.ts`. Decide: disable on mainnet (Option A) OR migrate to intent-bound model (Option B).

**Architect's recommendation:** **Option A** for first mainnet smoke. Implementation:

- `app/api/subscriptions/[creatorId]/route.ts` — at handler top: `if (currentNetwork() === 'mainnet') return NextResponse.json({ error: "subscriptions are devnet-only during Phase 4" }, { status: 503 });`
- `components/SubscribeButton.tsx` — read `process.env.NEXT_PUBLIC_SOLANA_NETWORK`; if mainnet, render disabled button with tooltip "Subscriptions launch in Phase 5. Use per-call payments."
- `app/c/[address]/page.tsx` — same gate on the Subscribe card; show "Per-call only on mainnet" message.

Option B (migrate subs to intent-bound) is **explicitly out of scope** for Phase 4. It is Phase 5.

**PAUSE here.** Do not implement until user explicitly says "Option A — disable" or "Option B — harden now."

**Verification (Option A):** with `NEXT_PUBLIC_SOLANA_NETWORK=mainnet`, the subscribe routes 503, the dashboard tier editor still saves prices (devnet record), the `/c` page renders the disabled state.

**Commit message:** `Phase 4 (5/N): disable subscriptions in mainnet mode (Option A)` OR `Phase 4 (5/N): migrate subscriptions to intent-bound payments (Option B)`

### Batch 6 — Prisma migration baseline (PAUSE before implementing)

**Scope:** Establish a real Prisma migration history for production. The current production schema has `PaymentIntent` and `PaymentReceipt` applied via a one-off runtime endpoint and is NOT in any committed migration.

**Plan (the brief explicitly says don't propose `migrate deploy` blindly):**

Step-by-step, verify-locally-first:

1. **Snapshot production schema.** Run `pg_dump --schema-only [REDACTED-DATABASE-URL] > backups/prod-schema-2026-05-09.sql`. Commit the dump (it's structure only, no data).
2. **Compare to `prisma/schema.prisma`.** Run `npx prisma migrate diff --from-url [REDACTED-DATABASE-URL] --to-schema-datamodel prisma/schema.prisma --script > /tmp/diff.sql`. Inspect. Should show `0 changes` if schema and prod are in sync; if not, this is the gap to study.
3. **Generate baseline migration.** Run `mkdir -p prisma/migrations/0_init && npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`.
4. **Mark baseline as applied in production.** `npx prisma migrate resolve --applied 0_init` — this writes the row to `_prisma_migrations` without re-running the SQL. **This is the only "destructive" step**, and it is non-destructive in the sense that no schema mutation happens; only the migrations table is updated.
5. **Verify status.** `npx prisma migrate status` should now report "Database schema is up to date".
6. **Tear down the temporary admin/migration endpoint.** Find it: `rg -n "migrate|admin" app/api`. Remove the route file. Remove its secret from Vercel env vars. Redeploy. Verify the route now returns 404.

**Risks:**
- If step 2 shows actual drift (some prod table has a column the schema doesn't), the baseline is *not* `from-empty`; it's "from-snapshot". Adjust accordingly.
- If `_prisma_migrations` table doesn't exist in production yet, `migrate resolve` creates it. Confirm before running.

**PAUSE here.** Do not run any of steps 3-5 in production until user explicitly says proceed AND a fresh DB backup has been taken.

**Verification:** `npx prisma migrate status --schema prisma/schema.prisma` against production DB returns clean. The temporary admin endpoint returns 404.

**Commit message:** `Phase 4 (6/N): prisma migration baseline; remove temporary admin endpoint`

### Batch 7 — Human browser devnet verification (no code, manual)

**Scope:** Run the full flow on `https://veloran-paywall-sage.vercel.app` end-to-end using a real browser. Confirm all five evidence points:

- 402 returned cleanly with `intentId`, `memo`, `payTo`
- Payment confirms in <5s
- Replay (curl with same X-PAYMENT) returns 409 with the consumed-intent error
- Earnings dashboard shows the unlock with Solscan link
- `/api/health` returns OK on all four checks

No commit. Document the run in `docs/runs/2026-05-09-batch7-verification.md`.

### Batch 8 — Mainnet smoke checklist (no execution, just docs + readiness)

**Scope:** Author `docs/runbooks/mainnet-smoke.md` covering pre-flight, execution, abort criteria, recovery. **Do not execute the smoke until the user explicitly accepts Batch 1-7 results.**

See section 9 below for the full checklist.

### Recommended execution order

Per the brief:

1. **Batch 1** (stale replay docs) — start here, lowest risk, highest immediate honesty payoff
2. **Batch 2** (fixture tests) — establishes the safety baseline
3. **Batch 3** (network/Solscan/mainnet config) — gates on (1) and (2) being green
4. **Batch 4** (structured logs + /api/health) — fast win, complements Batch 3
5. **Batch 5** (subscription stance) — **PAUSE** before implementing
6. **Batch 6** (Prisma baseline) — **PAUSE** before implementing
7. **Batch 7** (human devnet verification) — manual, gates Batch 8
8. **Batch 8** (mainnet smoke checklist authored, NOT executed)

---

## 5. File-by-file change plan

> Files marked **[INFERRED — VERIFY]** were not read directly by the architect; behavior is described from the brief. Treat verification of these files as the very first read on resume.

### Files that change in Batch 1 (stale copy)

| File | Why | Change |
|---|---|---|
| `README.md` | Old replay claim if present | Replace any "replay returns content / idempotent" with "replay rejected with 409 (consumed)". |
| `docs/HANDOFF.md` | Verification checklist mentions replay | Update item that says replay returns content. |
| `docs/pitch-deck.md` | Slide 6 / 9 may overstate replay safety | Soften wording; "idempotent verification" → "intent-bound, single-use payment". |
| `docs/demo-script.md` | Beat 5 wow-moment voiceover | Update only if the line claims replay returns content. Otherwise no change. |
| `app/for-agents/page.tsx` | "A successful unlock" + idempotency note | Replace idempotency paragraph with the consumed-intent rejection. Add an explicit "Replay" subsection showing the 409 response. |
| `app/demo/page.tsx` | "What's happening on-chain" | If the page implies idempotent return, update to consumed-intent rejection. |
| `components/PaywallGate.tsx` | Comment about idempotent return | Update comment if present. |
| `scripts/ai-reader.ts` | Last printed line says "Replay this same signature anytime → server returns the same content idempotently." | Replace with "Replay rejected: same memo / signature returns 409 (consumed-intent)." |

### Files that change in Batch 2 (tests)

| File | Why | Change |
|---|---|---|
| `scripts/payment-safety-smoke.ts` | Currently too thin | Extend to fixture-driven (or wrap in a test runner). |
| `tests/fixtures/` (new) | Where pre-recorded tx JSON lives | New directory with one fixture per test case. |
| `package.json` | Add `test:payment-safety` if not already | Verify existing script; add the test pipeline. |

### Files that change in Batch 3 (network-aware)

| File | Why | Change |
|---|---|---|
| `lib/solana.ts` | Hardcoded devnet constants today | Branch on `NEXT_PUBLIC_SOLANA_NETWORK`. Throw at boot on mismatch. |
| `lib/network.ts` (new) | Centralize Solscan helpers | `solscanTxUrl`, `solscanAccountUrl`, `currentNetwork`. |
| `lib/x402.ts` | Uses `VELORAN_PROGRAM_ID` directly | Switch to `currentProgramId()` from `lib/solana.ts`. |
| `lib/anchor-client.ts` | Hand-encoded ix uses `VELORAN_PROGRAM_ID` | Same — read network-aware constant. |
| `scripts/ai-reader.ts` | Hardcodes USDC + program ID | Read from network-aware constants. |
| `components/PaywallGate.tsx`, `components/SubscribeButton.tsx` | Reference `USDC_DEVNET_MINT` directly | Replace with `currentUsdcMint()`. |
| Every Solscan link | Hardcodes `?cluster=devnet` | Use `solscanTxUrl(sig)`. |

### Files that change in Batch 4 (logs + health)

| File | Why | Change |
|---|---|---|
| `lib/log.ts` (new) | Structured logger | Allowlisted-key event emitter. |
| `app/api/x402/[slug]/route.ts` | Where 4 of 5 events fire | Insert `log.event(...)` at the right transitions. |
| `app/api/payment-intents/[slug]/route.ts` **[INFERRED — VERIFY]** | Where intent-creation event fires | Same. |
| `app/api/unlock/[slug]/route.ts` | Human path mirror | Same logging — if it doesn't yet flow through intents, log only the events that apply. |
| `app/api/health/route.ts` (new) | Health endpoint | DB ping + RPC ping + network read. |

### Files that change in Batch 5 (subscriptions; PAUSED)

| File | Why | Option A change | Option B change |
|---|---|---|---|
| `app/api/subscriptions/[creatorId]/route.ts` | Mainnet gate | Return 503 if mainnet | Migrate to intent-bound flow |
| `components/SubscribeButton.tsx` | UX gate | Show disabled state on mainnet | Add intent fetch before Privy modal |
| `app/c/[address]/page.tsx` | Subscribe card | Render "per-call only on mainnet" | No change |

### Files that change in Batch 6 (Prisma; PAUSED)

| File | Why | Change |
|---|---|---|
| `prisma/migrations/0_init/migration.sql` (new) | Baseline | Generated by `prisma migrate diff`. |
| `prisma/migrations/migration_lock.toml` (new if missing) | Lock provider | `provider = "postgresql"`. |
| `app/api/<temp-admin>/route.ts` **[INFERRED — VERIFY]** | Tear down | Delete file. |
| Vercel env (no commit) | Remove temp admin secret | Manual via dashboard. |

---

## 6. Test plan

### 6.1 Fixture tests (Batch 2)

Test cases listed in section 4, Batch 2. Architecture:

```ts
// scripts/payment-verification.test.ts (or extension of payment-safety-smoke)

import { verifyOnChainPayment } from "../lib/x402";
import { loadFixture } from "./fixtures";

const cases = [
  ["correct memo accepted", "happy.json", true],
  ["wrong memo rejected", "wrong-memo.json", false],
  ["missing veloran program rejected", "no-program.json", false],
  ["wrong payer rejected", "wrong-payer.json", false],
  // ...
];

for (const [name, fixture, shouldPass] of cases) {
  test(name, () => {
    const tx = loadFixture(fixture);
    const result = verifyOnChainPayment({ tx, ... });
    expect(result.ok).toBe(shouldPass);
  });
}
```

Fixtures are pre-recorded `getParsedTransaction` outputs from real devnet transactions, edited to introduce each failure mode. **[INFERRED — VERIFY]** that `verifyOnChainPayment` is still pure (no side effects) and accepts a `ParsedTransactionWithMeta` directly. If the route handler now does its own RPC fetch inline, refactor to keep the pure function callable from tests.

### 6.2 DB-level tests (Batch 2)

For tests 10-11 (consumed intent / expired intent), need a test DB or a transactional rollback. Suggestion:

- Use SQLite for the test DB (Prisma supports both).
- Test fixture: pre-create a `CONSUMED` PaymentIntent, hit the route handler with its `txSignature` in X-PAYMENT, expect 409.
- Repeat with an `EXPIRED` intent (`expiresAt` in past), expect 410 (or whatever code is chosen).

### 6.3 End-to-end smoke (Batch 7)

The brief includes the standing E2E command:

```bash
set -a; . ./.env.local; set +a
VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app \
AGENT_KEYPAIR_PATH=/root/.config/solana/agent.json \
NEXT_PUBLIC_SOLANA_RPC_URL="$NEXT_PUBLIC_HELIUS_RPC_URL" \
npm run ai-reader -- why-i-m-long-sol-into-fomc-ev8p0
```

Expected on a clean devnet run: 402 → pay → 200 → JSON content. Then a manual `curl -i -H "X-PAYMENT: <same>" .../api/x402/<slug>` should return 409.

### 6.4 Health endpoint test

```bash
curl -s https://veloran-paywall-sage.vercel.app/api/health | jq
```

Expected:

```json
{ "app": "ok", "db": "ok", "rpc": "ok", "network": "devnet" }
```

No secrets, no env, no commit hash.

---

## 7. Migration baseline plan (Prisma) — DETAIL

> **PAUSE** here for explicit user approval before any of the production-touching steps run.

### 7.1 Why this is risky

Prisma's contract is "your committed migration history === the production schema". Right now production has tables (`PaymentIntent`, `PaymentReceipt`) that no committed migration created. If a future engineer runs `prisma migrate deploy` blindly, Prisma will try to apply the migrations it knows about against a DB that already has the tables — most likely failing on duplicate-table error, possibly leaving the DB in an inconsistent state.

### 7.2 Pre-flight

- `pg_dump --schema-only [REDACTED-DATABASE-URL] > backups/prod-schema-2026-05-09.sql`
- `pg_dump [REDACTED-DATABASE-URL] > backups/prod-full-2026-05-09.sql` (optional but recommended)
- Verify the dump contains all expected tables: `Creator`, `Post`, `Unlock`, `SubscriptionTier`, `Subscription`, `PaymentIntent`, `PaymentReceipt`, `_prisma_migrations` (if Prisma already wrote one).
- Confirm production DB is reachable from the VPS but **not** accessed during the baseline window. Coordinate a 5-minute deploy freeze.

### 7.3 Steps

1. Author baseline: `mkdir -p prisma/migrations/0_init && npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`
2. Diff against production: `npx prisma migrate diff --from-url [REDACTED-DATABASE-URL] --to-schema-datamodel prisma/schema.prisma --script > /tmp/drift.sql`
   - If `/tmp/drift.sql` is non-empty: **STOP**. Investigate before proceeding. The baseline must reflect what's actually in production, not just what's in the schema file.
3. If `/tmp/drift.sql` is empty: `npx prisma migrate resolve --applied 0_init`
4. Verify: `npx prisma migrate status`
5. Future migrations follow normal flow: `npx prisma migrate dev` locally, `npx prisma migrate deploy` on Vercel during build.

### 7.4 Rollback

If step 3 fails or step 4 shows drift afterward:

- The migrations table can be reset: `DELETE FROM _prisma_migrations WHERE migration_name = '0_init'` (re-do the baseline).
- The schema dump from 7.2 is the disaster-recovery source.

### 7.5 Cleanup

- Find the temp admin endpoint: `rg -n "POST.*migrate|admin/migrate|run-prisma" app/api`
- Delete the route file.
- Vercel: remove the secret env var that protected it.
- Redeploy.
- Verify: `curl -i https://veloran-paywall-sage.vercel.app/api/<old-admin-path>` returns 404.

---

## 8. Subscription decision plan — DETAIL

> **PAUSE** before implementing.

### 8.1 Option A — disable subscriptions on mainnet (RECOMMENDED for first smoke)

**Pros:**
- Zero risk of double-charge for monthly subscribers.
- First mainnet smoke is purely per-call, exercising one well-tested code path.
- Removes Phase 5's hardening pressure from the May 10 deadline.

**Cons:**
- The deck slide 7 calls out subscriptions as a moat; we'll need a footnote ("subscriptions launch in Phase 5, devnet only today on mainnet").

**Implementation:** see Batch 5 file changes above.

**Time:** ~30 min.

### 8.2 Option B — migrate subscriptions to intent-bound model (NOT RECOMMENDED for May 10)

**Pros:**
- Subscriptions remain a live mainnet feature.
- Architectural symmetry with per-call.

**Cons:**
- Net-new code: subscription `PaymentIntent` shape, longer expiry windows, idempotency key includes plan + creator.
- Untested at scale.
- Burns the May 9-10 buffer needed for the demo polish.
- Risk-budget for mainnet smoke goes up sharply.

**Implementation:** ~1-2 days. Out of Phase 4 scope.

**Architect's stance:** **A** for this hackathon. Defer **B** to Phase 5.

---

## 9. Mainnet readiness checklist — explicit gates

These are the **only** acceptable preconditions for the first tiny-value mainnet smoke:

- [ ] **Batch 1 green** — no stale replay copy anywhere
- [ ] **Batch 2 green** — fixture tests passing locally and in CI
- [ ] **Batch 3 green** — network-aware boot refuses devnet constants on mainnet
- [ ] **Batch 4 green** — `/api/health` returns OK on all checks; logs flow
- [ ] **Batch 5 green** — Option A applied (subscriptions disabled on mainnet)
- [ ] **Batch 6 green** — Prisma baseline applied, `migrate status` clean, temp admin removed
- [ ] **Batch 7 green** — human devnet verification documented in `docs/runs/`
- [ ] **Mainnet env vars set in Vercel:**
  - `NEXT_PUBLIC_SOLANA_NETWORK=mainnet`
  - `NEXT_PUBLIC_HELIUS_RPC_URL=` mainnet RPC URL
  - `SOLANA_RPC_URL_SERVER=` mainnet server-only RPC (private)
  - `NEXT_PUBLIC_VELORAN_PROGRAM_ID=Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz`
  - Mainnet treasury address
- [ ] **Anchor program redeployed/upgraded on mainnet** with same code as devnet (verified by hash)
- [ ] **Treasury wallet mainnet ATA exists** and is owned by the Veloran treasury address
- [ ] **Smoke value cap:** first call must be ≤ $0.10 USDC. Self-loop if possible (deployer pays self).
- [ ] **Abort criteria:** any unexpected response, any RPC failure, any verification failure → stop, do not retry, document and roll back.
- [ ] **Recovery plan:** if a tx confirms but verification fails server-side, the program already moved funds. Recovery = manual reconciliation; document the tx for auditing.

**Architect's hard rule:** if any item is uncertain, stay on devnet. The hackathon is won with a clean devnet demo plus a credible mainnet readiness story; it is lost with a real-money bug.

---

## 10. Commands

> Replace `[REDACTED-DATABASE-URL]` with the actual URL from `.env.local`. Never commit it. Never paste it in chat.

### Inspection

```bash
cd /root/veloran-astachain-clean

# Stale-replay search (Batch 1 verification)
rg -n "idempotent|replay.*content|same txSignature|same signature" README.md app docs components scripts

# Network-config search (Batch 3)
rg -n "cluster=devnet|cluster=mainnet|SOLANA_NETWORK|NEXT_PUBLIC_SOLANA_NETWORK" app components lib scripts

# Hardcoded constants search
rg -n "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU|EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v|2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS|Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz" app components lib scripts

# Temp admin endpoint search (Batch 6 cleanup)
rg -n "POST.*migrate|admin/migrate|run-prisma|temp.*db" app/api
```

### Test

```bash
cd /root/veloran-astachain-clean
npm run test:payment-safety     # Batch 2 fixtures
npm run lint
npx tsc --noEmit
npm run build
```

### Build / deploy

```bash
git status --short --branch
git log --oneline -5
git push origin main            # Vercel auto-deploys on push to main

# Verify deploy
vercel inspect https://veloran-paywall-sage.vercel.app | sed -n '1,45p'
vercel logs https://veloran-paywall-sage.vercel.app --no-follow --since 20m --json --limit 50 \
  | jq 'select(.event != null) | { event: .event, intentId: .intentId, network: .network }'
```

### Agent E2E

```bash
set -a; . ./.env.local; set +a
VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app \
AGENT_KEYPAIR_PATH=/root/.config/solana/agent.json \
NEXT_PUBLIC_SOLANA_RPC_URL="$NEXT_PUBLIC_HELIUS_RPC_URL" \
npm run ai-reader -- why-i-m-long-sol-into-fomc-ev8p0
```

### Health

```bash
curl -s https://veloran-paywall-sage.vercel.app/api/health | jq
```

### Replay-rejection verification (manual)

```bash
# After running ai-reader once successfully, capture the X-PAYMENT it sent
# (instrument ai-reader.ts to print the header before the second GET, or
# read it from Vercel logs if Batch 4 logging is in place)

PAYLOAD="<base64url X-PAYMENT from successful run>"
curl -i -H "X-PAYMENT: $PAYLOAD" https://veloran-paywall-sage.vercel.app/api/x402/why-i-m-long-sol-into-fomc-ev8p0

# Expected: HTTP/1.1 409
# {"error":"Payment intent already consumed"} or equivalent shape
```

### Prisma baseline (Batch 6) — VERIFY LOCALLY FIRST, then PAUSE

```bash
# (1) Backups
pg_dump --schema-only "[REDACTED-DATABASE-URL]" > backups/prod-schema-$(date +%F).sql
pg_dump            "[REDACTED-DATABASE-URL]" > backups/prod-full-$(date +%F).sql

# (2) Drift detection
npx prisma migrate diff \
  --from-url "[REDACTED-DATABASE-URL]" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/drift.sql

# Inspect /tmp/drift.sql; if non-empty, STOP.

# (3) Baseline migration
mkdir -p prisma/migrations/0_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

# (4) Mark as applied (PAUSE for user OK before this command)
npx prisma migrate resolve --applied 0_init

# (5) Verify
npx prisma migrate status
```

---

## 11. Open questions for Asta / Merlin

> Genuine decision points only. No busywork.

1. **Has the Phase 4 code (`9627a18`) been pushed to GitHub origin yet?** If not, **action**: `git push origin main` from the VPS so this plan and the code can be merged without diverging. As of this plan's authorship, origin is at `92885b3` (one commit ahead of the local WSL planning copy at `679a056` but missing the Phase 4 work).
2. **Subscription decision: A or B?** Architect strongly recommends A. Confirm before Batch 5 executes.
3. **Prisma migration baseline: proceed?** Confirm the production DB backup has been taken (or take it now via `pg_dump`) before authorizing Batch 6 step 3 onward.
4. **Mainnet smoke value cap.** $0.10 USDC, $0.05, or $1? Architect recommends $0.10 maximum on the first call.
5. **Mainnet smoke target slug.** Which post will be the first mainnet payment? Architect recommends a fresh post created specifically for the smoke (slug e.g. `mainnet-smoke-2026-05-09`), priced at $0.10, owned by a self-loop wallet (deployer = creator = treasury for the test).
6. **Memo verification mechanism.** **[INFERRED — VERIFY]** is the memo a Memo program ix in the tx, or is it a program log line emitted by the Veloran program? The verification logic in `lib/x402.ts` will look different depending. First read on resume.
7. **Human path intent integration.** **[INFERRED — VERIFY]** does `app/api/unlock/[slug]/route.ts` use `PaymentIntent` now, or is it still the old txSignature-keyed flow? If the latter, the human flow has weaker replay safety than the agent flow — flag for Phase 5.
8. **`/api/health` failure mode.** When `db` or `rpc` returns "fail", should the endpoint return HTTP 503 or 200-with-fail-payload? Architect recommends 200-with-fail-payload (so monitoring can poll without surfacing transient blips as alerts) plus a separate `/api/ready` for HTTP-coded readiness.
9. **Test runner.** Project today uses `tsx scripts/payment-safety-smoke.ts` style — is there appetite to introduce Vitest or Jest for Batch 2's fixture tests, or extend the smoke pattern? Architect recommends extending the existing pattern (no new dep) for Phase 4; introduce a real runner in Phase 5.

---

## Appendix — what was NOT planned (out of scope for Phase 4)

- Subscription intent-bound migration (Option B) — Phase 5
- Multi-asset payments (SOL, EURC) — Phase 5
- Native binary file delivery (CSV, PDF) — Phase 5
- Audit (formal external) of the Anchor program — Phase 5
- Spend controls / agent budget caps — Phase 5
- `/api/catalog` discovery endpoint — Phase 5
- Subscription cancellation / refund flows — Phase 5
- Mainnet wiring of the live URL — happens *after* Phase 4 gates pass; not a Phase 4 deliverable

---

## Appendix — assumption flags (search for these on resume)

The string **`[INFERRED — VERIFY]`** appears in this plan in the following places:

1. Section 2.1 — memo verification mechanism (Memo program ix vs program log)
2. Section 2.2 — human unlock flow goes through PaymentIntent
3. Section 2.4 — PaymentIntent shape (fields)
4. Section 2.4 — PaymentReceipt shape (fields)
5. Section 2.5 — memo location in tx (program log vs Memo ix)
6. Section 4 Batch 4 — `app/api/payment-intents/[slug]/route.ts` exists and emits the challenge-created event
7. Section 5 Batch 5 — `lib/x402.ts` `verifyOnChainPayment` is still pure
8. Section 5 Batch 6 — temp admin endpoint location
9. Section 11 question 6 — same as 5
10. Section 11 question 7 — same as 2

Resolving each of these is the first read on the VPS before any Batch 1+ work begins.

---

*This plan is consistent with the brief at `Veloran Phase 4 Architect Planner Handoff.md` (Asta's Obsidian Vault). Pause markers are intentional: Batches 5 and 6 must not execute without explicit user approval per the brief.*
