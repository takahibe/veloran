import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { SubscribeButton } from "@/components/SubscribeButton";
import { verifyPrivyCookie } from "@/lib/privy-server";
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

  // Server-side: if the visitor is logged in, look up their actual active
  // subscription so we can show the *real* plan + expiry (not just "yes
  // there's a cookie"). The cookie alone doesn't carry plan info.
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
      {activeSub ? (
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

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hasMonthly && (
              <SubscribeButton
                creatorId={creator.id}
                creatorAddress={creator.solanaAddress!}
                plan="monthly"
                priceUsdc={tier!.monthlyPrice!}
              />
            )}
            {hasYearly && (
              <SubscribeButton
                creatorId={creator.id}
                creatorAddress={creator.solanaAddress!}
                plan="yearly"
                priceUsdc={tier!.yearlyPrice!}
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
