import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { PLATFORM_BPS, BPS_DENOMINATOR } from "@/lib/x402";

/**
 * GET /api/earnings
 *
 * Returns the authenticated creator's lifetime earnings derived from the
 * Unlock table. Mirrors the on-chain split math (PLATFORM_BPS = 500).
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

  // All unlocks for posts this creator owns
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

  let grossMicro = 0n;
  let humanCount = 0;
  let agentCount = 0;
  for (const u of unlocks) {
    grossMicro += BigInt(u.amountUsdc);
    if (u.readerType === "agent") agentCount += 1;
    else humanCount += 1;
  }
  const platformMicro = (grossMicro * PLATFORM_BPS) / BPS_DENOMINATOR;
  const creatorMicro = grossMicro - platformMicro;

  return NextResponse.json({
    totals: {
      gross: grossMicro.toString(),
      creator: creatorMicro.toString(),
      platform: platformMicro.toString(),
      unlockCount: unlocks.length,
      humanCount,
      agentCount,
    },
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
  });
}
