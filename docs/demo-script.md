# Veloran demo video — 2:30 voiceover script

**Target runtime:** 2:30 (judges expect ≤ 2:00; we run a hair long because the agent beat is the wow moment and needs to land. Trim to 2:00 only if the agent flow can be tightened.)

**Recording tool:** Loom (Chrome extension). Auto-uploads, gives a shareable link, supports webcam-corner overlay if you want to add it.

**Format:** screen recording at 1920×1080, 30fps. Voiceover narrated live OR recorded after-the-fact in Descript. *I recommend live narration on the first take — re-recordings are easier to do later than to sync after.*

---

## Pre-flight checklist (do this BEFORE you press record)

Set up four windows, sized + positioned ahead of time so you can switch with `Cmd/Ctrl + Tab`:

| Window | Contents | Notes |
|---|---|---|
| **W1 — Creator Chrome (normal)** | Logged in as creator on `/dashboard` | Tier saved: monthly $1, yearly $10. Has at least one published post. |
| **W2 — Reader Chrome (incognito)** | Signed out, `https://veloran-paywall-sage.vercel.app/p/<your-slug>` open in a tab | Reader Privy account already used once → faster login (no email code re-fetch). USDC + SOL funded. |
| **W3 — Terminal** | `cd ~/veloran` ready. Command pre-typed but not yet run: `VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app AGENT_KEYPAIR_PATH=~/.config/solana/agent.json npm run ai-reader -- <slug>` | Use a dark terminal theme (Solarized Dark or similar). Larger font (16-18pt) so judges can read. |
| **W4 — Solscan tab** | `https://solscan.io/account/2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS?cluster=devnet` open and scrolled to a recent transaction | This is the program account view — shows the deployed `pay_for_content` instruction. |

**Phantom wallet** (for the 5s wallet cutaway): pinned to extension bar, **set to devnet**, **funded with at least 0.05 SOL + 1 USDC**.

**Audio:** quiet room, normal mic. If you have AirPods or a USB mic, use it — laptop built-in mic is fine but not ideal.

**Test before pressing record:** open the AI reader command in a fresh terminal and run it once. If it works, kill that unlock from the database (or just run against a different post) so the first take is fresh.

---

## The script

