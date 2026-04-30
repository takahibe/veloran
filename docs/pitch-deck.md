# Veloran — Solana Frontier Hackathon Pitch Deck

**Format per slide:** title · 1 short headline · 2–4 concise bullets · optional speaker note.

**Visual brand:** dark background, violet (#8B5CF6) accents, geometric sans for headlines, monospace for addresses + code. Each slide stands alone.

**Length target:** 10 slides, ~2:00 if presented live (~12s/slide). Designed to be skimmed by judges in under 90 seconds as a static deck.

---

## Slide 1 — Title

**Headline:** Veloran — the payment and access layer for the agent economy.

**Bullets:**
- Sell APIs, datasets, and premium content
- Humans and AI agents both unlock with USDC on Solana
- 95% direct to the seller, settled on-chain — no facilitator, no custody

**Footer:** `veloran-paywall-sage.vercel.app` · Solana Frontier · May 2026

**Speaker note:** Open with the one-liner. Don't over-explain — the rest of the deck does the work.

---

## Slide 2 — Problem

**Headline:** Premium digital resources are still sold like it's 2015.

**Bullets:**
- Stripe and API keys assume a long-lived enterprise contract; they don't fit one-off purchases
- Subscriptions force buyers into recurring relationships they don't want
- AI agents read content and call APIs all day — and pay nothing
- Existing crypto-native attempts are off-chain facilitators that custody buyer funds

**Speaker note:** Three audiences (sellers, casual buyers, agents) — one broken billing layer.

---

## Slide 3 — Why now

**Headline:** Three trends just converged.

**Bullets:**
- Agents are real economic actors — OpenAI, Anthropic, Google all shipped agents in 2025
- x402 (HTTP 402 Payment Required) shipped as a real protocol in 2025; the wire is ready, the on-chain settlement layer wasn't
- USDC supply on Solana > $5B with sub-cent fees — micropayments are finally economical at scale

**Speaker note:** The payment infrastructure question is suddenly live, and Solana is where it's most economical to answer.

---

## Slide 4 — Solution

**Headline:** One paid endpoint, two payers, on-chain settlement.

**Bullets:**
- Sellers publish a paid endpoint (API, dataset, content) and set a USDC price
- Humans see a one-tap checkout via Privy (email or Phantom)
- AI agents see HTTP 402 with on-chain payment instructions, sign, parse the response
- A custom Anchor program enforces the 95/5 split atomically — Veloran never holds buyer funds

**Speaker note:** The key reveal: same URL, two checkout flows. The on-chain split is enforced by Solana's runtime, not by us.

---

## Slide 5 — Product / how it works

**Headline:** Three steps from idea to paid endpoint.

**Bullets:**
- **Sign in** — email login mints an embedded Privy wallet, or connect Phantom directly
- **Publish** — drop a JSON response, a file payload, or analyst writing into the gated content field; pick a price
- **Get paid** — humans tap to buy; agents send `X-PAYMENT` header with a signed Solana tx; settlement is on-chain in <3 seconds

**Speaker note:** Show the dashboard during this slide. The form is the product.

---

## Slide 6 — Why Solana

**Headline:** Micropayments only work where fees and latency don't.

**Bullets:**
- Sub-cent fees → $0.05 per-call pricing is economical
- Sub-second confirmations → agent gets its response in the same request cycle
- Custom programs → atomic 95/5 split impossible where every payment routes through a hosted facilitator
- USDC > $5B on Solana → deep stablecoin liquidity for both sides

**Speaker note:** Frame Solana as the *only* chain where this product can exist with this UX. Other chains require facilitators because they can't settle this fast or cheap.

---

## Slide 7 — Use cases

**Headline:** What you can sell on Veloran today.

**Bullets:**
- **Paid API endpoints** — trade signals, on-chain analytics, model inference (`$0.05–$5` per call)
- **One-shot datasets** — CSV/JSON/PDF priced once, downloaded once
- **Premium analyst content** — long-form research, gated newsletters, structured reports
- **Subscriptions** — one monthly payment unlocks every endpoint from a single seller (heavy-buyer flow)

**Speaker note:** Demo flagship is a crypto signal API. The other wedges are the same primitive in different shapes.

---

## Slide 8 — Market direction / opportunity

**Headline:** The settlement layer for paid endpoints.

**Bullets:**
- Stripe + API keys = ~$XB API monetization market — none of it crypto-native
- AI agent traffic crossed 30% of bot traffic on some sites in 2025 — none of it billed
- Existing crypto x402 facilitators (xpay.sh on Base, payai.network multi-chain) are pay-per-call only and off-chain
- Veloran's wedge: on-chain settlement + subscriptions + Solana-native — the structural delta competitors can't copy

**Speaker note:** *Real numbers needed before recording. Replace `$XB` with a sourced figure or drop that bullet.*

---

## Slide 9 — Demo / proof

**Headline:** Live on Solana devnet, end-to-end working today.

**Bullets:**
- ✅ Anchor program deployed — `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`
- ✅ Human flow + AI agent flow both verified on the live URL
- ✅ Subscription tiers, on-chain split, idempotent settlements
- ✅ Open source: `github.com/takahibe/veloran`

**Footer:** Watch the 2:30 demo video at the live URL.

**Speaker note:** This is where you point to the live URL. Don't promise — point. Open Solscan and show the program account if questioned.

---

## Slide 10 — Vision / closing

**Headline:** Programmable paywalls for the next billion paid requests.

**Bullets:**
- **Today:** Solana devnet, per-call + subscription, humans + agents
- **Q3 2026:** Mainnet program audit + deploy, Helius indexer, custom domains for sellers
- **Q4 2026:** Native dataset paywalls, multi-asset (SOL, EURC), Veloran SDK so any app paywalls in <30 LOC

**Closing line:** *The agent economy doesn't need another facilitator. It needs a settlement layer.*

**Footer:**
- 🌐 `veloran-paywall-sage.vercel.app`
- 💻 `github.com/takahibe/veloran`
- 📧 `dr.adityasaputra@gmail.com`

**Speaker note:** End on the URL. Let the live product close the pitch.

---

# Appendix — for your reference

## Final headline + subhead (locked)

- **Headline:** Veloran — the payment and access layer for the agent economy.
- **Subhead:** Sell APIs, datasets, and premium content that humans and AI agents unlock with USDC on Solana.

## Strongest part of the story

The on-chain 95/5 split via a deployed Anchor program — verifiable on Solscan, structurally different from every off-chain facilitator competitor (xpay.sh, payai.network). The same Anchor instruction generically powers per-call unlocks, subscription purchases, and any future payment shape we add. *This is the part judges will remember.*

## Weakest part — needs real implementation proof

- **Datasets as a use case** — we list CSV/JSON/PDF as a wedge, but Veloran today only handles text-shaped payloads (JSON content works because it's text; native binary file delivery is roadmap).
- **Market sizing claim** in slide 8 — `$XB API monetization market` placeholder must be replaced with a sourced figure or dropped before recording.
- **No real third-party seller using it yet** — every seller in the live demo is a test account. The deck implies the product is ready for sellers; that's true technically but not yet socially.

## Words to avoid (per positioning prompt)

"Substack on Solana", "Creators can sell anything", "AI agents pay too", "Web3", "revolutionary", "disruptive", "leverage", "unlock value".

## Words that earn their place

"Programmable", "on-chain settlement", "non-custodial", "atomic", "facilitator" (only when contrasting), "agent economy", "trustless" (slide 4 / 9 only).

## Visual format options

The user is designing the deck visually in Claude artifacts. This markdown is the content source. Three viable formats:

1. Google Slides / Pitch / Canva (manual visual pass)
2. PowerPoint .pptx via the `pptx` skill
3. Custom HTML deck via `frontend-design` skill — matches the live URL brand exactly

## Demo content prep

The flagship "API endpoint" in the demo is a JSON-shaped post. Suggested test post for the recording:

- Slug: `sol-alpha-signal-2026-04-29`
- Price: $0.50
- Content (paste into the gated content field):
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
