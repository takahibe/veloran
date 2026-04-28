# Veloran — Solana Frontier Hackathon 2026 — Pitch Deck

**Format:** 10 slides. Each lands in 10–15 seconds when read aloud. Judges skim — every word earns its place.

**Voice/tone:** confident, honest, technical when it pays off, never salesy. No hyperbole. Numbers where we have them. "We don't know yet" where we don't.

**Visual brand:** dark background (matches the live URL), violet (#8B5CF6) for accents, white/grey hierarchy. Geist or similar geometric sans for headlines, monospace for addresses + code. Avoid emoji on slides themselves; use sparingly in speaker notes.

**Length target:** 10 slides, ~2 minutes if presented (roughly 12s/slide). Judges will likely view as static deck after watching the demo video, so each slide must stand alone.

---

## Slide 1 — Cover

**Headline:** `Veloran`
**Tagline:** *Substack for the agent economy.*
**Sub-tagline:** Per-post & subscription paywalls on Solana. Humans pay with one click. AI agents pay autonomously.

**Footer:**
- `veloran-paywall-sage.vercel.app` — live on Solana devnet
- `github.com/takahibe/veloran` — open source
- Solana Frontier Hackathon · May 2026

**Visual:** Black canvas, large violet "V" mark or wordmark. Small Solana logo lockup ("Built on Solana") in corner.

**Speaker notes:** *(opening line if presenting live)* "Veloran is a single-link paywall for any creator. Humans unlock with a click, AI agents pay automatically. Five percent to us, ninety-five to the creator, split on-chain."

---

## Slide 2 — The Problem

**Headline:** Creator paywalls are stuck in 2015.

**Three columns / three pains:**

| Substack-style | Stripe paywalls | AI agents |
|---|---|---|
| Takes **10%** + locks creators into one platform | KYC, dispute fees, custodial — most creators give up | Read + summarize content all day, **pay nothing** |
| No per-post pricing | No micro-payments under $0.50 | No standard for paying for what they consume |
| No way to monetize an API or dataset | No native programmability | Creators get scraped, not paid |

**One-line bottom band (violet):** *Two markets. Same broken rails.*

**Speaker notes:** Frame both audiences. Substack's $1B valuation proves the creator side. Agent traffic is exploding and creators get zero.

---

## Slide 3 — The Solution

**Headline:** One paywall link. Two payers.

**Body — three sentences max:**
> Creators paste a post, set a price ($0.05–$5 USDC) or a monthly tier, get a link.
> Readers — human or AI agent — pay in USDC and unlock instantly.
> 95% to the creator. 5% to Veloran. Split on-chain via our Anchor program. **No custody. No KYC. No platform lock-in.**

**Visual:** Three-column flow:
```
[Creator] → [/p/<slug>] → [Human reader (Privy wallet)]
                       ↘ [AI agent (x402 endpoint)]
```
Both arrows merge into a single Anchor program box → 95/5 split.

**Speaker notes:** The key reveal: the *same URL* serves both audiences. Visit it as a human, you see a paywall. Hit it as an HTTP client without payment, you get a 402 challenge with on-chain payment instructions.

---

## Slide 4 — How a human pays (5 seconds on screen)

**Headline:** Email login. No seed phrase. One click to unlock.

**Visual:** Three-frame storyboard (real screenshots from the live URL):

1. `/p/<slug>` showing blurred content + violet "Unlock for $0.50 USDC" button
2. Privy modal with the SPL transferChecked details
3. Unlocked content + Solscan transaction link

**Caption strip below:** *"Privy embedded wallet. Devnet USDC. ~3 seconds end-to-end."*

**Speaker notes:** Privy handles wallet creation invisibly. No "what's a seed phrase" friction. Phantom wallets also work — we tested both.

---

## Slide 5 — How an AI agent pays *(the novel moment)*

**Headline:** Every paywalled link is also an x402 endpoint.

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
  console.log(await paid.text());
}
```

**Right — terminal output (real, from the AI reader script):**
```
🤖  Agent address:  3P6V…VmYB
📡  Hitting endpoint without payment…
💸  Challenge:        $0.50 USDC → 95% creator, 5% platform
🔨  Building pay_for_content transaction…
✅  Confirmed:        56upSAXh…q5u
🔓  Re-requesting with X-PAYMENT…
━━━ Unlocked content ━━━
[content reveals]
```

**Footer band (violet):** *First infrastructure that treats AI agents as paying customers, not freeloaders.*

**Speaker notes:** This is the slide judges remember. The video shows it live — terminal on one half of the screen, creator dashboard on the other. Creator earnings tick up in real time.

---

## Slide 6 — The on-chain split

**Headline:** Trustless by construction.

**Visual:** Single-instruction Anchor program diagram:
```
Reader USDC ATA
        ↓
  pay_for_content(amount)   ← 100 lines of Rust
        ↓
   ╔═════════╤═════════╗
   ║   95%   │   5%    ║
   ║ Creator │Treasury ║
   ╚═════════╧═════════╝
