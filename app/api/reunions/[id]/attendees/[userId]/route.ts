import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

type Params = { params: Promise<{ id: string; userId: string }> };

// PATCH /api/reunions/[id]/attendees/[userId] — correction manuelle secrétaire
// Body : { attended: boolean, attendanceStatus?: "PRESENT" | "ABSENT" | "EXCUSED" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canAttend =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_ATTENDANCE" as Feature));
  if (!canAttend) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id, userId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || body.attended === undefined) {
    return NextResponse.json({ error: "Body invalide." }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({ where: { id }, select: { status: true } });
  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  if (meeting.status === "CLOSED") {
    return NextResponse.json({ error: "La réunion est clôturée." }, { status: 409 });
  }

  const attendee = await db.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: id, userId } },
  });
  if (!attendee) return NextResponse.json({ error: "Membre non convoqué." }, { status: 404 });

  const status = body.attended ? "PRESENT" : (body.attendanceStatus ?? "ABSENT");

  await db.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: id, userId } },
    data: { attended: body.attended, attendanceStatus: status },
  });

  return NextResponse.json({ ok: true });
}
