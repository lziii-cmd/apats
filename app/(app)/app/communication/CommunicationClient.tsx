"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Announcement = {
  id: string;
  title: string;
  content: string;
  targetType: "ALL" | "CATEGORY" | "POST";
  targetCategory: { name: string } | null;
  targetPost: { name: string } | null;
  createdBy: { name: string };
  createdById: string;
  createdAt: string;
};

type Category = { id: string; name: string };
type Post = { id: string; name: string };

type Props = {
  canCreate: boolean;
  isAdmin: boolean;
  currentUserId: string;
  categories: Category[];
  posts: Post[];
};

export default function CommunicationClient({ canCreate, isAdmin, currentUserId, categories, posts }: Props) {
  const t = useTranslations("app.communication");
  const tc = useTranslations("common");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    targetType: "ALL",
    targetCategoryId: "",
    targetPostId: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/annonces");
      if (res.ok) setAnnouncements(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function targetBadge(a: Announcement) {
    if (a.targetType === "ALL") return t("targetBadgeAll");
    if (a.targetType === "CATEGORY" && a.targetCategory)
      return t("targetBadgeCategory", { name: a.targetCategory.name });
    if (a.targetType === "POST" && a.targetPost)
      return t("targetBadgePost", { name: a.targetPost.name });
    return "";
  }

  async function handlePublish() {
    if (!form.title.trim() || !form.content.trim()) return;
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
          targetPostId: form.targetType === "POST" ? form.targetPostId : undefined,
        }),
      });
      if (res.ok) {
        setForm({ title: "", content: "", targetType: "ALL", targetCategoryId: "", targetPostId: "" });
        setShowForm(false);
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
      fetchAnnouncements();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded transition-colors">
            {t("newAnnouncement")}
          </button>
        )}
      </div>

      {/* Fil d'annonces */}
      {loading ? (
        <p className="text-sm text-gray-500">{tc("loading")}</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noAnnouncements")}</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 text-base">{a.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{t("by")} {a.createdBy.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {targetBadge(a)}
                    </span>
                  </div>
                </div>
                {(isAdmin || a.createdById === currentUserId) && (
                  <button onClick={() => setDeleteId(a.id)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">
                    {tc("delete")}
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-3">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-base font-semibold mb-4">{t("newAnnouncement")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("announcementTitle")}</label>
                <input type="text" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Titre de l'annonce" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("announcementContent")}</label>
                <textarea value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                  placeholder="Contenu de l'annonce…" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("targetType")}</label>
                <select value={form.targetType}
                  onChange={(e) => setForm({ ...form, targetType: e.target.value, targetCategoryId: "", targetPostId: "" })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="ALL">{t("targetAll")}</option>
                  <option value="CATEGORY">{t("targetCategory")}</option>
                  <option value="POST">{t("targetPost")}</option>
                </select>
              </div>

              {form.targetType === "CATEGORY" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("targetCategoryLabel")}</label>
                  <select value={form.targetCategoryId}
                    onChange={(e) => setForm({ ...form, targetCategoryId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">— Choisir —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {form.targetType === "POST" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("targetPostLabel")}</label>
                  <select value={form.targetPostId}
                    onChange={(e) => setForm({ ...form, targetPostId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">— Choisir —</option>
                    {posts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {formError && <p className="text-xs text-red-600">{formError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setFormError(""); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button onClick={handlePublish}
                disabled={formLoading || !form.title.trim() || !form.content.trim() ||
                  (form.targetType === "CATEGORY" && !form.targetCategoryId) ||
                  (form.targetType === "POST" && !form.targetPostId)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {formLoading ? "…" : t("publish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-4">{t("deleteConfirm")}</h2>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {deleteLoading ? "…" : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
