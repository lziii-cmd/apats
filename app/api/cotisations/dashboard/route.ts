import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import { getExpectedMonths, collectionRate } from "@/lib/cotisations";

// GET /api/cotisations/dashboard
// Réservé COTISATIONS_VIEW ou ADMIN.
// Retourne les stats globales + paiements en attente.
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  type MemberRow = {
    id: string; createdAt: Date; category: { monthlyFee: number } | null;
    monthlyPayments: { year: number; month: number; amountPaid: number }[];
  };

  const [config, members, pendingMonthly, pendingCards] = await Promise.all([
    db.appConfig.findUnique({ where: { id: "singleton" } }),
    db.user.findMany({
      where: { role: "MEMBER" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        category: { select: { monthlyFee: true } },
        monthlyPayments: {
          where: { status: "CONFIRMED" },
          select: { year: true, month: true, amountPaid: true },
        },
      },
    }) as unknown as Promise<MemberRow[]>,
    db.monthlyPayment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.memberCard.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const academicYear = config?.academicYear ?? "2025-2026";

  // Calcul des stats globales mensuelles
  let totalExpected = 0;
  let totalConfirmed = 0;
  let overdueCount = 0;

  for (const m of members) {
    const expected = getExpectedMonths(new Date(m.createdAt));
    const confirmedSet = new Set(
      m.monthlyPayments.map((p) => `${p.year}-${p.month}`)
    );

    totalExpected += expected.length;
    totalConfirmed += expected.filter(({ year, month }) =>
      confirmedSet.has(`${year}-${month}`)
    ).length;

    const hasOverdue = expected.some(
      ({ year, month }) => !confirmedSet.has(`${year}-${month}`)
    );
    if (hasOverdue) overdueCount++;
  }

  // Stats cartes pour l'année académique courante
  const cardsCurrentYear = await db.memberCard.findMany({
    where: { academicYear },
    select: { status: true },
  }) as unknown as { status: string }[];
  const cardTaken = cardsCurrentYear.filter((c) => c.status === "CONFIRMED").length;
  const cardPending = cardsCurrentYear.filter((c) => c.status === "PENDING").length;

  // Montant total collecté (cotisations mensuelles confirmées toutes années)
  const confirmedPayments = await db.monthlyPayment.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amountPaid: true },
  });
  const totalAmount = confirmedPayments._sum.amountPaid ?? 0;

  return NextResponse.json({
    academicYear,
    stats: {
      totalMembers: members.length,
      totalExpected,
      totalConfirmed,
      rate: collectionRate(totalExpected, totalConfirmed),
      overdueCount,
      cardTaken,
      cardPending,
      totalAmount,
    },
    pendingMonthly,
    pendingCards,
  });
}
