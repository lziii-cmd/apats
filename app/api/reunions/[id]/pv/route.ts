import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/reunions/[id]/pv — upload PV PDF
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canUpload =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_UPLOAD_PV" as Feature));
  if (!canUpload) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id }, select: { id: true, status: true, pvUrl: true } });
  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });
  if (meeting.status !== "CLOSED") {
    return NextResponse.json({ error: "Le PV ne peut être uploadé que sur une réunion clôturée." }, { status: 409 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux. Maximum : 10 MB." }, { status: 400 });
  }

  // Supprimer l'ancien PV s'il existe
  if (meeting.pvUrl) {
    await del(meeting.pvUrl).catch(() => null);
  }

  const blob = await put(`reunions/${id}/pv-${Date.now()}.pdf`, file, { access: "public" });

  const updated = await db.meeting.update({
    where: { id },
    data: { pvUrl: blob.url },
    select: { pvUrl: true },
  });

  return NextResponse.json({ pvUrl: updated.pvUrl });
}

// DELETE /api/reunions/[id]/pv — supprimer le PV
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canUpload =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_UPLOAD_PV" as Feature));
  if (!canUpload) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id }, select: { pvUrl: true } });
  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  if (meeting.pvUrl) {
    await del(meeting.pvUrl).catch(() => null);
  }

  await db.meeting.update({ where: { id }, data: { pvUrl: null } });

  return NextResponse.json({ ok: true });
}
