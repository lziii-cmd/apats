"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Category = { id: string; name: string; monthlyFee: number };
type Post = { id: string; name: string };
type Mandate = { id: string; startDate: string; endDate: string; post: Post };
type Membre = {
  id: string;
  name: string;
  email: string;
  locale: string;
  createdAt: string;
  category: Category | null;
  mandates: Mandate[];
};

type Props = {
  membres: Membre[];
  categories: Category[];
  posts: Post[];
};

const EMPTY_FORM = { name: "", email: "", categoryId: "", postId: "", locale: "fr" };

export default function MembresClient({ membres, categories, posts }: Props) {
  const t = useTranslations("admin.membres");
  const tc = useTranslations("common");
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [editMembre, setEditMembre] = useState<Membre | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  function openCreate() {
    setForm(EMPTY_FORM);
    setError("");
    setTempPassword("");
    setShowCreate(true);
    setEditMembre(null);
  }

  function openEdit(m: Membre) {
    setForm({
      name: m.name,
      email: m.email,
      categoryId: m.category?.id ?? "",
      postId: m.mandates[0]?.post.id ?? "",
      locale: m.locale,
    });
    setError("");
    setTempPassword("");
    setEditMembre(m);
    setShowCreate(false);
  }

  function closeModal() {
    setShowCreate(false);
    setEditMembre(null);
    setTempPassword("");
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/membres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          categoryId: form.categoryId,
          postId: form.postId || undefined,
          locale: form.locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? t("emailConflict") : data.error ?? t("emailConflict"));
        return;
      }
      setTempPassword(data.tempPassword);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMembre) return;
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        categoryId: form.categoryId,
        locale: form.locale,
      };
      // postId vide = null (retirer le poste), sinon nouvelle attribution
      body.postId = form.postId === "" ? null : form.postId;

      const res = await fetch(`/api/admin/membres/${editMembre.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? t("emailConflict") : data.error ?? "Erreur");
        return;
      }
      closeModal();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const activeModal = showCreate || editMembre !== null;
  const isEditing = editMembre !== null;

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          + {t("add")}
        </button>
      </div>

      {/* Table */}
      {membres.length === 0 ? (
        <p className="text-gray-500 text-sm">{t("noMembers")}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t("name")}</th>
                <th className="px-4 py-3 text-left">{t("email")}</th>
                <th className="px-4 py-3 text-left">{t("category")}</th>
                <th className="px-4 py-3 text-left">{t("post")}</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {membres.map((m) => {
                const mandate = m.mandates[0] ?? null;
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3">
                      {m.category ? (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                          {m.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mandate ? (
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                          {mandate.post.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">{t("noMandate")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {tc("edit")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création / édition */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? t("editTitle") : t("add")}
            </h2>

            {/* Affichage mot de passe temporaire après création */}
            {tempPassword ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-sm font-medium text-green-800 mb-1">{t("createSuccess")}</p>
                  <p className="text-xs text-green-700 mb-2">{t("tempPasswordNote")}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t("tempPassword")} :</span>
                    <code className="bg-white border border-green-300 rounded px-3 py-1 font-mono text-sm font-bold tracking-wider">
                      {tempPassword}
                    </code>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full bg-gray-900 text-white py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  {tc("confirm")}
                </button>
              </div>
            ) : (
              <form onSubmit={isEditing ? handleEdit : handleCreate} className="space-y-4">
                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("name")}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("email")}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("category")}</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.monthlyFee} {t("fcfa")}/mois)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("post")}</label>
                  <select
                    value={form.postId}
                    onChange={(e) => setForm({ ...form, postId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("noPost")}</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("locale")}</label>
                  <select
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {loading ? "…" : tc("save")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
