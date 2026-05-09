import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// DELETE /api/tresorerie/transactions/[id]
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

  const tx = await db.transaction.findUnique({ where: { id } });
  if (!tx) return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 });

  await db.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
