import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const { inviteCode } = await req.json();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { _count: { select: { memberships: true } } },
  });

  if (!group || group.inviteCode !== inviteCode) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  if (group._count.memberships >= group.maxMembers) {
    return NextResponse.json({ error: "Group is full" }, { status: 403 });
  }

  // Check user's group limit
  const userGroupCount = await prisma.membership.count({
    where: { userId: session.user.id },
  });

  if (userGroupCount >= 3) {
    return NextResponse.json({ error: "You can only be in up to 3 groups" }, { status: 403 });
  }

  // Check already member
  const existing = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  await prisma.membership.create({
    data: { userId: session.user.id, groupId },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || session.user.id;

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Only owner can kick others; anyone can leave
  if (targetUserId !== session.user.id && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  // Owner can't leave without deleting group
  if (targetUserId === session.user.id && membership.role === "OWNER") {
    return NextResponse.json({ error: "Owner must delete group instead" }, { status: 400 });
  }

  await prisma.membership.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  return NextResponse.json({ ok: true });
}
