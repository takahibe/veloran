"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { microUsdcToUsd } from "@/lib/slug";

type Tier = {
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  active: boolean;
};

type Props = {
  /** Creator's id; needed to GET the tier for first-load. */
  creatorId: string | null;
  /** Creator's solana address; used for the share link to /c/<address>. */
  solanaAddress: string | null;
};

export function CreatorTierEditor({ creatorId, solanaAddress }: Props) {
  const { getAccessToken } = usePrivy();

  const [tier, setTier] = useState<Tier | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState("");
  const [yearlyInput, setYearlyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing tier
  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/subscription-tiers?creatorId=${creatorId}`
        );
        if (!res.ok) throw new Error(`load tier: ${res.status}`);
        const body = (await res.json()) as { tier: Tier | null };
        if (cancelled) return;
        setTier(body.tier);
        if (body.tier) {
          setMonthlyInput(
            body.tier.monthlyPrice !== null
              ? microUsdcToUsd(body.tier.monthlyPrice)
              : ""
          );
          setYearlyInput(
            body.tier.yearlyPrice !== null
              ? microUsdcToUsd(body.tier.yearlyPrice)
              : ""
          );
        }
        setLoaded(true);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load tier");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/subscription-tiers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthlyPriceUsd: monthlyInput.trim() === "" ? null : monthlyInput,
          yearlyPriceUsd: yearlyInput.trim() === "" ? null : yearlyInput,
          // Re-enable on save unless both prices are blank
          active:
            monthlyInput.trim() !== "" || yearlyInput.trim() !== "",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
      setTier(body.tier);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [monthlyInput, yearlyInput, getAccessToken]);

  const handleDisable = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/subscription-tiers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: false }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
      setTier(body.tier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [getAccessToken]);

  if (!creatorId) return null;

  const active = tier?.active ?? false;

  return (
    <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Subscriptions
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Let readers subscribe to ALL your paywalled posts at one
            price. Same on-chain split: 95% to you, 5% platform.
          </p>
        </div>
        {active && solanaAddress && (
          <Link
            href={`/c/${solanaAddress}`}
            target="_blank"
            className="text-xs text-violet-300 hover:text-violet-200 whitespace-nowrap"
          >
            View public page ↗
          </Link>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PriceField
          label="Monthly price"
          unit="/month"
          value={monthlyInput}
          onChange={setMonthlyInput}
          disabled={saving || !loaded}
        />
        <PriceField
          label="Yearly price"
          unit="/year"
          value={yearlyInput}
          onChange={setYearlyInput}
          disabled={saving || !loaded}
        />
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Leave a field blank to disable that plan. Set both blank to pause
        subscriptions entirely.
      </p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          {saving
            ? "Saving…"
            : active
              ? "Update subscription"
              : "Save subscription tier"}
        </button>
        {active && (
          <button
            onClick={handleDisable}
            disabled={saving}
            className="px-3 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-400 hover:text-neutral-200"
          >
            Pause subscriptions
          </button>
        )}
        {savedFlash && (
          <span className="text-xs text-violet-300">Saved.</span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </section>
  );
}

function PriceField({
  label,
  unit,
  value,
  onChange,
  disabled,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
          $
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          disabled={disabled}
          className="w-full rounded-lg bg-neutral-950/40 border border-neutral-800 pl-8 pr-16 py-2 text-neutral-100 outline-none focus:border-violet-500 disabled:opacity-50"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
          {unit}
        </span>
      </div>
    </label>
  );
}
