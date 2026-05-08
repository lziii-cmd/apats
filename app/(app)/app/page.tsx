import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Feature } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("app.dashboard");

  const canViewCotisations =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));

  const [totalMembers, config, cotisationStats] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", isActive: true } }),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
    canViewCotisations
      ? db.user.findMany({
          where: { role: "MEMBER" },
          select: {
            createdAt: true,
            monthlyPayments: {
              where: { status: "CONFIRMED" },
              select: { year: true, month: true },
            },
          },
        })
      : null,
  ]);

  // Calcul du nombre de membres avec au moins un mois en retard
  let overdueCount: number | null = null;
  if (cotisationStats) {
    const now = new Date();
    overdueCount = cotisationStats.filter((m) => {
      const confirmedSet = new Set(
        m.monthlyPayments.map((p: { year: number; month: number }) => `${p.year}-${p.month}`)
      );
      const start = new Date(m.createdAt);
      // Mois depuis l'inscription jusqu'au mois précédent inclus
      let cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const limit = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cur < limit) {
        if (!confirmedSet.has(`${cur.getFullYear()}-${cur.getMonth() + 1}`)) return true;
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      return false;
    }).length;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        {t("welcome", { name: session.email.split("@")[0] })}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {t("academicYear")} : <span className="font-medium">{config?.academicYear ?? "—"}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget — Membres actifs */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("totalMembers")}</p>
          <p className="text-3xl font-bold text-gray-800">{totalMembers}</p>
          <p className="text-xs text-gray-400 mt-1">{t("activeMembers")}</p>
        </div>

        {/* Widget — Cotisations en retard */}
        {canViewCotisations ? (
          <div className={`bg-white rounded-lg border p-5 ${overdueCount && overdueCount > 0 ? "border-red-200" : "border-gray-200"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("cotisationsRetard")}</p>
            <p className={`text-3xl font-bold ${overdueCount && overdueCount > 0 ? "text-red-600" : "text-gray-800"}`}>
              {overdueCount ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">{t("membersWithOverdue")}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-40">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("cotisationsRetard")}</p>
            <p className="text-2xl font-bold text-gray-300">—</p>
          </div>
        )}

        {/* Widget — Prochaine réunion (F-012) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-40">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("prochaineReunion")}</p>
          <p className="text-2xl font-bold text-gray-300">—</p>
        </div>

        {/* Widget — Solde trésorerie (F-016) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-40">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("soldeTresorerie")}</p>
          <p className="text-2xl font-bold text-gray-300">—</p>
        </div>
      </div>

      {/* Dernières annonces (F-017) */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5 opacity-40">
        <p className="text-sm font-medium text-gray-700 mb-2">{t("dernieresAnnonces")}</p>
        <p className="text-xs text-gray-400">{t("noAnnouncements")}</p>
      </div>
    </div>
  );
}
