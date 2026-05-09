import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import * as XLSX from "xlsx";


// GET /api/tresorerie/export?year=2026&month=5
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canExport =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_EXPORT" as Feature));
  if (!canExport) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (year && month) {
    dateFrom = new Date(year, month - 1, 1);
    dateTo = new Date(year, month, 0, 23, 59, 59, 999);
  } else if (year) {
    dateFrom = new Date(year, 0, 1);
    dateTo = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  const [manualTx, monthlyPayments, memberCards] = await Promise.all([
    db.transaction.findMany({
      where: dateFrom && dateTo ? { date: { gte: dateFrom, lte: dateTo } } : {},
      include: {
        createdBy: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.monthlyPayment.findMany({
      where: {
        status: "CONFIRMED",
        ...(dateFrom && dateTo ? { updatedAt: { gte: dateFrom, lte: dateTo } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    db.memberCard.findMany({
      where: {
        status: "CONFIRMED",
        ...(dateFrom && dateTo ? { updatedAt: { gte: dateFrom, lte: dateTo } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  type Row = {
    Date: string;
    Type: string;
    Catégorie: string;
    Description: string;
    "Entrée (FCFA)": number | "";
    "Sortie (FCFA)": number | "";
    Source: string;
  };

  const rows: Row[] = [];

  for (const p of monthlyPayments) {
    rows.push({
      Date: (p.confirmedAt ?? p.updatedAt).toLocaleDateString("fr-FR"),
      Type: "Entrée",
      Catégorie: "Cotisation mensuelle",
      Description: `Cotisation ${p.month}/${p.year} — ${p.user.name}`,
      "Entrée (FCFA)": p.amountPaid,
      "Sortie (FCFA)": "",
      Source: "Automatique",
    });
  }

  for (const c of memberCards) {
    rows.push({
      Date: (c.confirmedAt ?? c.updatedAt).toLocaleDateString("fr-FR"),
      Type: "Entrée",
      Catégorie: "Carte de membre",
      Description: `Carte membre ${c.academicYear} — ${c.user.name}`,
      "Entrée (FCFA)": c.pricePaid,
      "Sortie (FCFA)": "",
      Source: "Automatique",
    });
  }

  for (const tx of manualTx) {
    rows.push({
      Date: tx.date.toLocaleDateString("fr-FR"),
      Type: tx.type === "INCOME" ? "Entrée" : "Sortie",
      Catégorie: tx.category.name,
      Description: tx.description,
      "Entrée (FCFA)": tx.type === "INCOME" ? tx.amount : "",
      "Sortie (FCFA)": tx.type === "EXPENSE" ? tx.amount : "",
      Source: tx.createdBy.name,
    });
  }

  // Trier par date
  rows.sort((a, b) => {
    const da = a.Date.split("/").reverse().join("-");
    const db2 = b.Date.split("/").reverse().join("-");
    return da.localeCompare(db2);
  });

  const totalIncome = rows.reduce((s, r) => s + (r["Entrée (FCFA)"] || 0), 0);
  const totalExpense = rows.reduce((s, r) => s + (r["Sortie (FCFA)"] || 0), 0);

  rows.push({
    Date: "",
    Type: "",
    Catégorie: "TOTAL",
    Description: "",
    "Entrée (FCFA)": totalIncome,
    "Sortie (FCFA)": totalExpense,
    Source: "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trésorerie");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const periodLabel = year && month ? `${month}-${year}` : year ? `${year}` : "complet";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tresorerie-${periodLabel}.xlsx"`,
    },
  });
}
