"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { showToast } from "@/components/Toast";

type Announcement = {
  id: string;
  title: string;
  content: string;
  targetType: "ALL" | "CATEGORY" | "POST" | "BUREAU" | "HORS_BUREAU" | "SELECT";
  targetCategory: { name: string } | null;
  targetPosts: { post: { name: string } }[];
  _count: { targetRecipients: number };
  createdBy: { name: string };
  createdById: string;
  createdAt: string;
};

type Category = { id: string; name: string };
type Post = { id: string; name: string };
type Member = { id: string; name: string };

type Props = {
  canCreate: boolean;
  isAdmin: boolean;
  currentUserId: string;
  categories: Category[];
  posts: Post[];
  members: Member[];
};

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const MODAL: React.CSSProperties = {
  background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
  width: "100%", maxWidth: "520px", margin: "0 16px",
  padding: "24px", maxHeight: "90vh", overflowY: "auto",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "5px",
};
const INPUT: React.CSSProperties = {
  width: "100%", border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: "13px",
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
  outline: "none", boxSizing: "border-box" as const,
};
const BTN_PRI: React.CSSProperties = {
  flex: 1, background: "#14171c", color: "white", border: "none",
  borderRadius: "var(--border-radius-md)", padding: "9px 0", fontSize: "13px", cursor: "pointer",
};
const BTN_SEC: React.CSSProperties = {
  flex: 1, background: "transparent", color: "var(--color-text-secondary)",
  border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
  padding: "9px 0", fontSize: "13px", cursor: "pointer",
};

const AUTHOR_COLORS = ["#1D9E75", "#534AB7", "#2B5FA3", "#8B3A3A", "#5A7A2E", "#7A4F1D", "#C45E10", "#0F6E8E"];

function authorColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AUTHOR_COLORS[Math.abs(h) % AUTHOR_COLORS.length];
}

