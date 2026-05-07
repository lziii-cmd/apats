import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Feature } from "@prisma/client";

const ALL_FEATURES = Object.values(Feature);

// PUT /api/admin/posts/[id]/permissions — remplacer toute la grille d'un poste
// Body attendu : { permissions: { feature: Feature; granted: boolean }[] }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  const post = await db.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Poste introuvable." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.permissions)) {
    return NextResponse.json(
      { error: "Le champ 'permissions' (tableau) est requis." },
      { status: 400 }
    );
  }

  // Valider que toutes les features envoyées sont connues
  const invalid = body.permissions.find(
    (p: { feature: string }) => !ALL_FEATURES.includes(p.feature as Feature)
  );
  if (invalid) {
    return NextResponse.json(
      { error: `Feature inconnue : ${invalid.feature}` },
      { status: 400 }
    );
  }

  // Remplacement atomique de toute la grille (delete + createMany dans une transaction)
  await db.$transaction([
    db.permission.deleteMany({ where: { postId: id } }),
    db.permission.createMany({
      data: body.permissions.map((p: { feature: Feature; granted: boolean }) => ({
        postId: id,
        feature: p.feature,
        granted: p.granted,
      })),
    }),
  ]);

  const updated = await db.permission.findMany({
    where: { postId: id },
    select: { feature: true, granted: true },
  });

  return NextResponse.json(updated);
}
