# x402 spike — Apr 29, 2026

## What we evaluated

`x402@0.7.3` (the official Coinbase package, already a transitive dep
via `@privy-io/react-auth`). Inspected the package's TypeScript types
and shipped error codes inside `node_modules/x402/dist/cjs/`.

What it ships:

- `verify`, `settle`, `Supported` (facilitator side)
- `createPaymentHeader`, `preparePaymentHeader`, `signPaymentHeader`,
  `selectPaymentRequirements` (client side)
- Network enum that includes `solana-devnet` and `solana`
- A fully fleshed-out `exact_svm` scheme with 25+ specific SVM error
  codes — clearly production-intended for Solana

## Why we couldn't adopt it as-is

The `exact_svm` scheme rejects custom-program calls. Concrete error
codes from the type definitions:

```
invalid_exact_svm_payload_transaction_instruction_not_spl_token_transfer_checked
invalid_exact_svm_payload_transaction_instructions_length
invalid_exact_svm_payload_transaction_instructions_compute_limit_instruction
invalid_exact_svm_payload_transaction_instructions_compute_price_instruction
invalid_exact_svm_payload_transaction_fee_payer_included_in_instruction_accounts
```

The scheme expects exactly: optional compute-budget instructions + a
single SPL `transferChecked` to a known recipient. Anything else fails
verification. Our 95/5 split happens via a custom Anchor program
(`pay_for_content`) that does two `transferChecked` CPIs. By
construction, that does not pass `exact_svm`.

We had two options:

1. **Drop the program for agent payments.** Agents would do a vanilla
   USDC transfer to the creator only. We'd lose the on-chain split —
   the single most demonstrable claim in our pitch. We'd also need an
   off-chain fee mechanism to claim our 5%, which contradicts the
   "trustless on-chain split" narrative.
2. **Keep the program, write our own scheme.** Use the same outer 402
   envelope (which is the visible part of x402 to a wallet or judge)
   but carry a payload that proves the program was called.

We chose **(2)**. The plan listed this exact branch as a sanctioned
fallback — *"hand-rolled 402 + signed USDC transfer header. Still
demonstrably 'x402-style'."*

## Our scheme: `exact-veloran`

### Wire format

**Unpaid request** — `GET /api/x402/<slug>`
**Server response** — HTTP 402 with body:

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact-veloran",
      "network": "solana-devnet",
      "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "maxAmountRequired": "500000",
      "resource": "/api/x402/<slug>",
      "description": "Unlock '<preview>' — pays creator (95%) + Veloran (5%) via on-chain split",
      "payTo": {
        "creatorAta": "<base58>",
        "platformAta": "<base58>"
      },
      "extra": {
        "programId": "2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS",
        "splitBps": { "creator": 9500, "platform": 500 }
      }
    }
  ]
}
```

**Paid request** — `GET /api/x402/<slug>`, with header:

```
X-PAYMENT: <base64url(JSON)>
```

Header JSON (decoded):

```json
{
  "scheme": "exact-veloran",
  "network": "solana-devnet",
  "txSignature": "<base58 sig>",
  "payerAddress": "<base58 pubkey>"
}
```

**Server response** — HTTP 200 with body `{ ok, title, content, txSignature }`
and header `X-PAYMENT-RESPONSE: <base64url({"ok":true,"txSignature":"..."})>`
mirroring the official x402 envelope shape.

### Server verification

For each `X-PAYMENT` header, the server fetches the named tx from
Solana devnet (`getParsedTransaction`) and confirms:

1. The tx succeeded (`meta.err === null`).
2. The tx's account keys include `VELORAN_PROGRAM_ID` — proves the
   program was actually invoked. Vanilla SPL transfers fail here.
3. The creator's USDC ATA balance increased by `>= 95%` of the price.
4. The platform treasury's USDC ATA balance increased by `>= 5%` of
   the price.
5. Combined creator + platform delta `>=` price (catches rounding
   exploits).
6. The claimed `payerAddress`'s USDC ATA balance decreased by `>=`
   price. This couples the header's claim to on-chain reality.

If any check fails, return 400 with a specific error.

### Idempotency

`Unlock.txSignature` is unique. A repeated `X-PAYMENT` with the same
signature returns the same content without creating a duplicate
`Unlock` row. Cheap retry safety.

### Auth model

Agents have no Privy account. Their only credential is the ability to
have signed the on-chain tx. The on-chain tx + the matching
`payerAddress` = sufficient proof of payment. This is the same threat
model as the human path's `/api/unlock/[slug]` — *"prove you funded a
pay\_for\_content tx for this post"*.

## Trade-offs accepted

- **Not protocol-compatible with the official x402 facilitators.** A
  Coinbase x402 facilitator service or an agent built on the official
  client SDK won't recognize `exact-veloran`. For the hackathon demo
  this doesn't matter — our AI reader script (May 1) will speak our
  scheme directly. Post-hackathon, the right move is to either submit
  `exact-veloran` upstream as a new scheme or refactor the program to
  fit `exact_svm` (likely requires the program to be a wrapping
  facilitator that emits a strict transferChecked).
- **No nonce / expiration.** Tx signatures are unique per Solana tx;
  the `Unlock` row's uniqueness constraint provides replay protection
  at the persistence layer.

## What this enables

- The agent demo (May 1): a Node script holds a Solana keypair, hits
  `/api/x402/<slug>`, gets a 402, signs+sends a `pay_for_content` tx,
  re-hits the URL with `X-PAYMENT`, prints the content. Same wallet,
  different network actor — the *agent economy* beat of the demo.
- A clean separation of concerns: `lib/x402.ts` is the verification
  truth, both routes (`/api/unlock/...` for humans, `/api/x402/...`
  for agents) call it. Adding a third entry point later is a 30-line
  change.

## Open items for post-hackathon

- Publish the scheme spec somewhere reachable.
- Investigate making the program a `transferChecked`-emitting wrapper
  so we can ride the official `exact_svm` rails while still doing the
  split in one tx.
- Consider whether the platform cut should be a separate transfer
  appended outside the program rather than a CPI from inside it —
  trades off composability vs. atomicity.
