import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { posts: true } },
    },
  });

  return NextResponse.json({ ...group, role: membership.role });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const body = await req.json();
  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      name: body.name,
      description: body.description,
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ ok: true });
}
