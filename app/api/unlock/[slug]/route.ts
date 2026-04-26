import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import {
  getServerConnection,
  USDC_DEVNET_MINT,
  VELORAN_PROGRAM_ID,
  VELORAN_TREASURY,
} from "@/lib/solana";
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
 * Verifies that the given Solana tx is a USDC SPL transfer from the
 * authenticated reader's wallet to the post creator's USDC ATA, for
 * exactly the post's price. Creates an Unlock row and returns content.
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
    return NextResponse.json({ error: "Missing txSignature" }, { status: 400 });
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

  // 4. Fetch + verify the on-chain transaction
  const connection = getServerConnection();
  const tx = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) {
    return NextResponse.json(
      { error: "Transaction not found or failed" },
      { status: 400 }
    );
  }

  // Compute expected ATAs
  const readerPk = new PublicKey(reader.solanaAddress);
  const creatorPk = new PublicKey(post.creator.solanaAddress);
  const creatorAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    creatorPk
  ).toBase58();
  const readerAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    readerPk
  ).toBase58();
  const platformAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    VELORAN_TREASURY
  ).toBase58();

  // Confirm the tx actually invoked our Anchor program — otherwise an
  // attacker could craft a raw SPL transfer and bypass the on-chain split.
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    k.pubkey.toBase58()
  );
  if (!accountKeys.includes(VELORAN_PROGRAM_ID.toBase58())) {
    return NextResponse.json(
      { error: "Transaction did not invoke the Veloran program" },
      { status: 400 }
    );
  }

  // Walk pre/post token balances to confirm the 95/5 split landed:
  // creator >= creator_cut, platform >= platform_cut, sum >= price.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post_ = tx.meta?.postTokenBalances ?? [];

  const balanceFor = (
    arr: typeof pre,
    owner: string,
    accountIndex: number
  ): bigint => {
    const entry = arr.find(
      (b) =>
        b.accountIndex === accountIndex &&
        b.mint === USDC_DEVNET_MINT.toBase58() &&
        b.owner === owner
    );
    return entry ? BigInt(entry.uiTokenAmount.amount) : 0n;
  };

  const creatorAtaIdx = accountKeys.indexOf(creatorAta);
  const readerAtaIdx = accountKeys.indexOf(readerAta);
  const platformAtaIdx = accountKeys.indexOf(platformAta);
  if (creatorAtaIdx === -1) {
    return NextResponse.json(
      { error: "Creator USDC account not in transaction" },
      { status: 400 }
    );
  }
  if (platformAtaIdx === -1) {
    return NextResponse.json(
      { error: "Platform USDC account not in transaction" },
      { status: 400 }
    );
  }

  // Mirror the program's split math (PLATFORM_BPS=500, denom=10_000).
  const price = BigInt(post.priceUsdc);
  const expectedPlatform = (price * 500n) / 10_000n;
  const expectedCreator = price - expectedPlatform;

  const creatorDelta =
    balanceFor(post_, post.creator.solanaAddress, creatorAtaIdx) -
    balanceFor(pre, post.creator.solanaAddress, creatorAtaIdx);
  const platformDelta =
    balanceFor(post_, VELORAN_TREASURY.toBase58(), platformAtaIdx) -
    balanceFor(pre, VELORAN_TREASURY.toBase58(), platformAtaIdx);

  if (creatorDelta < expectedCreator) {
    return NextResponse.json(
      {
        error: `Creator received ${creatorDelta} micro-USDC, expected >= ${expectedCreator}`,
      },
      { status: 400 }
    );
  }
  if (platformDelta < expectedPlatform) {
    return NextResponse.json(
      {
        error: `Platform received ${platformDelta} micro-USDC, expected >= ${expectedPlatform}`,
      },
      { status: 400 }
    );
  }
  if (creatorDelta + platformDelta < price) {
    return NextResponse.json(
      { error: "Combined creator + platform credit is less than the price" },
      { status: 400 }
    );
  }

  // Confirm reader is the funder (their ATA balance went down by full price)
  if (readerAtaIdx !== -1) {
    const readerPre = balanceFor(pre, reader.solanaAddress, readerAtaIdx);
    const readerPost = balanceFor(post_, reader.solanaAddress, readerAtaIdx);
    if (readerPre - readerPost < price) {
      return NextResponse.json(
        { error: "Reader wallet did not fund this transfer" },
        { status: 400 }
      );
    }
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