Format below: **`[time]` SCREEN ACTION** (what's visible/changing) — *italicized voiceover.*

### 0:00 – 0:08 — Cold open

**`[0:00]` W1: Creator dashboard, hovering on the violet "+ New paywall" button.**

> *"This is Veloran. A creator paywall built on Solana. One link, two payers — humans, and AI agents."*

**On-screen text overlay (lower third, 0:03 → 0:08):**
> Veloran · veloran-paywall-sage.vercel.app

---

### 0:08 – 0:25 — Beat 1: Creator publishes a paywall

**`[0:08]` W1: Click "+ New paywall". The form opens.**

> *"Creators paste a post. Set a price. Get a link."*

**`[0:12]` W1: Type a title (or paste pre-prepared title), paste 3-4 sentences of dummy content into the gated content field, click "✨ Generate with Claude".**

> *"Claude writes the teaser automatically. Anthropic's API is wired in."*

**`[0:18]` W1: Preview text appears. Set price to $0.50. Click "Publish paywall".**

> *"Set a price — fifty cents. Publish."*

**`[0:22]` W1: Redirects to dashboard. The new post appears in the list with `$0.50` and `0 unlocks`.**

> *"Live link, ready to share."*

---

### 0:25 – 0:45 — Beats 2-3: Human reader pays

**`[0:25]` W1 → W2: Switch to incognito. Already on the post URL. Show the page: title, byline, blurred locked content, violet "Unlock for $0.50 USDC" button.**

> *"A reader visits the link. They see the title, the preview, the paywall."*

**`[0:30]` W2: Click "Unlock for $0.50 USDC". Privy modal opens.**

> *"Sign in with email — no seed phrase, no crypto onboarding."*

**`[0:35]` W2: Privy modal shows the SPL transferChecked tx. Click Confirm.**

> *"One click confirms the payment. USDC on Solana devnet."*

**`[0:39]` W2: Status cycles — Sending → Verifying → Unlocked. Content appears with Solscan link.**

> *"On-chain in three seconds. Content unlocked."*

---

### 0:45 – 0:50 — Wallet cutaway (5s)

**`[0:45]` W2 → reset to fresh incognito: click "Sign in" again, this time choose "Connect Wallet" → Phantom popup → Approve. Land on dashboard.**

> *"Or for crypto-native readers — connect Phantom directly. Same flow, no email."*

**(Cut back to the creator side immediately — don't dwell.)**

---

### 0:50 – 1:25 — Beat 5: AI agent pays autonomously *(THE WOW MOMENT)*

**`[0:50]` W3: Terminal in focus, full-screen or 70% width with W1 (creator dashboard) visible on the right 30%. Command is pre-typed.**

> *"Now watch this. The same paywall link is also an x402 endpoint. AI agents can pay it autonomously."*

**`[0:56]` W3: Hit Enter. The script starts running. Output streams:**
```
🤖 Agent address: 3P6V…VmYB
🎯 Target: …/api/x402/<slug>
📡 Hitting endpoint without payment…
💸 Challenge: $0.50 USDC → 95% creator, 5% platform
```

> *"The agent hits the URL with no payment. Server returns HTTP 402 — the x402 protocol — with the price and the on-chain instructions."*

**`[1:05]` W3: Continue showing:**
```
🔨 Building pay_for_content transaction…
🚀 Submitting to Solana devnet…
✅ Confirmed: <signature>…
```

> *"The agent builds the Solana transaction. Calls our Anchor program. Splits the payment ninety-five-five on-chain."*

**`[1:13]` W3: Final output:**
```
🔓 Re-requesting with X-PAYMENT…
━━━ Unlocked content ━━━
[content reveals]
```

> *"Pays. Re-requests with the payment header. Gets the content. Zero human in the loop."*

**`[1:20]` W3 → switch focus to W1 (creator dashboard).**

---

### 1:25 – 1:35 — Beat 6: Creator earnings update

**`[1:25]` W1: Hit Ctrl+R. Earnings card refreshes. Lifetime earnings shows $0.95. Pills now read "1 human" and "1 agent". Recent unlocks list shows both transactions.**

> *"Creator dashboard updates instantly. Ninety-five cents earned. One human, one agent — both on-chain."*

---

### 1:35 – 1:55 — Subscription beat (the Substack story)

**`[1:35]` W1 → W2 (incognito reader): navigate to `/c/<creator-address>`. Show the creator profile with Subscribe card showing monthly $1 + yearly $10.**

> *"And readers who come back regularly — subscribe."*

**`[1:42]` W2: Click "Subscribe · $1.00/month". Privy / wallet confirms. "Subscribed · monthly · Active until <date>" appears.**

> *"One payment. Every post from this creator unlocked for thirty days."*

**`[1:49]` W2: Click on a different post → content immediately unlocks (no per-post payment).**

> *"No per-post payment. Same on-chain split. Same Anchor program."*

---

### 1:55 – 2:10 — Solscan proof

**`[1:55]` W4: Solscan tab in focus. Show the program account page with recent transactions visible.**

> *"This is our Anchor program on Solana devnet."*

**`[2:00]` W4: Click into one of the recent unlock transactions. Show the token balance changes — reader -$0.50, creator +$0.475, treasury +$0.025.**

> *"Every unlock — every subscription — fires this one instruction. Ninety-five percent to the creator. Five percent to Veloran. Atomic. Immutable. Auditable."*

---

### 2:10 – 2:30 — Closer

**`[2:10]` Cut to a static slide: black background, large violet "Veloran" wordmark, tagline below.**

**On-screen text:**
```
              Veloran
   Substack for the agent economy.

   veloran-paywall-sage.vercel.app
   github.com/takahibe/veloran
```

> *"Veloran. Single-link paywalls on Solana. Humans pay with a click. AI agents pay autonomously. Ninety-five percent to the creator, on-chain."*

**`[2:23]` Hold the slide for 5 seconds. Voiceover:**

> *"Live now on devnet. Open source. Built for the Solana Frontier Hackathon."*

**`[2:30]` End.**

---

## Production tips

### Pacing
- The script clocks in at **~2:25–2:32** depending on cadence. If you over-run, the easiest cut is the wallet cutaway (saves 5s) — the agent beat must NOT be cut.
- Speak **slightly faster than conversational** (~160 wpm). Voiceovers naturally feel slow on playback.
- Pause for ~0.5s between beats. Resist the urge to fill silence.

### What to do if a take goes wrong mid-recording
- If the human-pay confirmation hangs (RPC lag): pause narration, wait for it. Trim the dead air in editing.
- If the AI reader script errors out: stop, don't try to recover live. Re-run from the top.
- If Phantom switches networks unexpectedly: immediately stop, fix Phantom, restart.

### Editing pass (Descript or CapCut)
- Trim any silence longer than 1 second
- Add the lower-third overlay at 0:03 (Veloran wordmark + URL)
- Add the closer slide at 2:10 (use Canva / Figma / a static image)
- Background music: optional, low volume (-20dB), instrumental only. Search "Loom-style demo background music" — keep it subtle.

### What NOT to do
- ❌ Don't add captions/subtitles in this version — they distract from the on-screen UI. If submission requires subtitles, add them via Loom's auto-captions and double-check accuracy.
- ❌ Don't speed-ramp the AI agent terminal output — judges need to read it. Real-time pace is correct.
- ❌ Don't add transitions (fades, wipes, swooshes). Hard cuts only. Looks more professional, not less.
- ❌ Don't show your face in a webcam corner. Adds nothing; consumes screen real estate. (Skip unless the hackathon explicitly requires it.)

### Take strategy
1. **Take 1: full run-through, narrating live.** No editing yet. Just see what breaks.
2. **Diagnose:** which beats need re-takes? Which ran too long?
3. **Take 2-N: re-record problem beats individually.** Splice in editing.
4. **Final pass:** add lower-third, closer slide, music. Export.

Budget: 2-3 hours total for first usable cut. Plan for one half-day. Don't try to record + submit in the same session.

---

## Submission package (what the hackathon portal probably wants)

When you submit:
- **Demo video:** Loom URL (or YouTube unlisted upload if portal requires direct upload)
- **Live URL:** `https://veloran-paywall-sage.vercel.app`
- **GitHub:** `https://github.com/takahibe/veloran` (make sure it's public — it currently is)
- **Pitch deck:** PDF export of whichever format you choose
- **Description (200-500 words):** *can borrow heavily from pitch-deck.md slide 1, 3, 5, 6*

---

## Open variables for you to fill in

Replace these in the script before recording:

- `<your-slug>` — pick the post slug you want featured. Suggest using a fresh post created right before recording, with realistic-looking content.
- `<signature>` — replace inline references with the actual transaction signature shown.
- `<date>` — the subscription expiry date renders dynamically; nothing to do.
- `<creator-address>` — your creator account's Solana address.
- 𝕏 / Twitter handle — optional, if you want a social link in the closer.
