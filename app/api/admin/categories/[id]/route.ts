import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/categories/[id] — modifier nom ou montant
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide." }, { status: 400 });

  const existing = await db.memberCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const conflict = await db.memberCategory.findUnique({ where: { name: body.name } });
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "Ce nom est déjà utilisé." }, { status: 409 });
    }
    updateData.name = body.name.trim();
  }

  if (body.monthlyFee !== undefined) {
    const fee = parseInt(body.monthlyFee, 10);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json({ error: "monthlyFee doit être un entier positif." }, { status: 400 });
    }
    updateData.monthlyFee = fee;
  }

  const category = await db.memberCategory.update({
    where: { id },
    data: updateData,
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(category);
}

// DELETE /api/admin/categories/[id]
// Bloqué si des membres utilisent encore cette catégorie
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  const category = await db.memberCategory.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!category) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });

  if (category._count.users > 0) {
    return NextResponse.json(
      { error: `Impossible : ${category._count.users} membre(s) utilisent cette catégorie.` },
      { status: 409 }
    );
  }

  await db.memberCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
