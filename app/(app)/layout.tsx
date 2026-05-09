import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { getUserFeatures } from "@/lib/permissions";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import NotificationBell from "@/components/NotificationBell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("app.nav");
  const features = await getUserFeatures(session.userId);

  const canSee = (feature: string) =>
    session.role === "ADMIN" || features.includes(feature as never);

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-800 text-gray-100 flex flex-col py-6 px-4 gap-1 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Amicale APATS
        </span>

        <Link href="/app" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("dashboard")}
        </Link>

        {canSee("MEMBERS_VIEW") && (
          <Link href="/app/membres" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
            {t("membres")}
          </Link>
        )}

        <Link href="/app/cotisations" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("cotisations")}
        </Link>

        <Link href="/app/reunions" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("reunions")}
        </Link>

        <Link href="/app/evenements" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("evenements")}
        </Link>

        {canSee("TREASURY_VIEW") && (
          <Link href="/app/tresorerie" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
            {t("tresorerie")}
          </Link>
        )}

        <Link href="/app/communication" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("communication")}
        </Link>

        <Link href="/app/profil" className="rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors">
          {t("profil")}
        </Link>

        <div className="mt-auto pt-4 border-t border-gray-700">
          <LocaleSwitcher />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-4 shrink-0">
          <NotificationBell />
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
