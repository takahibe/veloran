import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { makeSlug, usdToMicroUsdc } from "@/lib/slug";

async function authedCreator(req: NextRequest) {
  const verified = await verifyPrivyToken(req.headers.get("authorization"));
  if (!verified) return null;
  return prisma.creator.findUnique({
    where: { privyUserId: verified.userId },
  });
}

// Create a new paywall.
export async function POST(req: NextRequest) {
  const creator = await authedCreator(req);
  if (!creator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    preview?: string;
    content?: string;
    priceUsd?: string;
  };

  const title = body.title?.trim();
  const content = body.content?.trim();
  const preview = body.preview?.trim();
  const priceMicro = body.priceUsd ? usdToMicroUsdc(body.priceUsd) : null;

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "title too short" }, { status: 400 });
  }
  if (!content || content.length < 10) {
    return NextResponse.json({ error: "content too short" }, { status: 400 });
  }
  if (!preview || preview.length < 5) {
    return NextResponse.json({ error: "preview too short" }, { status: 400 });
  }
  if (priceMicro === null) {
    return NextResponse.json(
      { error: "invalid price (must be > 0 USD, up to 6 decimals)" },
      { status: 400 }
    );
  }

  // Retry slug generation on the rare collision.
  let created;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = makeSlug(title);
    try {
      created = await prisma.post.create({
        data: {
          slug,
          title,
          preview,
          content,
          priceUsdc: priceMicro,
          creatorId: creator.id,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          preview: true,
          priceUsdc: true,
          createdAt: true,
        },
      });
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      // else retry with new random suffix
    }
  }

  return NextResponse.json(created, { status: 201 });
}

// List the logged-in creator's own posts.
export async function GET(req: NextRequest) {
  const creator = await authedCreator(req);
  if (!creator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      preview: true,
      priceUsdc: true,
      createdAt: true,
      _count: { select: { unlocks: true } },
    },
  });

  return NextResponse.json({ posts });
}
