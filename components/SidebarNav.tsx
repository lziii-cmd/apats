"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number | null;
  show?: boolean;
}

interface SidebarNavProps {
  userName: string;
  userRole: string;
  userInitials: string;
  navItems: NavItem[];
}

function getCurrentLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const val = match?.split("=")[1];
  return LOCALES.includes(val as Locale) ? (val as Locale) : "fr";
}

export default function SidebarNav({ userName, userRole, userInitials, navItems }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentLocale = getCurrentLocale();

  async function handleLocale(locale: Locale) {
    await fetch("/api/me/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  }

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        background: "#14171c",
        width: "184px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
        gap: "2px",
        minHeight: "100vh",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 6px 18px",
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            background: "#1D9E75",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className="ti ti-diamond" style={{ color: "white", fontSize: "16px" }} />
        </div>
        <div style={{ lineHeight: "1.15" }}>
          <div style={{ color: "#fff", fontWeight: 500, fontSize: "13px", letterSpacing: "0.3px" }}>
            APATS
          </div>
          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px" }}>Amicale ENSMG</div>
        </div>
      </div>

      {/* Section label */}
      <div
        style={{
          color: "rgba(255,255,255,0.32)",
          fontSize: "10px",
          letterSpacing: "0.8px",
          padding: "6px 8px 4px",
          textTransform: "uppercase",
        }}
      >
        Principal
      </div>

      {/* Nav items */}
      {navItems
        .filter((item) => item.show !== false)
        .map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "6px",
                background: active ? "rgba(29,158,117,0.16)" : "transparent",
                color: active ? "#5DCAA5" : "rgba(255,255,255,0.62)",
                fontSize: "12.5px",
                textDecoration: "none",
                fontWeight: active ? 500 : 400,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <i
                className={`ti ${item.icon}`}
                style={{ fontSize: "16px", flexShrink: 0 }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  style={{
                    background: active ? "rgba(255,255,255,0.08)" : "#D85A30",
                    color: "white",
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "8px",
                    flexShrink: 0,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

      {/* Bottom: user card + locale switcher */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "14px",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "6px 8px",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#0F6E56",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ lineHeight: "1.15", minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: "white",
                fontSize: "11px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName}
            </div>
            <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px" }}>{userRole}</div>
          </div>
        </div>

        {/* Locale switcher */}
        <div style={{ display: "flex", gap: "4px", padding: "4px 8px" }}>
          {LOCALES.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocale(locale)}
              disabled={isPending || locale === currentLocale}
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "none",
                cursor: locale === currentLocale ? "default" : "pointer",
                background:
                  locale === currentLocale ? "rgba(255,255,255,0.1)" : "transparent",
                color:
                  locale === currentLocale ? "white" : "rgba(255,255,255,0.42)",
                fontWeight: locale === currentLocale ? 500 : 400,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
