"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { showToast } from "@/components/Toast";

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

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const MODAL: React.CSSProperties = {
  background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
  width: "100%", maxWidth: "400px", margin: "0 16px", padding: "24px",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "5px",
};
const INPUT: React.CSSProperties = {
  width: "100%", border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: "13px",
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
  outline: "none", boxSizing: "border-box" as const,
};
const BTN_PRI: React.CSSProperties = {
  flex: 1, background: "#14171c", color: "white", border: "none",
  borderRadius: "var(--border-radius-md)", padding: "9px 0", fontSize: "13px", cursor: "pointer",
};
const BTN_SEC: React.CSSProperties = {
  flex: 1, background: "transparent", color: "var(--color-text-secondary)",
  border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
  padding: "9px 0", fontSize: "13px", cursor: "pointer",
};

function statusBadge(status: PaymentStatus, t: (k: string) => string) {
  const styles: Record<PaymentStatus, React.CSSProperties> = {
    CONFIRMED: { background: "#E1F5EE", color: "#085041" },
    PENDING:   { background: "#FAEEDA", color: "#633806" },
    REJECTED:  { background: "#FBEAEA", color: "#791F1F" },
  };
  const labels: Record<PaymentStatus, string> = {
    CONFIRMED: t("confirmed"),
    PENDING: t("pending"),
    REJECTED: t("rejected"),
  };
  return (
    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, ...styles[status] }}>
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
  const tc = useTranslations("common");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDash, setLoadingDash] = useState(canView);

  const [showDeclareForm, setShowDeclareForm] = useState(false);
  const [declareType, setDeclareType] = useState<"monthly" | "card">("monthly");
  const [declareMonth, setDeclareMonth] = useState(new Date().getMonth() + 1);
  const [declareYear, setDeclareYear] = useState(new Date().getFullYear());
  const [declareMode, setDeclareMode] = useState<PaymentMode>("WAVE");
  const [declareRef, setDeclareRef] = useState("");
  const [declaring, setDeclaring] = useState(false);
  const [declareError, setDeclareError] = useState("");

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
      showToast("Paiement déclaré. En attente de confirmation.");
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
    showToast("Paiement confirmé.");
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
    showToast("Paiement rejeté.", "info");
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
    <div style={{ padding: "22px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500, margin: 0 }}>{t("title")}</h1>
      </div>

      {/* ── TABLEAU DE BORD trésorier ─────────────────────────────────── */}
      {canView && (
        <div style={{ marginBottom: "24px" }}>
          {loadingDash ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-tertiary)" }}>Chargement…</p>
          ) : dashboard ? (
            <>
              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px" }}>
                {[
                  { label: t("rate"), value: `${dashboard.stats.rate}%`, icon: "ti-chart-pie", color: "#2B5FA3", bg: "#E6F1FB" },
                  { label: t("totalAmount"), value: `${dashboard.stats.totalAmount.toLocaleString("fr-FR")} FCFA`, icon: "ti-wallet", color: "#085041", bg: "#E1F5EE" },
                  { label: t("overdueCount"), value: String(dashboard.stats.overdueCount), icon: "ti-alert-triangle", color: "#791F1F", bg: "#FBEAEA" },
                  { label: t("cardStats", { year: dashboard.academicYear }), value: `${dashboard.stats.cardTaken} prise${dashboard.stats.cardTaken > 1 ? "s" : ""}`, icon: "ti-id-badge", color: "#633806", bg: "#FAEEDA" },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "6px",
                        background: s.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <i className={`ti ${s.icon}`} style={{ fontSize: "14px", color: s.color }} />
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 600, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Paiements en attente */}
              {(dashboard.pendingMonthly.length > 0 || dashboard.pendingCards.length > 0) && (
                <div
                  style={{
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                    {t("pendingPayments")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {dashboard.pendingCards.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500 }}>{c.user.name}</span>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                            Carte {c.academicYear} · {modeLabel(c.paymentMode, t)}
                          </span>
                          {c.paymentRef && (
                            <span style={{ fontSize: "10.5px", color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                              {c.paymentRef}
                            </span>
                          )}
                        </div>
                        {canConfirm && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleConfirm(c.id, "card")}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "var(--border-radius-md)",
                                background: "#E1F5EE", color: "#085041", border: "none", cursor: "pointer",
                              }}
                            >
                              {t("confirmAction")}
                            </button>
                            <button
                              onClick={() => { setRejectingId(c.id); setRejectType("card"); }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "var(--border-radius-md)",
                                background: "#FBEAEA", color: "#791F1F", border: "none", cursor: "pointer",
                              }}
                            >
                              {t("rejectAction")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {dashboard.pendingMonthly.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500 }}>{p.user.name}</span>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                            {p.month}/{p.year} · {modeLabel(p.paymentMode, t)}
                          </span>
                          {p.paymentRef && (
                            <span style={{ fontSize: "10.5px", color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                              {p.paymentRef}
                            </span>
                          )}
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                            {p.amountPaid.toLocaleString("fr-FR")} {t("fcfa")}
                          </span>
                        </div>
                        {canConfirm && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleConfirm(p.id, "monthly")}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "var(--border-radius-md)",
                                background: "#E1F5EE", color: "#085041", border: "none", cursor: "pointer",
                              }}
                            >
                              {t("confirmAction")}
                            </button>
                            <button
                              onClick={() => { setRejectingId(p.id); setRejectType("monthly"); }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "var(--border-radius-md)",
                                background: "#FBEAEA", color: "#791F1F", border: "none", cursor: "pointer",
                              }}
                            >
                              {t("rejectAction")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── MES COTISATIONS ───────────────────────────────────────────── */}
      {loadingSummary ? (
        <p style={{ fontSize: "13px", color: "var(--color-text-tertiary)" }}>Chargement…</p>
      ) : summary ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "start" }}>
          {/* ── Colonne gauche: carte + historique ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Carte de membre */}
          <div
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                {t("myCard")} — {summary.academicYear}
              </div>
              <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
                {summary.cardPriceFcfa.toLocaleString("fr-FR")} {t("fcfa")}
              </span>
            </div>

            {summary.card ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {statusBadge(summary.card.status, t)}
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  {modeLabel(summary.card.paymentMode, t)}
                </span>
                {summary.card.paymentRef && (
                  <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                    {summary.card.paymentRef}
                  </span>
                )}
                {summary.card.status === "REJECTED" && summary.card.rejectReason && (
                  <span style={{ fontSize: "11px", color: "#791F1F" }}>Motif : {summary.card.rejectReason}</span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>{t("cardNotTaken")}</span>
                <button
                  onClick={() => { setDeclareType("card"); setShowDeclareForm(true); }}
                  style={{
                    fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                    background: "#14171c", color: "white", border: "none", cursor: "pointer",
                  }}
                >
                  {t("takeCard")}
                </button>
              </div>
            )}
          </div>

          {/* Payment history */}
          {summary.payments.length > 0 && (
            <div
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "10px", color: "var(--color-text-primary)" }}>
                Historique des paiements
              </div>
              {summary.payments.slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {p.month}/{p.year}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{modeLabel(p.paymentMode, t)}</span>
                  <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                    {p.amountPaid.toLocaleString("fr-FR")} {t("fcfa")}
                  </span>
                  {statusBadge(p.status, t)}
                </div>
              ))}
            </div>
          )}
          </div>{/* end left column */}

          {/* ── Colonne droite: grille mensuelle ── */}
          <div>
          <div
            style={{
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>{t("myPayments")}</div>
              <button
                onClick={() => { setDeclareType("monthly"); setShowDeclareForm(true); }}
                style={{
                  fontSize: "11px", padding: "5px 12px", borderRadius: "var(--border-radius-md)",
                  background: "#14171c", color: "white", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "5px",
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: "12px" }} />
                {t("declarePayment")}
              </button>
            </div>

            {/* 12-month grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const year = new Date().getFullYear();
                const key = `${year}-${month}`;
                const isPaid = paidSet.has(key);
                const isOverdue = overdueSet.has(key);
                const paymentForMonth = summary.payments.find((p) => p.year === year && p.month === month);
                const isExpected = summary.expectedMonths.some((m) => m.year === year && m.month === month);

                let cellStyle: React.CSSProperties;
                let statusText: string;

                if (isPaid) {
                  cellStyle = { background: "#E1F5EE", border: "0.5px solid #A7E3CC", color: "#085041" };
                  statusText = t("paid");
                } else if (isOverdue || isExpected) {
                  cellStyle = { background: "#FBEAEA", border: "0.5px solid #F5BEBE", color: "#791F1F" };
                  statusText = t("overdue");
                } else if (paymentForMonth?.status === "PENDING") {
                  cellStyle = { background: "#FAEEDA", border: "0.5px solid #F5D9A8", color: "#633806" };
                  statusText = t("pending");
                } else {
                  cellStyle = { background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-tertiary)" };
                  statusText = t("notDue");
                }

                return (
                  <div
                    key={month}
                    style={{
                      borderRadius: "var(--border-radius-md)", padding: "8px 4px",
                      textAlign: "center", fontSize: "10.5px", ...cellStyle,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{t(MONTH_KEYS[i])}</div>
                    <div style={{ marginTop: "2px", opacity: 0.85 }}>{statusText}</div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {/* Modal — déclaration */}
      {showDeclareForm && (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <h3 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 18px" }}>
              {declareType === "card" ? t("takeCard") : t("declarePayment")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {declareType === "monthly" && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>{t("month")}</label>
                    <select
                      value={declareMonth}
                      onChange={(e) => setDeclareMonth(Number(e.target.value))}
                      style={INPUT}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{t(MONTH_KEYS[i])}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>{t("year")}</label>
                    <input
                      type="number"
                      value={declareYear}
                      onChange={(e) => setDeclareYear(Number(e.target.value))}
                      style={INPUT}
                      min={2020}
                      max={2099}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={LABEL}>{t("paymentMode")}</label>
                <select
                  value={declareMode}
                  onChange={(e) => setDeclareMode(e.target.value as PaymentMode)}
                  style={INPUT}
                >
                  <option value="WAVE">{t("wave")}</option>
                  <option value="ORANGE_MONEY">{t("orangeMoney")}</option>
                </select>
              </div>

              <div>
                <label style={LABEL}>{t("paymentRef")}</label>
                <input
                  type="text"
                  value={declareRef}
                  onChange={(e) => setDeclareRef(e.target.value)}
                  placeholder={t("paymentRefHint")}
                  style={INPUT}
                />
                {(declareMode === "WAVE" || declareMode === "ORANGE_MONEY") && (
                  <p style={{ fontSize: "10.5px", color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
                    <i className="ti ti-info-circle" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "3px" }} />
                    Numéro visible dans l'historique {declareMode === "WAVE" ? "Wave" : "Orange Money"}
                  </p>
                )}
              </div>

              {declareError && (
                <p style={{ fontSize: "12px", color: "#791F1F", margin: 0 }}>{declareError}</p>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => { setShowDeclareForm(false); setDeclareError(""); }} style={BTN_SEC}>
                {tc("cancel")}
              </button>
              <button
                onClick={handleDeclare}
                disabled={declaring}
                style={{ ...BTN_PRI, opacity: declaring ? 0.6 : 1 }}
              >
                {declaring ? "…" : tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — rejet */}
      {rejectingId && (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <h3 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 18px" }}>{t("rejectDialog")}</h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={LABEL}>{t("rejectReason")}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{ ...INPUT, resize: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setRejectingId(null); setRejectReason(""); }} style={BTN_SEC}>
                {tc("cancel")}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                style={{ ...BTN_PRI, background: "#791F1F", opacity: !rejectReason.trim() ? 0.5 : 1 }}
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
