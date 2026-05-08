"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type PaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED";
type PaymentMode = "CASH" | "WAVE" | "ORANGE_MONEY";

type MonthlyPayment = {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  paymentMode: PaymentMode;
  paymentRef: string | null;
  status: PaymentStatus;
  rejectReason: string | null;
  createdAt: string;
};

type MemberCard = {
  id: string;
  academicYear: string;
  pricePaid: number;
  paymentMode: PaymentMode;
  paymentRef: string | null;
  status: PaymentStatus;
  rejectReason: string | null;
};

type Summary = {
  membre: { id: string; name: string; email: string; category: { monthlyFee: number } | null };
  academicYear: string;
  cardPriceFcfa: number;
  card: MemberCard | null;
  payments: MonthlyPayment[];
  expectedMonths: { year: number; month: number }[];
  overdueMonths: { year: number; month: number }[];
};

type DashboardStats = {
  totalMembers: number;
  totalExpected: number;
  totalConfirmed: number;
  rate: number;
  overdueCount: number;
  cardTaken: number;
  cardPending: number;
  totalAmount: number;
};

type PendingPayment = MonthlyPayment & { user: { id: string; name: string; email: string } };
type PendingCard = MemberCard & { user: { id: string; name: string; email: string } };

type Dashboard = {
  academicYear: string;
  stats: DashboardStats;
  pendingMonthly: PendingPayment[];
  pendingCards: PendingCard[];
};

const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;

