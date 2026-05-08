import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, PaymentMode } from "@prisma/client";

const VALID_MODES = ["CASH", "WAVE", "ORANGE_MONEY"];

// POST /api/cotisations/monthly
// CASH  → réservé au trésorier (COTISATIONS_MANAGE), memberId obligatoire, status CONFIRMED
// Wave/OM → membre pour lui-même, status PENDING → notif trésorier
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: {
    memberId?: string;
    month?: number;
    year?: number;
    paymentMode?: string;
    paymentRef?: string;
    amountPaid?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { month, year, paymentMode, paymentRef, amountPaid } = body;
  let { memberId } = body;

  if (!month || !year || !paymentMode) {
    return NextResponse.json({ error: "month, year et paymentMode sont requis." }, { status: 400 });
  }
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Mois invalide (1–12)." }, { status: 400 });
  }
  if (!VALID_MODES.includes(paymentMode)) {
    return NextResponse.json({ error: "Mode de paiement invalide." }, { status: 400 });
  }

  const isCash = paymentMode === "CASH";

  if (isCash) {
    // Seul un ADMIN ou un trésorier (COTISATIONS_MANAGE) peut enregistrer un paiement cash
    const canManage =
      session.role === "ADMIN" ||
      (await hasPermission(session.userId, "COTISATIONS_MANAGE" as Feature));
    if (!canManage) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    if (!memberId) return NextResponse.json({ error: "memberId requis pour un paiement cash." }, { status: 400 });
  } else {
    // Wave/OM : le membre déclare pour lui-même
    memberId = session.userId;
  }

  // Vérifier que le membre existe
  const membre = await db.user.findUnique({
    where: { id: memberId, role: "MEMBER" },
    select: { id: true, category: { select: { monthlyFee: true } } },
  });
  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const amountDue = membre.category?.monthlyFee ?? 0;
  const finalAmountPaid = amountPaid ?? amountDue;

  // Vérifier l'unicité (un seul paiement par membre/mois/année)
  const existing = await db.monthlyPayment.findUnique({
    where: { userId_year_month: { userId: memberId!, year, month } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un paiement existe déjà pour ce mois." },
      { status: 409 }
    );
  }

  const payment = await db.monthlyPayment.create({
    data: {
      userId: memberId!,
      month,
      year,
      amountDue,
      amountPaid: finalAmountPaid,
      paymentMode: paymentMode as PaymentMode,
      paymentRef: paymentRef ?? null,
      status: isCash ? "CONFIRMED" : "PENDING",
      confirmedBy: isCash ? session.userId : null,
      confirmedAt: isCash ? new Date() : null,
    },
  });

  // Pour Wave/OM : notifier tous les trésoriers (COTISATIONS_CONFIRM)
  if (!isCash) {
    const treasurers = await db.user.findMany({
      where: {
        role: "MEMBER",
        mandates: { some: { isActive: true } },
      },
      select: { id: true, mandates: { where: { isActive: true }, select: { postId: true } } },
    });

    // Filtrer ceux qui ont COTISATIONS_CONFIRM
    for (const t of treasurers) {
      for (const m of t.mandates) {
        const hasPerm = await db.permission.findFirst({
          where: { postId: m.postId, feature: "COTISATIONS_CONFIRM" as Feature, granted: true },
        });
        if (hasPerm) {
          await db.notification.create({
            data: {
              userId: t.id,
              type: "cotisation_pending",
              title: "Paiement à confirmer",
              body: `Un paiement ${paymentMode === "WAVE" ? "Wave" : "Orange Money"} est en attente de confirmation pour ${month}/${year}.`,
            },
          });
          break;
        }
      }
    }

    // Notifier aussi les admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: "cotisation_pending",
          title: "Paiement à confirmer",
          body: `Un paiement ${paymentMode === "WAVE" ? "Wave" : "Orange Money"} est en attente de confirmation pour ${month}/${year}.`,
        },
      });
    }
  }

  return NextResponse.json(payment, { status: 201 });
}
