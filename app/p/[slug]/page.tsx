import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { microUsdcToUsd } from "@/lib/slug";
import { PaywallGate } from "@/components/PaywallGate";
import { unlockCookieName, verifyUnlockToken } from "@/lib/content-gate";
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
      creator: {
        select: { displayName: true, email: true, solanaAddress: true },
      },
    },
  });
}

async function getUnlockedContent(
  slug: string,
  content: string
): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(unlockCookieName(slug))?.value;
  return verifyUnlockToken(token, slug) ? content : null;
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

  const initialContent = await getUnlockedContent(post.slug, post.content);

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

      <PaywallGate
        slug={post.slug}
        priceUsd={microUsdcToUsd(post.priceUsdc)}
        priceUsdc={post.priceUsdc}
        creatorAddress={post.creator.solanaAddress}
        initialContent={initialContent}
      />

      <p className="mt-8 text-center text-xs text-neutral-600">
        Payments settle on Solana devnet · 95% to creator, 5% to Veloran ·
        on-chain
      </p>
    </main>
  );
}
