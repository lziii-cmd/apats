"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";

type Attendee = {
  userId: string;
  attended: boolean | null;
  attendanceStatus: string | null;
  user: { id: string; name: string };
};

type Meeting = {
  id: string;
  title: string;
  date: string;
  status: "PLANNED" | "OPEN" | "CLOSED";
  qrCode: string;
  attendees: Attendee[];
};

type Props = { meeting: Meeting };

export default function EmargementClient({ meeting: initial }: Props) {
  const t = useTranslations("app.emargement");
  const [meeting, setMeeting] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  const presentCount = meeting.attendees.filter((a) => a.attended).length;
  const total = meeting.attendees.length;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/reunions/${meeting.id}`);
    if (res.ok) {
      const data = await res.json();
      setMeeting((prev) => ({ ...prev, attendees: data.attendees, status: data.status }));
    }
  }, [meeting.id]);

  // Polling toutes les 4s quand la réunion est OPEN
  useEffect(() => {
    if (meeting.status !== "OPEN") return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [meeting.status, refresh]);

  async function handleOpen() {
    setLoading(true);
    try {
      await fetch(`/api/reunions/${meeting.id}/open`, { method: "POST" });
      setMeeting((prev) => ({ ...prev, status: "OPEN" }));
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    setLoading(true);
    try {
      await fetch(`/api/reunions/${meeting.id}/close`, { method: "POST" });
      await refresh();
      setMeeting((prev) => ({ ...prev, status: "CLOSED" }));
    } finally {
      setLoading(false);
      setShowCloseConfirm(false);
    }
  }

  async function toggleAttendee(userId: string, currentlyPresent: boolean) {
    await fetch(`/api/reunions/${meeting.id}/attendees/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended: !currentlyPresent }),
    });
    await refresh();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={`/app/reunions/${meeting.id}`} className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← {t("backToDetail")}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-gray-500">{meeting.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {meeting.status === "PLANNED" && (
            <button
              onClick={handleOpen}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-60"
            >
              {loading ? "…" : t("openMeeting")}
            </button>
          )}
          {meeting.status === "OPEN" && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              {t("closeMeeting")}
            </button>
          )}
          {meeting.status === "CLOSED" && (
            <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1.5 rounded">
              {t("closed")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-gray-700">{t("qrTitle")}</p>
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setQrFullscreen(true)}
            title={t("qrFullscreen")}
          >
            <QRCode value={meeting.qrCode} size={200} />
          </div>
          <p className="text-xs text-gray-400">{t("qrHint")}</p>
          {meeting.status === "OPEN" && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded animate-pulse">
              ● {t("scanActive")}
            </span>
          )}
        </div>

        {/* Liste présence */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              {t("attendanceList")} · {presentCount}/{total}
            </p>
            {meeting.status === "OPEN" && (
              <span className="text-xs text-gray-400">{t("autoRefresh")}</span>
            )}
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {meeting.attendees.map((a) => {
              const isPresent = a.attended === true;
              return (
                <div key={a.userId} className="flex items-center justify-between py-2">
                  <span className={`text-sm ${isPresent ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {a.user.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isPresent && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        ✓ {t("present")}
                      </span>
                    )}
                    {meeting.status !== "CLOSED" && (
                      <button
                        onClick={() => toggleAttendee(a.userId, isPresent)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          isPresent
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {isPresent ? t("markAbsent") : t("markPresent")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QR fullscreen */}
      {qrFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-white flex items-center justify-center cursor-pointer"
          onClick={() => setQrFullscreen(false)}
        >
          <div className="flex flex-col items-center gap-6">
            <QRCode value={meeting.qrCode} size={320} />
            <p className="text-gray-500 text-sm">{t("qrClickToClose")}</p>
          </div>
        </div>
      )}

      {/* Modal clôture */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-2">{t("closeConfirmTitle")}</h2>
            <p className="text-sm text-gray-600 mb-5">{t("closeConfirmText")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-60"
              >
                {loading ? "…" : t("confirmClose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
