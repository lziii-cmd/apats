import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// GET /api/membres?categoryId=&postId=&cotisationStatus=all|overdue|upToDate
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
  const cotisationStatus = searchParams.get("cotisationStatus") ?? "all";

  const membres = await db.user.findMany({
    where: {
      role: "MEMBER",
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(postId ? { mandates: { some: { isActive: true, postId } } } : {}),
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
      monthlyPayments: {
        where: { status: "CONFIRMED" },
        select: { year: true, month: true },
      },
    },
  });

  // Calcul isOverdue pour chaque membre
  const now = new Date();
  const result = membres.map((m) => {
    const confirmedSet = new Set(
      m.monthlyPayments.map((p) => `${p.year}-${p.month}`)
    );
    const start = new Date(m.createdAt);
    let isOverdue = false;
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cur < limit) {
      if (!confirmedSet.has(`${cur.getFullYear()}-${cur.getMonth() + 1}`)) {
        isOverdue = true;
        break;
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    const { monthlyPayments: _payments, ...rest } = m;
    return { ...rest, isOverdue };
  });

  const filtered =
    cotisationStatus === "overdue"
      ? result.filter((m) => m.isOverdue)
      : cotisationStatus === "upToDate"
      ? result.filter((m) => !m.isOverdue)
      : result;

  return NextResponse.json(filtered);
}
