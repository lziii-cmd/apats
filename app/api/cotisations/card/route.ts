import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, PaymentMode } from "@prisma/client";

const VALID_MODES = ["CASH", "WAVE", "ORANGE_MONEY"];

// POST /api/cotisations/card
// CASH → réservé trésorier, memberId requis, CONFIRMED d'office
// Wave/OM → membre pour lui-même, PENDING → notif trésorier
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: {
    memberId?: string;
    academicYear?: string;
    paymentMode?: string;
    paymentRef?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { academicYear, paymentMode, paymentRef } = body;
  let { memberId } = body;

  if (!academicYear || !paymentMode) {
    return NextResponse.json({ error: "academicYear et paymentMode sont requis." }, { status: 400 });
  }
  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    return NextResponse.json({ error: "Format academicYear invalide (AAAA-AAAA)." }, { status: 400 });
  }
  if (!VALID_MODES.includes(paymentMode)) {
    return NextResponse.json({ error: "Mode de paiement invalide." }, { status: 400 });
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
    select: { id: true },
  });
  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const config = await db.appConfig.findUnique({ where: { id: "singleton" } });
  const pricePaid = config?.cardPriceFcfa ?? 5000;

  const existing = await db.memberCard.findUnique({
    where: { userId_academicYear: { userId: memberId!, academicYear } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Une carte existe déjà pour cette année académique." },
      { status: 409 }
    );
  }

  const card = await db.memberCard.create({
    data: {
      userId: memberId!,
      academicYear,
      pricePaid,
      paymentMode: paymentMode as PaymentMode,
      paymentRef: paymentRef ?? null,
      status: isCash ? "CONFIRMED" : "PENDING",
      confirmedBy: isCash ? session.userId : null,
      confirmedAt: isCash ? new Date() : null,
    },
  });

  if (!isCash) {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: "cotisation_pending",
          title: "Carte à confirmer",
          body: `Une carte de membre ${academicYear} est en attente de confirmation.`,
        },
      });
    }
  }

  return NextResponse.json(card, { status: 201 });
}
