import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/reunions/scan — enregistrer sa présence via QR Code
// Body : { qrCode: string }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.qrCode) {
    return NextResponse.json({ error: "QR Code manquant." }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({
    where: { qrCode: body.qrCode },
    select: { id: true, title: true, status: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "QR Code invalide." }, { status: 404 });
  }

  if (meeting.status !== "OPEN") {
    return NextResponse.json(
      { error: "L'émargement n'est pas ouvert pour cette réunion." },
      { status: 403 }
    );
  }

  const attendee = await db.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId: session.userId } },
  });

  if (!attendee) {
    return NextResponse.json(
      { error: "Vous n'êtes pas convoqué(e) à cette réunion." },
      { status: 403 }
    );
  }

  // Idempotent : already attended → just return success
  if (attendee.attended) {
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    return NextResponse.json({ ok: true, name: user?.name, alreadyScanned: true });
  }

  await db.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: meeting.id, userId: session.userId } },
    data: { attended: true, attendanceStatus: "PRESENT" },
  });

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  return NextResponse.json({ ok: true, name: user?.name, meetingTitle: meeting.title });
}
