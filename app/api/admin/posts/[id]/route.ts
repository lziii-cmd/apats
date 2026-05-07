import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH /api/admin/posts/[id] — renommer un poste
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Le nom du poste est requis." }, { status: 400 });
  }

  const existing = await db.post.findUnique({ where: { name } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "Un poste avec ce nom existe déjà." }, { status: 409 });
  }

  try {
    const post = await db.post.update({ where: { id }, data: { name } });
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Poste introuvable." }, { status: 404 });
  }
}

// DELETE /api/admin/posts/[id] — supprimer un poste
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  // Vérifier s'il y a des mandats actifs sur ce poste (contrainte Restrict)
  const activeMandates = await db.mandate.count({
    where: { postId: id, isActive: true },
  });

  if (activeMandates > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer ce poste : ${activeMandates} mandat(s) actif(s) y sont rattachés.`,
      },
      { status: 409 }
    );
  }

  try {
    await db.post.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Poste introuvable." }, { status: 404 });
  }
}
