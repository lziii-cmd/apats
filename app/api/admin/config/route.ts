import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;
const VALID_LOCALES = ["fr", "en"];

// GET /api/admin/config
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const config = await db.appConfig.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });

  return NextResponse.json(config);
}

// PATCH /api/admin/config
// Body : { orgName?, defaultLocale?, academicYear? }
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body invalide." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.orgName !== undefined) {
    const name = String(body.orgName).trim();
    if (!name) {
      return NextResponse.json({ error: "Le nom de l'amicale ne peut pas être vide." }, { status: 400 });
    }
    data.orgName = name;
  }

  if (body.defaultLocale !== undefined) {
    if (!VALID_LOCALES.includes(body.defaultLocale)) {
      return NextResponse.json({ error: "Langue invalide." }, { status: 400 });
    }
    data.defaultLocale = body.defaultLocale;
  }

  if (body.academicYear !== undefined) {
    const year = String(body.academicYear).trim();
    if (!ACADEMIC_YEAR_REGEX.test(year)) {
      return NextResponse.json(
        { error: "Format d'année académique invalide. Attendu : AAAA-AAAA (ex: 2025-2026)." },
        { status: 400 }
      );
    }
    const [start, end] = year.split("-").map(Number);
    if (end !== start + 1) {
      return NextResponse.json(
        { error: "L'année de fin doit être l'année de début + 1." },
        { status: 400 }
      );
    }
    data.academicYear = year;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const config = await db.appConfig.upsert({
    where: { id: "singleton" },
    create: { ...data },
    update: { ...data },
  });

  return NextResponse.json(config);
}
