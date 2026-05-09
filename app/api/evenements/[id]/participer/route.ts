import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/evenements/[id]/participer — s'inscrire
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  const event = await db.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });

  await db.eventParticipant.upsert({
    where: { eventId_userId: { eventId: id, userId: session.userId } },
    create: { eventId: id, userId: session.userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/evenements/[id]/participer — se désinscrire
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  await db.eventParticipant.deleteMany({
    where: { eventId: id, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
