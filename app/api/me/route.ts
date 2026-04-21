import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { privy, verifyPrivyToken } from "@/lib/privy-server";

export async function POST(req: NextRequest) {
  const verified = await verifyPrivyToken(req.headers.get("authorization"));
  if (!verified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    solanaAddress?: string;
  };

  // Pull email from Privy's user record (source of truth).
  const privyUser = await privy.getUserById(verified.userId);
  const email = privyUser?.email?.address ?? null;

  const creator = await prisma.creator.upsert({
    where: { privyUserId: verified.userId },
    update: {
      email,
      ...(body.solanaAddress ? { solanaAddress: body.solanaAddress } : {}),
    },
    create: {
      privyUserId: verified.userId,
      email,
      solanaAddress: body.solanaAddress ?? null,
    },
    select: {
      id: true,
      email: true,
      solanaAddress: true,
      displayName: true,
    },
  });

  return NextResponse.json(creator);
}

export async function GET(req: NextRequest) {
  const verified = await verifyPrivyToken(req.headers.get("authorization"));
  if (!verified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const creator = await prisma.creator.findUnique({
    where: { privyUserId: verified.userId },
    select: {
      id: true,
      email: true,
      solanaAddress: true,
      displayName: true,
    },
  });
  return NextResponse.json(creator);
}
