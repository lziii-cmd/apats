"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { showToast } from "@/components/Toast";

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

type Props = { meetings: Meeting[]; canCreate: boolean; currentUserId: string };

const TYPE_STYLE: Record<Meeting["type"], { bg: string; color: string; label: string }> = {
  BUREAU: { bg: "#E6F1FB", color: "#0C447C", label: "Bureau" },
  AG: { bg: "#EEEDFE", color: "#3C3489", label: "Assemblée Générale" },
  EXTRAORDINARY: { bg: "#FAEEDA", color: "#633806", label: "Extraordinaire" },
};

const STATUS_STYLE: Record<Meeting["status"], { bg: string; color: string; label: string; icon: string }> = {
  PLANNED: { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)", label: "Planifiée", icon: "ti-clock" },
  OPEN: { bg: "#E1F5EE", color: "#085041", label: "En cours", icon: "ti-broadcast" },
  CLOSED: { bg: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", label: "Clôturée", icon: "ti-check" },
};

const PILL = (active: boolean): React.CSSProperties => ({
  fontSize: "11px", padding: "5px 11px", borderRadius: "999px", border: "none", cursor: "pointer",
  fontWeight: active ? 500 : 400,
  background: active ? "#14171c" : "var(--color-background-secondary)",
  color: active ? "white" : "var(--color-text-secondary)",
  whiteSpace: "nowrap" as const,
});

export default function ReunionsClient({ meetings, canCreate }: Props) {
  const t = useTranslations("app.reunions");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PLANNED" | "OPEN" | "CLOSED" | "BUREAU" | "AG" | "EXTRAORDINARY">("ALL");

  async function toggleConfirm(meeting: Meeting) {
    const isConfirmed = meeting.attendees[0]?.preConfirmed ?? false;
    setLoadingId(meeting.id);
    try {
      await fetch(`/api/reunions/${meeting.id}/confirm`, { method: isConfirmed ? "DELETE" : "POST" });
      showToast(isConfirmed ? "Présence annulée." : "Présence confirmée.");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = meetings.filter((m) => {
    if (filter === "ALL") return true;
    if (["PLANNED", "OPEN", "CLOSED"].includes(filter)) return m.status === filter;
    return m.type === filter;
  });

  const upcoming = meetings.filter((m) => m.status !== "CLOSED");
  const closedCount = meetings.filter((m) => m.status === "CLOSED").length;

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>{t("title")}</h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            {upcoming.length} à venir · {closedCount} clôturée{closedCount > 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/app/reunions/creer"
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
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <button style={PILL(filter === "ALL")} onClick={() => setFilter("ALL")}>Toutes · {meetings.length}</button>
        <button style={PILL(filter === "PLANNED")} onClick={() => setFilter("PLANNED")}>À venir · {meetings.filter(m => m.status === "PLANNED").length}</button>
        <button style={PILL(filter === "BUREAU")} onClick={() => setFilter("BUREAU")}>Bureau · {meetings.filter(m => m.type === "BUREAU").length}</button>
        <button style={PILL(filter === "AG")} onClick={() => setFilter("AG")}>AG · {meetings.filter(m => m.type === "AG").length}</button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          {t("noReunions")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {filtered.map((m) => {
            const date = new Date(m.date);
            const day = date.getDate();
            const monthLabel = date.toLocaleString("fr-FR", { month: "short" }).toUpperCase();
            const year = date.getFullYear();
            const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const endTimeStr = m.endTime
              ? new Date(m.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : null;
            const typeStyle = TYPE_STYLE[m.type];
            const statusStyle = STATUS_STYLE[m.status];
            const isInvited = m.attendees.length > 0;
            const isConfirmed = m.attendees[0]?.preConfirmed ?? false;
            const isLoading = loadingId === m.id;

            return (
              <div
                key={m.id}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "14px 16px",
                  opacity: m.status === "CLOSED" ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "stretch" }}>
                  {/* Mini date block */}
                  <div
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      minWidth: "52px", background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)", padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", letterSpacing: "0.5px" }}>{monthLabel}</div>
                    <div style={{ fontSize: "22px", fontWeight: 500, lineHeight: 1 }}>{day}</div>
                    <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>{year}</div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: typeStyle.bg, color: typeStyle.color, fontWeight: 500 }}>
                        {typeStyle.label}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: statusStyle.bg, color: statusStyle.color, fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>
                        <i className={`ti ${statusStyle.icon}`} style={{ fontSize: "10px" }} />
                        {statusStyle.label}
                      </span>
                      {isConfirmed && (
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "#E1F5EE", color: "#085041", fontWeight: 500 }}>
                          ✓ Confirmée
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>{m.title}</div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "10px" }}>
                      <span><i className="ti ti-clock" style={{ fontSize: "12px", verticalAlign: "-2px", marginRight: "4px" }} />{time}{endTimeStr ? ` → ${endTimeStr}` : ""}</span>
                      <span><i className="ti ti-map-pin" style={{ fontSize: "12px", verticalAlign: "-2px", marginRight: "4px" }} />{m.location}</span>
                      <span><i className="ti ti-users" style={{ fontSize: "12px", verticalAlign: "-2px", marginRight: "4px" }} />{m._count.attendees} {t("attendeesCount", { count: m._count.attendees }).replace(/\d+/, "").trim() || "convoqué(s)"}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Link
                        href={`/app/reunions/${m.id}`}
                        style={{
                          fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                          border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)",
                          textDecoration: "none", background: "var(--color-background-primary)",
                        }}
                      >
                        {t("detail")}
                      </Link>
                      {isInvited && m.status === "PLANNED" && (
                        <button
                          onClick={() => toggleConfirm(m)}
                          disabled={isLoading}
                          style={{
                            fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                            border: isConfirmed ? "0.5px solid var(--color-border-tertiary)" : "none",
                            background: isConfirmed ? "transparent" : "#1D9E75",
                            color: isConfirmed ? "var(--color-text-secondary)" : "white",
                            cursor: "pointer", opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? "…" : isConfirmed ? t("cancelPresence") : t("confirmPresence")}
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
