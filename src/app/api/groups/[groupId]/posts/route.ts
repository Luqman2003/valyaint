import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = 20;

  const posts = await prisma.post.findMany({
    where: { groupId },
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { content, photoUrls } = parsed.data;

  if (!content && (!photoUrls || photoUrls.length === 0)) {
    return NextResponse.json({ error: "Post must have content or photos" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      content,
      authorId: session.user.id,
      groupId,
      photos: photoUrls
        ? { create: photoUrls.map((url, i) => ({ url, order: i })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      photos: { orderBy: { order: "asc" } },
      _count: { select: { comments: true } },
      group: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
