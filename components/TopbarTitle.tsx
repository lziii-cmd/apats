"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, { label: string; icon: string }> = {
  "/app":              { label: "Tableau de bord", icon: "ti-layout-dashboard" },
  "/app/membres":      { label: "Membres",          icon: "ti-users" },
  "/app/cotisations":  { label: "Cotisations",      icon: "ti-credit-card" },
  "/app/reunions":     { label: "Réunions",          icon: "ti-calendar-event" },
  "/app/evenements":   { label: "Événements",        icon: "ti-confetti" },
  "/app/tresorerie":   { label: "Trésorerie",        icon: "ti-wallet" },
  "/app/communication":{ label: "Annonces",          icon: "ti-bell" },
  "/app/profil":       { label: "Mon Profil",        icon: "ti-user-circle" },
};

function resolve(pathname: string) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const parent = Object.keys(ROUTE_LABELS)
    .filter((k) => k !== "/app" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? ROUTE_LABELS[parent] : null;
}

export default function TopbarTitle() {
  const pathname = usePathname();
  const current = resolve(pathname);

  if (!current) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <i
        className={`ti ${current.icon}`}
        style={{ fontSize: "14px", color: "var(--color-text-tertiary)" }}
      />
      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
        {current.label}
      </span>
    </div>
  );
}
