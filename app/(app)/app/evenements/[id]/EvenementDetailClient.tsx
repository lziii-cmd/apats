"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Participant = { userId: string; user: { id: string; name: string } };

type Event = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
  description: string;
  responsible: string | null;
  budget: number | null;
  createdBy: { id: string; name: string };
  participants: Participant[];
};

type Props = { event: Event; isParticipating: boolean; canCreate: boolean };

export default function EvenementDetailClient({ event, isParticipating: initialParticipating, canCreate }: Props) {
  const t = useTranslations("app.evenements");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isParticipating, setIsParticipating] = useState(initialParticipating);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  async function toggleParticipate() {
    setLoading(true);
    try {
      await fetch(`/api/evenements/${event.id}/participer`, {
        method: isParticipating ? "DELETE" : "POST",
      });
      setIsParticipating(!isParticipating);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/evenements/${event.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/app/evenements");
        router.refresh();
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const isPast = new Date(event.date) < new Date();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/app/evenements" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        {t("backToList")}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {isPast && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded mb-2 inline-block">
              {t("pastBadge")}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        </div>
        {canCreate && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/app/evenements/${event.id}/modifier`}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              {tc("edit")}
            </Link>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="text-sm border border-red-300 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors">
              {tc("delete")}
            </button>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("date")}</p>
          <p className="font-medium">{formatDate(event.date)} · {formatTime(event.date)}
            {event.endDate && ` → ${formatTime(event.endDate)}`}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("location")}</p>
          <p className="font-medium">{event.location}</p>
        </div>
        {event.responsible && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("responsible")}</p>
            <p className="font-medium">{event.responsible}</p>
          </div>
        )}
        {event.budget != null && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("budget")}</p>
            <p className="font-medium">{event.budget.toLocaleString("fr-FR")} FCFA</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{t("organizer")}</p>
          <p className="font-medium">{event.createdBy.name}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{t("descriptionLabel")}</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
          {event.description}
        </div>
      </div>

      {/* Bouton participation */}
      {!isPast && (
        <div className="mb-6">
          <button onClick={toggleParticipate} disabled={loading}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
              isParticipating
                ? "border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}>
            {loading ? "…" : isParticipating ? t("leave") : t("join")}
          </button>
        </div>
      )}

      {/* Participants */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          {t("participantsList")} · {event.participants.length}
        </h2>
        {event.participants.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noParticipants")}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {event.participants.map((p) => (
              <div key={p.userId} className="px-4 py-2.5 text-sm text-gray-800">{p.user.name}</div>
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
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {loading ? "…" : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
