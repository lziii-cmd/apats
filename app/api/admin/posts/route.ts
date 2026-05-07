import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/posts — liste tous les postes avec leurs permissions
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const posts = await db.post.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: {
        select: { feature: true, granted: true },
      },
      _count: { select: { mandates: true } },
    },
  });

  return NextResponse.json(posts);
}

// POST /api/admin/posts — créer un nouveau poste
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Le nom du poste est requis." }, { status: 400 });
  }

  const existing = await db.post.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Un poste avec ce nom existe déjà." }, { status: 409 });
  }

  const post = await db.post.create({ data: { name } });
  return NextResponse.json(post, { status: 201 });
}
