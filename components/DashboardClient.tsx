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
