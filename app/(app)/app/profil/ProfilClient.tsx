"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { showToast } from "@/components/Toast";

type PaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED";
type AttendanceStatus = "EXCUSED" | null;

type MonthlyPayment = {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  paymentMode: string;
  status: PaymentStatus;
};

type MemberCard = {
  id: string;
  academicYear: string;
  pricePaid: number;
  paymentMode: string;
  status: PaymentStatus;
};

type Mandate = {
  id: string;
  startDate: string;
  endDate: string;
  post: { id: string; name: string };
};

type AttendanceEntry = {
  attended: boolean | null;
  attendanceStatus: AttendanceStatus;
  preConfirmed: boolean;
  meeting: {
    id: string;
    title: string;
    type: string;
    date: string;
    status: string;
  };
};

type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string;
    locale: string;
    createdAt: string;
    category: { id: string; name: string; monthlyFee: number } | null;
    activeMandate: Mandate | null;
  };
  academicYear: string;
  cardPriceFcfa: number;
  card: MemberCard | null;
  monthlyPayments: MonthlyPayment[];
  attendance: AttendanceEntry[];
};

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];

const SECTION: React.CSSProperties = {
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-md)",
  padding: "18px 20px",
  background: "var(--color-background-primary)",
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.8px",
  textTransform: "uppercase" as const,
  color: "var(--color-text-tertiary)",
  marginBottom: "14px",
};

const LABEL_SM: React.CSSProperties = {
  fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "2px",
};

const INPUT: React.CSSProperties = {
  width: "100%", border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: "13px",
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
  outline: "none", boxSizing: "border-box" as const,
};

function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function paymentStatusBadge(status: PaymentStatus, t: (k: string) => string) {
  const styles: Record<PaymentStatus, React.CSSProperties> = {
    CONFIRMED: { background: "#E1F5EE", color: "#085041" },
    PENDING:   { background: "#FAEEDA", color: "#633806" },
    REJECTED:  { background: "#FBEAEA", color: "#791F1F" },
  };
  const labels: Record<PaymentStatus, string> = {
    CONFIRMED: t("confirmed"),
    PENDING:   t("pending"),
    REJECTED:  t("rejected"),
  };
  return (
    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, ...styles[status] }}>
      {labels[status]}
    </span>
  );
}

function attendanceBadge(entry: AttendanceEntry, t: (k: string) => string) {
  let style: React.CSSProperties;
  let label: string;
  if (entry.attendanceStatus === "EXCUSED") {
    style = { background: "#FAEEDA", color: "#633806" };
    label = t("excused");
  } else if (entry.attended === true) {
    style = { background: "#E1F5EE", color: "#085041" };
    label = t("present");
  } else if (entry.attended === false) {
    style = { background: "#FBEAEA", color: "#791F1F" };
    label = t("absent");
  } else {
    style = { background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)" };
    label = "—";
  }
  return (
    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, ...style }}>
      {label}
    </span>
  );
}

