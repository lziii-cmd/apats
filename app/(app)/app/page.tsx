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
      <div style={{ fontSize: "10px", color: subColor, marginTop: "3px" }}>
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
    <svg viewBox="0 0 300 140" style={{ width: "100%", height: "140px", display: "block" }} role="img" aria-label="Graphique des cotisations mensuelles">
      <line x1="0" y1="110" x2="300" y2="110" stroke="var(--color-border-tertiary)" strokeWidth="0.5" />
      <line x1="0" y1="73" x2="300" y2="73" stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
      <line x1="0" y1="36" x2="300" y2="36" stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
      {monthlyData.map((d, i) => {
        const x = startX + i * (barWidth + gap);
        const isPast = i < now.getMonth();
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
            <text x={x + barWidth / 2} y="124" fontSize="9" textAnchor="middle"
              fill={isCurrent ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
              fontWeight={isCurrent ? "500" : undefined}>
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

  const isAdmin = session.role === "ADMIN";
  const [canViewCotisations, canViewTreasury, canViewMembers] = await Promise.all([
    isAdmin ? Promise.resolve(true) : hasPermission(session.userId, "COTISATIONS_VIEW" as Feature),
    isAdmin ? Promise.resolve(true) : hasPermission(session.userId, "TREASURY_VIEW" as Feature),
    isAdmin ? Promise.resolve(true) : hasPermission(session.userId, "MEMBERS_VIEW" as Feature),
  ]);

  /* Bureau = can see org-level data */
  const isBureau = isAdmin || canViewMembers || canViewCotisations;

  /* ── Fetch user info ── */
  const [user, config, nextMeeting, latestAnnouncement] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, category: { select: { monthlyFee: true } } },
    }),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
    db.meeting.findFirst({
      where: { status: { in: ["PLANNED", "OPEN"] }, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, type: true, _count: { select: { attendees: true } } },
    }).catch(() => null),
    db.announcement.findFirst({
      orderBy: { createdAt: "desc" },
      select: { title: true, content: true },
    }).catch(() => null),
  ]);

  /* First name from user.name, fallback to email prefix */
  const firstName = user?.name?.trim().split(/\s+/)[0]
    ?? session.email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const nextMeetingDate = nextMeeting?.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(nextMeeting.date)
    : null;
  const isMeetingToday = nextMeeting?.date
    ? new Date(nextMeeting.date).toDateString() === new Date().toDateString()
    : false;

  /* ══════════════════════════════════════════════════════
     BUREAU / ADMIN — dashboard organisationnel
  ══════════════════════════════════════════════════════ */
  if (isBureau) {
    const [totalMembers, cotisationStats, treasuryBalance] = await Promise.all([
      db.user.count({ where: { role: "MEMBER", isActive: true } }),
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
      canViewTreasury
        ? db.transaction.aggregate({ _sum: { amount: true } }).catch(() => null)
        : null,
    ]);

    let overdueCount: number | null = null;
    if (cotisationStats) {
      const now = new Date();
      overdueCount = cotisationStats.filter((m) => {
        const confirmedSet = new Set(m.monthlyPayments.map((p) => `${p.year}-${p.month}`));
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

    const balance = treasuryBalance?._sum?.amount ?? null;

    const MONTHS = ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû"];
    const MONTH_NUMS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
    const expectedPerMonth = totalMembers * (user?.category?.monthlyFee ?? 3000);
    const monthlyData = MONTHS.map((label, i) => {
      const monthNum = MONTH_NUMS[i];
      const collected = cotisationStats
        ? cotisationStats.reduce((sum, m) => {
            return sum + m.monthlyPayments.filter((p) => p.month === monthNum).reduce((s, p) => s + p.amountPaid, 0);
          }, 0)
        : 0;
      return { month: label, collected, expected: expectedPerMonth || 54000 };
    });

    return (
      <div style={{ padding: "22px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>
              Bonjour, {displayName} 👋
            </h1>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
              Voici l&apos;aperçu de l&apos;amicale aujourd&apos;hui.
            </p>
          </div>
          <span style={{ fontSize: "11px", padding: "4px 10px", background: "var(--color-background-secondary)", borderRadius: "999px", color: "var(--color-text-secondary)" }}>
            {config?.academicYear ?? "Année académique"}
          </span>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "9px", marginBottom: "18px" }}>
          {canViewMembers && (
            <KpiCard label="Membres actifs" value={totalMembers} sub="Inscrits" icon="ti-users" />
          )}
          {canViewCotisations && (
            <KpiCard
              label="En retard"
              value={overdueCount ?? "—"}
              sub={overdueCount === 0 ? "Tout est à jour" : overdueCount ? `${overdueCount} membre(s)` : "—"}
              subColor={overdueCount && overdueCount > 0 ? "#D85A30" : "var(--color-text-secondary)"}
              icon="ti-alert-circle"
            />
          )}
          <KpiCard
            label="Trésorerie"
            value={canViewTreasury && balance != null ? balance.toLocaleString("fr-FR") : "—"}
            unit={canViewTreasury ? "FCFA" : undefined}
            sub={canViewTreasury ? "Solde actuel" : "Accès restreint"}
            subColor={canViewTreasury && balance != null ? "#1D9E75" : "var(--color-text-secondary)"}
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
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>Cotisations mensuelles</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginTop: "1px" }}>{config?.academicYear ?? "Année académique"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "10px", color: "var(--color-text-secondary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", background: "#1D9E75", borderRadius: "2px", display: "inline-block" }} />Collecté
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", background: "#D3D1C7", borderRadius: "2px", display: "inline-block" }} />Attendu
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

          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "1px" }}>Activité récente</div>
            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginBottom: "12px" }}>Derniers événements</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              {canViewMembers && (
                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#E1F5EE", color: "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-users" style={{ fontSize: "13px" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.35 }}>{totalMembers} membres actifs</div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>Amicale APATS</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-calendar-plus" style={{ fontSize: "13px" }} />
                </div>
                <div>
                  <div style={{ fontSize: "11.5px", lineHeight: 1.35 }}>{nextMeetingDate ? `Prochaine réunion : ${nextMeetingDate}` : "Aucune réunion planifiée"}</div>
                  {nextMeeting && <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{nextMeeting._count.attendees} convoqué(s)</div>}
                </div>
              </div>
              {canViewCotisations && overdueCount != null && (
                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: overdueCount > 0 ? "#FCEBEB" : "#E1F5EE", color: overdueCount > 0 ? "#791F1F" : "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-alert-circle" style={{ fontSize: "13px" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.35 }}>{overdueCount > 0 ? `${overdueCount} membre(s) en retard` : "Toutes cotisations à jour"}</div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>Ce mois</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contextual banners */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
          {isMeetingToday && nextMeeting && (
            <a href={`/app/reunions/${nextMeeting.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#E1F5EE", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
              <i className="ti ti-qrcode" style={{ color: "#085041", fontSize: "17px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#085041", fontWeight: 500 }}>Réunion aujourd&apos;hui</div>
                <div style={{ fontSize: "11px", color: "#0F6E56" }}>Scanner ma présence →</div>
              </div>
            </a>
          )}
          {canViewCotisations && overdueCount != null && overdueCount > 0 && (
            <a href="/app/cotisations" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#FBEAEA", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
              <i className="ti ti-alert-triangle" style={{ color: "#7F1D1D", fontSize: "17px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#7F1D1D", fontWeight: 500 }}>{overdueCount} membre{overdueCount > 1 ? "s" : ""} en retard de cotisation</div>
                <div style={{ fontSize: "11px", color: "#991B1B" }}>Voir les cotisations →</div>
              </div>
            </a>
          )}
        </div>

        {/* Announcement banner */}
        {latestAnnouncement && (
          <a href="/app/communication" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#FAEEDA", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
            <i className="ti ti-bell" style={{ color: "#854F0B", fontSize: "16px", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", color: "#633806", fontWeight: 500 }}>{latestAnnouncement.title}</div>
              <div style={{ fontSize: "11px", color: "#854F0B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{latestAnnouncement.content}</div>
            </div>
          </a>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     MEMBRE SIMPLE — dashboard personnel
  ══════════════════════════════════════════════════════ */

  /* Fetch personal cotisation data */
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const myData = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      category: { select: { monthlyFee: true, name: true } },
      monthlyPayments: {
        where: { year: currentYear, month: currentMonth },
        select: { status: true, amountPaid: true },
        take: 1,
      },
      memberCards: {
        where: { academicYear: config?.academicYear ?? "" },
        select: { status: true },
        take: 1,
      },
      _count: {
        select: { monthlyPayments: { where: { status: "CONFIRMED" } } },
      },
    },
  });

  const myPaymentThisMonth = myData?.monthlyPayments[0] ?? null;
  const myCard = myData?.memberCards[0] ?? null;
  const myConfirmedCount = myData?._count.monthlyPayments ?? 0;
  const announcementCount = await db.announcement.count().catch(() => 0);

  /* Personal payment status */
  let paymentStatus: { label: string; color: string; bg: string } = { label: "Non dû", color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)" };
  if (myPaymentThisMonth?.status === "CONFIRMED") {
    paymentStatus = { label: "À jour ✓", color: "#085041", bg: "#E1F5EE" };
  } else if (myPaymentThisMonth?.status === "PENDING") {
    paymentStatus = { label: "En attente", color: "#633806", bg: "#FAEEDA" };
  } else if (myPaymentThisMonth?.status === "REJECTED") {
    paymentStatus = { label: "Rejeté", color: "#791F1F", bg: "#FBEAEA" };
  }

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>
            Bonjour, {displayName} 👋
          </h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            Voici votre tableau de bord personnel.
          </p>
        </div>
        <span style={{ fontSize: "11px", padding: "4px 10px", background: "var(--color-background-secondary)", borderRadius: "999px", color: "var(--color-text-secondary)" }}>
          {config?.academicYear ?? "Année académique"}
        </span>
      </div>

      {/* KPI grid — personal */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "9px", marginBottom: "18px" }}>
        <KpiCard
          label="Cotisation ce mois"
          value={paymentStatus.label}
          sub={myPaymentThisMonth ? `${myPaymentThisMonth.amountPaid.toLocaleString("fr-FR")} FCFA` : myData?.category?.monthlyFee ? `${myData.category.monthlyFee.toLocaleString("fr-FR")} FCFA attendus` : "—"}
          subColor={paymentStatus.color}
          icon="ti-credit-card"
        />
        <KpiCard
          label="Carte de membre"
          value={myCard ? (myCard.status === "CONFIRMED" ? "Prise ✓" : myCard.status === "PENDING" ? "En attente" : "Rejetée") : "Non prise"}
          sub={config?.academicYear ?? "—"}
          subColor={myCard?.status === "CONFIRMED" ? "#085041" : myCard?.status === "PENDING" ? "#633806" : "var(--color-text-secondary)"}
          icon="ti-id-badge"
        />
        <KpiCard
          label="Prochaine réunion"
          value={nextMeetingDate?.split(" ")[0] ?? "—"}
          unit={nextMeetingDate?.split(" ")[1]}
          sub={nextMeeting ? `${nextMeeting._count.attendees} convoqué(s)` : "Aucune planifiée"}
          icon="ti-calendar-event"
        />
        <KpiCard
          label="Annonces"
          value={announcementCount}
          sub="Fil de communication"
          icon="ti-bell"
        />
      </div>

      {/* Personal cotisation summary */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px", marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "10px" }}>Mes cotisations confirmées</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "28px", fontWeight: 500, lineHeight: 1, color: "#1D9E75" }}>{myConfirmedCount}</div>
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "3px" }}>
              paiement{myConfirmedCount > 1 ? "s" : ""} confirmé{myConfirmedCount > 1 ? "s" : ""} · {myData?.category?.name ?? "—"}
            </div>
          </div>
          <a
            href="/app/cotisations"
            style={{ fontSize: "11px", padding: "6px 14px", background: "#14171c", color: "white", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}
          >
            Gérer mes cotisations →
          </a>
        </div>
      </div>

      {/* Contextual banners */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
        {isMeetingToday && nextMeeting && (
          <a href={`/app/reunions/${nextMeeting.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#E1F5EE", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
            <i className="ti ti-qrcode" style={{ color: "#085041", fontSize: "17px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#085041", fontWeight: 500 }}>Réunion aujourd&apos;hui</div>
              <div style={{ fontSize: "11px", color: "#0F6E56" }}>Scanner ma présence →</div>
            </div>
          </a>
        )}
        {(!myPaymentThisMonth || myPaymentThisMonth.status === "REJECTED") && myData?.category?.monthlyFee && (
          <a href="/app/cotisations" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#FBEAEA", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
            <i className="ti ti-alert-triangle" style={{ color: "#7F1D1D", fontSize: "17px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#7F1D1D", fontWeight: 500 }}>Cotisation de {new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now)} non payée</div>
              <div style={{ fontSize: "11px", color: "#991B1B" }}>Déclarer un paiement →</div>
            </div>
          </a>
        )}
      </div>

      {/* Announcement banner */}
      {latestAnnouncement && (
        <a href="/app/communication" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#FAEEDA", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
          <i className="ti ti-bell" style={{ color: "#854F0B", fontSize: "16px", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", color: "#633806", fontWeight: 500 }}>{latestAnnouncement.title}</div>
            <div style={{ fontSize: "11px", color: "#854F0B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{latestAnnouncement.content}</div>
          </div>
        </a>
      )}
    </div>
  );
}
