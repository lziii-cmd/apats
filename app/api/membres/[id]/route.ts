import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// GET /api/membres/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_VIEW_DETAIL" as Feature));
  if (!allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const membre = await db.user.findUnique({
    where: { id, role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          isActive: true,
          post: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  return NextResponse.json(membre);
}
