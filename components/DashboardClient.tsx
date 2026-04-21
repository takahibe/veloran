"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { microUsdcToUsd } from "@/lib/slug";

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

export function DashboardClient() {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
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

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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
            <PostRow key={p.id} post={p} />
          ))}
        </section>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-400">Dashboard error: {error}</p>
      )}
    </main>
  );
}

function PostRow({ post }: { post: Post }) {
  const url = `/p/${post.slug}`;
  return (
    <Link
      href={url}
      className="flex items-center justify-between rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 p-5 transition"
    >
      <div className="min-w-0">
        <p className="font-medium truncate">{post.title}</p>
        <p className="mt-0.5 text-sm text-neutral-500 truncate">
          {post.preview}
        </p>
        <p className="mt-2 text-xs text-neutral-600 font-mono">{url}</p>
      </div>
      <div className="ml-6 shrink-0 text-right">
        <p className="text-lg font-semibold">
          ${microUsdcToUsd(post.priceUsdc)}
        </p>
        <p className="text-xs text-neutral-500">
          {post._count.unlocks} unlock{post._count.unlocks === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
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
