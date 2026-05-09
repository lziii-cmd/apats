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

/* Deterministic card color palette */
const CARD_COLORS = ["#1D9E75", "#534AB7", "#2B5FA3", "#8B3A3A", "#5A7A2E", "#7A4F1D"];

function cardColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

const PILL = (active: boolean): React.CSSProperties => ({
  fontSize: "11px", padding: "5px 11px", borderRadius: "999px", border: "none", cursor: "pointer",
  fontWeight: active ? 500 : 400,
  background: active ? "#14171c" : "var(--color-background-secondary)",
  color: active ? "white" : "var(--color-text-secondary)",
  whiteSpace: "nowrap" as const,
});

export default function EvenementsClient({ events, canCreate }: Props) {
  const t = useTranslations("app.evenements");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const past = events.filter((e) => new Date(e.date) < now);
  const displayed = showPast ? [...past].reverse() : upcoming;

  async function toggleParticipate(event: Event) {
    const isIn = event.participants.length > 0;
    setLoadingId(event.id);
    try {
      await fetch(`/api/evenements/${event.id}/participer`, { method: isIn ? "DELETE" : "POST" });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>{t("title")}</h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            {upcoming.length} à venir · {past.length} passé{past.length > 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/app/evenements/creer"
            style={{
              fontSize: "12px", padding: "7px 13px", display: "flex", alignItems: "center", gap: "6px",
              background: "#14171c", color: "white", border: "1px solid #14171c",
              borderRadius: "var(--border-radius-md)", textDecoration: "none",
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: "13px" }} />
            {t("create")}
          </Link>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "16px" }}>
        <button style={PILL(!showPast)} onClick={() => setShowPast(false)}>
          {t("upcoming")} · {upcoming.length}
        </button>
        {past.length > 0 && (
          <button style={{ ...PILL(showPast), marginLeft: "auto" }} onClick={() => setShowPast(true)}>
            {t("past")} · {past.length}
          </button>
        )}
      </div>

      {/* Grid of event cards */}
      {displayed.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          {t("noEvents")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          {displayed.map((e) => {
            const isIn = e.participants.length > 0;
            const isLoading = loadingId === e.id;
            const date = new Date(e.date);
            const day = date.getDate();
            const monthYear = date.toLocaleString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();
            const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const color = cardColor(e.id);
            const isPast = new Date(e.date) < now;

            return (
              <div
                key={e.id}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  overflow: "hidden",
                  opacity: isPast ? 0.7 : 1,
                }}
              >
                {/* Colored header */}
                <div
                  style={{
                    height: "100px",
                    background: color,
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px", padding: "3px 9px", borderRadius: "999px",
                      background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 500,
                    }}
                  >
                    <i className="ti ti-confetti" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "3px" }} />
                    {isPast ? "Passé" : "À venir"}
                  </span>
                  <div style={{ textAlign: "right", color: "white" }}>
                    <div style={{ fontSize: "24px", fontWeight: 500, lineHeight: 1 }}>{day}</div>
                    <div style={{ fontSize: "10px", opacity: 0.85, marginTop: "2px" }}>{monthYear}</div>
                  </div>
                  <i
                    className="ti ti-calendar-event"
                    style={{ position: "absolute", bottom: "-8px", right: "14px", fontSize: "52px", color: "rgba(255,255,255,0.18)" }}
                  />
                </div>

                {/* Body */}
                <div style={{ padding: "13px 14px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "3px" }}>{e.title}</div>
                  <div
                    style={{
                      fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "10px",
                      lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {e.description}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "10.5px", color: "var(--color-text-secondary)", marginBottom: "11px" }}>
                    <span><i className="ti ti-clock" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "3px" }} />{time}</span>
                    <span><i className="ti ti-map-pin" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "3px" }} />{e.location}</span>
                    {e.budget && (
                      <span><i className="ti ti-wallet" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "3px" }} />{e.budget.toLocaleString("fr-FR")} FCFA</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "11px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: "10.5px", color: "var(--color-text-secondary)" }}>
                      <i className="ti ti-users" style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "4px" }} />
                      {e._count.participants} inscrit{e._count.participants > 1 ? "s" : ""}
                    </span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                      <Link
                        href={`/app/evenements/${e.id}`}
                        style={{
                          fontSize: "11px", padding: "4px 10px", borderRadius: "var(--border-radius-md)",
                          border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        {t("detail")}
                      </Link>
                      {!isPast && (
                        <button
                          onClick={() => toggleParticipate(e)}
                          disabled={isLoading}
                          style={{
                            fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                            border: isIn ? "0.5px solid var(--color-border-tertiary)" : "none",
                            background: isIn ? "transparent" : "#1D9E75",
                            color: isIn ? "var(--color-text-secondary)" : "white",
                            cursor: "pointer", opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? "…" : isIn ? t("leave") : t("join")}
                        </button>
                      )}
                    </div>
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
