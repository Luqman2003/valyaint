import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const groupId = url.searchParams.get("groupId");
  const limit = 20;

  // Get user's group IDs
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { groupId: true },
  });

  const groupIds = groupId
    ? [groupId]
    : memberships.map((m) => m.groupId);

  if (groupIds.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  const posts = await prisma.post.findMany({
    where: { groupId: { in: groupIds } },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      photos: { orderBy: { order: "asc" } },
      _count: { select: { comments: true } },
      group: { select: { id: true, name: true } },
    },
  });

  const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

  return NextResponse.json({ posts, nextCursor });
}
