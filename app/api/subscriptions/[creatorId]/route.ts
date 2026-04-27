import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { getServerConnection } from "@/lib/solana";
import { verifyOnChainPayment } from "@/lib/x402";
import {
  signSubscriptionToken,
  subscriptionCookieName,
  subscriptionCookieMaxAge,
  type SubscriptionPlan,
} from "@/lib/content-gate";

type Params = { params: Promise<{ creatorId: string }> };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function withSubscriptionCookie(
  res: NextResponse,
  creatorId: string,
  plan: SubscriptionPlan
): NextResponse {
  res.cookies.set({
    name: subscriptionCookieName(creatorId),
    value: signSubscriptionToken(creatorId, plan),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: subscriptionCookieMaxAge(plan),
  });
  return res;
}

function isPlan(v: unknown): v is SubscriptionPlan {
  return v === "monthly" || v === "yearly";
}

/**
 * POST /api/subscriptions/[creatorId]
 * Body: { txSignature: string, plan: "monthly" | "yearly" }
 *
 * Human path. Privy-authenticated. Verifies the on-chain payment to the
 * target creator, creates a Subscription row, and sets the HMAC cookie
 * so the reader's browser is gated-in for the plan duration.
 *
 * Idempotent on txSignature.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { creatorId } = await params;

  // 1. Authenticate reader
  const claims = await verifyPrivyToken(req.headers.get("authorization"));
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscriber = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
  });
  if (!subscriber?.solanaAddress) {
    return NextResponse.json(
      { error: "Subscriber has no wallet on record" },
      { status: 400 }
    );
  }

  // 2. Body
  let body: { txSignature?: string; plan?: string };
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
  if (!isPlan(body.plan)) {
    return NextResponse.json(
      { error: "plan must be 'monthly' or 'yearly'" },
      { status: 400 }
    );
  }
  const plan: SubscriptionPlan = body.plan;

  // 3. Load creator + tier
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      solanaAddress: true,
      tier: {
        select: {
          monthlyPrice: true,
          yearlyPrice: true,
          active: true,
        },
      },
    },
  });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }
  if (!creator.solanaAddress) {
    return NextResponse.json(
      { error: "Creator wallet missing" },
      { status: 500 }
    );
  }
  if (!creator.tier || !creator.tier.active) {
    return NextResponse.json(
      { error: "Creator does not offer subscriptions" },
      { status: 400 }
    );
  }
  const expectedPrice =
    plan === "monthly" ? creator.tier.monthlyPrice : creator.tier.yearlyPrice;
  if (expectedPrice === null || expectedPrice === undefined) {
    return NextResponse.json(
      { error: `Creator does not offer a ${plan} plan` },
      { status: 400 }
    );
  }

  // Idempotency: same tx signature already processed → return ok with cookie
  const existing = await prisma.subscription.findUnique({
    where: { txSignature },
  });
  if (existing) {
    return withSubscriptionCookie(
      NextResponse.json({
        ok: true,
        plan: existing.plan,
        expiresAt: existing.expiresAt.toISOString(),
        txSignature,
      }),
      creator.id,
      existing.plan === "yearly" ? "yearly" : "monthly"
    );
  }

  // 4. Fetch + verify the on-chain payment
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
    recipientAddress: creator.solanaAddress,
    amountUsdc: expectedPrice,
    expectedPayerAddress: subscriber.solanaAddress,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 5. Persist subscription
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (plan === "yearly" ? 365 : 30) * MS_PER_DAY
  );

  const sub = await prisma.subscription.create({
    data: {
      creatorId: creator.id,
      subscriberCreatorId: subscriber.id,
      subscriberAddress: subscriber.solanaAddress,
      plan,
      amountUsdc: expectedPrice,
      startsAt: now,
      expiresAt,
      txSignature,
    },
    select: {
      plan: true,
      expiresAt: true,
      txSignature: true,
    },
  });

  return withSubscriptionCookie(
    NextResponse.json({
      ok: true,
      plan: sub.plan,
      expiresAt: sub.expiresAt.toISOString(),
      txSignature: sub.txSignature,
    }),
    creator.id,
    plan
  );
}

/**
 * GET /api/subscriptions/[creatorId]   (Privy authed)
 *
 * Returns the caller's active subscription to this creator, if any.
 * Used by /c/[address] to show "Subscribed until ..." state.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { creatorId } = await params;
  const claims = await verifyPrivyToken(req.headers.get("authorization"));
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json({ subscription: null });
  }

  const active = await prisma.subscription.findFirst({
    where: {
      creatorId,
      subscriberCreatorId: me.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: {
      id: true,
      plan: true,
      startsAt: true,
      expiresAt: true,
      amountUsdc: true,
      txSignature: true,
    },
  });

  return NextResponse.json({
    subscription: active
      ? {
          id: active.id,
          plan: active.plan,
          startsAt: active.startsAt.toISOString(),
          expiresAt: active.expiresAt.toISOString(),
          amountUsdc: active.amountUsdc,
          txSignature: active.txSignature,
        }
      : null,
  });
}
