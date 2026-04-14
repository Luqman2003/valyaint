import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Verify post exists and user is member
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: post.groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      authorId: session.user.id,
      postId,
    },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
