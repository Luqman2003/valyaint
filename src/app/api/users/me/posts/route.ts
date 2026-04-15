import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "photos" | "text" | null (all)
  const groupId = searchParams.get("groupId");
  const cursor = searchParams.get("cursor");
  const limit = 20;

  const where: Record<string, unknown> = { authorId: session.user.id };

  if (groupId) {
    where.groupId = groupId;
  }

  if (filter === "photos") {
    where.photos = { some: {} };
  } else if (filter === "text") {
    where.photos = { none: {} };
    where.content = { not: null };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      photos: { orderBy: { order: "asc" } },
      group: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, limit) : posts;

  return NextResponse.json({
    posts: results,
    nextCursor: hasMore ? results[results.length - 1].id : null,
  });
}
