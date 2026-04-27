import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { PaywallGate } from "@/components/PaywallGate";
import {
  unlockCookieName,
  verifyUnlockToken,
  subscriptionCookieName,
  verifySubscriptionToken,
} from "@/lib/content-gate";
import { verifyPrivyCookie } from "@/lib/privy-server";
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
      content: true,
      priceUsdc: true,
      createdAt: true,
      creatorId: true,
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
          solanaAddress: true,
          tier: {
            select: {
              monthlyPrice: true,
              yearlyPrice: true,
              active: true,
            },
          },
        },
      },
    },
  });
}

async function isViewerTheCreator(creatorId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get("privy-token")?.value;
  const claims = await verifyPrivyCookie(token);
  if (!claims) return false;
  const me = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
    select: { id: true },
  });
  return me?.id === creatorId;
}

/**
 * Two ways to render the content unlocked:
 *   - Per-post unlock cookie (vlr_unlock_<slug>) for one-off payment
 *   - Subscription cookie (vlr_sub_<creatorId>) covers all the
 *     creator's posts for the plan duration
 */
async function getUnlockedContent(
  slug: string,
  creatorId: string,
  content: string
): Promise<string | null> {
  const jar = await cookies();
  const unlockToken = jar.get(unlockCookieName(slug))?.value;
  if (verifyUnlockToken(unlockToken, slug)) return content;

  const subToken = jar.get(subscriptionCookieName(creatorId))?.value;
  if (verifySubscriptionToken(subToken, creatorId)) return content;

  return null;
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
  if (!post.creator.solanaAddress) notFound();

  const isOwner = await isViewerTheCreator(post.creatorId);
  const initialContent = isOwner
    ? post.content
    : await getUnlockedContent(post.slug, post.creatorId, post.content);

  // Surface the creator's subscription tier (if active) so the PaywallGate
  // can render a "Subscribe" upsell alongside the per-post Unlock button.
  const tier =
    post.creator.tier && post.creator.tier.active
      ? {
          monthlyPrice: post.creator.tier.monthlyPrice,
          yearlyPrice: post.creator.tier.yearlyPrice,
        }
      : null;

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

      {isOwner && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-violet-700/40 bg-violet-950/20 px-4 py-2.5">
          <p className="text-xs text-violet-300">
            Viewing as creator — content unlocked, no payment needed.
          </p>
          <Link
            href="/dashboard"
            className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2"
          >
            ← Dashboard
          </Link>
        </div>
      )}

      <p className="mt-8 text-lg text-neutral-300 leading-relaxed">
        {post.preview}
      </p>

      <PaywallGate
        slug={post.slug}
        priceUsd={microUsdcToUsd(post.priceUsdc)}
        priceUsdc={post.priceUsdc}
        creatorAddress={post.creator.solanaAddress}
        creatorByline={byline}
        initialContent={initialContent}
        tier={tier}
      />

      <p className="mt-8 text-center text-xs text-neutral-600">
        Payments settle on Solana devnet · 95% to creator, 5% to Veloran ·
        on-chain
      </p>
    </main>
  );
}
