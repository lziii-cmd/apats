"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Meeting = {
  id: string;
  type: "BUREAU" | "AG" | "EXTRAORDINARY";
  title: string;
  date: string;
  endTime: string | null;
  location: string;
  status: "PLANNED" | "OPEN" | "CLOSED";
  _count: { attendees: number };
  attendees: { preConfirmed: boolean }[];
};

type Props = {
  meetings: Meeting[];
  canCreate: boolean;
  currentUserId: string;
};

const TYPE_COLORS = {
  BUREAU: "bg-blue-100 text-blue-700",
  AG: "bg-green-100 text-green-700",
  EXTRAORDINARY: "bg-orange-100 text-orange-700",
};

const STATUS_COLORS = {
  PLANNED: "bg-gray-100 text-gray-600",
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

export default function ReunionsClient({ meetings, canCreate }: Props) {
  const t = useTranslations("app.reunions");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleConfirm(meeting: Meeting) {
    const isConfirmed = meeting.attendees[0]?.preConfirmed ?? false;
    setLoadingId(meeting.id);
    try {
      await fetch(`/api/reunions/${meeting.id}/confirm`, {
        method: isConfirmed ? "DELETE" : "POST",
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {canCreate && (
          <Link
            href="/app/reunions/creer"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            + {t("create")}
          </Link>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="text-gray-500 text-sm">{t("noReunions")}</p>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const isInvited = m.attendees.length > 0;
            const isConfirmed = m.attendees[0]?.preConfirmed ?? false;
            const isLoading = loadingId === m.id;

            return (
              <div
                key={m.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[m.type]}`}>
                        {t({ BUREAU: "typeBureau", AG: "typeAG", EXTRAORDINARY: "typeExtraordinary" }[m.type] as never)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[m.status]}`}>
                        {t({ PLANNED: "statusPlanned", OPEN: "statusOpen", CLOSED: "statusClosed" }[m.status] as never)}
                      </span>
                      {isConfirmed && (
                        <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-700">
                          ✓ {t("preConfirmedBadge")}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{m.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(m.date)} · {formatTime(m.date)}
                      {m.endTime && ` → ${formatTime(m.endTime)}`}
                    </p>
                    <p className="text-sm text-gray-500">{m.location}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {t("attendeesCount", { count: m._count.attendees })}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Link
                      href={`/app/reunions/${m.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t("detail")}
                    </Link>
                    {isInvited && m.status === "PLANNED" && (
                      <button
                        onClick={() => toggleConfirm(m)}
                        disabled={isLoading}
                        className={`text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-60 ${
                          isConfirmed
                            ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                            : "bg-teal-600 hover:bg-teal-700 text-white"
                        }`}
                      >
                        {isLoading ? "…" : isConfirmed ? t("cancelPresence") : t("confirmPresence")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
