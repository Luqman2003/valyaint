import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

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
    select: { inviteCode: true },
  });

  return NextResponse.json({ inviteCode: group?.inviteCode });
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

  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: createId() },
    select: { inviteCode: true },
  });

  return NextResponse.json({ inviteCode: group.inviteCode });
}
