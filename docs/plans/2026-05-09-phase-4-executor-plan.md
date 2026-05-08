# Veloran Phase 4 — Executor Playbook

**For:** the coding agent (or developer) executing Phase 4 hardening
**Created:** 2026-05-09
**Working dir:** `/root/veloran-astachain-clean` (VPS)
**Branch:** `main`
**Reference architect plan:** `docs/plans/2026-05-09-phase-4-architect-plan.md` (background only)
**Reference brief:** Asta's Obsidian vault — `Veloran Phase 4 Architect Planner Handoff.md`

---

## Read this before you start

1. **Don't expose secrets.** No private keys, DB URLs, API keys, Privy secrets, Vercel tokens, raw `.env.local` in chat, commits, logs, or any output. Use `[REDACTED]`.
2. **Devnet stays the default.** Mainnet only after Tasks 1-7 pass + the user explicitly clears Task 8.
3. **No destructive Prisma operations against production.** Task 6 has explicit pause markers.
4. **No blind admin endpoints.** If you need temporary runtime DB access, protect it, use it, remove it, redeploy, confirm it returns 404.
5. **Tasks 5 and 6 are HARD-PAUSED** until the user replies "go" with the chosen option. Don't run them on autopilot.
6. **Pause when uncertain.** If a step doesn't match what the playbook predicted, stop and ask. Do not retry, do not improvise mainnet.
7. **Next.js 16.2.4** has breaking changes; consult `node_modules/next/dist/docs/` before changing framework behavior.

## Standing verification commands (run after every task)

```bash
cd /root/veloran-astachain-clean
npx tsc --noEmit
npm run lint
npm run test:payment-safety
git status --short --branch
git log --oneline -5
```

If any of these fail, fix before committing. Never push a red build.

## Task order

| # | Task | Auto/Pause | Est. | Deps |
|---|---|---|---|---|
| 0 | Verify INFERRED assumptions from architect plan | Auto | 30 min | — |
| 1 | Fix stale replay docs | Auto | 30 min | 0 |
| 2 | Fixture-based payment-safety tests | Auto | 2 hr | 0 |
| 3 | Network-aware boot + Solscan helper | Auto | 1.5 hr | 1, 2 |
| 4 | Structured logs + `/api/health` | Auto | 1 hr | 3 |
| 5 | Subscription stance (Option A/B) | **PAUSE for user** | 30 min (A) / 1-2 days (B) | 4 |
| 6 | Prisma migration baseline | **PAUSE for user** | 1 hr | 5 |
| 7 | Human devnet verification | Auto (manual) | 30 min | 6 |
| 8 | Mainnet smoke checklist (author only) | Auto | 30 min | 7 |

Don't reorder. Don't skip Task 0.

---

## Task 0 — Verify the architect's inferred assumptions

**Goal:** Read the actual Phase 4 source on the VPS and resolve every `[INFERRED — VERIFY]` flag in the architect plan before writing any code.

**Pre-conditions:**
- You're on the VPS at `/root/veloran-astachain-clean`
- `git status` is clean
- The Phase 4 commit `9627a18 fix: use server payment memo for intent-bound payments` is in your local history (`git log --oneline -10` shows it)

**Steps:**

1. Read the actual files. For each, write a 1-line summary in `docs/plans/2026-05-09-phase-4-task0-verification.md`:

   ```bash
   for f in \
     lib/payment-intents.ts \
     lib/payment-memo.ts \
     app/api/payment-intents/[slug]/route.ts \
     app/api/x402/[slug]/route.ts \
     app/api/unlock/[slug]/route.ts \
     scripts/payment-safety-smoke.ts \
     prisma/schema.prisma; do
     echo "=== $f ==="
     wc -l "$f" 2>/dev/null
   done
   ```

2. Resolve each flag from the architect plan section 11 questions 6, 7, and the Appendix list (10 items). For each, record one of: **CONFIRMED**, **DIFFERS** (with note on actual behavior), or **NOT FOUND**.

3. Specifically, answer:

   - **Q1.** Where is the memo written into the on-chain transaction — Memo program instruction, OR a program log line? (Affects how Task 2 fixtures construct the wrong-memo case.)
   - **Q2.** Does `app/api/unlock/[slug]/route.ts` create or consume a `PaymentIntent`, or is it still keyed by `txSignature`?
   - **Q3.** What are the exact field names on `PaymentIntent` and `PaymentReceipt` in `prisma/schema.prisma`?
   - **Q4.** What HTTP status does the route return for a CONSUMED intent? Is it 409 with a specific JSON shape?
   - **Q5.** What HTTP status does the route return for an EXPIRED intent? (Brief implies 410; verify.)
   - **Q6.** Where is the temporary admin/migration endpoint? `rg -n "POST.*migrate|admin/migrate|run-prisma|temp.*db" app/api`
   - **Q7.** Is `verifyOnChainPayment` in `lib/x402.ts` still pure (no side effects)? Or does it now do its own RPC fetch?

