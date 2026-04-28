import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { SubscribeButton } from "@/components/SubscribeButton";
import { SubscribeOptions } from "@/components/SubscribeOptions";
import { AuthRefresh } from "@/components/AuthRefresh";
import { verifyPrivyCookie } from "@/lib/privy-server";
import type { Metadata } from "next";

type Props = { params: Promise<{ address: string }> };

function deriveByline(creator: {
  displayName: string | null;
  email: string | null;
  solanaAddress: string | null;
}): string {
  if (creator.displayName) return creator.displayName;
  if (creator.email) return creator.email.split("@")[0];
  if (creator.solanaAddress) {
    return `${creator.solanaAddress.slice(0, 4)}…${creator.solanaAddress.slice(-4)}`;
  }
  return "anon";
}

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
  const byline = deriveByline(creator);
  return {
    title: `${byline} · Veloran`,
    description: `Paywalled posts by ${byline}. Subscribe or pay-per-post in USDC on Solana.`,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { address } = await params;
  const creator = await getCreatorByAddress(address);
  if (!creator) notFound();

  const byline = deriveByline(creator);

  // Server-side: identify the visitor (if logged in) so we can:
  //   - Hide the Subscribe card when the visitor IS the creator
  //   - Look up their actual active subscription (plan + exact expiry)
  let isOwner = false;
  let activeSub: {
    plan: string;
    expiresAt: Date;
    txSignature: string;
  } | null = null;

  const jar = await cookies();
  const privyToken = jar.get("privy-token")?.value;
  const claims = await verifyPrivyCookie(privyToken);
  if (claims) {
    const me = await prisma.creator.findUnique({
      where: { privyUserId: claims.userId },
      select: { id: true },
    });
    if (me) {
      isOwner = me.id === creator.id;
      if (!isOwner) {
        const sub = await prisma.subscription.findFirst({
          where: {
            creatorId: creator.id,
            subscriberCreatorId: me.id,
            expiresAt: { gt: new Date() },
          },
          orderBy: { expiresAt: "desc" },
          select: { plan: true, expiresAt: true, txSignature: true },
        });
        activeSub = sub;
      }
    }
  }

  const tier =
    creator.tier && creator.tier.active ? creator.tier : null;
  const hasMonthly = !!(tier && tier.monthlyPrice && tier.monthlyPrice > 0);
  const hasYearly = !!(tier && tier.yearlyPrice && tier.yearlyPrice > 0);
  const offersSubscription = hasMonthly || hasYearly;

  // If the active sub is monthly AND a yearly tier exists, offer an upgrade.
  const showUpgradeToYearly =
    !!activeSub && activeSub.plan === "monthly" && hasYearly;

  return (
    <main className="flex-1 px-6 py-16 max-w-3xl mx-auto w-full">
      {/* Re-renders this server page when Privy auth flips on the client */}
      <AuthRefresh />

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

      {/* Creator self-view banner */}
      {isOwner && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-violet-700/40 bg-violet-950/20 px-4 py-2.5">
          <p className="text-xs text-violet-300">
            Viewing as creator — this is your public profile.
          </p>
          <Link
            href="/dashboard"
            className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2"
          >
            ← Dashboard
          </Link>
        </div>
      )}

      {/* Subscription card */}
      {isOwner ? (
        // Show creator a preview of what readers see, but no payment buttons
        offersSubscription ? (
          <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Your subscription tier (preview)
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasMonthly && (
                <div className="rounded-lg border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
                  Monthly · ${microUsdcToUsd(tier!.monthlyPrice!)}/month
                </div>
              )}
              {hasYearly && (
                <div className="rounded-lg border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
                  Yearly · ${microUsdcToUsd(tier!.yearlyPrice!)}/year
                </div>
              )}
            </div>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-xs text-violet-300 hover:text-violet-200"
            >
              Edit tier on dashboard ↗
            </Link>
          </section>
        ) : (
          <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-500">
            You haven&apos;t opened subscriptions yet.{" "}
            <Link href="/dashboard" className="text-violet-300 hover:text-violet-200">
              Set monthly / yearly prices on the dashboard.
            </Link>
          </section>
        )
      ) : activeSub ? (
        <section className="mt-10 rounded-xl border border-violet-700/40 bg-violet-950/20 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300">
            Subscribed
          </p>
          <p className="mt-2 text-lg text-neutral-200">
            You&apos;re on the{" "}
            <span className="font-medium">
              {activeSub.plan === "yearly" ? "yearly" : "monthly"}
            </span>{" "}
            plan — every post from {byline} is unlocked for you.
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Active until{" "}
            <span className="text-neutral-200">
              {activeSub.expiresAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
          <a
            href={`https://solscan.io/tx/${activeSub.txSignature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs font-mono text-violet-400 hover:text-violet-300"
          >
            {activeSub.txSignature.slice(0, 10)}…
            {activeSub.txSignature.slice(-6)} ↗
          </a>

          {showUpgradeToYearly && (
            <div className="mt-5 border-t border-violet-700/30 pt-5">
              <p className="text-xs uppercase tracking-wider text-violet-300">
                Upgrade to yearly
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Lock in 12 months at ${microUsdcToUsd(tier!.yearlyPrice!)}.
                Your access is extended to a year from today.
              </p>
              <div className="mt-3 max-w-xs">
                <SubscribeButton
                  creatorId={creator.id}
                  creatorAddress={creator.solanaAddress!}
                  plan="yearly"
                  priceUsdc={tier!.yearlyPrice!}
                />
              </div>
            </div>
          )}
        </section>
      ) : offersSubscription ? (
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

          <div className="mt-5">
            <SubscribeOptions
              creatorId={creator.id}
              creatorAddress={creator.solanaAddress!}
              monthly={hasMonthly ? { priceUsdc: tier!.monthlyPrice! } : null}
              yearly={hasYearly ? { priceUsdc: tier!.yearlyPrice! } : null}
            />
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

      {/* Footer nav */}
      <div className="mt-12 flex items-center justify-between gap-4 border-t border-neutral-800 pt-6">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-violet-300"
        >
          ← Veloran home
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          Your dashboard →
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-neutral-600">
        Payments settle on Solana devnet · 95% to creator, 5% to Veloran ·
        on-chain
      </p>
    </main>
  );
}
