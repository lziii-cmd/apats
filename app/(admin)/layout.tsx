import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col py-6 px-4 gap-2 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Admin Système
        </span>
        <Link
          href="/admin/admin"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          Tableau de bord
        </Link>
        <Link
          href="/admin/postes"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          Postes &amp; Permissions
        </Link>
        {/* Liens futurs : Membres (F-006), Config (F-008), etc. */}
      </aside>

      {/* Contenu */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
