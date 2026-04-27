# Wallet sign-in verification (demo readiness)

**Date:** 2026-04-28
**Status:** spec — implementation plan to follow
**Scope:** verification-only, no code changes

## Context

Veloran's `Privy` config already enables both `email` and `wallet` login methods (`components/Providers.tsx`):

```ts
loginMethods: ["email", "wallet"],
externalWallets: { solana: { connectors: solanaConnectors } },
```

Wallet sign-in via Phantom / Solflare / Backpack therefore *already works technically*. We've never verified it on the live URL because all 8 demo beats up to now have been recorded against the email + embedded-wallet path. Before locking in the demo video script, we want to confirm the wallet path is functional, identify rough edges, and decide whether to feature it on camera.

## Goal

A 5-second cutaway in the demo video — "or for crypto-native readers, just connect Phantom" — that shows Privy's wallet-connect modal flowing into the same unlock UX. Total demo runtime increases by ~5s; pitch broadens to cover both audiences.

This *requires* the wallet path to work end-to-end on the live URL, but does NOT require it to become the primary login.

## Approach

**Demo strategy:** *Mixed cast* — beats 1–4 stay on the email + embedded-wallet path (preserves the "non-crypto creators, no seed phrase" pitch). Beat 5 stays on the AI agent script. We add **one small visual cutaway** between beats showing wallet-connect once, then return to the canonical demo. Beats 6–8 unchanged.

**Implementation strategy:** None — purely a manual verification + recording pass. Zero code changes; the existing Privy config + `useWallets()` + `useSignAndSendTransaction()` flow handles connected wallets identically to embedded ones.

## Known quirks (note, do not fix)

These are documented behaviors the demo recorder must work around, not bugs blocking the verification:

1. **Same person, two Creator rows.** Privy assigns a different `did:privy:` per login method. `Creator.privyUserId` is the unique key in our schema, so signing into the same browser via email then via wallet creates two distinct Creator rows. *Demo guidance:* pick one login path per persona (creator OR reader) and stick with it for the recording. Don't mix mid-take.
2. **Connected wallets are not auto-funded.** Privy's "no seed phrase" experience only applies to embedded wallets it creates itself. A user who connects Phantom must already have devnet SOL (faucet) and devnet USDC (Circle faucet or `/dev/send-usdc` helper) on that wallet. *Demo guidance:* fund the demo wallet before recording.
3. **Phantom defaults to mainnet.** Switch to devnet in Phantom Settings → Developer Settings → Testnet Mode → Solana Devnet. Without this, transactions silently target mainnet and never confirm.

## Verification surface

The wallet path must work for these flows on the live URL:

- **Sign in:** Privy modal → Connect Wallet → Phantom approval → land on `/dashboard`
- **/api/me upserts correctly:** the connected wallet's address shows up as `Creator.solanaAddress`
- **Reader → unlock a post:** `PaywallGate` flow signs the `pay_for_content` tx with Phantom → server verifies → content reveals (same code path as embedded wallet — `useSignAndSendTransaction` is wallet-agnostic)
- **Reader → subscribe to a creator:** `SubscribeButton` → Phantom signs → `Subscription` row created → vlr_sub cookie set
- **Creator → create post + set tier:** Phantom-connected user can publish a paywall post and set a subscription tier from `/dashboard`

These exercise every code path that depends on Privy's wallet abstraction. If they all pass, the wallet flow is demo-ready.

## Out of scope

- Reordering or restyling the Privy modal (Privy controls that UI)
- Disabling email login or pivoting to wallet-only ("Option C" from the brainstorm)
- Linking email + wallet identities to a single Creator row (would require a `Creator.linkedWallets` table — defer)
- Changing landing page copy to emphasize wallet over email — the pitch deck and video voiceover handle the framing
- Editing demo posts/pricing as a wallet-connected creator (general post-edit feature is on the future-features shelf separately)

## Verification → demo plan

1. Manual end-to-end test on the live URL covering all 5 surfaces above. Pass/fail recorded inline.
2. **If a flow fails:** decision rule = *fix iff a one-line patch fixes it*; otherwise drop the wallet cutaway from the demo script and re-test only the existing 8 beats. Wallet sign-in is demo-nice-to-have, not on the critical path.
3. **If all flows pass:** add a TODO note to the (not-yet-written) demo video script to include the 5-second wallet cutaway between beats 4 and 5. The script itself is a separate work item — this spec only ensures the path exists for it to reference.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phantom devnet mode wasn't switched, tx fails on camera | Medium | Re-record | Pre-flight checklist: confirm Phantom is on devnet before opening the live URL |
| Privy modal shows a Coinbase / SUI / EVM wallet option that confuses the demo viewer | Low | Visual noise | `walletChainType: "solana-only"` is already set in `Providers.tsx` — confirm in verification |
| Same-browser-different-Creator-row issue causes the demo to pull up an empty dashboard mid-take | Medium | Re-record | Use a fresh incognito window for the wallet-cutaway take |
| Existing 8-beat path regresses while we focus on wallet verification | Low | Demo broken | Verification is read-only; explicitly re-test beats 4 + 5 after the wallet pass |
