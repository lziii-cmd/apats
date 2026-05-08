import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shouldEscalate, getExpectedMonths } from "@/lib/cotisations";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cotisations
 * Protégé par Authorization: Bearer <CRON_SECRET>.
 * Appelé quotidiennement.
 *
 * Actions :
 * 1. Rappels d'escalade pour paiements Wave/OM PENDING : J+3, J+7, J+14, J+30
 * 2. Rappels automatiques aux membres en retard (cotisation mensuelle)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();
  let escalateCount = 0;
  let reminderCount = 0;

  // 1. Escalade Wave/OM en attente
  const pendingPayments = await db.monthlyPayment.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true } } },
  });
  const pendingCards = await db.memberCard.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true } } },
  });

  // Récupérer les admins et trésoriers pour les notifs d'escalade
  type AdminRow = { id: string };
  type TreasurerRow = { post: { mandates: { userId: string }[] } };
  type MemberCronRow = { id: string; createdAt: Date; monthlyPayments: { year: number; month: number }[] };

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }) as unknown as AdminRow[];
  const treasurers = await db.permission.findMany({
    where: { feature: "COTISATIONS_CONFIRM", granted: true },
    include: { post: { include: { mandates: { where: { isActive: true }, select: { userId: true } } } } },
  }) as unknown as TreasurerRow[];
  const treasurerIds = [...new Set(treasurers.flatMap((p) => p.post.mandates.map((m) => m.userId)))];
  const confirmTargets = [...new Set([...admins.map((a) => a.id), ...treasurerIds])];

  for (const p of pendingPayments) {
    if (shouldEscalate(new Date(p.createdAt), now)) {
      const days = Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      for (const uid of confirmTargets) {
        await db.notification.create({
          data: {
            userId: uid,
            type: "cotisation_escalade",
            title: `Paiement en attente depuis J+${days}`,
            body: `Le paiement Wave/OM de ${p.user.name} pour ${p.month}/${p.year} est en attente depuis ${days} jours.`,
          },
        });
        escalateCount++;
      }
    }
  }

  for (const c of pendingCards) {
    if (shouldEscalate(new Date(c.createdAt), now)) {
      const days = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      for (const uid of confirmTargets) {
        await db.notification.create({
          data: {
            userId: uid,
            type: "card_escalade",
            title: `Carte en attente depuis J+${days}`,
            body: `La carte de membre de ${c.user.name} est en attente depuis ${days} jours.`,
          },
        });
        escalateCount++;
      }
    }
  }

  // 2. Rappels aux membres en retard
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      createdAt: true,
      monthlyPayments: {
        where: { status: "CONFIRMED" },
        select: { year: true, month: true },
      },
    },
  }) as unknown as MemberCronRow[];

  for (const member of members) {
    const expected = getExpectedMonths(new Date(member.createdAt), now);
    const confirmedSet = new Set(member.monthlyPayments.map((p) => `${p.year}-${p.month}`));
    const overdue = expected.filter(({ year, month }) => !confirmedSet.has(`${year}-${month}`));

    if (overdue.length > 0) {
      // Un seul rappel groupé par membre
      const latestOverdue = overdue[overdue.length - 1];
      await db.notification.create({
        data: {
          userId: member.id,
          type: "cotisation_reminder",
          title: "Cotisation en retard",
          body: `Vous avez ${overdue.length} mois de cotisation en retard. Dernier mois impayé : ${latestOverdue.month}/${latestOverdue.year}.`,
        },
      });
      reminderCount++;
    }
  }

  return NextResponse.json({
    escalateNotifications: escalateCount,
    reminderNotifications: reminderCount,
    runAt: now.toISOString(),
  });
}
