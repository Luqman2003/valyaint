import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGroupSchema } from "@/lib/validations";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          _count: { select: { memberships: true, posts: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m) => ({
    ...m.group,
    role: m.role,
    memberCount: m.group._count.memberships,
    postCount: m.group._count.posts,
  }));

  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Check max 3 groups
  const groupCount = await prisma.membership.count({
    where: { userId: session.user.id },
  });

  if (groupCount >= 3) {
    return NextResponse.json(
      { error: "You can only be in up to 3 groups" },
      { status: 403 }
    );
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: session.user.id,
      memberships: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
