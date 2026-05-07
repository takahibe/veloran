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
- Many existing rails are built for accounts, subscriptions, or contracts — not one-off machine purchases
- Subscriptions force buyers into recurring relationships they don't want
- AI agents increasingly read content and call APIs — but most resources still have no agent-native payment path
- Existing crypto-native attempts are off-chain facilitators that custody buyer funds

**Speaker note:** Three audiences (sellers, casual buyers, agents) — one broken billing layer.

---

## Slide 3 — Why now

**Headline:** Three trends just converged.

**Bullets:**
- Major AI labs shipped increasingly agentic products in 2025
- HTTP 402/x402 emerged as a real payment pattern in 2025; Solana makes settlement cheap enough for small requests
- USDC supply on Solana > $5B with sub-cent fees — micropayments are finally economical at scale

**Speaker note:** The payment infrastructure question is suddenly live, and Solana is where it's most economical to answer.

---

## Slide 4 — Solution + market validation

**Headline:** Pay.sh proved the demand. Veloran fills the seller-side gap.

**Bullets:**
- Pay.sh (Solana Foundation + Google Cloud) lets agents discover and pay for established APIs — validation that agent-paid commerce works on Solana
- Cloudflare Pay-Per-Crawl proves content owners want to charge machine traffic
- One resource URL supports two buyers: humans checkout with Privy; agents receive HTTP 402 payment instructions
- Veloran wedge: publishing + paywall + access + on-chain settlement for independent sellers — analysts, researchers, indie API builders, data curators

**Speaker note:** Pay.sh is validation, not competition. Their market is established APIs + agent buyers; ours is independent sellers + sovereign settlement. Both can exist; both are needed for the full agent economy stack.

---

## Slide 5 — Product / how it works

**Headline:** Three steps from idea to paid endpoint.

**Bullets:**
- **Sign in** — email login mints an embedded Privy wallet, or connect Phantom directly
- **Publish** — drop a JSON response, text payload, or analyst writing into the gated content field; pick a price
- **Get paid** — humans tap to buy; agents send `X-PAYMENT` header with a signed Solana tx; settlement is on-chain in <3 seconds

**Speaker note:** Show the dashboard during this slide. The form is the product.

---

## Slide 6 — Why Solana

**Headline:** Micropayments only work where fees and latency don't.

**Bullets:**
- Sub-cent fees → $0.05 per-call pricing is economical
- Fast, low-cost settlement → agent gets its response in the same request cycle
- Custom programs → atomic 95/5 split without routing every payment through a hosted facilitator
- USDC > $5B on Solana → deep stablecoin liquidity for both sides

**Speaker note:** Frame Solana as the chain where this UX is most natural: cheap USDC settlement, fast confirmation, and programmable payment logic.

---

## Slide 7 — Use cases

**Headline:** What you can sell on Veloran today.

**Bullets:**
- **Paid API endpoints** — trade signals, on-chain analytics, model inference (`$0.05–$5` per call)
- **Text-shaped datasets** — JSON/CSV-style payloads priced once, downloaded once; native files are roadmap
- **Premium analyst content** — long-form research, gated newsletters, structured reports
- **Subscriptions** — one monthly payment unlocks every endpoint from a single seller (heavy-buyer flow)

**Speaker note:** Demo flagship is a crypto signal API. The other wedges are the same primitive in different shapes.

---

## Slide 8 — Market direction / opportunity

**Headline:** APIs are revenue products. Agents are becoming buyers.

**Bullets:**
- Postman 2025: 65% of surveyed organizations generate API revenue; 25% derive more than half their revenue from APIs
- IBM 2025: enterprise AI workflows are projected to grow from 3% to 25% by end of 2025; 70% say agentic AI is essential
- Pay.sh and Cloudflare Pay-Per-Crawl validate the direction: machine traffic is becoming payable traffic
- Veloran’s wedge: Solana-native publishing + paywall + access + direct on-chain settlement for independent sellers

**Speaker note:** Use this as direction, not TAM theater. The market already charges for APIs and is starting to charge machine traffic; Veloran packages that primitive for sellers on Solana.

---

## Slide 9 — Demo / proof

**Headline:** Live on Solana devnet, end-to-end working today.

**Bullets:**
- ✅ Anchor program deployed — `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS`
- ✅ Human flow + AI-agent-style HTTP 402 flow both verified on the live URL
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

**Closing line:** *Publish once. Humans pay with checkout. Agents pay with HTTP 402. Sellers get paid directly on-chain.*

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
- **Market sizing claim** in slide 8 — replaced with sourced Postman/IBM direction stats; re-check figures before final recording if desired.
- **No real third-party seller using it yet** — every seller in the live demo is a test account. The deck implies the product is ready for sellers; that's true technically but not yet socially.

## Words to avoid (per positioning prompt)

"creator newsletter on Solana", "Creators can sell anything", "AI agents pay too", "Web3", "revolutionary", "disruptive", "leverage", "unlock value".

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
