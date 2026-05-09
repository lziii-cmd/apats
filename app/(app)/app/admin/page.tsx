import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/app");

  const [totalMembers, totalCategories, totalPosts, config] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.memberCategory.count(),
    db.post.count(),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const stats = [
    { label: "MEMBRES", value: totalMembers, href: "/app/admin/membres", icon: "ti-users" },
    { label: "CATÉGORIES", value: totalCategories, href: "/app/admin/categories", icon: "ti-tag" },
    { label: "POSTES", value: totalPosts, href: "/app/admin/postes", icon: "ti-id-badge" },
  ];

  const quickLinks = [
    { label: "Ajouter un membre", href: "/app/admin/membres", icon: "ti-user-plus" },
    { label: "Gérer les catégories", href: "/app/admin/categories", icon: "ti-tag" },
    { label: "Postes & Permissions", href: "/app/admin/postes", icon: "ti-shield-check" },
    { label: "Configuration", href: "/app/admin/config", icon: "ti-settings" },
  ];

  return (
    <div style={{ padding: "20px 28px", maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          Admin Système
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
          {config?.orgName ?? "Amicale des PATs — ENSMG"} · Année académique {config?.academicYear ?? "—"}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card"
            style={{
              padding: "20px",
              textDecoration: "none",
              display: "block",
              transition: "box-shadow 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: "rgba(29,158,117,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: "16px", color: "var(--color-accent)" }} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-tertiary)", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                {s.label}
              </span>
            </div>
            <p style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-tertiary)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
          Accès rapide
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "12.5px", fontWeight: 500,
                color: "var(--color-text-primary)",
                background: "var(--color-background-secondary)",
                padding: "7px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                border: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <i className={`ti ${l.icon}`} style={{ fontSize: "14px", color: "var(--color-text-secondary)" }} />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
