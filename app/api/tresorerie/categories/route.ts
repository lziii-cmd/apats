import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, TxCatType } from "@prisma/client";

const VALID_TYPES: TxCatType[] = ["INCOME", "EXPENSE", "BOTH"];

// GET /api/tresorerie/categories?type=INCOME
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_VIEW" as Feature));
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type") as TxCatType | null;

  const categories = await db.txCategory.findMany({
    where: typeFilter && VALID_TYPES.includes(typeFilter)
      ? { OR: [{ type: typeFilter }, { type: "BOTH" }] }
      : {},
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

// POST /api/tresorerie/categories
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canManage =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_MANAGE" as Feature));
  if (!canManage) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  let body: { name?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { name, type } = body;
  if (!name || !type) return NextResponse.json({ error: "name et type sont requis." }, { status: 400 });
  if (!VALID_TYPES.includes(type as TxCatType)) return NextResponse.json({ error: "Type invalide." }, { status: 400 });

  const trimmed = name.trim();
  if (!trimmed) return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });

  const existing = await db.txCategory.findUnique({ where: { name: trimmed } });
  if (existing) return NextResponse.json({ error: "Cette catégorie existe déjà." }, { status: 409 });

  const cat = await db.txCategory.create({
    data: { name: trimmed, type: type as TxCatType },
  });

  return NextResponse.json(cat, { status: 201 });
}