4. If any answer materially changes the plan, update the architect plan inline (in `docs/plans/2026-05-09-phase-4-architect-plan.md`) and note the change at the top of the verification doc.

**Verification:**
- `docs/plans/2026-05-09-phase-4-task0-verification.md` exists and answers Q1–Q7 with concrete findings.
- All 10 architect plan `[INFERRED — VERIFY]` flags resolved (or escalated to user if blocking).
- `git status` shows the verification doc as the only addition.

**Commit:**
```bash
git add docs/plans/2026-05-09-phase-4-task0-verification.md
git add docs/plans/2026-05-09-phase-4-architect-plan.md  # if updates were made
git commit -m "Phase 4 (0/8): resolve INFERRED assumptions from architect plan"
git push
```

---

## Task 1 — Fix stale replay docs

**Goal:** Remove all "idempotent / same signature returns content" language. Replace with "consumed-intent rejection" semantics.

**Pre-conditions:**
- Task 0 complete; you know the actual HTTP status code (Q4) and JSON shape returned for a replay attempt.

**Steps:**

1. Find every instance of the stale language:

   ```bash
   rg -n "idempotent|replay.*content|same txSignature|same signature" \
     README.md app docs components scripts
   ```

2. For each hit, rewrite. Pattern:

   - **Old:** "Replay this same signature anytime → server returns the same content idempotently."
   - **New:** "Replay rejected: same payment / signature returns 409 with `{ error: 'Payment intent already consumed' }`."

3. Specific files to touch (verify with rg first, edit only what shows up):

   - `README.md` — replace any replay/idempotency claim
   - `docs/HANDOFF.md` — Verification checklist may say "Same `txSignature` can't be replayed to mint extra Unlock rows" or similar
   - `docs/pitch-deck.md` — slide 6 (on-chain split) and slide 9 (proof) may overstate
   - `docs/demo-script.md` — Beat 5 wow-moment voiceover, especially the closing terminal output line
   - `app/for-agents/page.tsx` — "Step 4 — A successful unlock" section may have idempotency note. Add a new "Replay" subsection showing the 409 response shape verbatim from Task 0 Q4.
   - `app/demo/page.tsx` — "What's happening on-chain" bullet "Idempotent verification" → rewrite
   - `components/PaywallGate.tsx` — comments only
   - `scripts/ai-reader.ts` — last printed line in the success path

4. Re-run rg after edits. Should return zero hits with the old semantics:

   ```bash
   rg -n "idempotent|replay.*content|same txSignature|same signature" \
     README.md app docs components scripts
   ```

   Expected: empty output. If it still hits, you missed a file.

**Verification:**
- `rg` returns empty for the stale patterns.
- `npx tsc --noEmit` clean.
- Manually skim the for-agents page and confirm the new "Replay" subsection makes sense.

**Commit:**
```bash
git add README.md docs app components scripts
git commit -m "Phase 4 (1/8): replace stale replay-idempotency copy with consumed-intent rejection"
git push
```

---

## Task 2 — Fixture-based payment-safety tests

**Goal:** Move `scripts/payment-safety-smoke.ts` from static guards to fixture-driven tests covering 11 verification invariants. No new test framework — extend the existing `tsx`-runnable script.

**Pre-conditions:**
- Task 0 confirmed the shape of `verifyOnChainPayment` in `lib/x402.ts` and whether it's pure (Q7).
- `npm run test:payment-safety` script entry exists in `package.json`. If not, add one: `"test:payment-safety": "tsx scripts/payment-safety-smoke.ts"`.

**Steps:**

1. Create the fixture directory:

   ```bash
   mkdir -p tests/fixtures
   ```

2. Capture one real successful devnet transaction as the **happy** fixture:

   ```bash
   # Pick a confirmed devnet payment tx signature from a recent unlock
   # (from PaymentReceipt table or Vercel logs)
   SIG="<signature>"
   solana confirm "$SIG" --output json --url devnet > tests/fixtures/happy.json
   ```

