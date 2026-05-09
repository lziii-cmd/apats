import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";

// PATCH /api/me/password — changer son propre mot de passe
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { currentPassword, newPassword } = body ?? {};

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Le mot de passe actuel est requis." },
      { status: 400 }
    );
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  const { valid } = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect." },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
