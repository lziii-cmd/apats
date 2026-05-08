import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// POST /api/reunions/[id]/close — clôturer la réunion
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

  if (meeting.status !== "OPEN") {
    return NextResponse.json({ error: "Seule une réunion ouverte peut être clôturée." }, { status: 409 });
  }

  // Marquer les non-scannés comme ABSENT
  await db.meetingAttendee.updateMany({
    where: { meetingId: id, attended: null },
    data: { attended: false, attendanceStatus: "ABSENT" },
  });

  await db.meeting.update({ where: { id }, data: { status: "CLOSED" } });
  return NextResponse.json({ ok: true });
}