3. Author 10 derived fixtures by editing the happy JSON. For each, change exactly ONE field to break exactly ONE invariant. Save under `tests/fixtures/`:

   - `wrong-memo.json` — alter the memo bytes in the Memo program ix (or program log, depending on Q1)
   - `no-program.json` — strip the Veloran program ID from `accountKeys` and remove its CPIs
   - `wrong-payer.json` — replace the payer ATA with a different account
   - `missing-recipient-ata.json` — strip the creator ATA from `accountKeys`
   - `missing-platform-ata.json` — strip the treasury ATA from `accountKeys`
   - `missing-payer-ata.json` — strip the payer ATA from `accountKeys`
   - `insufficient-creator-delta.json` — reduce the creator ATA's `postTokenBalances` so delta < 95% of price
   - `insufficient-platform-delta.json` — reduce the treasury ATA's `postTokenBalances` so delta < 5% of price
   - `failed-tx.json` — set `meta.err` to a non-null value

   Plus two DB-level cases (no fixture file; constructed in code):

   - `consumed-intent` — pre-insert a `PaymentIntent` row with `state='CONSUMED'` and the same `txSignature`; assert route returns 409
   - `expired-intent` — pre-insert a `PaymentIntent` row with `expiresAt` in the past; assert route returns 410 (or whatever Task 0 Q5 said)

4. Rewrite `scripts/payment-safety-smoke.ts` to iterate cases:

   ```ts
   import * as fs from "node:fs";
   import { verifyOnChainPayment } from "../lib/x402";
   // import any other helpers needed (memo verifier, intent loader)

   type Case = {
     name: string;
     fixture: string;        // path under tests/fixtures/
     expect: "ok" | "fail";
     expectedReason?: string; // for failure cases — e.g. "memo_mismatch"
   };

   const cases: Case[] = [
     { name: "correct memo accepted",            fixture: "happy.json",                       expect: "ok" },
     { name: "wrong memo rejected",              fixture: "wrong-memo.json",                  expect: "fail", expectedReason: "memo_mismatch" },
     { name: "missing veloran program rejected", fixture: "no-program.json",                  expect: "fail", expectedReason: "program_not_invoked" },
     { name: "wrong payer rejected",             fixture: "wrong-payer.json",                 expect: "fail", expectedReason: "payer_mismatch" },
     { name: "missing recipient ATA rejected",   fixture: "missing-recipient-ata.json",       expect: "fail", expectedReason: "recipient_ata_missing" },
     { name: "missing platform ATA rejected",    fixture: "missing-platform-ata.json",        expect: "fail", expectedReason: "platform_ata_missing" },
     { name: "missing payer ATA rejected",       fixture: "missing-payer-ata.json",           expect: "fail", expectedReason: "payer_ata_missing" },
     { name: "insufficient creator delta",       fixture: "insufficient-creator-delta.json",  expect: "fail", expectedReason: "creator_delta_too_low" },
     { name: "insufficient platform delta",      fixture: "insufficient-platform-delta.json", expect: "fail", expectedReason: "platform_delta_too_low" },
     { name: "failed tx rejected",               fixture: "failed-tx.json",                   expect: "fail", expectedReason: "tx_failed" },
   ];

   let pass = 0, fail = 0;
   for (const c of cases) {
     const tx = JSON.parse(fs.readFileSync(`tests/fixtures/${c.fixture}`, "utf8"));
     const result = verifyOnChainPayment({ tx, /* recipientAddress, amountUsdc, expectedPayerAddress from happy fixture */ });
     const ok = c.expect === "ok" ? result.ok === true : result.ok === false /* && result.error includes c.expectedReason */;
     if (ok) { console.log(`✅ ${c.name}`); pass++; }
     else    { console.error(`❌ ${c.name} — expected ${c.expect}, got ${JSON.stringify(result)}`); fail++; }
   }
   console.log(`\n${pass}/${cases.length} passed`);
   process.exit(fail === 0 ? 0 : 1);
   ```

5. The 2 DB-level cases (`consumed-intent`, `expired-intent`) require a route-level test. Add them as a separate `scripts/payment-routes-smoke.ts` that:

   - Boots a SQLite test DB (`DATABASE_URL=file:./test.db`)
   - Pre-inserts a `PaymentIntent` row in the desired state
   - Calls the route handler directly (import `GET` from `app/api/x402/[slug]/route.ts`)
   - Asserts response status + JSON shape

   If route handlers can't be invoked directly (Next.js 16 quirks — verify in `node_modules/next/dist/docs/`), use HTTP loopback against a `next dev` server instead.

6. Wire to package.json:

   ```bash
   # Verify these exist; add if missing:
   #   "test:payment-safety": "tsx scripts/payment-safety-smoke.ts"
   #   "test:payment-routes": "tsx scripts/payment-routes-smoke.ts"
   #   "test": "npm run test:payment-safety && npm run test:payment-routes"
   ```

**Verification:**
- `npm run test:payment-safety` prints `10/10 passed` and exits 0.
- `npm run test:payment-routes` prints `2/2 passed` and exits 0.
- Each failure case fails for its **expected reason**, not just "rejected".
- `npx tsc --noEmit` clean.

**Commit:**
```bash
git add tests/fixtures scripts/payment-safety-smoke.ts scripts/payment-routes-smoke.ts package.json
git commit -m "Phase 4 (2/8): fixture-based payment-safety tests + route-level idempotency tests"
git push
```

---

