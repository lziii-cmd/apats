import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// GET /api/admin/membres — liste complète triée alphabétiquement
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const membres = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      isActive: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        where: { isActive: true },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          post: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
  });

  return NextResponse.json(membres);
}

// POST /api/admin/membres — créer un membre
// Body : { name, email, categoryId, postId? }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.categoryId) {
    return NextResponse.json(
      { error: "Les champs name, email et categoryId sont requis." },
      { status: 400 }
    );
  }

  // Vérifier unicité email
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
  }

  // Générer mot de passe temporaire aléatoire (8 chars hex)
  const tempPassword = crypto.randomBytes(4).toString("hex");
  const passwordHash = crypto
    .createHash("sha256")
    .update(tempPassword)
    .digest("hex");

  // Créer le membre
  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: "MEMBER",
      locale: body.locale ?? "fr",
      categoryId: body.categoryId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
    },
  });

  // Si un poste est fourni → créer le mandat
  let mandate = null;
  if (body.postId) {
    const config = await db.appConfig.findUnique({
      where: { id: "singleton" },
      select: { mandateDurationDays: true },
    });
    const durationDays = config?.mandateDurationDays ?? 730;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    mandate = await db.mandate.create({
      data: {
        userId: user.id,
        postId: body.postId,
        startDate,
        endDate,
        isActive: true,
      },
      include: { post: { select: { id: true, name: true } } },
    });
  }

  // Email de bienvenue — graceful degradation
  if (process.env.EMAIL_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.EMAIL_API_KEY);
      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "noreply@apats.ensmg",
        to: user.email,
        subject: "Bienvenue sur APATS — vos identifiants de connexion",
        html: `
          <p>Bonjour ${user.name},</p>
          <p>Votre compte a été créé sur l'application APATS de l'amicale de l'ENSMG.</p>
          <p><strong>Email :</strong> ${user.email}<br/>
          <strong>Mot de passe provisoire :</strong> ${tempPassword}</p>
          <p>Connectez-vous sur : <a href="${baseUrl}/login">${baseUrl}/login</a></p>
          <p>Pensez à changer votre mot de passe depuis votre profil.</p>
          <p>— L'équipe APATS</p>
        `,
      });
    } catch {
      // Ne pas bloquer si l'email échoue
    }
  }

  return NextResponse.json({ user, mandate, tempPassword }, { status: 201 });
}
