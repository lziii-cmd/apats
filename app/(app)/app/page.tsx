import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("app.dashboard");

  const [totalMembers, config] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        {t("welcome", { name: session.email.split("@")[0] })}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {t("academicYear")} : <span className="font-medium">{config?.academicYear ?? "—"}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget — Membres */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("totalMembers")}</p>
          <p className="text-3xl font-bold text-gray-800">{totalMembers}</p>
          <p className="text-xs text-gray-400 mt-1">{t("totalMembers")}</p>
        </div>

        {/* Widget — Cotisations en retard (F-011) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-60">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("cotisationsRetard")}</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
          <p className="text-xs text-gray-400 mt-1">{t("comingSoon")}</p>
        </div>

        {/* Widget — Prochaine réunion (F-012) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-60">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("prochaineReunion")}</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
          <p className="text-xs text-gray-400 mt-1">{t("comingSoon")}</p>
        </div>

        {/* Widget — Solde trésorerie (F-016) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-60">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("soldeTresorerie")}</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
          <p className="text-xs text-gray-400 mt-1">{t("comingSoon")}</p>
        </div>
      </div>

      {/* Dernières annonces (F-017) */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5 opacity-60">
        <p className="text-sm font-medium text-gray-700 mb-2">{t("dernieresAnnonces")}</p>
        <p className="text-xs text-gray-400">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
