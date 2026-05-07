import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/mandates?userId=xxx — historique des mandats d'un membre
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Paramètre userId requis." }, { status: 400 });
  }

  const mandates = await db.mandate.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    include: {
      post: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(mandates);
}

// POST /api/admin/mandates — attribuer un poste à un membre
// Body : { userId, postId, startDate?, endDate? }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.postId) {
    return NextResponse.json(
      { error: "Les champs userId et postId sont requis." },
      { status: 400 }
    );
  }

  // Vérifier que l'utilisateur et le poste existent
  const [user, post, config] = await Promise.all([
    db.user.findUnique({ where: { id: body.userId }, select: { id: true } }),
    db.post.findUnique({ where: { id: body.postId }, select: { id: true } }),
    db.appConfig.findUnique({ where: { id: "singleton" }, select: { mandateDurationDays: true } }),
  ]);

  if (!user) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (!post) return NextResponse.json({ error: "Poste introuvable." }, { status: 404 });

  const durationDays = config?.mandateDurationDays ?? 730;
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate
    ? new Date(body.endDate)
    : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Désactiver l'éventuel mandat actif précédent
  await db.mandate.updateMany({
    where: { userId: body.userId, isActive: true },
    data: { isActive: false },
  });

  const mandate = await db.mandate.create({
    data: {
      userId: body.userId,
      postId: body.postId,
      startDate,
      endDate,
      isActive: true,
    },
    include: { post: { select: { id: true, name: true } } },
  });

  return NextResponse.json(mandate, { status: 201 });
}
