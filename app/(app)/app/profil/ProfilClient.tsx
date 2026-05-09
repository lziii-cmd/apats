"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

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

export default function ProfilClient() {
  const t = useTranslations("app.profil");

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Changement de mot de passe
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

  function attendanceLabel(entry: AttendanceEntry) {
    if (entry.attendanceStatus === "EXCUSED") return t("excused");
    if (entry.attended === true) return t("present");
    if (entry.attended === false) return t("absent");
    return "—";
  }

  function attendanceBadgeClass(entry: AttendanceEntry) {
    if (entry.attendanceStatus === "EXCUSED") return "bg-yellow-100 text-yellow-700";
    if (entry.attended === true) return "bg-green-100 text-green-700";
    if (entry.attended === false) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-500";
  }

  function cardStatusBadge(status: PaymentStatus) {
    if (status === "CONFIRMED") return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{t("cardTaken")}</span>;
    if (status === "PENDING") return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{t("cardPending")}</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{t("cardNotTaken")}</span>;
  }

  function paymentStatusBadge(status: PaymentStatus) {
    if (status === "CONFIRMED") return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{t("confirmed")}</span>;
    if (status === "PENDING") return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{t("pending")}</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">{t("rejected")}</span>;
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="text-gray-400">Chargement…</span>
      </div>
    );
  }

  if (!data) return null;

  const { user, academicYear, card, monthlyPayments, attendance } = data;
  const mandateEndDate = user.activeMandate
    ? new Date(user.activeMandate.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {/* Bloc 1 — Informations personnelles */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">{t("identity")}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">{t("name")}</span>
            <p className="font-medium text-gray-900">{user.name}</p>
          </div>
          <div>
            <span className="text-gray-400">{t("email")}</span>
            <p className="font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <span className="text-gray-400">{t("category")}</span>
            <p className="font-medium text-gray-900">{user.category?.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-gray-400">{t("post")}</span>
            <p className="font-medium text-gray-900">
              {user.activeMandate ? user.activeMandate.post.name : t("noPost")}
            </p>
            {mandateEndDate && (
              <p className="text-xs text-gray-400">{t("mandateUntil")} {mandateEndDate}</p>
            )}
          </div>
          <div>
            <span className="text-gray-400">{t("memberSince")}</span>
            <p className="font-medium text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Bloc 2 — Statut de cotisation */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">{t("cotisation")}</h2>
          <span className="text-sm text-gray-400">{t("academicYear")} : <span className="font-medium text-gray-700">{academicYear}</span></span>
        </div>

        {/* Carte de membre */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">{t("card")}</span>
          {card ? cardStatusBadge(card.status) : <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{t("cardNotTaken")}</span>}
        </div>

        {/* Mensualités */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t("monthlyPayments")}</h3>
          {monthlyPayments.length === 0 ? (
            <p className="text-sm text-gray-400">{t("noPayments")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">{t("month")}</th>
                    <th className="pb-2 font-medium">{t("amount")}</th>
                    <th className="pb-2 font-medium">{t("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlyPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-gray-700">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                      <td className="py-2 text-gray-700">{p.amountPaid.toLocaleString()} {t("fcfa")}</td>
                      <td className="py-2">{paymentStatusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Bloc 3 — Présence aux réunions */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">{t("attendance")}</h2>
        {attendance.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noAttendance")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">{t("meeting")}</th>
                  <th className="pb-2 font-medium">{t("date")}</th>
                  <th className="pb-2 font-medium">{t("attendanceStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-700">{entry.meeting.title}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(entry.meeting.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${attendanceBadgeClass(entry)}`}>
                        {attendanceLabel(entry)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bloc 4 — Paramètres */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">{t("settings")}</h2>

        {/* Langue */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">{t("language")}</span>
          <LocaleSwitcher />
        </div>

        <hr className="border-gray-100" />

        {/* Changement de mot de passe */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t("changePassword")}</h3>
          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("currentPassword")}</label>
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("newPassword")}</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-400 mt-1">{t("passwordMinLength")}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="new-password"
              />
            </div>

            {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
            {pwdSuccess && <p className="text-sm text-green-600">{pwdSuccess}</p>}

            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {pwdLoading ? "…" : t("savePassword")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
