import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// PATCH /api/cotisations/monthly/[id]
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

  const payment = await db.monthlyPayment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Ce paiement n'est plus en attente." }, { status: 409 });
  }

  if (body.action === "reject" && !body.rejectReason) {
    return NextResponse.json({ error: "Un motif de rejet est requis." }, { status: 400 });
  }

  const updated = await db.monthlyPayment.update({
    where: { id },
    data: {
      status: body.action === "confirm" ? "CONFIRMED" : "REJECTED",
      confirmedBy: session.userId,
      confirmedAt: new Date(),
      rejectReason: body.action === "reject" ? (body.rejectReason ?? null) : null,
    },
  });

  // Notifier le membre du résultat
  const label = body.action === "confirm" ? "confirmé" : "rejeté";
  const body_text =
    body.action === "confirm"
      ? `Votre paiement de ${payment.month}/${payment.year} a été confirmé.`
      : `Votre paiement de ${payment.month}/${payment.year} a été rejeté. Motif : ${body.rejectReason}`;

  await db.notification.create({
    data: {
      userId: payment.userId,
      type: `cotisation_${label}`,
      title: `Paiement ${label}`,
      body: body_text,
    },
  });

  return NextResponse.json(updated);
}