```

**Three bullets below:**
- One atomic transaction. Deterministic 95/5 split. No middleman custodies USDC.
- Program ID `2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS` — public on devnet, every tx auditable on Solscan.
- Same instruction powers per-post unlocks AND subscriptions. Generic by design.

**Speaker notes:** "Trustless" isn't marketing here — the Rust enforces the split. We literally cannot take more than 5%.

---

## Slide 7 — Subscriptions (the Substack story)

**Headline:** Per-post for tips. Subscriptions for fans.

**Visual:** Side-by-side card showing:

**Per-post** *(as low as $0.05)*
- One-tap unlock
- 95% creator / 5% Veloran
- Receipt: Solscan link forever

**Subscription** *(monthly or yearly)*
- One payment unlocks every post from a creator
- Same on-chain split
- HMAC cookie auto-expires when on-chain `expiresAt` passes — no off-chain renewal nonsense
- Reader can upgrade monthly → yearly without losing time

**Footer:** *Both flows use the same Anchor instruction. No new on-chain code; off-chain database tracks plan + duration.*

**Speaker notes:** Subscriptions ship today, devnet, in this hackathon submission. Not a "coming soon" slide.

---

## Slide 8 — Why now (market)

**Headline:** Two markets converging.

**Two-row table:**

| Force | Signal |
|---|---|
| **Creator economy** | Substack hit 4M+ paid subscribers. Beehiiv, Ghost, Patreon all growing. Creators want lower take rates + per-post pricing. |
| **Agent economy** | OpenAI, Anthropic, Google all shipped agents in 2025–26. Web traffic from agents already crossed 30% on some sites. None of them pay for what they read. |
| **Solana × x402** | Solana Foundation pushed x402 as 2026 infrastructure priority. Coinbase's `x402` package + Privy's wallet integration shipped this year. |
| **On-chain payments** | USDC supply on Solana > $5B. Stablecoin transfer fees < $0.001. Per-post pricing is finally economical. |

**Footer band:** *Veloran sits exactly where these four trends meet.*

**Speaker notes:** Don't oversell — let the data carry it. If asked "what about Lightning?" — Bitcoin Lightning works but Solana ecosystem alignment + USDC stability + Privy auth made the choice obvious.

---

## Slide 9 — Roadmap

**Headline:** Devnet today. Mainnet next.

**Three columns / three milestones:**

**Today — May 2026 (this submission)**
- ✅ Live devnet deployment
- ✅ Per-post + subscription paywalls
- ✅ Email + wallet login (Privy)
- ✅ AI agent reader script
- ✅ On-chain 95/5 split via Anchor
- ✅ Open source on GitHub

**Q3 2026 — Mainnet**
- Mainnet program audit + deploy
- Privy production app
- Helius indexer for instant earnings updates
- Custom domain support for creators

**Q4 2026 — Beyond posts**
- API + dataset paywalls (PDF, CSV, JSON feeds)
- Multi-asset payments (USDC, SOL, EURC)
- Veloran SDK so any app can paywall via our rails
- Cross-creator bundles (Spotify-for-content)

**Speaker notes:** Defendable: the rails are general-purpose. Posts are the wedge; APIs and datasets are the longer game.

---

## Slide 10 — Ask

**Headline:** What we want from this hackathon.

**Three blocks:**

**1. Win the prize.**
The demo runs. The split is on-chain. The agent flow is novel. We earn it.

**2. Solana Foundation grant.**
We're a strong fit for the x402 infrastructure track. ~$25–75K to get to mainnet, audit the program, ship the SDK.

**3. Talk to creators.**
Twenty creators using Veloran on mainnet by end of Q3 = real product validation. If you know newsletter writers, indie publishers, or API providers tired of Stripe/Substack — please send them our way.

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
- **Slide 6:** technical, precise, no marketing words
- **Slides 7, 8:** market framing, pull quotes from real data
- **Slides 9, 10:** honest scope, specific asks

## What we deliberately did NOT include

- Team photo / bio slide → judges have your submitter info already
- Detailed financial projections → at this stage, anything specific is fiction
- "Why we'll win" / competitive matrix → looks defensive; let the demo carry it
- Token / launch / airdrop → not in scope, would actively hurt the pitch with serious judges

## Words to avoid

"Revolutionary", "disruptive", "Web3", "leverage", "unlock value", "transformative". They flag the deck as low-effort.

## Words that earn their place

"On-chain", "trustless" (only in Slide 6 where it's literally true), "non-custodial", "agent economy", "atomic", "deterministic".

## Once content is locked, decide format

Per the brainstorm earlier — three options for visual format:
1. Google Slides / Pitch / Canva (manual design pass)
2. PowerPoint .pptx via the `pptx` skill
3. Custom HTML deck via `frontend-design` skill (matches live URL brand exactly)

My recommendation once content is signed off: **option 3** — a brand-matched HTML deck — because it doubles as a slide you can click-through during the demo video without breaking visual continuity. Plus PDF export for judges who want a download.
