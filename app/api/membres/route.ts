import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// GET /api/membres?categoryId=&postId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_VIEW" as Feature));
  if (!allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const postId = searchParams.get("postId") ?? undefined;

  const membres = await db.user.findMany({
    where: {
      role: "MEMBER",
      ...(categoryId ? { categoryId } : {}),
      ...(postId
        ? { mandates: { some: { isActive: true, postId } } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          post: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(membres);
}
