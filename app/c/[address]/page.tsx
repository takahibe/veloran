import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { SubscribeButton } from "@/components/SubscribeButton";
import {
  subscriptionCookieName,
  verifySubscriptionToken,
} from "@/lib/content-gate";
import type { Metadata } from "next";

type Props = { params: Promise<{ address: string }> };

async function getCreatorByAddress(address: string) {
  return prisma.creator.findUnique({
    where: { solanaAddress: address },
    select: {
      id: true,
      email: true,
      displayName: true,
      solanaAddress: true,
      tier: {
        select: {
          monthlyPrice: true,
          yearlyPrice: true,
          active: true,
        },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          preview: true,
          priceUsdc: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const creator = await getCreatorByAddress(address);
  if (!creator) return { title: "Not found · Veloran" };
  const byline =
    creator.displayName ?? creator.email?.split("@")[0] ?? "anon";
  return {
    title: `${byline} · Veloran`,
    description: `Paywalled posts by ${byline}. Subscribe or pay-per-post in USDC on Solana.`,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { address } = await params;
  const creator = await getCreatorByAddress(address);
  if (!creator) notFound();

  const byline =
    creator.displayName ?? creator.email?.split("@")[0] ?? "anon";

  // Check if the visitor already has an active subscription cookie.
  const jar = await cookies();
  const subToken = jar.get(subscriptionCookieName(creator.id))?.value;
  const alreadySubscribed = verifySubscriptionToken(subToken, creator.id);

  const tier =
    creator.tier && creator.tier.active ? creator.tier : null;
  const hasMonthly = !!(tier && tier.monthlyPrice && tier.monthlyPrice > 0);
  const hasYearly = !!(tier && tier.yearlyPrice && tier.yearlyPrice > 0);
  const offersSubscription = hasMonthly || hasYearly;

  return (
    <main className="flex-1 px-6 py-16 max-w-3xl mx-auto w-full">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.2em] text-violet-400"
      >
        Veloran
      </Link>

      <header className="mt-6">
        <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
          {byline}
        </h1>
        <p className="mt-2 text-sm font-mono text-neutral-500 break-all">
          {creator.solanaAddress}
        </p>
      </header>

      {/* Subscription card */}
      {offersSubscription ? (
        <section className="mt-10 rounded-xl border border-violet-700/30 bg-gradient-to-br from-violet-950/30 via-neutral-900/40 to-neutral-900/40 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300">
            Subscribe
          </p>
          <p className="mt-2 text-lg text-neutral-200">
            Unlock every post from {byline} for the period — no per-post payment.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            On-chain split unchanged: 95% to creator, 5% platform.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hasMonthly && (
              <SubscribeButton
                creatorId={creator.id}
                creatorAddress={creator.solanaAddress!}
                plan="monthly"
                priceUsdc={tier!.monthlyPrice!}
                initialExpiresAt={
                  alreadySubscribed
                    ? // we don't know the exact expiry without a DB call;
                      // showing "active" via the subscribed state is enough
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    : undefined
                }
              />
            )}
            {hasYearly && (
              <SubscribeButton
                creatorId={creator.id}
                creatorAddress={creator.solanaAddress!}
                plan="yearly"
                priceUsdc={tier!.yearlyPrice!}
                initialExpiresAt={
                  alreadySubscribed
                    ? new Date(
                        Date.now() + 365 * 24 * 60 * 60 * 1000
                      ).toISOString()
                    : undefined
                }
              />
            )}
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-500">
          {byline} hasn&apos;t opened subscriptions yet — pay per post below.
        </section>
      )}

      {/* Posts list */}
      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">
          Posts ({creator.posts.length})
        </h2>
        {creator.posts.length === 0 ? (
          <p className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-500">
            No posts yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {creator.posts.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 p-5 transition"
              >
                <Link href={`/p/${p.slug}`} className="block">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-sm text-neutral-500 line-clamp-2">
                    {p.preview}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs font-mono text-neutral-600">
                      /p/{p.slug}
                    </p>
                    <p className="text-sm font-medium text-neutral-300">
                      ${microUsdcToUsd(p.priceUsdc)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 text-center text-xs text-neutral-600">
        Payments settle on Solana devnet · 95% to creator, 5% to Veloran ·
        on-chain
      </p>
    </main>
  );
}
