"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Me = {
  id: string;
  email: string | null;
  solanaAddress: string | null;
  displayName: string | null;
};

export function DashboardClient() {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kick unauthenticated users back to the landing page.
  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  // On first load once logged in, upsert our Creator row.
  const walletAddress = wallets[0]?.address;
  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/me", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ solanaAddress: walletAddress }),
        });
        if (!res.ok) throw new Error(`api/me: ${res.status}`);
        if (!cancelled) setMe(await res.json());
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, walletAddress, getAccessToken]);

  if (!ready || !authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400">
            Veloran
          </p>
          <h1 className="text-3xl font-semibold mt-1">Dashboard</h1>
        </div>
        <button
          onClick={() => logout()}
          className="px-4 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-300"
        >
          Log out
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card label="Signed in as" value={user?.email?.address ?? "—"} />
        <Card
          label="Solana address (devnet)"
          value={me?.solanaAddress ? truncate(me.solanaAddress) : "creating…"}
          mono
        />
        <Card label="Posts published" value="0" />
      </section>

      <section className="rounded-xl border border-neutral-800 p-8 text-center">
        <p className="text-neutral-400">
          You haven&apos;t created a paywall yet.
        </p>
        <button
          disabled
          className="mt-4 px-5 py-2.5 rounded-lg bg-violet-600 opacity-50 cursor-not-allowed text-white font-medium"
          title="Wired up tomorrow"
        >
          + New paywall (coming Apr 22)
        </button>
      </section>

      {error && (
        <p className="mt-6 text-sm text-red-400">Profile error: {error}</p>
      )}
    </main>
  );
}

function Card({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/40">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-2 text-lg ${mono ? "font-mono text-sm break-all" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
