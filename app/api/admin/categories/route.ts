import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/categories
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const categories = await db.memberCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(categories);
}

// POST /api/admin/categories — créer une catégorie
// Body : { name, monthlyFee }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || body?.monthlyFee === undefined) {
    return NextResponse.json({ error: "Les champs name et monthlyFee sont requis." }, { status: 400 });
  }

  const fee = parseInt(body.monthlyFee, 10);
  if (isNaN(fee) || fee < 0) {
    return NextResponse.json({ error: "monthlyFee doit être un entier positif." }, { status: 400 });
  }

  const existing = await db.memberCategory.findUnique({ where: { name: body.name } });
  if (existing) {
    return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà." }, { status: 409 });
  }

  const category = await db.memberCategory.create({
    data: { name: body.name.trim(), monthlyFee: fee },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(category, { status: 201 });
}