## Task 3 — Network-aware boot + Solscan helper

**Goal:** Make it impossible to boot mainnet with devnet constants. Centralize Solscan link generation. No more hardcoded `?cluster=devnet`.

**Pre-conditions:**
- Tasks 1 + 2 done.
- Task 0 confirmed the current shape of `lib/solana.ts`.

**Steps:**

1. Update `lib/solana.ts` to read `process.env.NEXT_PUBLIC_SOLANA_NETWORK` and select constants per-network:

   ```ts
   import { Connection, PublicKey } from "@solana/web3.js";

   type Network = "devnet" | "mainnet";
   export const CURRENT_NETWORK: Network =
     (process.env.NEXT_PUBLIC_SOLANA_NETWORK as Network) || "devnet";

   const CONFIG = {
     devnet: {
       usdcMint:    new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
       programId:   new PublicKey("2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS"),
       treasury:    new PublicKey("DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP"),
     },
     mainnet: {
       usdcMint:    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
       programId:   new PublicKey("Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz"),
       treasury:    new PublicKey(process.env.MAINNET_TREASURY_ADDRESS || "MAINNET_TREASURY_NOT_SET"),
     },
   } as const;

   if (CURRENT_NETWORK === "mainnet" && CONFIG.mainnet.treasury.toBase58() === "MAINNET_TREASURY_NOT_SET") {
     throw new Error("Refusing to boot: NEXT_PUBLIC_SOLANA_NETWORK=mainnet but MAINNET_TREASURY_ADDRESS is not set.");
   }

   export const USDC_MINT      = CONFIG[CURRENT_NETWORK].usdcMint;
   export const VELORAN_PROGRAM_ID = CONFIG[CURRENT_NETWORK].programId;
   export const VELORAN_TREASURY = CONFIG[CURRENT_NETWORK].treasury;

   // Backwards-compat aliases for now — remove in Task 4 cleanup
   export const USDC_DEVNET_MINT = USDC_MINT;
   ```

   The trick: keep the old export names as aliases so other files don't break before we sweep them.

