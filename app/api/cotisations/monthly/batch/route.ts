import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, PaymentMode } from "@prisma/client";

const VALID_MODES = ["CASH", "WAVE", "ORANGE_MONEY"];

// POST /api/cotisations/monthly/batch
// Déclare plusieurs mensualités en une seule opération (y compris mois futurs).
// CASH  → trésorier (COTISATIONS_MANAGE), memberId obligatoire, status CONFIRMED
// Wave/OM → membre pour lui-même, status PENDING, une seule notif trésorier
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: {
    memberId?: string;
    months?: { month: number; year: number }[];
    paymentMode?: string;
    paymentRef?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { months, paymentMode, paymentRef } = body;
  let { memberId } = body;

  if (!months || !Array.isArray(months) || months.length === 0) {
    return NextResponse.json({ error: "months est requis (tableau non vide)." }, { status: 400 });
  }
  if (months.length > 12) {
    return NextResponse.json({ error: "Maximum 12 mois par déclaration." }, { status: 400 });
  }
  if (!paymentMode || !VALID_MODES.includes(paymentMode)) {
    return NextResponse.json({ error: "Mode de paiement invalide." }, { status: 400 });
  }

  for (const { month, year } of months) {
    if (!month || month < 1 || month > 12) {
      return NextResponse.json({ error: `Mois invalide : ${month}.` }, { status: 400 });
    }
    if (!year || year < 2020 || year > 2099) {
      return NextResponse.json({ error: `Année invalide : ${year}.` }, { status: 400 });
    }
  }

  const isCash = paymentMode === "CASH";

  if (isCash) {
    const canManage =
      session.role === "ADMIN" ||
      (await hasPermission(session.userId, "COTISATIONS_MANAGE" as Feature));
    if (!canManage) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    if (!memberId) return NextResponse.json({ error: "memberId requis pour un paiement cash." }, { status: 400 });
  } else {
    memberId = session.userId;
  }

  const membre = await db.user.findUnique({
    where: { id: memberId, role: "MEMBER" },
    select: { id: true, category: { select: { monthlyFee: true } } },
  });
  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const amountDue = membre.category?.monthlyFee ?? 0;

  // Vérifier les doublons existants
  const existingPayments = await db.monthlyPayment.findMany({
    where: {
      userId: memberId!,
      OR: months.map(({ month, year }) => ({ month, year })),
    },
    select: { month: true, year: true },
  });

  if (existingPayments.length > 0) {
    const conflicts = existingPayments
      .map(({ month, year }) => `${String(month).padStart(2, "0")}/${year}`)
      .join(", ");
    return NextResponse.json(
      { error: `Paiement déjà existant pour : ${conflicts}.` },
      { status: 409 }
    );
  }

  const now = new Date();
  const payments = await db.$transaction(
    months.map(({ month, year }) =>
      db.monthlyPayment.create({
        data: {
          userId: memberId!,
          month,
          year,
          amountDue,
          amountPaid: amountDue,
          paymentMode: paymentMode as PaymentMode,
          paymentRef: paymentRef ?? null,
          status: isCash ? "CONFIRMED" : "PENDING",
          confirmedBy: isCash ? session.userId : null,
          confirmedAt: isCash ? now : null,
        },
      })
    )
  );

  // Pour Wave/OM : une seule notification groupée
  if (!isCash) {
    const monthsList = months
      .map(({ month, year }) => `${String(month).padStart(2, "0")}/${year}`)
      .join(", ");
    const notifBody = `Paiement ${paymentMode === "WAVE" ? "Wave" : "Orange Money"} en attente pour ${months.length} mois : ${monthsList}.`;

    const treasurers = await db.user.findMany({
      where: { role: "MEMBER", mandates: { some: { isActive: true } } },
      select: { id: true, mandates: { where: { isActive: true }, select: { postId: true } } },
    });

    for (const t of treasurers) {
      for (const m of t.mandates) {
        const hasPerm = await db.permission.findFirst({
          where: { postId: m.postId, feature: "COTISATIONS_CONFIRM" as Feature, granted: true },
        });
        if (hasPerm) {
          await db.notification.create({
            data: { userId: t.id, type: "cotisation_pending", title: "Paiements à confirmer", body: notifBody },
          });
          break;
        }
      }
    }

    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      await db.notification.create({
        data: { userId: admin.id, type: "cotisation_pending", title: "Paiements à confirmer", body: notifBody },
      });
    }
  }

  return NextResponse.json(payments, { status: 201 });
}
