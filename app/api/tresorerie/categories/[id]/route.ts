import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// DELETE /api/tresorerie/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canManage =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_MANAGE" as Feature));
  if (!canManage) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  const cat = await db.txCategory.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });
  if (!cat) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  if (cat.isSystem) return NextResponse.json({ error: "Les catégories système ne peuvent pas être supprimées." }, { status: 403 });
  if (cat._count.transactions > 0) return NextResponse.json({ error: "Des transactions utilisent cette catégorie." }, { status: 409 });

  await db.txCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
