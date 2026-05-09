import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// DELETE /api/annonces/[id] — créateur ou admin
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;

  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });

  const canDelete = session.role === "ADMIN" || announcement.createdById === session.userId;
  if (!canDelete) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
