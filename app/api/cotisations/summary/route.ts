import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import { getExpectedMonths } from "@/lib/cotisations";

// GET /api/cotisations/summary?memberId=
// Retourne le résumé cotisations d'un membre.
// Un membre peut voir ses propres données.
// COTISATIONS_VIEW peut voir n'importe quel membre.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId") ?? session.userId;

  // Accès : soi-même OU permission COTISATIONS_VIEW OU ADMIN
  if (memberId !== session.userId) {
    const canView =
      session.role === "ADMIN" ||
      (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));
    if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const membre = await db.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
    },
  });
  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const config = await db.appConfig.findUnique({ where: { id: "singleton" } });
  const academicYear = config?.academicYear ?? "2025-2026";

  const [card, payments] = await Promise.all([
    db.memberCard.findUnique({
      where: { userId_academicYear: { userId: memberId, academicYear } },
    }),
    db.monthlyPayment.findMany({
      where: { userId: memberId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  const expectedMonths = getExpectedMonths(new Date(membre.createdAt));
  type PaymentRow = { status: string; year: number; month: number };
  const typedPayments = payments as unknown as PaymentRow[];
  const confirmedSet = new Set(
    typedPayments
      .filter((p) => p.status === "CONFIRMED")
      .map((p) => `${p.year}-${p.month}`)
  );
  const overdueMonths = expectedMonths.filter(
    ({ year, month }) => !confirmedSet.has(`${year}-${month}`)
  );

  return NextResponse.json({
    membre: {
      id: membre.id,
      name: membre.name,
      email: membre.email,
      createdAt: membre.createdAt,
      category: membre.category,
    },
    academicYear,
    cardPriceFcfa: config?.cardPriceFcfa ?? 5000,
    card,
    payments,
    expectedMonths,
    overdueMonths,
  });
}