2. Create `lib/network.ts` with the Solscan helper + network helpers:

   ```ts
   import { CURRENT_NETWORK } from "./solana";

   export function currentNetwork() { return CURRENT_NETWORK; }
   export function isMainnet() { return CURRENT_NETWORK === "mainnet"; }

   export function solscanTxUrl(sig: string) {
     return CURRENT_NETWORK === "mainnet"
       ? `https://solscan.io/tx/${sig}`
       : `https://solscan.io/tx/${sig}?cluster=devnet`;
   }

   export function solscanAccountUrl(addr: string) {
     return CURRENT_NETWORK === "mainnet"
       ? `https://solscan.io/account/${addr}`
       : `https://solscan.io/account/${addr}?cluster=devnet`;
   }
   ```

3. Find every hardcoded Solscan URL and replace:

   ```bash
   rg -n 'solscan\.io' app components lib scripts
   ```

   For each hit, replace with `solscanTxUrl(sig)` or `solscanAccountUrl(addr)`.

4. Find every hardcoded mint or program ID outside `lib/solana.ts` and replace with the network-aware export:

   ```bash
   rg -n "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU|EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v|2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS|Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz" \
     app components lib scripts | rg -v "^lib/solana\.ts:"
   ```

   For each hit, import from `@/lib/solana` instead.

5. Document the required Vercel env vars in `docs/HANDOFF.md` under a new "Environment variables" section. **DO NOT commit secrets**:

   - `NEXT_PUBLIC_SOLANA_NETWORK` — `devnet` or `mainnet`
   - `NEXT_PUBLIC_HELIUS_RPC_URL` — must match the network
   - `MAINNET_TREASURY_ADDRESS` — only required when mainnet
   - `SOLANA_RPC_URL_SERVER` — server-side RPC (private; falls back to `NEXT_PUBLIC_HELIUS_RPC_URL` if unset)

6. Local boot test with mismatched env:

   ```bash
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet npm run dev 2>&1 | head -20
   # Expected: server crashes at startup with "Refusing to boot..." in the console.
   # Confirm: this MUST NOT silently fall through to devnet.
   ```

   Then with proper env:

   ```bash
   NEXT_PUBLIC_SOLANA_NETWORK=devnet npm run dev 2>&1 | head -20
   # Expected: clean boot.
   ```

**Verification:**
- `rg 'solscan\.io.*cluster=devnet' app components lib scripts` returns zero hardcoded hits (all go through helper).
- `rg "4zMMC9srt5|EPjFWdd5|2CtnLfde|Bybn483X" app components scripts | rg -v "^lib/solana\.ts:"` returns zero hits.
- Boot with mainnet env + missing treasury fails loudly.
- Boot with devnet env succeeds.
- Existing devnet flows still work end-to-end (run the standing E2E command).

**Commit:**
```bash
git add lib/solana.ts lib/network.ts app components scripts docs
git commit -m "Phase 4 (3/8): network-aware boot, Solscan helper, refuse devnet constants on mainnet"
git push
```

---

## Task 4 — Structured logs + `/api/health`

**Goal:** Emit five named events from the payment flow. Add a coarse health endpoint. No secrets in logs.

**Pre-conditions:** Task 3 done.

**Steps:**

1. Create `lib/log.ts`:

   ```ts
   const ALLOWED_KEYS = new Set([
     "event", "intentId", "slug", "network", "expectedAmount",
     "signaturePrefix6", "errorCode", "reason",
     "creatorDeltaMicro", "platformDeltaMicro",
     "ts",
   ]);

   export function event(name: string, payload: Record<string, unknown>) {
     const safe: Record<string, unknown> = { event: name, ts: new Date().toISOString() };
     for (const [k, v] of Object.entries(payload)) {
       if (ALLOWED_KEYS.has(k) && v !== undefined && v !== null) safe[k] = v;
     }
     console.log(JSON.stringify(safe));
   }

   export function sigPrefix(sig: string): string {
     return sig.slice(0, 6);
   }
   ```

2. Wire into `app/api/x402/[slug]/route.ts` and `app/api/payment-intents/[slug]/route.ts` (and `app/api/unlock/[slug]/route.ts` if Task 0 Q2 confirmed it uses intents). Five events:

   - `payment_challenge_created` — at PaymentIntent insert time. Fields: `intentId`, `slug`, `network`, `expectedAmount`.
   - `payment_tx_lookup_failed` — when `getParsedTransaction` returns null. Fields: `intentId`, `signaturePrefix6`, `network`, `errorCode: "tx_not_found"`.
   - `payment_verification_failed` — when `verifyOnChainPayment` returns `ok: false`. Fields: `intentId`, `reason` (one of the 9 reasons from Task 2).
   - `payment_accepted` — on successful unlock. Fields: `intentId`, `signaturePrefix6`, `network`, `creatorDeltaMicro`, `platformDeltaMicro`.
   - `payment_replay_rejected` — when intent state is already CONSUMED. Fields: `intentId`, `signaturePrefix6`, `network`.

   **Never** pass headers, `req.body`, env vars, or DB rows into `event()`. The allowlist is the firewall.

3. Create `app/api/health/route.ts`:

   ```ts
   import { NextResponse } from "next/server";
   import { prisma } from "@/lib/db";
   import { Connection } from "@solana/web3.js";
   import { CURRENT_NETWORK } from "@/lib/solana";

   export async function GET() {
     const checks = {
       app: "ok",
       db: "fail" as "ok" | "fail",
       rpc: "fail" as "ok" | "fail",
       network: CURRENT_NETWORK,
     };

     try { await prisma.$queryRaw`SELECT 1`; checks.db = "ok"; } catch {}

     try {
       const rpcUrl = process.env.SOLANA_RPC_URL_SERVER || process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
       if (rpcUrl) {
         const conn = new Connection(rpcUrl, "confirmed");
         await conn.getLatestBlockhash();
         checks.rpc = "ok";
       }
     } catch {}

     return NextResponse.json(checks); // always 200; clients read the body
   }
   ```

   No env dump. No version. No secrets. Coarse only.

**Verification:**
- `curl -s http://localhost:3000/api/health | jq` returns `{ "app": "ok", "db": "ok"|"fail", "rpc": "ok"|"fail", "network": "devnet" }`.
- After running the standing agent E2E command, `vercel logs ... --json` shows the 5 event types from a single payment flow:
  ```bash
  vercel logs https://veloran-paywall-sage.vercel.app --no-follow --since 10m --json --limit 100 \
    | jq 'select(.event != null) | .event' | sort -u
  ```
  Expected: `payment_challenge_created`, `payment_accepted` (and `payment_replay_rejected` if you tested replay).
- No log line contains a header, env var, full request body, or unredacted signature.

**Commit:**
```bash
git add lib/log.ts app/api/health/route.ts app/api/x402 app/api/payment-intents app/api/unlock
git commit -m "Phase 4 (4/8): structured payment logs + /api/health"
git push
```

---

## ⏸ PAUSE — wait for user to clear Tasks 5 and 6

**Do not proceed past this line without an explicit user response.**

Post in chat:

> Tasks 1–4 done. Ready for Task 5 (subscription stance) — recommended Option A (disable on mainnet). Confirm "go A" to proceed, or specify a different option.

When the user replies **"go A"** or **"go B"**, run Task 5. When the user replies **"go 6"** with confirmation that a fresh `pg_dump` was taken, run Task 6.

If the user says anything else, ask for clarification. Do not invent.

---

## Task 5 — Subscription stance (Option A — disable on mainnet)

