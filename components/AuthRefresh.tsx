"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Mount on any server-rendered page whose output depends on the Privy
 * cookie (e.g. /c/[address] showing the visitor's subscription state).
 *
 * Server components only re-run on full navigations, so a Privy login
 * that happens after the initial render leaves stale server-rendered
 * markup until the user manually refreshes. This watches Privy's auth
 * state on the client and calls router.refresh() when it flips, which
 * re-runs the server render with the now-set privy-token cookie.
 */
export function AuthRefresh() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const previousAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    const prev = previousAuthRef.current;
    previousAuthRef.current = authenticated;
    // First reading is just initialization, don't refresh
    if (prev === null) return;
    // Auth flipped (login or logout) — re-render the page on the server
    if (prev !== authenticated) {
      router.refresh();
    }
  }, [ready, authenticated, router]);

  return null;
}
