import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { PLATFORM_BPS, BPS_DENOMINATOR } from "@/lib/x402";

/**
 * GET /api/earnings
 *
 * Returns the authenticated creator's lifetime earnings, including BOTH
 * per-post Unlock rows AND Subscription rows (monthly/yearly).
 * On-chain split math (PLATFORM_BPS = 500) is identical for both flows.
 *
 * Wire shape is intentionally backward-compatible with the original
 * (recent[] is still the per-post unlock list, totals.{gross,creator,
 * platform,unlockCount,humanCount,agentCount} unchanged) and adds new
 * fields:
 *   - totals.perPost / totals.subscriptions / totals.subscriberCount /
 *     totals.activeSubscribers
 *   - recentSubscriptions[] — sibling list with subscription rows
 */
export async function GET(req: NextRequest) {
  const claims = await verifyPrivyToken(req.headers.get("authorization"));
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creator = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
    select: { id: true },
  });
  if (!creator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Per-post unlocks for this creator's posts
  const unlocks = await prisma.unlock.findMany({
    where: { post: { creatorId: creator.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountUsdc: true,
      readerType: true,
      readerAddress: true,
      txSignature: true,
      createdAt: true,
      post: { select: { slug: true, title: true } },
    },
  });

  // Subscriptions to this creator
  const subscriptions = await prisma.subscription.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountUsdc: true,
      plan: true,
      subscriberAddress: true,
      txSignature: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // ------- totals -------
  let perPostMicro = 0n;
  let humanCount = 0;
  let agentCount = 0;
  for (const u of unlocks) {
    perPostMicro += BigInt(u.amountUsdc);
    if (u.readerType === "agent") agentCount += 1;
    else humanCount += 1;
  }

  let subscriptionsMicro = 0n;
  const now = new Date();
  let activeSubscribers = 0;
  for (const s of subscriptions) {
    subscriptionsMicro += BigInt(s.amountUsdc);
    if (s.expiresAt > now) activeSubscribers += 1;
  }

  const grossMicro = perPostMicro + subscriptionsMicro;
  const platformMicro = (grossMicro * PLATFORM_BPS) / BPS_DENOMINATOR;
  const creatorMicro = grossMicro - platformMicro;

  return NextResponse.json({
    totals: {
      // Backward-compatible fields (already consumed by DashboardClient)
      gross: grossMicro.toString(),
      creator: creatorMicro.toString(),
      platform: platformMicro.toString(),
      unlockCount: unlocks.length,
      humanCount,
      agentCount,
      // New: subscription breakdown
      perPost: perPostMicro.toString(),
      subscriptions: subscriptionsMicro.toString(),
      subscriberCount: subscriptions.length,
      activeSubscribers,
    },
    // Existing field — still per-post unlocks only, unchanged shape
    recent: unlocks.slice(0, 8).map((u) => ({
      id: u.id,
      amountUsdc: u.amountUsdc,
      readerType: u.readerType,
      readerAddress: u.readerAddress,
      txSignature: u.txSignature,
      createdAt: u.createdAt.toISOString(),
      postSlug: u.post.slug,
      postTitle: u.post.title,
    })),
    // New sibling list — subscription history
    recentSubscriptions: subscriptions.slice(0, 8).map((s) => ({
      id: s.id,
      amountUsdc: s.amountUsdc,
      plan: s.plan,
      subscriberAddress: s.subscriberAddress,
      txSignature: s.txSignature,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  });
}
