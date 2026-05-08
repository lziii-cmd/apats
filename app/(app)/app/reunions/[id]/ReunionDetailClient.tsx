"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Attendee = {
  userId: string;
  preConfirmed: boolean;
  attended: boolean | null;
  attendanceStatus: string | null;
  user: { id: string; name: string };
};

type Meeting = {
  id: string;
  type: "BUREAU" | "AG" | "EXTRAORDINARY";
  title: string;
  date: string;
  endTime: string | null;
  location: string;
  speakers: string | null;
  agenda: string;
  qrCode: string;
  status: "PLANNED" | "OPEN" | "CLOSED";
  createdBy: { id: string; name: string };
  attendees: Attendee[];
};

type Props = {
  meeting: Meeting;
  myAttendee: Attendee | null;
  canCreate: boolean;
  canAttend: boolean;
};

const TYPE_COLORS = {
  BUREAU: "bg-blue-100 text-blue-700",
  AG: "bg-green-100 text-green-700",
  EXTRAORDINARY: "bg-orange-100 text-orange-700",
};

const TYPE_LABELS: Record<string, string> = {
  BUREAU: "Bureau",
  AG: "Assemblée Générale",
  EXTRAORDINARY: "Extraordinaire",
};

export default function ReunionDetailClient({ meeting, myAttendee, canCreate, canAttend }: Props) {
  const t = useTranslations("app.reunions");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  async function toggleConfirm() {
    const isConfirmed = myAttendee?.preConfirmed ?? false;
    setLoading(true);
    try {
      await fetch(`/api/reunions/${meeting.id}/confirm`, {
        method: isConfirmed ? "DELETE" : "POST",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reunions/${meeting.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/app/reunions");
        router.refresh();
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const isInvited = myAttendee !== null;
  const isConfirmed = myAttendee?.preConfirmed ?? false;
  const confirmedCount = meeting.attendees.filter((a) => a.preConfirmed).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/app/reunions" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        {t("backToList")}
      </Link>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[meeting.type]}`}>
              {TYPE_LABELS[meeting.type]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              meeting.status === "OPEN" ? "bg-emerald-100 text-emerald-700" :
              meeting.status === "CLOSED" ? "bg-slate-100 text-slate-500" :
              "bg-gray-100 text-gray-600"
            }`}>
              {t(`status${meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}` as never)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
        </div>

        {canCreate && meeting.status !== "CLOSED" && (
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/app/reunions/${meeting.id}/modifier`}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
            >
              {tc("edit")}
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm border border-red-300 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
            >
              {tc("delete")}
            </button>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("date")}</p>
          <p className="font-medium">{formatDate(meeting.date)} · {formatTime(meeting.date)}
            {meeting.endTime && ` → ${formatTime(meeting.endTime)}`}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("location")}</p>
          <p className="font-medium">{meeting.location}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("organizer")}</p>
          <p className="font-medium">{meeting.createdBy.name}</p>
        </div>
        {meeting.speakers && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("speakersLabel")}</p>
            <p className="font-medium">{meeting.speakers}</p>
          </div>
        )}
      </div>

      {/* Ordre du jour */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{t("agendaLabel")}</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
          {meeting.agenda}
        </div>
      </div>

      {/* Boutons d'émargement */}
      {meeting.status !== "PLANNED" && (
        <div className="flex flex-wrap gap-2 mb-6">
          {canAttend && (
            <Link
              href={`/app/reunions/${meeting.id}/emargement`}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              📋 {t("emargementLink")}
            </Link>
          )}
          {isInvited && meeting.status === "OPEN" && (
            <Link
              href={`/app/reunions/${meeting.id}/scanner`}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              📷 {t("scannerLink")}
            </Link>
          )}
        </div>
      )}

      {/* Bouton pré-confirmation */}
      {isInvited && meeting.status === "PLANNED" && (
        <div className="mb-6">
          <button
            onClick={toggleConfirm}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
              isConfirmed
                ? "border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            {loading ? "…" : isConfirmed ? t("cancelPresence") : t("confirmPresence")}
          </button>
        </div>
      )}

      {/* Liste des convoqués */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          {t("inviteesList")} · {confirmedCount}/{meeting.attendees.length} {t("preConfirmedBadge").toLowerCase()}
        </h2>
        {meeting.attendees.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noAttendees")}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {meeting.attendees.map((a) => (
              <div key={a.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-800">{a.user.name}</span>
                {a.preConfirmed && (
                  <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    ✓ {t("preConfirmedBadge")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-3">{t("deleteConfirm")}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-60"
              >
                {loading ? "…" : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
