import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const data: Record<string, string> = {};
  if (body.displayName) data.displayName = body.displayName;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}
