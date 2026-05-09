import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/evenements/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
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
        select: { userId: true, user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
  return NextResponse.json(event);
}

// PATCH /api/evenements/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide." }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.responsible !== undefined) updateData.responsible = body.responsible || null;
  if (body.budget !== undefined) updateData.budget = body.budget ? Number(body.budget) : null;

  const event = await db.event.update({ where: { id }, data: updateData, select: { id: true } });
  return NextResponse.json(event);
}

// DELETE /api/evenements/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  await db.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