function statusBadge(status: PaymentStatus, t: (k: string) => string) {
  const map: Record<PaymentStatus, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  const labels: Record<PaymentStatus, string> = {
    CONFIRMED: t("confirmed"),
    PENDING: t("pending"),
    REJECTED: t("rejected"),
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function modeLabel(mode: PaymentMode, t: (k: string) => string) {
  return mode === "CASH" ? t("cash") : mode === "WAVE" ? t("wave") : t("orangeMoney");
}

export default function CotisationsClient({
  currentUserId,
  isAdmin,
  canView,
  canManage,
  canConfirm,
}: {
  currentUserId: string;
  isAdmin: boolean;
  canView: boolean;
  canManage: boolean;
  canConfirm: boolean;
}) {
  const t = useTranslations("app.cotisations");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDash, setLoadingDash] = useState(canView);

  // Declare payment form state
  const [showDeclareForm, setShowDeclareForm] = useState(false);
  const [declareType, setDeclareType] = useState<"monthly" | "card">("monthly");
  const [declareMonth, setDeclareMonth] = useState(new Date().getMonth() + 1);
  const [declareYear, setDeclareYear] = useState(new Date().getFullYear());
  const [declareMode, setDeclareMode] = useState<PaymentMode>("WAVE");
  const [declareRef, setDeclareRef] = useState("");
  const [declaring, setDeclaring] = useState(false);
  const [declareError, setDeclareError] = useState("");

  // Reject form
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<"monthly" | "card">("monthly");
  const [rejectReason, setRejectReason] = useState("");

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    const res = await fetch(`/api/cotisations/summary?memberId=${currentUserId}`);
    if (res.ok) setSummary(await res.json());
    setLoadingSummary(false);
  }, [currentUserId]);

  const fetchDashboard = useCallback(async () => {
    if (!canView) return;
    setLoadingDash(true);
    const res = await fetch("/api/cotisations/dashboard");
    if (res.ok) setDashboard(await res.json());
    setLoadingDash(false);
  }, [canView]);

  useEffect(() => {
    fetchSummary();
    if (canView) fetchDashboard();
  }, [fetchSummary, fetchDashboard, canView]);

  async function handleDeclare() {
    setDeclaring(true);
    setDeclareError("");
    const endpoint = declareType === "monthly" ? "/api/cotisations/monthly" : "/api/cotisations/card";
    const body =
      declareType === "monthly"
        ? { month: declareMonth, year: declareYear, paymentMode: declareMode, paymentRef: declareRef || undefined }
        : { academicYear: summary?.academicYear, paymentMode: declareMode, paymentRef: declareRef || undefined };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setDeclareError(j.error ?? "Erreur.");
    } else {
      setShowDeclareForm(false);
      setDeclareRef("");
      await fetchSummary();
    }
    setDeclaring(false);
  }

  async function handleConfirm(id: string, type: "monthly" | "card") {
    const ep = type === "monthly" ? `/api/cotisations/monthly/${id}` : `/api/cotisations/card/${id}`;
    await fetch(ep, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    await Promise.all([fetchDashboard(), fetchSummary()]);
  }

  async function handleReject() {
    if (!rejectingId || !rejectReason.trim()) return;
    const ep = rejectType === "monthly" ? `/api/cotisations/monthly/${rejectingId}` : `/api/cotisations/card/${rejectingId}`;
    await fetch(ep, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectReason }),
    });
    setRejectingId(null);
    setRejectReason("");
    await Promise.all([fetchDashboard(), fetchSummary()]);
  }

  const overdueSet = new Set(
    summary?.overdueMonths.map(({ year, month }) => `${year}-${month}`) ?? []
  );
  const paidSet = new Set(
    summary?.payments
      .filter((p) => p.status === "CONFIRMED")
      .map((p) => `${p.year}-${p.month}`) ?? []
  );

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-6">{t("title")}</h1>

      {/* ── TABLEAU DE BORD trésorier ─────────────────────────────────── */}
      {canView && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">{t("stats")}</h2>
          {loadingDash ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : dashboard ? (
            <>
              {/* Stats globales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: t("rate"), value: `${dashboard.stats.rate}%`, color: "text-blue-700" },
                  { label: t("totalAmount"), value: `${dashboard.stats.totalAmount.toLocaleString("fr-FR")} ${t("fcfa")}`, color: "text-green-700" },
                  { label: t("overdueCount"), value: dashboard.stats.overdueCount, color: "text-red-700" },
                  { label: t("cardStats", { year: dashboard.academicYear }), value: `${dashboard.stats.cardTaken} ${t("cardTakenCount")}`, color: "text-gray-700" },
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Paiements en attente */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t("pendingPayments")}</h3>
                {dashboard.pendingMonthly.length === 0 && dashboard.pendingCards.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("nopending")}</p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.pendingCards.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="font-medium">{c.user.name}</span>
                          <span className="ml-2 text-gray-500">Carte {c.academicYear}</span>
                          <span className="ml-2 text-gray-400">{modeLabel(c.paymentMode, t)}</span>
                          {c.paymentRef && <span className="ml-2 text-xs text-gray-400 font-mono">{c.paymentRef}</span>}
                        </div>
                        {canConfirm && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(c.id, "card")}
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                            >
                              {t("confirmAction")}
                            </button>
                            <button
                              onClick={() => { setRejectingId(c.id); setRejectType("card"); }}
                              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                            >
                              {t("rejectAction")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {dashboard.pendingMonthly.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="font-medium">{p.user.name}</span>
                          <span className="ml-2 text-gray-500">{p.month}/{p.year}</span>
                          <span className="ml-2 text-gray-400">{modeLabel(p.paymentMode, t)}</span>
                          {p.paymentRef && <span className="ml-2 text-xs text-gray-400 font-mono">{p.paymentRef}</span>}
                          <span className="ml-2 text-gray-700 font-medium">{p.amountPaid.toLocaleString("fr-FR")} {t("fcfa")}</span>
                        </div>
                        {canConfirm && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(p.id, "monthly")}
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                            >
                              {t("confirmAction")}
                            </button>
                            <button
                              onClick={() => { setRejectingId(p.id); setRejectType("monthly"); }}
                              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                            >
                              {t("rejectAction")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── MES COTISATIONS ───────────────────────────────────────────── */}
      {loadingSummary ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : summary ? (
        <>
          {/* Carte de membre */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">{t("myCard")} — {summary.academicYear}</h2>
              <span className="text-xs text-gray-500">{summary.cardPriceFcfa.toLocaleString("fr-FR")} {t("fcfa")}</span>
            </div>
            {summary.card ? (
              <div className="flex items-center gap-3">
                {statusBadge(summary.card.status, t)}
                <span className="text-sm text-gray-600">{modeLabel(summary.card.paymentMode, t)}</span>
                {summary.card.paymentRef && (
                  <span className="text-xs font-mono text-gray-400">{summary.card.paymentRef}</span>
                )}
                {summary.card.status === "REJECTED" && summary.card.rejectReason && (
                  <span className="text-xs text-red-600">Motif : {summary.card.rejectReason}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{t("cardNotTaken")}</span>
                <button
                  onClick={() => { setDeclareType("card"); setShowDeclareForm(true); }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                >
                  {t("takeCard")}
                </button>
              </div>
            )}
          </div>

          {/* Grille mensuelle — année courante */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">{t("myPayments")}</h2>
              <button
                onClick={() => { setDeclareType("monthly"); setShowDeclareForm(true); }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
              >
                {t("declarePayment")}
              </button>
            </div>

            {/* Grille 12 mois de l'année académique courante */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const year = new Date().getFullYear();
                const key = `${year}-${month}`;
                const isExpected = summary.expectedMonths.some((m) => m.year === year && m.month === month);
                const isPaid = paidSet.has(key);
                const isOverdue = overdueSet.has(key);
                const paymentForMonth = summary.payments.find((p) => p.year === year && p.month === month);

                let cellClass = "rounded-lg p-2 text-center text-xs ";
                let statusText = "";
                if (isPaid) {
                  cellClass += "bg-green-50 border border-green-200 text-green-700";
                  statusText = t("paid");
                } else if (isOverdue) {
                  cellClass += "bg-red-50 border border-red-200 text-red-700";
                  statusText = t("overdue");
                } else if (paymentForMonth?.status === "PENDING") {
                  cellClass += "bg-yellow-50 border border-yellow-200 text-yellow-700";
                  statusText = t("pending");
                } else if (isExpected) {
                  cellClass += "bg-orange-50 border border-orange-200 text-orange-600";
                  statusText = t("overdue");
                } else {
                  cellClass += "bg-gray-50 border border-gray-200 text-gray-400";
                  statusText = t("notDue");
                }

                return (
                  <div key={month} className={cellClass}>
                    <div className="font-medium">{t(MONTH_KEYS[i])}</div>
                    <div className="mt-0.5">{statusText}</div>
                  </div>
                );
              })}
            </div>

            {/* Historique complet */}
            {summary.payments.length > 0 && (
              <div className="mt-4 space-y-1">
                {summary.payments.slice(0, 12).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 tabular-nums">{p.month}/{p.year}</span>
                    <span className="text-gray-600">{modeLabel(p.paymentMode, t)}</span>
                    <span className="font-medium tabular-nums">{p.amountPaid.toLocaleString("fr-FR")} {t("fcfa")}</span>
                    {statusBadge(p.status, t)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* ── MODAL DÉCLARATION ────────────────────────────────────────── */}
      {showDeclareForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              {declareType === "card" ? t("takeCard") : t("declarePayment")}
            </h3>

            {declareType === "monthly" && (
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t("month")}</label>
                  <select
                    value={declareMonth}
                    onChange={(e) => setDeclareMonth(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{t(MONTH_KEYS[i])}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t("year")}</label>
                  <input
                    type="number"
                    value={declareYear}
                    onChange={(e) => setDeclareYear(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={2020}
                    max={2099}
                  />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">{t("paymentMode")}</label>
              <select
                value={declareMode}
                onChange={(e) => setDeclareMode(e.target.value as PaymentMode)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WAVE">{t("wave")}</option>
                <option value="ORANGE_MONEY">{t("orangeMoney")}</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">{t("paymentRef")}</label>
              <input
                type="text"
                value={declareRef}
                onChange={(e) => setDeclareRef(e.target.value)}
                placeholder={t("paymentRefHint")}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {declareError && (
              <p className="text-xs text-red-600 mb-3">{declareError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDeclareForm(false); setDeclareError(""); }}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5"
              >
                Annuler
              </button>
              <button
                onClick={handleDeclare}
                disabled={declaring}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded disabled:opacity-50 transition-colors"
              >
                {declaring ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REJET ──────────────────────────────────────────────── */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{t("rejectDialog")}</h3>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">{t("rejectReason")}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded disabled:opacity-50 transition-colors"
              >
                {t("rejectAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
