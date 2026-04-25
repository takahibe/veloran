import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/posts/[id]
 * Auth: only the post's creator can delete.
 * Cascades: removes Unlocks for this post in the same transaction
 * (schema doesn't declare onDelete: Cascade, so we do it explicitly).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const claims = await verifyPrivyToken(req.headers.get("authorization"));
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const me = await prisma.creator.findUnique({
    where: { privyUserId: claims.userId },
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, creatorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (post.creatorId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.unlock.deleteMany({ where: { postId: id } }),
    prisma.post.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
