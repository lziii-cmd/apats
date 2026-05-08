import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminHome() {
  const [totalMembers, totalCategories, totalPosts, config] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.memberCategory.count(),
    db.post.count(),
    db.appConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const stats = [
    { label: "Membres", value: totalMembers, href: "/admin/membres" },
    { label: "Catégories", value: totalCategories, href: "/admin/categories" },
    { label: "Postes", value: totalPosts, href: "/admin/postes" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          {config?.orgName ?? "Amicale des PATs — ENSMG"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Année académique {config?.academicYear ?? "—"} · Admin Système
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 transition-colors"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-800">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Accès rapide</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Ajouter un membre", href: "/admin/membres" },
            { label: "Gérer les catégories", href: "/admin/categories" },
            { label: "Postes & Permissions", href: "/admin/postes" },
            { label: "Configuration", href: "/admin/config" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
