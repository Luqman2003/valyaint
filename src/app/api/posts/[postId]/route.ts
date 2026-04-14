import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      photos: { orderBy: { order: "asc" } },
      _count: { select: { comments: true } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify user is member of the group
  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: post.groupId } },
  });

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  return NextResponse.json(post);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  const body = await req.json();
  const content = body.content as string | undefined;

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { content },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      photos: { orderBy: { order: "asc" } },
      _count: { select: { comments: true } },
      group: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}
