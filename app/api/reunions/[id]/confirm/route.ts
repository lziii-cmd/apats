import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/reunions/[id]/confirm — pré-confirmer sa présence (idempotent)
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  const attendee = await db.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: id, userId: session.userId } },
  });

  if (!attendee) {
    return NextResponse.json({ error: "Vous n'êtes pas convoqué(e) à cette réunion." }, { status: 403 });
  }

  await db.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: id, userId: session.userId } },
    data: { preConfirmed: true },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/reunions/[id]/confirm — annuler la pré-confirmation
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  const attendee = await db.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: id, userId: session.userId } },
  });

  if (!attendee) {
    return NextResponse.json({ error: "Vous n'êtes pas convoqué(e) à cette réunion." }, { status: 403 });
  }

  await db.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: id, userId: session.userId } },
    data: { preConfirmed: false },
  });

  return NextResponse.json({ ok: true });
}
