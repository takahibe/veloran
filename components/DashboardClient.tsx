"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { microUsdcToUsd } from "@/lib/slug";
import { CreatorTierEditor } from "@/components/CreatorTierEditor";

type Me = {
  id: string;
  email: string | null;
  solanaAddress: string | null;
  displayName: string | null;
};

type Post = {
  id: string;
  slug: string;
  title: string;
  preview: string;
  priceUsdc: number;
  createdAt: string;
  _count: { unlocks: number };
};

type RecentUnlock = {
  id: string;
  amountUsdc: number;
  readerType: string;
  readerAddress: string;
  txSignature: string;
  createdAt: string;
  postSlug: string;
  postTitle: string;
};

type Earnings = {
  totals: {
    gross: string;
    creator: string;
    platform: string;
    unlockCount: number;
    humanCount: number;
    agentCount: number;
    // New subscription breakdown (added in Day 2)
    perPost?: string;
    subscriptions?: string;
    subscriberCount?: number;
    activeSubscribers?: number;
  };
  recent: RecentUnlock[];
  recentSubscriptions?: RecentSubscription[];
};

type RecentSubscription = {
  id: string;
  amountUsdc: number;
  plan: string;
  subscriberAddress: string;
  txSignature: string;
  createdAt: string;
  expiresAt: string;
};

export function DashboardClient() {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  const walletAddress = wallets[0]?.address;

  // Upsert Creator row on first load.
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

  const loadPosts = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`api/posts: ${res.status}`);
      const body = (await res.json()) as { posts: Post[] };
      setPosts(body.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    }
  }, [authenticated, getAccessToken]);

  const loadEarnings = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/earnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`api/earnings: ${res.status}`);
      setEarnings((await res.json()) as Earnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load earnings");
    }
  }, [authenticated, getAccessToken]);

  // Wait for /api/me to upsert the Creator row before fetching posts/earnings.
  // On a fresh DB the Creator doesn't exist until /api/me POST returns, and
  // hitting /api/posts before then 401s.
  useEffect(() => {
    if (!me) return;
    loadPosts();
    loadEarnings();
  }, [me, loadPosts, loadEarnings]);

  if (!ready || !authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  const postCount = posts?.length ?? 0;

  return (
    <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400">
            Veloran
          </p>
          <h1 className="text-3xl font-semibold mt-1">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/post/new"
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium"
          >
            + New paywall
          </Link>
          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 text-sm text-neutral-300"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card label="Signed in as" value={user?.email?.address ?? "—"} />
        <Card
          label="Solana address (devnet)"
          value={me?.solanaAddress ? truncate(me.solanaAddress) : "creating…"}
          mono
        />
        <Card label="Posts published" value={String(postCount)} />
      </section>

      {earnings && <EarningsPanel earnings={earnings} />}

      <CreatorTierEditor
        creatorId={me?.id ?? null}
        solanaAddress={me?.solanaAddress ?? null}
      />

      {posts === null ? (
        <p className="text-sm text-neutral-500">Loading posts…</p>
      ) : postCount === 0 ? (
        <section className="rounded-xl border border-neutral-800 p-10 text-center">
          <p className="text-neutral-400">
            You haven&apos;t created a paywall yet.
          </p>
          <Link
            href="/post/new"
            className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium"
          >
            + Create your first paywall
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-neutral-500">
            Your paywalls
          </h2>
          {posts.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              onDeleted={() =>
                setPosts((prev) =>
                  prev ? prev.filter((x) => x.id !== p.id) : prev
                )
              }
              getAccessToken={getAccessToken}
            />
          ))}
        </section>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-400">Dashboard error: {error}</p>
      )}
    </main>
  );
}

