import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Feature } from "@prisma/client";

/* ─── KPI Card ─── */
function KpiCard({
  label,
  value,
  unit,
  sub,
  subColor = "var(--color-text-secondary)",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub: string;
  subColor?: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        padding: "13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "10px", color: "var(--color-text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          {label}
        </span>
        <i className={`ti ${icon}`} style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }} />
      </div>
      <div style={{ fontSize: "22px", fontWeight: 500, lineHeight: 1.1 }}>
        {value}
        {unit && (
          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginLeft: "3px", fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ fontSize: "10px", color: subColor, marginTop: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
        {sub}
      </div>
    </div>
  );
}

/* ─── Bar Chart SVG ─── */
function CotisationsChart({ monthlyData }: { monthlyData: { month: string; collected: number; expected: number }[] }) {
  const maxVal = Math.max(...monthlyData.map((d) => d.expected), 1);
  const chartHeight = 110;
  const barWidth = 18;
  const gap = 8;
  const startX = 22;
  const now = new Date();

  return (
    <svg viewBox={`0 0 300 140`} style={{ width: "100%", height: "140px", display: "block" }} role="img" aria-label="Graphique des cotisations mensuelles">
      <line x1="0" y1="110" x2="300" y2="110" stroke="var(--color-border-tertiary)" strokeWidth="0.5" />
      <line x1="0" y1="73" x2="300" y2="73" stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
      <line x1="0" y1="36" x2="300" y2="36" stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />

      {monthlyData.map((d, i) => {
        const x = startX + i * (barWidth + gap);
        const isPast = i < now.getMonth() || now.getFullYear() > 2026;
        const isCurrent = i === now.getMonth();
        const collectedH = Math.round((d.collected / maxVal) * chartHeight);
        const expectedH = Math.round((d.expected / maxVal) * chartHeight);
        const collectedY = 110 - collectedH;
        const expectedY = 110 - expectedH;

        return (
          <g key={d.month}>
            {isPast || isCurrent ? (
              <>
                <rect x={x} y={expectedY} width={barWidth} height={expectedH - collectedH} fill="#D3D1C7" opacity="0.4" rx="2" />
                <rect x={x} y={collectedY} width={barWidth} height={collectedH} fill={isCurrent ? "#5DCAA5" : "#1D9E75"} rx="2" />
              </>
            ) : (
              <rect x={x} y={expectedY} width={barWidth} height={expectedH} fill="#D3D1C7" opacity="0.35" rx="2" />
            )}
            <text
              x={x + barWidth / 2}
              y="124"
              fontSize="9"
              textAnchor="middle"
              fill={isCurrent ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
              fontWeight={isCurrent ? "500" : undefined}
            >
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("app.dashboard");

  const canViewCotisations =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));

  const canViewTreasury =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_VIEW" as Feature));

  const [totalMembers, config, cotisationStats, nextMeeting, latestAnnouncement, treasuryBalance] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", isActive: true } }),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
    canViewCotisations
      ? db.user.findMany({
          where: { role: "MEMBER" },
          select: {
            createdAt: true,
            monthlyPayments: {
              where: { status: "CONFIRMED" },
              select: { year: true, month: true, amountPaid: true },
            },
          },
        })
      : null,
    db.meeting.findFirst({
      where: { status: { in: ["PLANNED", "OPEN"] }, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      select: { date: true, _count: { select: { attendees: true } } },
    }).catch(() => null),
    db.announcement.findFirst({
      orderBy: { createdAt: "desc" },
      select: { title: true, content: true },
    }).catch(() => null),
    canViewTreasury
      ? db.transaction.aggregate({ _sum: { amount: true } }).then((r) => {
          const income = r._sum.amount ?? 0;
          return income;
        }).catch(() => null)
      : null,
  ]);

  // Overdue members count
  let overdueCount: number | null = null;
  if (cotisationStats) {
    const now = new Date();
    overdueCount = cotisationStats.filter((m) => {
      const confirmedSet = new Set(
        m.monthlyPayments.map((p) => `${p.year}-${p.month}`)
      );
      const start = new Date(m.createdAt);
      let cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const limit = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cur < limit) {
        if (!confirmedSet.has(`${cur.getFullYear()}-${cur.getMonth() + 1}`)) return true;
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      return false;
    }).length;
  }

  // Monthly chart data (Sep–Jul, academic year)
  const MONTHS = ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû"];
  const MONTH_NUMS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  const expectedPerMonth = totalMembers * (config ? 3000 : 0); // rough estimate

  const monthlyData = MONTHS.map((label, i) => {
    const monthNum = MONTH_NUMS[i];
    const collected = cotisationStats
      ? cotisationStats.reduce((sum, m) => {
          const matched = m.monthlyPayments.filter((p) => p.month === monthNum);
          return sum + matched.reduce((s, p) => s + p.amountPaid, 0);
        }, 0)
      : 0;
    return { month: label, collected, expected: expectedPerMonth || totalMembers * 2000 };
  });

  // Next meeting display
  const nextMeetingDate = nextMeeting?.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(nextMeeting.date)
    : null;

  // User first name
  const firstName = session.email.split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>
            {t("welcome", { name: displayName })}
          </h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            Voici un aperçu de l&apos;amicale aujourd&apos;hui.
          </p>
        </div>
        <span
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            background: "var(--color-background-secondary)",
            borderRadius: "999px",
            color: "var(--color-text-secondary)",
          }}
        >
          {config?.academicYear ?? "Année académique"}
        </span>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "9px", marginBottom: "18px" }}>
        <KpiCard
          label="Membres actifs"
          value={totalMembers}
          sub={`Inscrits`}
          icon="ti-users"
        />
        <KpiCard
          label="En retard"
          value={overdueCount ?? "—"}
          sub={overdueCount === 0 ? "Tout est à jour" : overdueCount ? `${overdueCount} membre(s)` : "—"}
          subColor={overdueCount && overdueCount > 0 ? "#D85A30" : "var(--color-text-secondary)"}
          icon="ti-alert-circle"
        />
        <KpiCard
          label="Trésorerie"
          value={canViewTreasury && treasuryBalance != null ? treasuryBalance.toLocaleString("fr-FR") : "—"}
          unit={canViewTreasury ? "FCFA" : undefined}
          sub={canViewTreasury ? "Solde actuel" : "Non autorisé"}
          subColor={canViewTreasury ? "#1D9E75" : "var(--color-text-secondary)"}
          icon="ti-wallet"
        />
        <KpiCard
          label="Prochaine réunion"
          value={nextMeetingDate?.split(" ")[0] ?? "—"}
          unit={nextMeetingDate?.split(" ")[1]}
          sub={nextMeeting ? `${nextMeeting._count.attendees} convoqué(s)` : "Aucune planifiée"}
          icon="ti-calendar-event"
        />
      </div>

      {/* Chart + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px", marginBottom: "14px" }}>
        {/* Chart */}
        <div
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500 }}>Cotisations mensuelles</div>
              <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginTop: "1px" }}>
                {config?.academicYear ?? "Année académique"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "10px", color: "var(--color-text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#1D9E75", borderRadius: "2px", display: "inline-block" }} />
                Collecté
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#D3D1C7", borderRadius: "2px", display: "inline-block" }} />
                Attendu
              </span>
            </div>
          </div>
          {canViewCotisations ? (
            <CotisationsChart monthlyData={monthlyData} />
          ) : (
            <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: "12px" }}>
              Accès non autorisé
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div
          style={{
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            padding: "14px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "1px" }}>Activité récente</div>
          <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginBottom: "12px" }}>Derniers événements</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            {[
              { icon: "ti-users", bg: "#E1F5EE", color: "#0F6E56", text: `${totalMembers} membres actifs`, sub: "Amicale APATS" },
              { icon: "ti-calendar-plus", bg: "#E6F1FB", color: "#185FA5", text: nextMeetingDate ? `Prochaine réunion : ${nextMeetingDate}` : "Aucune réunion planifiée", sub: nextMeeting ? `${nextMeeting._count.attendees} convoqué(s)` : "" },
              { icon: "ti-alert-circle", bg: overdueCount && overdueCount > 0 ? "#FCEBEB" : "#E1F5EE", color: overdueCount && overdueCount > 0 ? "#791F1F" : "#0F6E56", text: overdueCount != null ? (overdueCount > 0 ? `${overdueCount} membre(s) en retard` : "Toutes cotisations à jour") : "Cotisations — accès restreint", sub: "Ce mois" },
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: item.bg,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: "13px" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "11.5px", lineHeight: 1.35 }}>{item.text}</div>
                  {item.sub && <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{item.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement banner */}
      {latestAnnouncement && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 14px",
            background: "#FAEEDA",
            borderRadius: "var(--border-radius-md)",
          }}
        >
          <i className="ti ti-bell" style={{ color: "#854F0B", fontSize: "16px", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", color: "#633806", fontWeight: 500 }}>{latestAnnouncement.title}</div>
            <div
              style={{
                fontSize: "11px",
                color: "#854F0B",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {latestAnnouncement.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