**Trigger:** user replied "go A".

**Goal:** Make subscriptions a 503 on mainnet without breaking the devnet flow. Tier-editor still saves prices; the buy flow is gated.

**Steps:**

1. `app/api/subscriptions/[creatorId]/route.ts` — at the top of `POST`:

   ```ts
   import { isMainnet } from "@/lib/network";

   export async function POST(req: NextRequest, { params }: Params) {
     if (isMainnet()) {
       return NextResponse.json(
         { error: "subscriptions are devnet-only during Phase 4; per-call payments only on mainnet" },
         { status: 503 }
       );
     }
     // ... existing handler
   }
   ```

   Apply the same gate to any other subscription-mutating routes.

2. `components/SubscribeButton.tsx` — read network at module top:

   ```ts
   import { isMainnet } from "@/lib/network";

   // inside component, replace the button render:
   if (isMainnet()) {
     return (
       <button disabled className="...opacity-50 cursor-not-allowed" title="Subscriptions launch in Phase 5. Use per-call payments.">
         Subscriptions on devnet only
       </button>
     );
   }
   ```

3. `app/c/[address]/page.tsx` — wrap the Subscribe card with a network check. If mainnet, replace the card with a "Per-call only on mainnet" notice and a link to the per-call posts.

4. Pitch deck slide 7 footnote: "subscriptions launch in Phase 5; mainnet is per-call only on day one." Update `docs/pitch-deck.md`.

**Verification:**
- Local boot with `NEXT_PUBLIC_SOLANA_NETWORK=mainnet`:
  - `/c/<addr>` shows "Per-call only on mainnet" instead of subscribe buttons
  - `POST /api/subscriptions/<id>` returns 503
  - Subscribe button on `/c` page renders disabled
- Local boot with `NEXT_PUBLIC_SOLANA_NETWORK=devnet`:
  - All subscription flows still work end-to-end
- Tier editor on `/dashboard` still saves prices regardless of network (devnet record).

**Commit:**
```bash
git add app components docs
git commit -m "Phase 4 (5/8): disable subscriptions in mainnet mode (Option A)"
git push
```

### Task 5 alternative — Option B (harden subscriptions to intent-bound)

**Trigger:** user replied "go B".

**Out of Phase 4 scope by default.** If the user picks B anyway:

- Mirror the agent intent flow for subscriptions: server creates `SubscriptionIntent` (separate model? or shared `PaymentIntent` with a `kind` enum?), client embeds memo, replay rejected with 409.
- This is ≥ 1-2 days of work. Confirm time budget before starting.
- File scope: `prisma/schema.prisma` (new model or column), `app/api/subscriptions/[creatorId]/route.ts`, `components/SubscribeButton.tsx`, `lib/x402.ts` (if memo verification differs), tests in Task 2 extended for subscriptions.

If Option B is selected, escalate to user that Phase 4 timeline slips by 1-2 days.

---

## ⏸ PAUSE — wait for user to clear Task 6

Before Task 6, confirm:

1. **Fresh `pg_dump` of production has been taken** and stored somewhere safe (not committed unless schema-only).
2. The user has explicitly said "go 6".
3. A 5-minute deploy freeze is coordinated.

If any of these are false, do not proceed.

---

## Task 6 — Prisma migration baseline

**Trigger:** user replied "go 6" and pre-conditions cleared.

**Goal:** Establish a real Prisma migration history for production. Remove the temporary admin endpoint that applied schema changes at runtime.

**Steps:**

1. Backups:

   ```bash
   mkdir -p backups
   pg_dump --schema-only "[REDACTED-DATABASE-URL]" > backups/prod-schema-$(date +%F).sql
   pg_dump            "[REDACTED-DATABASE-URL]" > backups/prod-full-$(date +%F).sql
   # Inspect the schema dump:
   head -200 backups/prod-schema-$(date +%F).sql
   # Should show all expected tables + Prisma's _prisma_migrations table if it exists
   ```

2. Drift check (production schema vs `prisma/schema.prisma`):

   ```bash
   npx prisma migrate diff \
     --from-url "[REDACTED-DATABASE-URL]" \
     --to-schema-datamodel prisma/schema.prisma \
     --script > /tmp/drift.sql
   wc -l /tmp/drift.sql
   ```

   - If `wc -l` shows 0 (or only "-- This is an empty migration."): proceed.
   - If non-empty: **STOP**. Read `/tmp/drift.sql`. The baseline must reflect production reality, not just the schema file. Update the schema file to match prod, OR construct the baseline from the prod schema dump instead. Escalate to user.

3. Generate the baseline migration:

   ```bash
   mkdir -p prisma/migrations/0_init
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_init/migration.sql
   ls -la prisma/migrations/0_init/migration.sql
   # Should be a non-empty SQL file containing CREATE TABLE statements
   ```