function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function CommunicationClient({
  canCreate, isAdmin, currentUserId, categories, posts, members,
}: Props) {
  const t = useTranslations("app.communication");
  const tc = useTranslations("common");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    targetType: "ALL",
    targetCategoryId: "",
    targetPostIds: [] as string[],
    targetUserIds: [] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/annonces");
      if (res.ok) {
        setAnnouncements(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.error ?? "Erreur lors du chargement des annonces.");
      }
    } catch {
      setFetchError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  function resetForm() {
    setForm({ title: "", content: "", targetType: "ALL", targetCategoryId: "", targetPostIds: [], targetUserIds: [] });
    setFormError("");
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function targetBadge(a: Announcement) {
    switch (a.targetType) {
      case "ALL": return t("targetBadgeAll");
      case "CATEGORY": return a.targetCategory ? t("targetBadgeCategory", { name: a.targetCategory.name }) : "";
      case "POST": {
        const names = a.targetPosts.map((p) => p.post.name);
        if (names.length === 0) return t("targetBadgePost");
        const label = names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")}…`;
        return t("targetBadgePost") + " : " + label;
      }
      case "BUREAU": return t("targetBadgeBureau");
      case "HORS_BUREAU": return t("targetBadgeHorsBureau");
      case "SELECT": return t("targetBadgeSelect", { count: a._count.targetRecipients });
    }
  }

  function togglePostId(id: string) {
    setForm((f) => ({
      ...f,
      targetPostIds: f.targetPostIds.includes(id)
        ? f.targetPostIds.filter((x) => x !== id)
        : [...f.targetPostIds, id],
    }));
  }

  function toggleUserId(id: string) {
    setForm((f) => ({
      ...f,
      targetUserIds: f.targetUserIds.includes(id)
        ? f.targetUserIds.filter((x) => x !== id)
        : [...f.targetUserIds, id],
    }));
  }

  function isPublishDisabled() {
    if (!form.title.trim() || !form.content.trim()) return true;
    if (form.targetType === "CATEGORY" && !form.targetCategoryId) return true;
    if (form.targetType === "POST" && form.targetPostIds.length === 0) return true;
    if (form.targetType === "SELECT" && form.targetUserIds.length === 0) return true;
    return false;
  }

  async function handlePublish() {
    if (isPublishDisabled()) return;
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/annonces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          targetType: form.targetType,
          targetCategoryId: form.targetType === "CATEGORY" ? form.targetCategoryId : undefined,
          targetPostIds: form.targetType === "POST" ? form.targetPostIds : undefined,
          targetUserIds: form.targetType === "SELECT" ? form.targetUserIds : undefined,
        }),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        showToast("Annonce publiée.");
        fetchAnnouncements();
      } else {
        const data = await res.json();
        setFormError(data.error ?? "Erreur");
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/annonces/${id}`, { method: "DELETE" });
      setDeleteId(null);
      showToast("Annonce supprimée.", "info");
      fetchAnnouncements();
    } finally {
      setDeleteLoading(false);
    }
  }

  /* Stats for sidebar */
  const last30 = announcements.filter((a) => {
    const d = new Date(a.createdAt);
    return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;
  const byType: Record<string, number> = {};
  announcements.forEach((a) => { byType[a.targetType] = (byType[a.targetType] ?? 0) + 1; });

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>{t("title")}</h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            {announcements.length} annonce{announcements.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* 2-column layout: feed + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: "16px", alignItems: "start" }}>
        {/* ── Left: Feed ── */}
        <div>
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          {tc("loading")}
        </div>
      ) : fetchError ? (
        <div style={{
          padding: "12px 16px", borderRadius: "var(--border-radius-md)",
          background: "#FEF2F2", border: "0.5px solid #FECACA",
          color: "#991B1B", fontSize: "13px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <span>
            <i className="ti ti-alert-circle" style={{ fontSize: "14px", verticalAlign: "-2px", marginRight: "6px" }} />
            {fetchError}
          </span>
          <button
            onClick={fetchAnnouncements}
            style={{
              fontSize: "11px", padding: "4px 12px", borderRadius: "var(--border-radius-md)",
              background: "white", color: "#991B1B", border: "0.5px solid #FECACA",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            Réessayer
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          {t("noAnnouncements")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {announcements.map((a: Announcement) => {
            const color = authorColor(a.createdBy.name);
            const initials = getInitials(a.createdBy.name);
            return (
              <div
                key={a.id}
                style={{
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderLeft: `3px solid ${color}`,
                  borderRadius: "var(--border-radius-md)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {/* Author avatar */}
                  <div
                    style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: color, color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 500, flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {a.createdBy.name}
                      </span>
                      <span style={{ fontSize: "10.5px", color: "var(--color-text-tertiary)" }}>
                        {formatDate(a.createdAt)}
                      </span>
                      <span
                        style={{
                          fontSize: "10px", padding: "2px 8px", borderRadius: "999px",
                          background: "var(--color-background-secondary)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {targetBadge(a)}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: "13.5px", fontWeight: 500, marginBottom: "6px", color: "var(--color-text-primary)" }}>
                      {a.title}
                    </div>

                    {/* Content */}
                    <p
                      style={{
                        fontSize: "12.5px", color: "var(--color-text-secondary)", margin: 0,
                        whiteSpace: "pre-wrap", lineHeight: 1.5,
                      }}
                    >
                      {a.content}
                    </p>
                  </div>

                  {/* Delete button */}
                  {(isAdmin || a.createdById === currentUserId) && (
                    <button
                      onClick={() => setDeleteId(a.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-text-tertiary)", padding: "2px", flexShrink: 0,
                        lineHeight: 1,
                      }}
                      title={tc("delete")}
                    >
                      <i className="ti ti-trash" style={{ fontSize: "15px" }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

        </div>{/* end left feed */}

        {/* ── Right: Sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* CTA */}
          {canCreate && (
            <div
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "8px", color: "var(--color-text-primary)" }}>
                Publier une annonce
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.45 }}>
                Informez les membres de l&apos;amicale — vous pouvez cibler par catégorie, poste ou sélection manuelle.
              </p>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  width: "100%", fontSize: "12px", padding: "8px 0",
                  background: "#14171c", color: "white", border: "none",
                  borderRadius: "var(--border-radius-md)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: "13px" }} />
                {t("newAnnouncement")}
              </button>
            </div>
          )}

          {/* Stats */}
          {!loading && !fetchError && (
            <div
              style={{
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "12px", color: "var(--color-text-primary)" }}>
                Statistiques
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Total annonces", value: announcements.length },
                  { label: "30 derniers jours", value: last30 },
                  { label: "Tous les membres", value: byType["ALL"] ?? 0 },
                  { label: "Bureau", value: byType["BUREAU"] ?? 0 },
                  { label: "Ciblées", value: (byType["CATEGORY"] ?? 0) + (byType["POST"] ?? 0) + (byType["SELECT"] ?? 0) + (byType["HORS_BUREAU"] ?? 0) },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "5px 0",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                    }}
                  >
                    <span style={{ fontSize: "11.5px", color: "var(--color-text-secondary)" }}>{s.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>{/* end right sidebar */}
      </div>{/* end grid */}

      {/* Modal — nouvelle annonce */}
      {showForm && (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>{t("newAnnouncement")}</h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", lineHeight: 1 }}
              >
                <i className="ti ti-x" style={{ fontSize: "18px" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={LABEL}>{t("announcementTitle")}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={INPUT}
                  placeholder={t("announcementTitle")}
                />
              </div>

              <div>
                <label style={LABEL}>{t("announcementContent")}</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  style={{ ...INPUT, resize: "none" }}
                  placeholder={t("contentPlaceholder")}
                />
              </div>

              <div>
                <label style={LABEL}>{t("targetType")}</label>
                <select
                  value={form.targetType}
                  onChange={(e) => setForm({ ...form, targetType: e.target.value, targetCategoryId: "", targetPostIds: [], targetUserIds: [] })}
                  style={INPUT}
                >
                  <option value="ALL">{t("targetAll")}</option>
                  <option value="BUREAU">{t("targetBureau")}</option>
                  <option value="HORS_BUREAU">{t("targetHorsBureau")}</option>
                  <option value="CATEGORY">{t("targetCategory")}</option>
                  <option value="POST">{t("targetPost")}</option>
                  <option value="SELECT">{t("targetSelect")}</option>
                </select>
              </div>

              {form.targetType === "CATEGORY" && (
                <div>
                  <label style={LABEL}>{t("targetCategoryLabel")}</label>
                  <select
                    value={form.targetCategoryId}
                    onChange={(e) => setForm({ ...form, targetCategoryId: e.target.value })}
                    style={INPUT}
                  >
                    <option value="">— {t("choose")} —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {form.targetType === "POST" && (
                <div>
                  <label style={LABEL}>{t("targetPostLabel")}</label>
                  <div
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
                      padding: "8px", maxHeight: "176px", overflowY: "auto",
                      display: "flex", flexDirection: "column", gap: "2px",
                    }}
                  >
                    {posts.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", padding: "4px 8px", margin: 0 }}>
                        {t("noPosts")}
                      </p>
                    ) : posts.map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                          fontSize: "13px", color: "var(--color-text-primary)",
                          padding: "5px 8px", borderRadius: "5px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.targetPostIds.includes(p.id)}
                          onChange={() => togglePostId(p.id)}
                          style={{ accentColor: "var(--color-accent)" }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  {form.targetPostIds.length > 0 && (
                    <p style={{ fontSize: "11px", color: "var(--color-accent)", marginTop: "4px" }}>
                      {form.targetPostIds.length} {t("selectedPosts")}
                    </p>
                  )}
                </div>
              )}

              {form.targetType === "SELECT" && (
                <div>
                  <label style={LABEL}>{t("targetSelectLabel")}</label>
                  <div
                    style={{
                      border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
                      padding: "8px", maxHeight: "192px", overflowY: "auto",
                      display: "flex", flexDirection: "column", gap: "2px",
                    }}
                  >
                    {members.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", padding: "4px 8px", margin: 0 }}>
                        {t("noMembers")}
                      </p>
                    ) : members.map((m) => (
                      <label
                        key={m.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                          fontSize: "13px", color: "var(--color-text-primary)",
                          padding: "5px 8px", borderRadius: "5px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.targetUserIds.includes(m.id)}
                          onChange={() => toggleUserId(m.id)}
                          style={{ accentColor: "var(--color-accent)" }}
                        />
                        {m.name}
                      </label>
                    ))}
                  </div>
                  {form.targetUserIds.length > 0 && (
                    <p style={{ fontSize: "11px", color: "var(--color-accent)", marginTop: "4px" }}>
                      {form.targetUserIds.length} {t("selectedMembers")}
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <p style={{ fontSize: "12px", color: "#991B1B", margin: 0 }}>{formError}</p>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={BTN_SEC}>
                {tc("cancel")}
              </button>
              <button
                onClick={handlePublish}
                disabled={formLoading || isPublishDisabled()}
                style={{ ...BTN_PRI, opacity: formLoading || isPublishDisabled() ? 0.6 : 1 }}
              >
                {formLoading ? "…" : t("publish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — suppression */}
      {deleteId && (
        <div style={OVERLAY}>
          <div style={{ ...MODAL, maxWidth: "380px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 6px" }}>{t("deleteConfirm")}</h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteId(null)} style={BTN_SEC}>{tc("cancel")}</button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                style={{
                  ...BTN_PRI, background: "#991B1B",
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? "…" : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
