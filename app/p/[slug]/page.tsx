import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { UnlockButton } from "@/components/UnlockButton";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  return prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      preview: true,
      priceUsdc: true,
      createdAt: true,
      creator: {
        select: { displayName: true, email: true, solanaAddress: true },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found · Veloran" };
  return {
    title: `${post.title} · Veloran`,
    description: post.preview,
    openGraph: {
      title: post.title,
      description: post.preview,
      type: "article",
    },
  };
}

export default async function PaywallPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const byline =
    post.creator.displayName ??
    post.creator.email?.split("@")[0] ??
    "anon";

  return (
    <main className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.2em] text-violet-400"
      >
        Veloran
      </Link>

      <h1 className="mt-6 text-4xl sm:text-5xl font-semibold leading-tight">
        {post.title}
      </h1>

      <p className="mt-3 text-sm text-neutral-500">
        by <span className="text-neutral-300">{byline}</span>
        {" · "}
        <time dateTime={post.createdAt.toISOString()}>
          {post.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </p>

      <p className="mt-8 text-lg text-neutral-300 leading-relaxed">
        {post.preview}
      </p>

      {/* Locked content teaser */}
      <div className="relative mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <div className="p-6 select-none pointer-events-none">
          <p className="blur-sm text-neutral-400 leading-relaxed">
            The rest of this post is paywalled. Inside, the creator shares
            their full thesis, data, and conclusions — unlocked instantly
            after payment.
          </p>
          <p className="mt-4 blur-sm text-neutral-400 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
            lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod
            malesuada. Nullam cursus sapien vel venenatis.
          </p>
          <p className="mt-4 blur-sm text-neutral-400 leading-relaxed">
            Integer luctus, nisi a tristique scelerisque, mi magna rhoncus
            leo, at cursus turpis mauris eget metus. Aenean et posuere augue.
          </p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/60 to-neutral-950 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500">
            <LockIcon />
            <span>Paywalled · {post.preview.length > 0 ? "1 paragraph free" : "locked"}</span>
          </div>
          <UnlockButton
            slug={post.slug}
            priceUsd={microUsdcToUsd(post.priceUsdc)}
          />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-neutral-600">
        Payments settle on Solana devnet · 95% to creator, 5% to Veloran · on-chain
      </p>
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
