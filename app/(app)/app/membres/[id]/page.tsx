import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import { getExpectedMonths } from "@/lib/cotisations";

const MONTH_NAMES_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

export default async function MembreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_VIEW_DETAIL" as Feature));
  if (!allowed) redirect("/app");

  const { id } = await params;

  const canViewCotisations =
    session.role === "ADMIN" ||
    session.userId === id ||
    (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));

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

  // Données cotisations si permission
  let cotisationData: {
    card: { academicYear: string; status: string; pricePaid: number; paymentMode: string } | null;
    payments: { id: string; year: number; month: number; amountPaid: number; paymentMode: string; status: string }[];
    overdueMonths: { year: number; month: number }[];
  } | null = null;

  if (canViewCotisations) {
    const [config, card, payments] = await Promise.all([
      db.appConfig.findUnique({ where: { id: "singleton" } }),
      db.memberCard.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      }),
      db.monthlyPayment.findMany({
        where: { userId: id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
    ]);

    const academicYear = config?.academicYear ?? "2025-2026";
    const currentCard = card?.academicYear === academicYear ? card : null;

    const expectedMonths = getExpectedMonths(new Date(membre.createdAt));
    const confirmedSet = new Set(
      payments
        .filter((p) => p.status === "CONFIRMED")
        .map((p) => `${p.year}-${p.month}`)
    );
    const overdueMonths = expectedMonths.filter(
      ({ year, month }) => !confirmedSet.has(`${year}-${month}`)
    );

    cotisationData = {
      card: currentCard
        ? {
            academicYear: currentCard.academicYear,
            status: currentCard.status,
            pricePaid: currentCard.pricePaid,
            paymentMode: currentCard.paymentMode,
          }
        : null,
      payments: payments as typeof payments,
      overdueMonths,
    };
  }

  const t = await getTranslations("app.membres");

  function statusBadge(status: string) {
    if (status === "CONFIRMED") return "bg-green-100 text-green-700";
    if (status === "PENDING") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-600";
  }

  function statusLabel(status: string) {
    if (status === "CONFIRMED") return t("statusConfirmed");
    if (status === "PENDING") return t("statusPending");
    return t("statusRejected");
  }

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
              <dt className="text-xs text-gray-500 uppercase tracking-wide">{t("filterCotisation")}</dt>
              <dd className="font-medium mt-0.5">
                {membre.category.monthlyFee.toLocaleString("fr-FR")} FCFA/mois
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
                      mandat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
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

      {/* Historique cotisations */}
      {canViewCotisations && cotisationData ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <h2 className="text-sm font-medium text-gray-700">{t("cotisationHistory")}</h2>

          {/* Carte de membre */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t("cotisationCard")}</p>
            {cotisationData.card ? (
              <div className="flex items-center justify-between text-sm">
                <span>{cotisationData.card.academicYear}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">
                    {cotisationData.card.pricePaid.toLocaleString("fr-FR")} FCFA
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(cotisationData.card.status)}`}>
                    {statusLabel(cotisationData.card.status)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t("cotisationCardNotTaken")}</p>
            )}
          </div>

          {/* Mois en retard */}
          {cotisationData.overdueMonths.length > 0 && (
            <div>
              <p className="text-xs text-red-500 uppercase tracking-wide mb-2">{t("overdueTag")}</p>
              <div className="flex flex-wrap gap-1.5">
                {cotisationData.overdueMonths.map(({ year, month }) => (
                  <span key={`${year}-${month}`} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                    {MONTH_NAMES_FR[month - 1]} {year}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Paiements mensuels */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t("cotisationMonthly")}</p>
            {cotisationData.payments.length === 0 ? (
              <p className="text-sm text-gray-400">{t("cotisationNone")}</p>
            ) : (
              <div className="overflow-x-auto rounded border border-gray-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("cotisationMonth")}</th>
                      <th className="px-3 py-2 text-right">{t("cotisationAmount")}</th>
                      <th className="px-3 py-2 text-left">{t("cotisationMode")}</th>
                      <th className="px-3 py-2 text-left">{t("cotisationStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cotisationData.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 tabular-nums">
                          {MONTH_NAMES_FR[p.month - 1]} {p.year}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {p.amountPaid.toLocaleString("fr-FR")} FCFA
                        </td>
                        <td className="px-3 py-2 text-gray-600">{p.paymentMode}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded ${statusBadge(p.status)}`}>
                            {statusLabel(p.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-5 opacity-40">
          <h2 className="text-sm font-medium text-gray-700 mb-2">{t("cotisationHistory")}</h2>
          <p className="text-xs text-gray-400">{t("cotisationNone")}</p>
        </div>
      )}
    </div>
  );
}
