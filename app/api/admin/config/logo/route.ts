import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 500 * 1024; // 500 KB

// POST /api/admin/config/logo — upload logo via Vercel Blob
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximum : 500 KB." },
      { status: 400 }
    );
  }

  // Supprimer l'ancien logo s'il existe
  const current = await db.appConfig.findUnique({ where: { id: "singleton" } });
  if (current?.logoUrl) {
    await del(current.logoUrl).catch(() => null);
  }

  const blob = await put(`logos/apats-logo-${Date.now()}.${file.type.split("/")[1]}`, file, {
    access: "public",
  });

  const config = await db.appConfig.upsert({
    where: { id: "singleton" },
    create: { logoUrl: blob.url },
    update: { logoUrl: blob.url },
  });

  return NextResponse.json({ logoUrl: config.logoUrl });
}

// DELETE /api/admin/config/logo — supprimer le logo
export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const current = await db.appConfig.findUnique({ where: { id: "singleton" } });
  if (current?.logoUrl) {
    await del(current.logoUrl).catch(() => null);
  }

  await db.appConfig.upsert({
    where: { id: "singleton" },
    create: { logoUrl: null },
    update: { logoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
