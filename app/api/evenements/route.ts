import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// GET /api/evenements — liste tous les événements
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const events = await db.event.findMany({
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      endDate: true,
      location: true,
      description: true,
      responsible: true,
      budget: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
      participants: {
        where: { userId: session.userId },
        select: { userId: true },
        take: 1,
      },
    },
  });

  return NextResponse.json(events);
}

// POST /api/evenements — créer un événement
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.date || !body?.location || !body?.description) {
    return NextResponse.json({ error: "Champs requis : titre, date, lieu, description." }, { status: 400 });
  }

  const event = await db.event.create({
    data: {
      title: body.title,
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location,
      description: body.description,
      responsible: body.responsible ?? null,
      budget: body.budget ? Number(body.budget) : null,
      createdById: session.userId,
    },
    select: { id: true },
  });

  return NextResponse.json(event, { status: 201 });
}
