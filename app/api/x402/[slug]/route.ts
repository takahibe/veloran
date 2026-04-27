import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerConnection } from "@/lib/solana";
import {
  buildPaymentRequirements,
  buildPaymentResponseHeader,
  parsePaymentHeader,
  verifyOnChainPayment,
  VELORAN_X402_NETWORK,
  VELORAN_X402_SCHEME,
  X402_VERSION,
} from "@/lib/x402";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/x402/[slug]
 *
 * Veloran's x402-style endpoint. Without a valid X-PAYMENT header it
 * returns HTTP 402 + payment requirements. With one, it verifies the
 * on-chain tx (program invocation + 95/5 split + payer match) and
 * returns the content. Stateless — no cookies.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      preview: true,
      content: true,
      priceUsdc: true,
      creator: { select: { solanaAddress: true } },
    },
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

  const requirements = buildPaymentRequirements({
    slug: post.slug,
    priceUsdc: post.priceUsdc,
    preview: post.preview,
    creator: { solanaAddress: post.creator.solanaAddress },
  });

  // No payment header → return the 402 challenge.
  const headerValue = req.headers.get("x-payment");
  if (!headerValue) {
    return NextResponse.json(
      { x402Version: X402_VERSION, accepts: [requirements] },
      { status: 402 }
    );
  }

  const parsed = parsePaymentHeader(headerValue);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid X-PAYMENT header" },
      { status: 400 }
    );
  }
  if (parsed.scheme !== VELORAN_X402_SCHEME) {
    return NextResponse.json(
      { error: `Unsupported scheme '${parsed.scheme}'` },
      { status: 400 }
    );
  }
  if (parsed.network !== VELORAN_X402_NETWORK) {
    return NextResponse.json(
      { error: `Unsupported network '${parsed.network}'` },
      { status: 400 }
    );
  }

  // Idempotent: same signature → return content directly.
  const existing = await prisma.unlock.findUnique({
    where: { txSignature: parsed.txSignature },
  });
  if (existing) {
    return ok(post, parsed.txSignature);
  }

  const connection = getServerConnection();
  const tx = await connection.getParsedTransaction(parsed.txSignature, {
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
    recipientAddress: post.creator.solanaAddress,
    amountUsdc: post.priceUsdc,
    expectedPayerAddress: parsed.payerAddress,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.unlock.create({
    data: {
      postId: post.id,
      readerCreatorId: null,
      readerAddress: parsed.payerAddress,
      readerType: "agent",
      amountUsdc: post.priceUsdc,
      txSignature: parsed.txSignature,
    },
  });

  return ok(post, parsed.txSignature);
}

function ok(
  post: { title: string; content: string },
  txSignature: string
): NextResponse {
  const res = NextResponse.json({
    ok: true,
    title: post.title,
    content: post.content,
    txSignature,
  });
  res.headers.set(
    "X-PAYMENT-RESPONSE",
    buildPaymentResponseHeader(true, txSignature)
  );
  return res;
}
