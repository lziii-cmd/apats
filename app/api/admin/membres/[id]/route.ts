import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/membres/[id] — détail + historique mandats
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          isActive: true,
          post: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  return NextResponse.json(user);
}

// PATCH /api/admin/membres/[id] — modifier infos ou désactiver/réactiver
// Body (tous optionnels) : { name, email, categoryId, locale, isActive, postId }
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide." }, { status: 400 });

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  // Vérifier unicité email si modifié
  if (body.email && body.email !== existing.email) {
    const conflict = await db.user.findUnique({ where: { email: body.email } });
    if (conflict) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }
  }

  // Mise à jour des champs utilisateur
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.locale !== undefined) updateData.locale = body.locale;

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        where: { isActive: true },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          post: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
  });

  // Réattribution de poste → nouveau mandat
  if (body.postId) {
    const config = await db.appConfig.findUnique({
      where: { id: "singleton" },
      select: { mandateDurationDays: true },
    });
    const durationDays = config?.mandateDurationDays ?? 730;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.mandate.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });

    await db.mandate.create({
      data: { userId: id, postId: body.postId, startDate, endDate, isActive: true },
    });
  }

  // Retirer le poste (fermer mandat actif sans en ouvrir un nouveau)
  if (body.postId === null) {
    await db.mandate.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });
  }

  return NextResponse.json(user);
}