4. Add `prisma/migrations/migration_lock.toml` if missing:

   ```toml
   provider = "postgresql"
   ```

5. Mark baseline as applied (this writes to `_prisma_migrations` table; does NOT re-execute the SQL):

   ```bash
   DATABASE_URL="[REDACTED-DATABASE-URL]" npx prisma migrate resolve --applied 0_init
   ```

6. Verify status:

   ```bash
   DATABASE_URL="[REDACTED-DATABASE-URL]" npx prisma migrate status
   # Expected: "Database schema is up to date!"
   ```

7. Tear down the temporary admin/migration endpoint:

   ```bash
   # Find it
   rg -n "POST.*migrate|admin/migrate|run-prisma|temp.*db" app/api
   # Note the path. Suppose it's app/api/admin/migrate/route.ts
   git rm app/api/admin/migrate/route.ts  # adjust to actual path
   # Remove the secret env var from Vercel dashboard manually (do NOT commit)
   ```

8. Commit migrations + tear-down:

   ```bash
   git add prisma/migrations app
   git commit -m "Phase 4 (6/8): prisma migration baseline; remove temp admin endpoint"
   git push
   ```

9. After Vercel redeploys, verify the temp endpoint is gone:

   ```bash
   curl -i https://veloran-paywall-sage.vercel.app/api/admin/migrate  # adjust path
   # Expected: HTTP/1.1 404
   ```

**Verification:**
- `prisma migrate status` against production returns clean.
- Temp admin endpoint returns 404 in production.
- `git log` shows the baseline as a single clean commit.

---

## Task 7 — Human devnet verification

**Goal:** Run the full flow in a real browser end-to-end. Document the run.

**Pre-conditions:** Tasks 1-6 done.

**Steps:**

1. Open `https://veloran-paywall-sage.vercel.app/` in a fresh incognito window.
2. Sign in (Privy email path).
3. Create a new post (slug: `phase4-verify-2026-05-09`, price $0.10, JSON-shaped content).
4. Sign out. Open the post URL.
5. Sign in again as a different reader (Privy email path).
6. Click Unlock. Verify:
   - Privy modal opens
   - Tx confirms
   - Content reveals
   - Solscan link works (and uses the network-aware helper — no `?cluster=devnet` if Task 3 changed it)
7. Capture the X-PAYMENT header from the successful run (instrument `ai-reader` or read from logs).
8. Run replay:
   ```bash
   PAYLOAD="<base64url X-PAYMENT>"
   curl -i -H "X-PAYMENT: $PAYLOAD" https://veloran-paywall-sage.vercel.app/api/x402/phase4-verify-2026-05-09
   ```
   Expected: HTTP 409 with `{ "error": "Payment intent already consumed" }` (or whatever Task 0 Q4 confirmed).
9. Run agent E2E:
   ```bash
   set -a; . ./.env.local; set +a
   VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app \
   AGENT_KEYPAIR_PATH=/root/.config/solana/agent.json \
   NEXT_PUBLIC_SOLANA_RPC_URL="$NEXT_PUBLIC_HELIUS_RPC_URL" \
   npm run ai-reader -- phase4-verify-2026-05-09
   ```
   Expected: 402 → pay → 200 with JSON content.
10. Check `/api/health`:
    ```bash
    curl -s https://veloran-paywall-sage.vercel.app/api/health | jq
    ```
    Expected: all "ok".
11. Document everything in `docs/runs/2026-05-09-phase4-devnet-verification.md`:
    - Test post slug, price, tx signatures
    - Replay 409 captured (paste the response body)
    - Agent E2E success captured
    - Health endpoint output
    - Vercel logs sample showing the 5 event types

**Verification:**
- `docs/runs/2026-05-09-phase4-devnet-verification.md` is committed and includes all evidence.

**Commit:**
```bash
git add docs/runs
git commit -m "Phase 4 (7/8): devnet end-to-end verification documented"
git push
```

---

## Task 8 — Mainnet smoke checklist (author only, do NOT execute)

**Goal:** Author the runbook for the eventual first mainnet payment. Do not run it. Do not let the user run it without an explicit, separate "go mainnet smoke" approval AFTER the deck and demo video are submitted.

**Steps:**

