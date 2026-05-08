import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// POST /api/reunions/[id]/open — ouvrir l'émargement
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canAttend =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_ATTENDANCE" as Feature));
  if (!canAttend) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  if (meeting.status !== "PLANNED") {
    return NextResponse.json({ error: "La réunion ne peut pas être ouverte." }, { status: 409 });
  }

  await db.meeting.update({ where: { id }, data: { status: "OPEN" } });
  return NextResponse.json({ ok: true });
}