export default function ProfilClient() {
  const t = useTranslations("app.profil");

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/me");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!currentPwd) { setPwdError(t("errors.currentPasswordRequired")); return; }
    if (newPwd.length < 8) { setPwdError(t("errors.newPasswordTooShort")); return; }
    if (newPwd !== confirmPwd) { setPwdError(t("errors.passwordMismatch")); return; }

    setPwdLoading(true);
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    setPwdLoading(false);

    if (res.ok) {
      setPwdSuccess(t("passwordSuccess"));
      showToast("Mot de passe mis à jour.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } else {
      const body = await res.json();
      if (body.error?.includes("incorrect")) setPwdError(t("errors.currentPasswordWrong"));
      else if (body.error?.includes("8 caractères") || body.error?.includes("8 characters")) setPwdError(t("errors.newPasswordTooShort"));
      else setPwdError(t("errors.generic"));
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "22px 24px", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
        Chargement…
      </div>
    );
  }

  if (!data) return null;

  const { user, academicYear, card, monthlyPayments, attendance } = data;
  const initials = getInitials(user.name);
  const mandateEndDate = user.activeMandate
    ? new Date(user.activeMandate.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  const confirmedPayments = monthlyPayments.filter((p) => p.status === "CONFIRMED").length;

  const presentCount = attendance.filter((a) => a.attended === true).length;

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* ── Header banner pleine largeur ── */}
      <div
        style={{
          background: "#14171c",
          borderRadius: "var(--border-radius-lg)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "52px", height: "52px", borderRadius: "50%",
            background: "#1D9E75", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px", fontWeight: 500, flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontSize: "16px", fontWeight: 500, lineHeight: 1.2 }}>{user.name}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11.5px", marginTop: "2px" }}>{user.email}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "7px", flexWrap: "wrap" }}>
            {user.activeMandate && (
              <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "999px", background: "rgba(29,158,117,0.2)", color: "#5DCAA5", fontWeight: 500 }}>
                {user.activeMandate.post.name}
              </span>
            )}
            {user.category && (
              <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.58)" }}>
                {user.category.name}
              </span>
            )}
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: "flex", gap: "32px", textAlign: "right", flexShrink: 0 }}>
          {[
            { val: confirmedPayments, label: `cotisation${confirmedPayments !== 1 ? "s" : ""} payée${confirmedPayments !== 1 ? "s" : ""}` },
            { val: presentCount, label: `présence${presentCount !== 1 ? "s" : ""}` },
            { val: attendance.length, label: "réunion(s) convoquée(s)" },
          ].map(({ val, label }) => (
            <div key={label}>
              <div style={{ color: "white", fontSize: "22px", fontWeight: 500, lineHeight: 1 }}>{val}</div>
              <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px", marginTop: "3px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "12px", alignItems: "start" }}>

        {/* ── Colonne gauche : identité + paramètres ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Identité */}
          <div style={SECTION}>
            <div style={SECTION_TITLE}>{t("identity")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                { label: t("name"), value: user.name },
                { label: t("email"), value: user.email },
                { label: t("category"), value: user.category?.name ?? "—" },
                {
                  label: t("post"),
                  value: user.activeMandate ? user.activeMandate.post.name : t("noPost"),
                  sub: mandateEndDate ? `${t("mandateUntil")} ${mandateEndDate}` : undefined,
                },
                {
                  label: t("memberSince"),
                  value: new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
                },
              ].map(({ label, value, sub }, i) => (
                <div key={i}>
                  <div style={LABEL_SM}>{label}</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
                  {sub && <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "1px" }}>{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Paramètres */}
          <div style={SECTION}>
            <div style={SECTION_TITLE}>{t("settings")}</div>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: "14px", marginBottom: "14px",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>{t("language")}</span>
              <LocaleSwitcher />
            </div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "12px" }}>
              {t("changePassword")}
            </div>
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: t("currentPassword"), value: currentPwd, setter: setCurrentPwd, autoComplete: "current-password" },
                { label: t("newPassword"), value: newPwd, setter: setNewPwd, autoComplete: "new-password", hint: t("passwordMinLength") },
                { label: t("confirmPassword"), value: confirmPwd, setter: setConfirmPwd, autoComplete: "new-password" },
              ].map(({ label, value, setter, autoComplete, hint }) => (
                <div key={label}>
                  <label style={LABEL_SM}>{label}</label>
                  <input type="password" value={value} onChange={(e) => setter(e.target.value)} style={INPUT} autoComplete={autoComplete} />
                  {hint && <p style={{ fontSize: "11px", color: "var(--color-text-tertiary)", margin: "3px 0 0" }}>{hint}</p>}
                </div>
              ))}
              {pwdError && <p style={{ fontSize: "12px", color: "#991B1B", margin: 0 }}>{pwdError}</p>}
              {pwdSuccess && <p style={{ fontSize: "12px", color: "#085041", margin: 0 }}>{pwdSuccess}</p>}
              <button
                type="submit"
                disabled={pwdLoading}
                style={{ background: "#14171c", color: "white", border: "none", borderRadius: "var(--border-radius-md)", padding: "9px 18px", fontSize: "13px", cursor: "pointer", alignSelf: "flex-start", opacity: pwdLoading ? 0.6 : 1 }}
              >
                {pwdLoading ? "…" : t("savePassword")}
              </button>
            </form>
          </div>
        </div>

        {/* ── Colonne droite : cotisation + présence ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Cotisation */}
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ ...SECTION_TITLE, marginBottom: 0 }}>{t("cotisation")}</div>
              <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
                {t("academicYear")} : <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{academicYear}</span>
              </span>
            </div>
            {/* Carte de membre */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="ti ti-id-badge" style={{ fontSize: "15px", color: "var(--color-text-secondary)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{t("card")}</span>
              </div>
              {card
                ? paymentStatusBadge(card.status, t)
                : <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "var(--color-border-tertiary)", color: "var(--color-text-tertiary)" }}>{t("cardNotTaken")}</span>
              }
            </div>
            {/* Mensualités */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={LABEL_SM}>{t("monthlyPayments")}</div>
              <Link href="/app/cotisations" style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)", background: "#14171c", color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
                <i className="ti ti-plus" style={{ fontSize: "11px" }} />
                Déclarer un paiement
              </Link>
            </div>
            {monthlyPayments.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", margin: 0 }}>{t("noPayments")}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[t("month"), t("amount"), t("status")].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "0 0 8px", fontSize: "10px", color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPayments.map((p) => (
                      <tr key={p.id} style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                        <td style={{ padding: "8px 0", color: "var(--color-text-primary)" }}>{MONTH_NAMES[p.month - 1]} {p.year}</td>
                        <td style={{ padding: "8px 0", color: "var(--color-text-secondary)" }}>{p.amountPaid.toLocaleString()} {t("fcfa")}</td>
                        <td style={{ padding: "8px 0" }}>{paymentStatusBadge(p.status, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Présence */}
          <div style={SECTION}>
            <div style={SECTION_TITLE}>{t("attendance")}</div>
            {attendance.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", margin: 0 }}>{t("noAttendance")}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[t("meeting"), t("date"), t("attendanceStatus")].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "0 0 8px", fontSize: "10px", color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((entry, i) => (
                      <tr key={i} style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                        <td style={{ padding: "8px 0", color: "var(--color-text-primary)" }}>{entry.meeting.title}</td>
                        <td style={{ padding: "8px 0", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                          {new Date(entry.meeting.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "8px 0" }}>{attendanceBadge(entry, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
