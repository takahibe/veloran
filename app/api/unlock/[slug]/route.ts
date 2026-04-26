import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { getServerConnection } from "@/lib/solana";
import { verifyOnChainPayment } from "@/lib/x402";
import {
  signUnlockToken,
  unlockCookieName,
  UNLOCK_COOKIE_MAX_AGE,
} from "@/lib/content-gate";

function withUnlockCookie(
  res: NextResponse,
  slug: string
): NextResponse {
  res.cookies.set({
    name: unlockCookieName(slug),
    value: signUnlockToken(slug),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  });
  return res;
}

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/unlock/[slug]
 * Body: { txSignature: string }
 *
 * Human path. Privy-authenticated. Verifies the on-chain split via
 * lib/x402.ts (the same helper /api/x402/[slug] uses for agents).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  // 1. Authenticate reader via Privy
  const claims = await verifyPrivyToken(req.headers.get("authorization"));
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reader = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
  });
  if (!reader?.solanaAddress) {
    return NextResponse.json(
      { error: "Reader has no wallet on record" },
      { status: 400 }
    );
  }

  // 2. Body
  let body: { txSignature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const txSignature = body.txSignature?.trim();
  if (!txSignature) {
    return NextResponse.json(
      { error: "Missing txSignature" },
      { status: 400 }
    );
  }

  // 3. Look up the post + creator
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { creator: { select: { id: true, solanaAddress: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (!post.creator.solanaAddress) {
    return NextResponse.json(
      { error: "Creator wallet missing" },
      { status: 500 }
    );
  }

  // Already unlocked? Idempotent return.
  const existing = await prisma.unlock.findUnique({
    where: { txSignature },
  });
  if (existing) {
    return withUnlockCookie(
      NextResponse.json({ ok: true, content: post.content }),
      slug
    );
  }

  // 4. Fetch + verify the on-chain transaction via shared helper
  const connection = getServerConnection();
  const tx = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 400 }
    );
  }

  const result = verifyOnChainPayment({
    tx,
    post: {
      priceUsdc: post.priceUsdc,
      creator: { solanaAddress: post.creator.solanaAddress },
    },
    expectedPayerAddress: reader.solanaAddress,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 5. Persist unlock
  await prisma.unlock.create({
    data: {
      postId: post.id,
      readerCreatorId: reader.id,
      readerAddress: reader.solanaAddress,
      readerType: "human",
      amountUsdc: post.priceUsdc,
      txSignature,
    },
  });

  return withUnlockCookie(
    NextResponse.json({ ok: true, content: post.content }),
    slug
  );
}
