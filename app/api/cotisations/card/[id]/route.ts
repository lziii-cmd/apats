import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// PATCH /api/cotisations/card/[id]
// body: { action: "confirm" | "reject", rejectReason?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canConfirm =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_CONFIRM" as Feature));
  if (!canConfirm) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;

  let body: { action?: string; rejectReason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (body.action !== "confirm" && body.action !== "reject") {
    return NextResponse.json({ error: "action doit être 'confirm' ou 'reject'." }, { status: 400 });
  }
  if (body.action === "reject" && !body.rejectReason) {
    return NextResponse.json({ error: "Un motif de rejet est requis." }, { status: 400 });
  }

  const card = await db.memberCard.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  if (card.status !== "PENDING") {
    return NextResponse.json({ error: "Cette carte n'est plus en attente." }, { status: 409 });
  }

  const updated = await db.memberCard.update({
    where: { id },
    data: {
      status: body.action === "confirm" ? "CONFIRMED" : "REJECTED",
      confirmedBy: session.userId,
      confirmedAt: new Date(),
      rejectReason: body.action === "reject" ? (body.rejectReason ?? null) : null,
    },
  });

  const label = body.action === "confirm" ? "confirmée" : "rejetée";
  const bodyText =
    body.action === "confirm"
      ? `Votre carte de membre ${card.academicYear} a été confirmée.`
      : `Votre carte de membre ${card.academicYear} a été rejetée. Motif : ${body.rejectReason}`;

  await db.notification.create({
    data: {
      userId: card.userId,
      type: `card_${label}`,
      title: `Carte ${label}`,
      body: bodyText,
    },
  });

  return NextResponse.json(updated);
}
