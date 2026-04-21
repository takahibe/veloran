"use client";

/**
 * Placeholder for Day 5. Right now this just shows the price and an alert.
 * Day 5 will wire this to Privy's Solana wallet + a USDC transfer (direct for
 * now, then routed through the Anchor 95/5 split program in Week 2).
 */
export function UnlockButton({
  slug,
  priceUsd,
}: {
  slug: string;
  priceUsd: string;
}) {
  return (
    <button
      onClick={() => {
        alert(
          `Payment wiring lands Day 5. Slug: ${slug} · Price: $${priceUsd} USDC`
        );
      }}
      className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition shadow-lg shadow-violet-600/20"
    >
      Unlock for ${priceUsd} USDC
    </button>
  );
}
