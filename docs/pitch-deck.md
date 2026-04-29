# Veloran — Solana Frontier Hackathon 2026 — Pitch Deck

**Format:** 10 slides. Each lands in 10–15 seconds when read aloud. Judges skim — every word earns its place.

**Voice/tone:** confident, honest, technical when it pays off, never salesy. No hyperbole. Numbers where we have them. "We don't know yet" where we don't.

**Visual brand:** dark background (matches the live URL), violet (#8B5CF6) for accents, white/grey hierarchy. Geist or similar geometric sans for headlines, monospace for addresses + code. Avoid emoji on slides themselves; use sparingly in speaker notes.

**Length target:** 10 slides, ~2 minutes if presented (roughly 12s/slide). Judges will likely view as static deck after watching the demo video, so each slide must stand alone.

**Positioning anchor:** *Programmable paywalls for APIs, datasets, and premium content.* Sellers publish a paid endpoint, buyers (humans or AI agents) unlock with USDC on Solana, 95/5 split is enforced on-chain by a deployed Anchor program. Reference: `docs/pitch-deck.md` was rewritten Apr 29 to lead with API + agent-economy framing and the on-chain-split moat against `xpay.sh` and `payai.network` (both off-chain facilitators).

---

## Slide 1 — Cover

**Headline:** `Veloran`
**Tagline:** *Programmable paywalls for APIs, datasets, and premium content.*
**Sub-tagline:** Humans and AI agents pay with USDC on Solana. 95% direct to the seller, settled on-chain.

**Footer:**
- `veloran-paywall-sage.vercel.app` — live on Solana devnet
- `github.com/takahibe/veloran` — open source
- Solana Frontier Hackathon · May 2026

**Visual:** Black canvas, large violet "V" mark or wordmark. Small Solana logo lockup ("Built on Solana") in corner.

**Speaker notes:** *(opening line if presenting live)* "Veloran is a programmable paywall. A seller publishes a paid endpoint. A buyer — human or AI agent — unlocks it with USDC on Solana. The split is on-chain. No facilitator."

---

## Slide 2 — The Problem

**Headline:** Premium digital resources are still sold like it's 2015.

**Three columns / three pains:**

| Sellers | Buyers | AI agents |
|---|---|---|
| Stripe = KYC, dispute fees, custody. Subscriptions force readers into contracts they don't want. | No native way to pay $0.05 for a single API call or report. | Read APIs and content all day. **Pay for none of it.** |
| API marketplaces take 20–30% + lock you to one chain. | Sign-up flows for every paid endpoint they touch. | No standard way for an autonomous agent to discover a price and settle a payment without an enterprise contract. |
| No way to prove on-chain that the buyer actually paid. | Pay for "subscriptions" they use once. | Sellers get scraped, not paid. |

**One-line bottom band (violet):** *Three audiences. One broken billing layer.*

**Speaker notes:** Frame three pains. Don't dwell — judges feel this one. Move on.

---

## Slide 3 — The Solution

**Headline:** One paid endpoint. Two payers. On-chain settlement.

**Body — three sentences max:**
> Sellers publish a paid endpoint — an API, a dataset, an analyst report — and set a USDC price.
> Buyers — humans or AI agents — unlock instantly. Humans see a one-tap checkout. Agents get HTTP 402 with on-chain payment instructions, sign the transaction, parse the response.
> 95% to the seller. 5% to Veloran. Split atomically by a deployed Anchor program. **No facilitator. No custody. No KYC.**

**Visual:** Three-column flow:
```
[Seller]   →   [/api/v1/<endpoint>]   →   [Human buyer (Privy / Phantom)]
                                       ↘  [AI agent (x402)]
                       ↓
            [Anchor program — pay_for_content]
                       ↓
              ╔═══════╤══════╗
              ║  95%  │  5%  ║
              ║seller │ Velo ║
              ╚═══════╧══════╝
```

Both arrows merge into a single Anchor program box → 95/5 split.

**Speaker notes:** The key reveal: the *same URL* serves both audiences. Visit it as a human, you see a paywall. Hit it as an HTTP client without payment, you get a 402 challenge with on-chain instructions.

---

## Slide 4 — How a human pays (5 seconds on screen)

**Headline:** Email or Phantom. One click to unlock.

**Visual:** Three-frame storyboard (real screenshots from the live URL):

1. `/p/<endpoint>` showing blurred preview + violet "Unlock for $0.50 USDC" button
2. Privy modal — choose email login OR connect a wallet — with the SPL transferChecked details
3. Unlocked response (JSON for an API endpoint, or rendered text for an analyst write-up) + Solscan transaction link

**Caption strip below:** *"Privy embedded wallet OR Phantom. Devnet USDC. ~3 seconds end-to-end."*

**Speaker notes:** Privy handles wallet creation invisibly. No "what's a seed phrase" friction for non-crypto buyers. Phantom wallets work natively for the crypto-fluent.

---

## Slide 5 — How an AI agent pays *(the novel moment)*

**Headline:** Every paid endpoint is also an x402 endpoint.

**Two-column code/output:**

**Left — agent code (~6 lines):**
```ts
const res = await fetch(url);
if (res.status === 402) {
  const { accepts } = await res.json();
  const tx = await pay(accepts[0]);     // pay_for_content w/ 95/5 split
  const paid = await fetch(url, {
    headers: { "X-PAYMENT": encode(tx) },
  });
  console.log(JSON.parse(await paid.text()));
}
```

**Right — terminal output (real, from the AI reader script):**
```
🤖  Agent address:  3P6V…VmYB
📡  Hitting endpoint without payment…
💸  Challenge:        $0.50 USDC → 95% seller, 5% platform
🔨  Building pay_for_content transaction…
✅  Confirmed:        56upSAXh…q5u
🔓  Re-requesting with X-PAYMENT…
━━━ Response ━━━
{
  "signal": "long",
  "asset": "SOL",
  "confidence": 0.78,
  "thesis": "Low CME OI + treasury inflows pre-FOMC…",
  "expires": "2026-05-15"
}
```

**Footer band (violet):** *Solana-native. Non-custodial. The seller is paid before the response leaves the server.*

**Speaker notes:** This is the slide judges remember. The video shows it live — terminal on one half of the screen, seller dashboard on the other. Earnings tick up in real time.

---

## Slide 6 — The on-chain split *(the technical moat)*

**Headline:** Trustless by construction. Different from every facilitator.

**Visual:** Single-instruction Anchor program diagram:
```
Buyer USDC ATA
        ↓
  pay_for_content(amount)   ← 100 lines of Rust
        ↓
   ╔═════════╤═════════╗
   ║   95%   │   5%    ║
   ║  Seller │Treasury ║
   ╚═════════╧═════════╝
```

**Three bullets below:**
- One atomic transaction. Deterministic 95/5 split. **Veloran never custodies the buyer's USDC.**
- Program ID `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS` — public on devnet, every tx auditable on Solscan.
- Same instruction powers per-call unlocks, file purchases, content unlocks, AND subscriptions. Generic by design.

**Comparison strip below (small, light text):**
> *xpay.sh and payai.network are off-chain facilitators — they custody payments briefly and take a fee. Veloran's split is enforced by Solana's runtime. We literally cannot take more than 5%.*

**Speaker notes:** "Trustless" isn't marketing here — the Rust enforces the split. This is the structural difference vs every competitor in the space.

---

## Slide 7 — Subscriptions for heavy buyers

**Headline:** Per-call for tries. Subscriptions for fans.

**Visual:** Side-by-side card showing:

**Per-call** *(as low as $0.05)*
- One-tap unlock per request
- 95% seller / 5% Veloran
- Receipt: Solscan link forever

**Subscription** *(monthly or yearly)*
- One payment unlocks every endpoint from a seller
- Same on-chain split
- HMAC cookie auto-expires when on-chain `expiresAt` passes — no off-chain renewal nonsense
- Buyer can upgrade monthly → yearly without losing time

**Footer band (violet):** *Both flows use the same Anchor instruction. Neither competitor in this space (xpay, payai) ships subscriptions — they're pay-per-call only.*

**Speaker notes:** Subscriptions ship today, devnet, in this hackathon submission. Not a "coming soon" slide. Heavy buyers want flat rate; per-call competitors can't offer that.

---

## Slide 8 — Why now (market)

**Headline:** Three trends converging.

**Three-row table:**

| Force | Signal |
|---|---|
| **Agent economy** | OpenAI, Anthropic, Google all shipped agents in 2025–26. Web traffic from agents already crossed 30% on some sites. None of them pay for what they read. |
| **Solana × x402** | Solana Foundation pushed x402 as 2026 infrastructure priority. Coinbase shipped the `x402` package. Privy added Solana wallet integration. |
| **On-chain stablecoin payments** | USDC supply on Solana > $5B. Stablecoin transfer fees < $0.001. Per-call pricing of $0.05 is finally economical at scale. |
| **API & data sales** | API monetization market projected at $X+ billion. Existing rails (Stripe + API keys + monthly subscriptions) are wrong shape for autonomous buyers. |

**Footer band:** *Veloran sits exactly where these four trends meet — Solana, x402, on-chain settlement, agent buyers.*

**Speaker notes:** Don't oversell — let the data carry it. *Note for user: real numbers needed before recording. Replace $X+ billion with a sourced figure if available; otherwise drop that row.*

---

## Slide 9 — Roadmap

**Headline:** Devnet today. Mainnet next. SDK after.

**Three columns / three milestones:**

**Today — May 2026 (this submission)**
- ✅ Live devnet deployment
- ✅ Per-call unlocks (humans + agents)
- ✅ Subscription tiers (monthly + yearly)
- ✅ Email + wallet sign-in (Privy + Phantom)
- ✅ AI agent reader script
- ✅ On-chain 95/5 split via Anchor
- ✅ Open source on GitHub

**Q3 2026 — Mainnet**
- Mainnet program audit + deploy
- Privy production app
- Helius indexer for instant earnings updates
- Custom domains for sellers
- Spend controls for agent buyers (budget caps, allow-lists)

**Q4 2026 — Beyond endpoints**
- Native dataset paywalls (CSV/JSON file delivery, not just text payloads)
- Multi-asset payments (USDC + SOL + EURC)
- Veloran SDK so any seller can paywall via our rails in <30 LOC
- Bundles — one subscription unlocks endpoints from multiple sellers (creator co-ops)

**Speaker notes:** Defendable: the rails are general-purpose. APIs are the wedge; datasets and SDKs are the longer game. The roadmap intentionally avoids token / airdrop / governance language — keeps focus on the payment primitive.

---

## Slide 10 — Ask

**Headline:** What we want from this hackathon.

**Three blocks:**

**1. Win the prize.**
The demo runs live. The split is enforced on-chain. The agent flow is novel. We earn it.

**2. Solana Foundation grant.**
We're a strong fit for the x402 infrastructure track. ~$25–75K to get to mainnet, audit the program, ship the SDK.

**3. Talk to data sellers.**
Twenty endpoints live on Veloran by end of Q3 = real product validation. If you know API providers, on-chain analysts, indie researchers, or quant teams selling data — please send them our way.

**Footer (large, bold, centered):**
- 🌐 `veloran-paywall-sage.vercel.app` *(live demo)*
- 💻 `github.com/takahibe/veloran` *(open source)*
- 📧 `dr.adityasaputra@gmail.com`
- 𝕏 *(your handle, if you want one for the deck)*

**Speaker notes:** End on the URL. The deck is meant to make judges click through to the live URL — that's where the product sells itself.

---

# Appendix (NOT in the deck — for your reference)

## Tone notes per slide

- **Slides 1, 2, 3:** confident, declarative
- **Slides 4, 5:** show, don't tell — these are screenshots/code
- **Slide 6:** technical, precise, no marketing words. The competitor mention is intentional and short.
- **Slides 7, 8:** market framing, pull quotes from real data
- **Slides 9, 10:** honest scope, specific asks

## What we deliberately did NOT include

- Team photo / bio slide → judges have your submitter info already
- Detailed financial projections → at this stage, anything specific is fiction
- "Why we'll win" / competitive matrix → looks defensive; the slide-6 footer competitor mention does the job in one line
- Token / launch / airdrop → not in scope, would actively hurt the pitch with serious judges
- Substack comparison → deliberately removed in this rewrite. New positioning is API-first; Substack framing is in the rear-view

## Words to avoid

"Revolutionary", "disruptive", "Web3", "leverage", "unlock value", "transformative". They flag the deck as low-effort.

## Words that earn their place

"On-chain" (only when literally true), "non-custodial", "atomic", "deterministic", "facilitator" (when contrasting with us), "agent economy", "trustless" (slide 6 only).

## Once content is locked, decide format

Per the brainstorm earlier — three options for visual format:
1. Google Slides / Pitch / Canva (manual design pass)
2. PowerPoint .pptx via the `pptx` skill
3. Custom HTML deck via `frontend-design` skill (matches live URL brand exactly)

User is doing the visual design themselves in Claude artifacts.

## Demo content hint for slide 5

The flagship "API endpoint" in the demo is a JSON-shaped post — the existing `/api/x402/[slug]` route returns whatever content the seller published, and a JSON body looks like an API response. Suggested test post for the live demo:

- Slug: `sol-alpha-signal-2026-04-29` (or similar)
- Price: $0.50
- Content (JSON, paste into the gated content field):
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

The existing post page renders this with `whitespace-pre-wrap`, so JSON formatting is preserved on the human-facing view.
