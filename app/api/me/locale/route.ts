import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

// PATCH /api/me/locale — changer la langue de l'utilisateur connecté
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const locale = body?.locale as Locale;

  if (!locale || !LOCALES.includes(locale)) {
    return NextResponse.json(
      { error: `Locale invalide. Valeurs acceptées : ${LOCALES.join(", ")}` },
      { status: 400 }
    );
  }

  // Persister en DB
  await db.user.update({
    where: { id: session.userId },
    data: { locale },
  });

  // Mettre à jour le cookie (non httpOnly pour être lisible côté client)
  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });

  return response;
}
