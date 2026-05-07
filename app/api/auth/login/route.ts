import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { LOCALE_COOKIE } from "@/i18n/config";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: body.email } });

  if (!user) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const { valid, needsUpgrade, newHash } = await verifyPassword(body.password, user.passwordHash);

  if (!valid) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  if (needsUpgrade && newHash) {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  }

  resetRateLimit(ip);

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });

  const redirect = user.role === "ADMIN" ? "/admin/admin" : "/app/app";

  const response = NextResponse.json({ redirect });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  });

  // Poser le cookie de locale depuis les préférences de l'utilisateur
  response.cookies.set(LOCALE_COOKIE, user.locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
