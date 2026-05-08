import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, MeetingType } from "@prisma/client";

// GET /api/reunions — liste des réunions
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const meetings = await db.meeting.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      endTime: true,
      location: true,
      status: true,
      _count: { select: { attendees: true } },
      attendees: {
        where: { userId: session.userId },
        select: { preConfirmed: true },
        take: 1,
      },
    },
  });

  return NextResponse.json(meetings);
}

// POST /api/reunions — créer une réunion
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide." }, { status: 400 });

  const { type, title, date, endTime, location, speakers, agenda, inviteeIds } = body;

  if (!type || !title || !date || !location || !agenda) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  if (!Object.values(MeetingType).includes(type)) {
    return NextResponse.json({ error: "Type de réunion invalide." }, { status: 400 });
  }

  // AG → inviter tous les membres actifs
  let finalInviteeIds: string[] = inviteeIds ?? [];
  if (type === MeetingType.AG) {
    const activeMembers = await db.user.findMany({
      where: { isActive: true, role: "MEMBER" },
      select: { id: true },
    });
    finalInviteeIds = activeMembers.map((m) => m.id);
  }

  const meeting = await db.meeting.create({
    data: {
      type,
      title,
      date: new Date(date),
      endTime: endTime ? new Date(endTime) : null,
      location,
      speakers: speakers ?? null,
      agenda,
      createdById: session.userId,
      attendees: {
        create: finalInviteeIds.map((userId: string) => ({ userId })),
      },
    },
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
      _count: { select: { attendees: true } },
    },
  });

  // Notifications in-app aux invités
  if (finalInviteeIds.length > 0) {
    await db.notification.createMany({
      data: finalInviteeIds.map((userId: string) => ({
        userId,
        type: "meeting_invite",
        title: `Convocation : ${title}`,
        body: `Vous êtes convoqué(e) à la réunion "${title}" le ${new Date(date).toLocaleDateString("fr-FR")}.`,
      })),
    });
  }

  return NextResponse.json(meeting, { status: 201 });
}
