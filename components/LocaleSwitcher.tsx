"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/request";

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "🇫🇷 Français",
  en: "🇬🇧 English",
};

function getCurrentLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const val = match?.split("=")[1];
  return LOCALES.includes(val as Locale) ? (val as Locale) : "fr";
}

export default function LocaleSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(locale: Locale) {
    await fetch("/api/me/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  }

  const current = getCurrentLocale();

  return (
    <div className="flex gap-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          onClick={() => handleChange(locale)}
          disabled={isPending || locale === current}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            locale === current
              ? "bg-gray-600 text-white cursor-default"
              : "text-gray-400 hover:bg-gray-700 hover:text-white"
          } disabled:opacity-60`}
          title={LOCALE_LABELS[locale]}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
