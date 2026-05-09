"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Event = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
  description: string;
  responsible: string | null;
  budget: number | null;
  _count: { participants: number };
  participants: { userId: string }[];
};

type Props = { events: Event[]; canCreate: boolean };

export default function EvenementsClient({ events, canCreate }: Props) {
  const t = useTranslations("app.evenements");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const past = events.filter((e) => new Date(e.date) < now);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  async function toggleParticipate(event: Event) {
    const isIn = event.participants.length > 0;
    setLoadingId(event.id);
    try {
      await fetch(`/api/evenements/${event.id}/participer`, {
        method: isIn ? "DELETE" : "POST",
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  function EventCard({ e }: { e: Event }) {
    const isIn = e.participants.length > 0;
    const isLoading = loadingId === e.id;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{e.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(e.date)} · {formatTime(e.date)}
              {e.endDate && ` → ${formatTime(e.endDate)}`}
            </p>
            <p className="text-sm text-gray-500">{e.location}</p>
            {e.responsible && (
              <p className="text-xs text-gray-400 mt-0.5">{t("responsible")} : {e.responsible}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {t("participantsCount", { count: e._count.participants })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link href={`/app/evenements/${e.id}`} className="text-xs text-blue-600 hover:underline">
              {t("detail")}
            </Link>
            <button
              onClick={() => toggleParticipate(e)}
              disabled={isLoading}
              className={`text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-60 ${
                isIn
                  ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              }`}
            >
              {isLoading ? "…" : isIn ? t("leave") : t("join")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {canCreate && (
          <Link
            href="/app/evenements/creer"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            + {t("create")}
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">{t("noEvents")}</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("upcoming")}</h2>
              <div className="space-y-3">
                {upcoming.map((e) => <EventCard key={e.id} e={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("past")}</h2>
              <div className="space-y-3 opacity-70">
                {past.slice().reverse().map((e) => <EventCard key={e.id} e={e} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
