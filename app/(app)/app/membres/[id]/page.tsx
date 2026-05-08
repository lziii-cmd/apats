import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";

export default async function MembreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_VIEW_DETAIL" as never));
  if (!allowed) redirect("/app");

  const { id } = await params;

  const membre = await db.user.findUnique({
    where: { id, role: "MEMBER" },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          isActive: true,
          post: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!membre) notFound();

  const t = await getTranslations("app.membres");

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/app/membres" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        {t("backToList")}
      </Link>

      <h1 className="text-xl font-semibold mb-1">{membre.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{membre.email}</p>

      {/* Infos personnelles */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">{t("category")}</dt>
            <dd className="font-medium mt-0.5">{membre.category?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">{t("locale")}</dt>
            <dd className="font-medium mt-0.5">{membre.locale === "fr" ? "Français" : "English"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">{t("memberSince")}</dt>
            <dd className="font-medium mt-0.5">
              {new Date(membre.createdAt).toLocaleDateString("fr-FR")}
            </dd>
          </div>
          {membre.category && (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Cotisation mensuelle</dt>
              <dd className="font-medium mt-0.5">
                {membre.category.monthlyFee.toLocaleString("fr-FR")} FCFA
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Historique mandats */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">{t("mandateHistory")}</h2>
        {membre.mandates.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noMandate")}</p>
        ) : (
          <div className="space-y-2">
            {membre.mandates.map((mandat) => (
              <div
                key={mandat.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium">{mandat.post.name}</span>
                <div className="text-right text-gray-500">
                  <span className="tabular-nums">
                    {new Date(mandat.startDate).toLocaleDateString("fr-FR")} →{" "}
                    {new Date(mandat.endDate).toLocaleDateString("fr-FR")}
                  </span>
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      mandat.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {mandat.isActive ? t("active") : t("inactive")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique cotisations — placeholder F-011 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-60">
        <h2 className="text-sm font-medium text-gray-700 mb-2">{t("cotisationHistory")}</h2>
        <p className="text-xs text-gray-400">{t("cotisationHistorySoon")}</p>
      </div>
    </div>
  );
}
