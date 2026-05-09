import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";

// GET /api/tresorerie
// Résumé financier : total entrées, total sorties, solde
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [monthlyPayments, memberCards, transactions] = await Promise.all([
    db.monthlyPayment.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { amountPaid: true },
    }),
    db.memberCard.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { pricePaid: true },
    }),
    db.transaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
  ]);

  const cotisationsTotal = (monthlyPayments._sum.amountPaid ?? 0) + (memberCards._sum.pricePaid ?? 0);

  const manualIncome = transactions.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const manualExpense = transactions.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;

  const totalIncome = cotisationsTotal + manualIncome;
  const totalExpense = manualExpense;
  const balance = totalIncome - totalExpense;

  return NextResponse.json({ totalIncome, totalExpense, balance });
}
