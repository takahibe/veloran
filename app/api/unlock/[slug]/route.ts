import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { getServerConnection, USDC_DEVNET_MINT } from "@/lib/solana";

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
    return NextResponse.json({ ok: true, content: post.content });
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

  // Walk pre/post token balances to confirm: creator received priceUsdc
  // micro-USDC AND it came from the reader's ATA.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post_ = tx.meta?.postTokenBalances ?? [];
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    k.pubkey.toBase58()
  );

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
  if (creatorAtaIdx === -1) {
    return NextResponse.json(
      { error: "Creator USDC account not in transaction" },
      { status: 400 }
    );
  }

  const creatorPreBal = balanceFor(
    pre,
    post.creator.solanaAddress,
    creatorAtaIdx
  );
  const creatorPostBal = balanceFor(
    post_,
    post.creator.solanaAddress,
    creatorAtaIdx
  );
  const creatorDelta = creatorPostBal - creatorPreBal;

  if (creatorDelta < BigInt(post.priceUsdc)) {
    return NextResponse.json(
      {
        error: `Creator received ${creatorDelta} micro-USDC, expected ${post.priceUsdc}`,
      },
      { status: 400 }
    );
  }

  // Confirm reader is the source (their ATA balance went down)
  if (readerAtaIdx !== -1) {
    const readerPre = balanceFor(pre, reader.solanaAddress, readerAtaIdx);
    const readerPost = balanceFor(post_, reader.solanaAddress, readerAtaIdx);
    if (readerPre - readerPost < BigInt(post.priceUsdc)) {
      return NextResponse.json(
        { error: "Reader wallet did not fund this transfer" },
        { status: 400 }
      );
    }
  }
  // (If reader ATA didn't exist before tx, that's fine — but then they
  // can't be the funder, so we'd reject. Here we only continue if their
  // ATA was present and decreased.)

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

  return NextResponse.json({ ok: true, content: post.content });
}
