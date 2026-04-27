import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { usdToMicroUsdc } from "@/lib/slug";

/**
 * GET /api/subscription-tiers?creatorId=<id>     (public)
 * GET /api/subscription-tiers?address=<solana>   (public, alt lookup)
 *
 * Returns the creator's tier or `{ tier: null }`. Used by the public
 * `/c/[address]` page and by the dashboard's tier editor on first load.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const creatorId = url.searchParams.get("creatorId");
  const address = url.searchParams.get("address");
  if (!creatorId && !address) {
    return NextResponse.json(
      { error: "creatorId or address required" },
      { status: 400 }
    );
  }

  const where = creatorId
    ? { id: creatorId }
    : { solanaAddress: address as string };

  const creator = await prisma.creator.findUnique({
    where,
    select: {
      id: true,
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
    return NextResponse.json({ tier: null });
  }

  const tier = creator.tier;
  if (!tier || !tier.active) {
    return NextResponse.json({ creatorId: creator.id, tier: null });
  }
  return NextResponse.json({
    creatorId: creator.id,
    tier: {
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      active: tier.active,
    },
  });
}

/**
 * PUT /api/subscription-tiers   (Privy authed, creator-only)
 * Body: { monthlyPriceUsd?: string|null, yearlyPriceUsd?: string|null, active?: boolean }
 *
 * Upserts the caller's own tier. A null or "" price disables that plan.
 */
export async function PUT(req: NextRequest) {
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

  const body = (await req.json().catch(() => ({}))) as {
    monthlyPriceUsd?: string | null;
    yearlyPriceUsd?: string | null;
    active?: boolean;
  };

  // Convert prices. `null` or "" → disable (store null). Otherwise validate.
  function priceFromInput(v: string | null | undefined): number | null | "invalid" {
    if (v === null || v === undefined || v.trim() === "") return null;
    const micro = usdToMicroUsdc(v);
    if (micro === null) return "invalid";
    return micro;
  }

  const monthly = priceFromInput(body.monthlyPriceUsd);
  const yearly = priceFromInput(body.yearlyPriceUsd);
  if (monthly === "invalid") {
    return NextResponse.json(
      { error: "invalid monthlyPriceUsd (positive number, up to 6 decimals)" },
      { status: 400 }
    );
  }
  if (yearly === "invalid") {
    return NextResponse.json(
      { error: "invalid yearlyPriceUsd (positive number, up to 6 decimals)" },
      { status: 400 }
    );
  }

  // If both are null AND active is not explicitly true, disable the tier.
  const active = body.active ?? !(monthly === null && yearly === null);

  const tier = await prisma.subscriptionTier.upsert({
    where: { creatorId: creator.id },
    update: {
      monthlyPrice: monthly,
      yearlyPrice: yearly,
      active,
    },
    create: {
      creatorId: creator.id,
      monthlyPrice: monthly,
      yearlyPrice: yearly,
      active,
    },
    select: {
      monthlyPrice: true,
      yearlyPrice: true,
      active: true,
    },
  });

  return NextResponse.json({ tier });
}
