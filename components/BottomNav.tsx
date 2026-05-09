"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  isAdmin: boolean;
  canSeeMembers: boolean;
  canSeeTreasury: boolean;
}

type NavEntry = {
  href: string;
  icon: string;
  label: string;
};

const MORE_ITEMS_ADMIN: NavEntry[] = [
  { href: "/app/evenements", icon: "ti-confetti",    label: "Événements" },
  { href: "/app/tresorerie", icon: "ti-wallet",      label: "Trésorerie" },
  { href: "/app/communication", icon: "ti-bell",     label: "Annonces" },
  { href: "/app/profil",    icon: "ti-user-circle",  label: "Mon Profil" },
  { href: "/admin",         icon: "ti-settings",     label: "Administration" },
];

const MORE_ITEMS_MEMBER: NavEntry[] = [
  { href: "/app/evenements", icon: "ti-confetti",   label: "Événements" },
];

export default function BottomNav({ isAdmin, canSeeMembers, canSeeTreasury }: BottomNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  /* Close sheet on outside tap */
  useEffect(() => {
    if (!showMore) return;
    function handler(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMore]);

  /* Close sheet on navigation */
  useEffect(() => { setShowMore(false); }, [pathname]);

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  /* Nav items — differentiated by role */
  const isBureau = isAdmin || canSeeMembers;

  const mainItems: NavEntry[] = isBureau
    ? [
        { href: "/app",           icon: "ti-layout-dashboard", label: "Accueil" },
        { href: "/app/membres",   icon: "ti-users",            label: "Membres" },
        { href: "/app/cotisations", icon: "ti-credit-card",    label: "Cotisations" },
        { href: "/app/reunions",  icon: "ti-calendar-event",   label: "Réunions" },
      ]
    : [
        { href: "/app",             icon: "ti-layout-dashboard", label: "Accueil" },
        { href: "/app/communication", icon: "ti-bell",           label: "Annonces" },
        { href: "/app/cotisations", icon: "ti-credit-card",      label: "Cotisations" },
        { href: "/app/reunions",    icon: "ti-calendar-event",   label: "Réunions" },
        { href: "/app/profil",      icon: "ti-user-circle",      label: "Profil" },
      ];

  const moreItems: NavEntry[] = isBureau
    ? MORE_ITEMS_ADMIN.filter((i) => {
        if (i.href === "/app/tresorerie") return canSeeTreasury;
        if (i.href === "/admin") return isAdmin;
        return true;
      })
    : MORE_ITEMS_MEMBER;

  const showMoreTab = isBureau; /* membre simple has no "Plus" tab */

  /* Is any "more" item currently active? */
  const moreActive = moreItems.some((i) => isActive(i.href));

  return (
    <>
      {/* Bottom sheet backdrop */}
      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 39,
            background: "rgba(0,0,0,0.35)",
          }}
        />
      )}

      {/* Bottom sheet */}
      {showMore && (
        <div
          ref={sheetRef}
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom))",
            left: 0, right: 0,
            zIndex: 40,
            background: "var(--color-background-primary)",
            borderRadius: "16px 16px 0 0",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
            padding: "0 0 8px",
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--color-border-tertiary)" }} />
          </div>
          <div style={{
            padding: "0 16px 8px",
            fontSize: "10px", color: "var(--color-text-tertiary)",
            textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500,
          }}>
            Autres sections
          </div>
          {moreItems.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "13px 16px",
                borderBottom: idx < moreItems.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                textDecoration: "none",
                background: isActive(item.href) ? "rgba(29,158,117,0.05)" : "transparent",
              }}
            >
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: isActive(item.href) ? "rgba(29,158,117,0.12)" : "var(--color-background-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: "18px", color: isActive(item.href) ? "#1D9E75" : "var(--color-text-secondary)" }} />
              </div>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: isActive(item.href) ? "#1D9E75" : "var(--color-text-primary)" }}>
                {item.label}
              </span>
              <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "var(--color-text-tertiary)" }} />
            </Link>
          ))}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          height: "calc(72px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "#14171c",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "stretch",
          zIndex: 38,
        }}
        aria-label="Navigation principale"
      >
        {mainItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", textDecoration: "none",
                position: "relative",
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              {active && (
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: "28px", height: "2px",
                  background: "#1D9E75", borderRadius: "0 0 2px 2px",
                }} />
              )}
              <i
                className={`ti ${item.icon}`}
                style={{ fontSize: "22px", color: active ? "#ffffff" : "rgba(255,255,255,0.38)" }}
              />
              <span style={{
                fontSize: "9.5px", letterSpacing: "0.2px",
                color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                fontWeight: active ? 500 : 400,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* "Plus" tab — bureau/admin only */}
        {showMoreTab && (
          <button
            onClick={() => setShowMore((v) => !v)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "3px", background: (showMore || moreActive) ? "rgba(255,255,255,0.07)" : "transparent",
              border: "none", cursor: "pointer", position: "relative",
              transition: "background 0.15s",
            }}
            aria-expanded={showMore}
            aria-label="Plus de sections"
          >
            {moreActive && !showMore && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: "28px", height: "2px",
                background: "#1D9E75", borderRadius: "0 0 2px 2px",
              }} />
            )}
            <i
              className="ti ti-dots"
              style={{ fontSize: "22px", color: (showMore || moreActive) ? "#ffffff" : "rgba(255,255,255,0.38)" }}
            />
            <span style={{
              fontSize: "9.5px", letterSpacing: "0.2px",
              color: (showMore || moreActive) ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
              fontWeight: (showMore || moreActive) ? 500 : 400,
            }}>
              Plus
            </span>
          </button>
        )}
      </nav>
    </>
  );
}