1. Create `docs/runbooks/mainnet-smoke.md` with the following structure:

   ```markdown
   # Mainnet Smoke Runbook (DO NOT RUN UNTIL EXPLICITLY APPROVED)

   ## Pre-conditions (all must be ✅)
   - [ ] Tasks 1-7 of Phase 4 complete and merged to main
   - [ ] Vercel `NEXT_PUBLIC_SOLANA_NETWORK=mainnet` set in a separate "production-mainnet" preview environment (NOT main production)
   - [ ] All mainnet env vars set: `MAINNET_TREASURY_ADDRESS`, `NEXT_PUBLIC_HELIUS_RPC_URL` (mainnet), `SOLANA_RPC_URL_SERVER` (mainnet)
   - [ ] Anchor program at `Bybn483XkZxahdTQKHqRzfvuAnvPocWti9PGUVoPxhLz` is live on mainnet (Solscan confirms)
   - [ ] Treasury wallet's mainnet USDC ATA exists and is owned by the treasury address (run `spl-token account-info` to confirm)
   - [ ] Smoke wallet has ≥ $0.20 USDC on mainnet (≥ 2× the cap below to allow for one retry)
   - [ ] `npm run test:payment-safety` and `npm run test:payment-routes` are green
   - [ ] Demo video and pitch deck are already submitted to the hackathon portal (mainnet smoke does not gate submission)

   ## Smoke value cap
   - First call MUST be ≤ **$0.10 USDC** (`100000` micro-USDC)
   - Self-loop: deployer = creator = treasury = single wallet (so net flow is zero except fees)

   ## Procedure
   1. Create a self-loop test post on mainnet preview environment, slug `mainnet-smoke-2026-05-09`, price $0.10
   2. Run agent E2E against the mainnet preview URL (replace VELORAN_BASE_URL accordingly)
   3. Verify 402 challenge contains mainnet program ID and mainnet USDC mint
   4. Verify on-chain tx splits 95/5 (creator + treasury are same wallet, so net zero, but program logs show split)
   5. Verify replay returns 409
   6. Capture: tx signature, Solscan link, intent.id, full event log

   ## Abort criteria (any one of these → STOP and roll back)
   - 402 challenge has the wrong USDC mint or program ID
   - Tx confirms but verification fails server-side (funds moved but no Unlock created — manual reconciliation needed)
   - Any RPC or Privy error not seen on devnet
   - Subscription route returns 200 anywhere on mainnet (it must be 503)
   - `/api/health` returns `network: "devnet"` despite mainnet env

   ## Rollback
   - There is no on-chain rollback for a confirmed split. If funds moved incorrectly, accept the loss and document.
   - For the deployment: revert the Vercel preview environment back to devnet env vars; redeploy.

   ## Recovery contact
   - If anything unexpected: STOP. Page the user. Do not retry.
   ```

2. Update the architect plan section 9 (Mainnet readiness checklist) with a back-reference to this runbook.

**Verification:**
- `docs/runbooks/mainnet-smoke.md` is committed.
- The runbook is **NOT** executed.

**Commit:**
```bash
git add docs/runbooks/mainnet-smoke.md docs/plans
git commit -m "Phase 4 (8/8): mainnet smoke runbook (authored, not executed)"
git push
```

---

## Final state after Phase 4

When all 8 tasks are committed and pushed, you should have:

- `git log --oneline -10` showing 8 Phase 4 commits in order, plus the Task 0 verification commit
- `npm run test:payment-safety && npm run test:payment-routes` returning green
- `curl /api/health` returning OK on app + db + rpc
- `vercel logs --json` showing 5 named event types in production
- A devnet verification doc with evidence
- A mainnet runbook authored but not executed
- No stale replay copy anywhere
- Subscription routes 503 on mainnet, 200 on devnet
- Prisma migration history clean; no temp admin endpoint
- No secrets ever in chat, commits, or logs

Then — and only then — message the user:

> Phase 4 complete. Verification doc at `docs/runs/2026-05-09-phase4-devnet-verification.md`. Mainnet runbook at `docs/runbooks/mainnet-smoke.md`. Awaiting explicit "go mainnet smoke" approval before any real-money execution.

Do not run the mainnet smoke without that approval.

---

## When to stop and ask the user

Pause and post in chat instead of improvising whenever:

- A `[INFERRED — VERIFY]` flag in Task 0 turns out wrong in a way that materially changes a later task
- A standing verification command fails (`tsc`, `lint`, `test:payment-safety`)
- A drift is detected in Task 6 step 2
- The Phase 4 commit `9627a18` is not in your local git log (the brief said it should be)
- An admin endpoint is found that doesn't match the expected pattern
- A test fails for a different reason than the one declared in the case definition
- The user has been silent for ≥ 30 min during a PAUSE

Pausing is always cheaper than recovering from a wrong move.

---

## Appendix — what this playbook does NOT do

- Does NOT activate mainnet
- Does NOT migrate subscriptions to intent-bound (that's Phase 5 if Option A is chosen)
- Does NOT add new product features
- Does NOT change the Anchor program
- Does NOT change the demo video script (Phase 4 doc updates touch the deck/demo only where they reference the now-wrong replay semantics)
- Does NOT push without verification commands passing first
- Does NOT touch Vercel env vars on autopilot — env changes are user-driven

If a task tempts you outside these boundaries, stop and ask.
