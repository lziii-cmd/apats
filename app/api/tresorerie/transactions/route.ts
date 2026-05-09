import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, TransactionCategory, TransactionType } from "@prisma/client";

const VALID_TYPES: TransactionType[] = ["INCOME", "EXPENSE"];
const VALID_CATEGORIES: TransactionCategory[] = ["EVENEMENT", "MATERIEL", "FRAIS_ADMIN", "AUTRE"];

// GET /api/tresorerie/transactions?year=2026&month=5&type=EXPENSE&category=MATERIEL
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const typeFilter = searchParams.get("type") as TransactionType | null;
  const categoryFilter = searchParams.get("category") as TransactionCategory | null;

  // Plage de dates
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
      where: {
        ...(dateFrom && dateTo ? { date: { gte: dateFrom, lte: dateTo } } : {}),
        ...(typeFilter && VALID_TYPES.includes(typeFilter) ? { type: typeFilter } : {}),
        ...(categoryFilter && VALID_CATEGORIES.includes(categoryFilter) ? { category: categoryFilter } : {}),
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    // Cotisations mensuelles (INCOME, catégorie COTISATION — auto)
    (typeFilter && typeFilter !== "INCOME") ? Promise.resolve([]) :
    db.monthlyPayment.findMany({
      where: {
        status: "CONFIRMED",
        ...(dateFrom && dateTo ? { updatedAt: { gte: dateFrom, lte: dateTo } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    // Cartes membres (INCOME, catégorie CARTE_MEMBRE — auto)
    (typeFilter && typeFilter !== "INCOME") ? Promise.resolve([]) :
    db.memberCard.findMany({
      where: {
        status: "CONFIRMED",
        ...(dateFrom && dateTo ? { updatedAt: { gte: dateFrom, lte: dateTo } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Skip cotisations si filtre catégorie est une catégorie manuelle
  const skipCotisations = categoryFilter && VALID_CATEGORIES.includes(categoryFilter);

  type TxRow = {
    id: string;
    date: string;
    type: "INCOME" | "EXPENSE";
    category: string;
    description: string;
    amount: number;
    source: "auto" | "manual";
    createdBy?: string;
  };

  const rows: TxRow[] = [];

  // Transactions manuelles
  for (const tx of manualTx) {
    rows.push({
      id: tx.id,
      date: tx.date.toISOString(),
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount: tx.amount,
      source: "manual",
      createdBy: tx.createdBy.name,
    });
  }

  if (!skipCotisations) {
    // Mensualités confirmées
    for (const p of monthlyPayments) {
      rows.push({
        id: `mp-${p.id}`,
        date: (p.confirmedAt ?? p.updatedAt).toISOString(),
        type: "INCOME",
        category: "COTISATION",
        description: `Cotisation ${p.month}/${p.year} — ${p.user.name}`,
        amount: p.amountPaid,
        source: "auto",
      });
    }

    // Cartes membres confirmées
    for (const c of memberCards) {
      rows.push({
        id: `mc-${c.id}`,
        date: (c.confirmedAt ?? c.updatedAt).toISOString(),
        type: "INCOME",
        category: "CARTE_MEMBRE",
        description: `Carte membre ${c.academicYear} — ${c.user.name}`,
        amount: c.pricePaid,
        source: "auto",
      });
    }
  }

  // Trier par date décroissante
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(rows);
}

// POST /api/tresorerie/transactions
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canManage =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_MANAGE" as Feature));
  if (!canManage) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  let body: { date?: string; type?: string; category?: string; description?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { date, type, category, description, amount } = body;

  if (!date || !type || !category || !description || amount == null) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type as TransactionType)) {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category as TransactionCategory)) {
    return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "Le montant doit être positif." }, { status: 400 });
  }

  const tx = await db.transaction.create({
    data: {
      date: new Date(date),
      type: type as TransactionType,
      category: category as TransactionCategory,
      description,
      amount,
      createdById: session.userId,
    },
  });

  return NextResponse.json(tx, { status: 201 });
}
