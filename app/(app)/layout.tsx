import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { getUserFeatures } from "@/lib/permissions";
import { db } from "@/lib/db";
import SidebarNav from "@/components/SidebarNav";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import TopbarTitle from "@/components/TopbarTitle";
import Toast from "@/components/Toast";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [t, features, user] = await Promise.all([
    getTranslations("app.nav"),
    getUserFeatures(session.userId),
    db.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  const canSee = (feature: string) =>
    session.role === "ADMIN" || features.includes(feature as never);

  const userName = user?.name ?? session.email.split("@")[0];
  const userInitials = getInitials(userName);
  const userRole = session.role === "ADMIN" ? "Administrateur" : "Membre";

  const navItems = [
    { href: "/app", icon: "ti-layout-dashboard", label: t("dashboard"), show: true },
    { href: "/app/membres", icon: "ti-users", label: t("membres"), show: canSee("MEMBERS_VIEW") },
    { href: "/app/cotisations", icon: "ti-credit-card", label: t("cotisations"), show: true },
    { href: "/app/reunions", icon: "ti-calendar-event", label: t("reunions"), show: true },
    { href: "/app/evenements", icon: "ti-confetti", label: t("evenements"), show: true },
    { href: "/app/tresorerie", icon: "ti-wallet", label: t("tresorerie"), show: canSee("TREASURY_VIEW") },
    { href: "/app/communication", icon: "ti-bell", label: t("communication"), show: true },
    { href: "/app/profil", icon: "ti-user-circle", label: t("profil"), show: true },
  ];

  const isAdmin = session.role === "ADMIN";
  const canSeeMembers = canSee("MEMBERS_VIEW");
  const canSeeTreasury = canSee("TREASURY_VIEW");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar — desktop only */}
      <div className="sidebar-desktop">
        <SidebarNav
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
          navItems={navItems}
          isAdmin={isAdmin}
        />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <header
          style={{
            height: "48px",
            background: "var(--color-background-primary)",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <TopbarTitle />
          <NotificationBell />
        </header>

        <main className="main-content" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="bottom-nav-mobile">
        <BottomNav
          isAdmin={isAdmin}
          canSeeMembers={canSeeMembers}
          canSeeTreasury={canSeeTreasury}
        />
      </div>

      <Toast />
    </div>
  );
}
