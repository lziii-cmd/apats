import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/mandates
 * Protégé par le header Authorization: Bearer <CRON_SECRET>.
 * Appelé quotidiennement (vercel.json ou plateforme équivalente).
 *
 * Actions :
 * 1. Expire les mandats dont endDate < now (isActive → false)
 * 2. Crée une notification in-app pour chaque mandat expirant dans 30 jours
 */
export async function GET(req: NextRequest) {
  // Vérification du secret — protection contre les appels non autorisés
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Expirer les mandats échus
  const expired = await db.mandate.updateMany({
    where: { isActive: true, endDate: { lt: now } },
    data: { isActive: false },
  });

  // 2. Détecter les mandats expirant dans exactement 30 jours (±12h)
  const soon = new Date(in30Days.getTime() - 12 * 60 * 60 * 1000);
  const soonEnd = new Date(in30Days.getTime() + 12 * 60 * 60 * 1000);

  const expiringSoon = await db.mandate.findMany({
    where: {
      isActive: true,
      endDate: { gte: soon, lte: soonEnd },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      post: { select: { name: true } },
    },
  });

  // 3. Créer les notifications in-app (admin + membre concerné)
  const adminUsers = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  let notifCount = 0;
  for (const mandate of expiringSoon) {
    const targets = [
      mandate.user.id,
      ...adminUsers.map((a) => a.id),
    ];

    // Dédupliquer si l'admin est aussi le membre (cas théorique)
    const uniqueTargets = [...new Set(targets)];

    for (const userId of uniqueTargets) {
      await db.notification.create({
        data: {
          userId,
          type: "mandate_expiry",
          title: "Mandat bientôt expiré",
          body: `Le mandat de ${mandate.user.name} (${mandate.post.name}) expire le ${mandate.endDate.toLocaleDateString("fr-FR")}.`,
        },
      });
      notifCount++;
    }

    // 4. Email de rappel (graceful degradation si Resend non configuré)
    if (process.env.EMAIL_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.EMAIL_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "noreply@apats.ensmg",
          to: adminUsers.map((a) => a.id), // emails admins récupérés séparément si besoin
          subject: `⚠️ Mandat expirant — ${mandate.user.name}`,
          html: `<p>Le mandat de <strong>${mandate.user.name}</strong> pour le poste <strong>${mandate.post.name}</strong> expire le <strong>${mandate.endDate.toLocaleDateString("fr-FR")}</strong>.</p><p>Connectez-vous à l'espace admin pour le renouveler.</p>`,
        });
      } catch {
        // Ne pas faire échouer le cron si l'email échoue
      }
    }
  }

  return NextResponse.json({
    expired: expired.count,
    expiringSoon: expiringSoon.length,
    notificationsCreated: notifCount,
    runAt: now.toISOString(),
  });
}
