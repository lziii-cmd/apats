"use client";

import { useState, useEffect } from "react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("apats:toast", { detail: { message, type } }));
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener("apats:toast", handler);
    return () => window.removeEventListener("apats:toast", handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 200,
      display: "flex", flexDirection: "column-reverse", gap: "8px",
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-item"
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", borderRadius: "var(--border-radius-md)",
            background: t.type === "error" ? "#7F1D1D" : "#14171c",
            color: "white", fontSize: "13px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
            minWidth: "220px", maxWidth: "360px",
          }}
        >
          <i
            className={`ti ${t.type === "success" ? "ti-check" : t.type === "error" ? "ti-alert-circle" : "ti-info-circle"}`}
            style={{
              fontSize: "16px", flexShrink: 0,
              color: t.type === "success" ? "#5DCAA5" : t.type === "error" ? "#FCA5A5" : "#93C5FD",
            }}
          />
          <span style={{ lineHeight: 1.4 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
