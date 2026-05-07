"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Category = { id: string; name: string; monthlyFee: number; _count: { users: number } };

export default function CategoriesClient({ categories }: { categories: Category[] }) {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("common");
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", monthlyFee: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setForm({ name: "", monthlyFee: "" });
    setError("");
    setShowCreate(true);
    setEditCat(null);
  }

  function openEdit(c: Category) {
    setForm({ name: c.name, monthlyFee: String(c.monthlyFee) });
    setError("");
    setEditCat(c);
    setShowCreate(false);
  }

  function closeModal() {
    setShowCreate(false);
    setEditCat(null);
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, monthlyFee: form.monthlyFee }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(res.status === 409 ? t("nameConflict") : d.error ?? "Erreur");
        return;
      }
      closeModal();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${editCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, monthlyFee: form.monthlyFee }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(res.status === 409 ? t("nameConflict") : d.error ?? "Erreur");
        return;
      }
      closeModal();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(t("deleteConfirm", { name: c.name }))) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? t("deleteBlocked"));
      return;
    }
    router.refresh();
  }

  const isEditing = editCat !== null;
  const activeModal = showCreate || isEditing;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          + {t("add")}
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500 text-sm">{t("noCategories")}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t("name")}</th>
                <th className="px-4 py-3 text-right">{t("monthlyFee")}</th>
                <th className="px-4 py-3 text-right">{t("members")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.monthlyFee.toLocaleString("fr-FR")} FCFA
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {c._count.users} {t("members")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      {tc("edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {tc("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? t("editTitle") : t("add")}
            </h2>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("monthlyFee")}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
          </div>
        </div>
      )}
    </div>
  );
}
