import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, description: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  return NextResponse.json(group);
}
