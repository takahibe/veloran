"use client";

import { usePrivy } from "@privy-io/react-auth";
import { SubscribeButton } from "./SubscribeButton";

type Props = {
  creatorId: string;
  creatorAddress: string;
  monthly: { priceUsdc: number } | null;
  yearly: { priceUsdc: number } | null;
};

/**
 * Wrapper around SubscribeButton that collapses the logged-out state
 * into a single "Sign in to subscribe" CTA, then expands to the two
 * plan-specific buttons after Privy authentication.
 *
 * Why: rendering two SubscribeButtons in their not-authed state shows
 * two identical "Sign in to subscribe" buttons (one per plan), which
 * looks redundant. The plan choice only matters once you're signed in.
 */
export function SubscribeOptions({
  creatorId,
  creatorAddress,
  monthly,
  yearly,
}: Props) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <p className="text-sm text-neutral-500">Loading…</p>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={() => login()}
        className="w-full px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition shadow-lg shadow-violet-600/20"
      >
        Sign in to subscribe
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {monthly && (
        <SubscribeButton
          creatorId={creatorId}
          creatorAddress={creatorAddress}
          plan="monthly"
          priceUsdc={monthly.priceUsdc}
        />
      )}
      {yearly && (
        <SubscribeButton
          creatorId={creatorId}
          creatorAddress={creatorAddress}
          plan="yearly"
          priceUsdc={yearly.priceUsdc}
        />
      )}
    </div>
  );
}
