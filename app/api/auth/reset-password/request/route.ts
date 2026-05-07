import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: body.email } });

  // Toujours répondre OK pour ne pas révéler l'existence d'un compte
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + TOKEN_TTL_MS);

  await db.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  // Envoi email — graceful degradation si EMAIL_API_KEY absent
  if (process.env.EMAIL_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.EMAIL_API_KEY);

      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "noreply@apats.ensmg",
        to: user.email,
        subject: "Réinitialisation de votre mot de passe — APATS",
        html: `
          <p>Bonjour ${user.name},</p>
          <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Ce lien est valable <strong>1 heure</strong>.</p>
          <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          <p>— L'équipe APATS</p>
        `,
      });
    } catch {
      // Ne pas bloquer la réponse si l'email échoue
    }
  }

  return NextResponse.json({ success: true });
}