function PostRow({
  post,
  onDeleted,
  getAccessToken,
}: {
  post: Post;
  onDeleted: () => void;
  getAccessToken: () => Promise<string | null>;
}) {
  const url = `/p/${post.slug}`;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const unlockNote =
      post._count.unlocks > 0
        ? ` This will also remove ${post._count.unlocks} unlock record${
            post._count.unlocks === 1 ? "" : "s"
          }.`
        : "";
    if (
      !window.confirm(
        `Delete "${post.title}"?${unlockNote} This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="group relative flex items-center justify-between rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 p-5 transition">
      <Link href={url} className="min-w-0 flex-1 pr-6">
        <p className="font-medium truncate">{post.title}</p>
        <p className="mt-0.5 text-sm text-neutral-500 truncate">
          {post.preview}
        </p>
        <p className="mt-2 text-xs text-neutral-600 font-mono">{url}</p>
      </Link>
      <div className="shrink-0 text-right flex items-center gap-4">
        <div>
          <p className="text-lg font-semibold">
            ${microUsdcToUsd(post.priceUsdc)}
          </p>
          <p className="text-xs text-neutral-500">
            {post._count.unlocks} unlock
            {post._count.unlocks === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete post"
          title="Delete post"
          className="rounded-lg border border-neutral-800 hover:border-red-500/50 hover:text-red-400 text-neutral-500 px-2.5 py-2 transition disabled:opacity-40 disabled:cursor-wait"
        >
          {deleting ? (
            <Spinner />
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
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

function EarningsPanel({ earnings }: { earnings: Earnings }) {
  const { totals, recent, recentSubscriptions } = earnings;
  const subscriberCount = totals.subscriberCount ?? 0;
  const activeSubscribers = totals.activeSubscribers ?? 0;
  const perPostMicro = totals.perPost ? Number(totals.perPost) : null;
  const subsMicro = totals.subscriptions ? Number(totals.subscriptions) : null;
  const hasAnyRevenue =
    totals.unlockCount > 0 || subscriberCount > 0;

  if (!hasAnyRevenue) {
    return (
      <section className="mb-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Earnings
        </p>
        <p className="mt-2 text-neutral-400">
          No unlocks yet. Share a paywall link to start earning.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-xl border border-violet-700/30 bg-gradient-to-br from-violet-950/30 via-neutral-900/40 to-neutral-900/40 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300">
            Lifetime earnings · creator share
          </p>
          <p className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
            ${microUsdcToUsd(Number(totals.creator))}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            From{" "}
            <span className="text-neutral-200">
              {totals.unlockCount} unlock{totals.unlockCount === 1 ? "" : "s"}
            </span>
            {subscriberCount > 0 && (
              <>
                {" "}
                +{" "}
                <span className="text-neutral-200">
                  {subscriberCount} subscription
                  {subscriberCount === 1 ? "" : "s"}
                </span>
              </>
            )}{" "}
            · gross{" "}
            <span className="text-neutral-300">
              ${microUsdcToUsd(Number(totals.gross))}
            </span>{" "}
            · 5% platform fee{" "}
            <span className="text-neutral-500">
              ${microUsdcToUsd(Number(totals.platform))}
            </span>
          </p>
          {subsMicro !== null && subsMicro > 0 && perPostMicro !== null && (
            <p className="mt-1 text-xs text-neutral-500">
              Per-post ${microUsdcToUsd(perPostMicro)} · Subscriptions $
              {microUsdcToUsd(subsMicro)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Pill label={`${totals.humanCount} human`} tone="violet" />
          <Pill label={`${totals.agentCount} agent`} tone="cyan" />
          {activeSubscribers > 0 && (
            <Pill
              label={`${activeSubscribers} active sub${activeSubscribers === 1 ? "" : "s"}`}
              tone="violet"
            />
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-800 pt-5">
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Recent unlocks
        </p>
        <ul className="space-y-2">
          {recent.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/p/${u.postSlug}`}
                  className="text-neutral-200 hover:text-violet-300 truncate block"
                >
                  {u.postTitle}
                </Link>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {u.readerType === "agent" ? "🤖 Agent" : "👤 Human"} ·{" "}
                  {new Date(u.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-neutral-200">
                  +${microUsdcToUsd(u.amountUsdc)}
                </p>
                <a
                  href={`https://solscan.io/tx/${u.txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-400 hover:text-violet-300 font-mono"
                >
                  {u.txSignature.slice(0, 6)}…{u.txSignature.slice(-4)} ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {recentSubscriptions && recentSubscriptions.length > 0 && (
        <div className="mt-6 border-t border-neutral-800 pt-5">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Recent subscriptions
          </p>
          <ul className="space-y-2">
            {recentSubscriptions.map((s) => {
              const exp = new Date(s.expiresAt);
              const isActive = exp > new Date();
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-neutral-200 truncate">
                      {s.plan === "yearly"
                        ? "Yearly subscription"
                        : "Monthly subscription"}{" "}
                      <span className="text-xs text-neutral-500">
                        from {s.subscriberAddress.slice(0, 4)}…
                        {s.subscriberAddress.slice(-4)}
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {isActive ? (
                        <>
                          ✅ Active until{" "}
                          {exp.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      ) : (
                        <>⌛ Expired {exp.toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-neutral-200">
                      +${microUsdcToUsd(s.amountUsdc)}
                    </p>
                    <a
                      href={`https://solscan.io/tx/${s.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 font-mono"
                    >
                      {s.txSignature.slice(0, 6)}…{s.txSignature.slice(-4)} ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "violet" | "cyan";
}) {
  const cls =
    tone === "violet"
      ? "border-violet-700/40 bg-violet-950/40 text-violet-200"
      : "border-cyan-700/40 bg-cyan-950/40 text-cyan-200";
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}
