"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  function formatDate(d: string) {
    const date = new Date(d);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          width: "32px",
          height: "32px",
          borderRadius: "var(--border-radius-md)",
          border: "0.5px solid var(--color-border-tertiary)",
          background: open ? "var(--color-background-secondary)" : "var(--color-background-primary)",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
      >
        <i className="ti ti-bell" style={{ fontSize: "15px" }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "3px",
              right: "3px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#D85A30",
              border: "1.5px solid var(--color-background-primary)",
            }}
          />
        )}
      </button>

      {/* Dropdown — right-aligned to prevent overflow */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "320px",
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 7px",
                  borderRadius: "999px",
                  background: "#FCEBEB",
                  color: "#791F1F",
                  fontWeight: 500,
                }}
              >
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--color-text-tertiary)",
                  fontSize: "12px",
                }}
              >
                <i className="ti ti-bell-off" style={{ fontSize: "22px", display: "block", marginBottom: "6px", opacity: 0.5 }} />
                Aucune notification
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "11px 16px",
                    borderTop: i > 0 ? "0.5px solid var(--color-border-tertiary)" : undefined,
                    background: n.isRead ? "transparent" : "rgba(29,158,117,0.04)",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: n.isRead ? "transparent" : "#1D9E75",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: n.isRead ? 400 : 500,
                          color: "var(--color-text-primary)",
                          lineHeight: 1.35,
                          marginBottom: "2px",
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.4,
                          marginBottom: "4px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {n.body}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>
                        {formatDate(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
