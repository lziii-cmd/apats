import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("admin.nav");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col py-6 px-4 gap-2 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Admin Système
        </span>
        <Link
          href="/admin"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          {t("dashboard")}
        </Link>
        <Link
          href="/admin/membres"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          {t("membres")}
        </Link>
        <Link
          href="/admin/categories"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          {t("categories")}
        </Link>
        <Link
          href="/admin/postes"
          className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
        >
          {t("postes")}
        </Link>

        <div className="mt-auto pt-4 border-t border-gray-700">
          <LocaleSwitcher />
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
