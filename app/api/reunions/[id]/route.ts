import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, MeetingType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/reunions/[id] — détail
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      endTime: true,
      location: true,
      speakers: true,
      agenda: true,
      qrCode: true,
      status: true,
      createdBy: { select: { id: true, name: true } },
      attendees: {
        select: {
          userId: true,
          preConfirmed: true,
          attended: true,
          attendanceStatus: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  return NextResponse.json(meeting);
}

// PATCH /api/reunions/[id] — modifier (statut PLANNED uniquement sauf changement de status)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide." }, { status: 400 });

  const existing = await db.meeting.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime) : null;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.speakers !== undefined) updateData.speakers = body.speakers;
  if (body.agenda !== undefined) updateData.agenda = body.agenda;
  if (body.status !== undefined) updateData.status = body.status;

  // Mise à jour liste invités (seulement si PLANNED)
  if (body.inviteeIds !== undefined && existing.status === "PLANNED") {
    let inviteeIds: string[] = body.inviteeIds;
    if (body.type === MeetingType.AG || existing.type === MeetingType.AG) {
      const activeMembers = await db.user.findMany({
        where: { isActive: true, role: "MEMBER" },
        select: { id: true },
      });
      inviteeIds = activeMembers.map((m) => m.id);
    }
    // Supprimer anciens invités non présents dans la nouvelle liste
    await db.meetingAttendee.deleteMany({
      where: { meetingId: id, userId: { notIn: inviteeIds } },
    });
    // Ajouter les nouveaux
    const existing_attendees = await db.meetingAttendee.findMany({
      where: { meetingId: id },
      select: { userId: true },
    });
    const existingIds = new Set(existing_attendees.map((a) => a.userId));
    const toAdd = inviteeIds.filter((uid) => !existingIds.has(uid));
    if (toAdd.length > 0) {
      await db.meetingAttendee.createMany({
        data: toAdd.map((userId) => ({ meetingId: id, userId })),
      });
    }
  }

  const meeting = await db.meeting.update({
    where: { id },
    data: updateData,
    select: {
      id: true, type: true, title: true, date: true, endTime: true,
      location: true, speakers: true, agenda: true, qrCode: true, status: true,
      _count: { select: { attendees: true } },
    },
  });

  return NextResponse.json(meeting);
}

// DELETE /api/reunions/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  if (meeting.status === "CLOSED") {
    return NextResponse.json(
      { error: "Une réunion clôturée ne peut pas être supprimée." },
      { status: 409 }
    );
  }

  await db.meeting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
