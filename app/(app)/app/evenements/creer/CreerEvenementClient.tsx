"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CreerEvenementClient() {
  const t = useTranslations("app.evenements");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", date: "", endDate: "", location: "",
    description: "", responsible: "", budget: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/evenements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          endDate: form.endDate || null,
          location: form.location,
          description: form.description,
          responsible: form.responsible || null,
          budget: form.budget ? Number(form.budget) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); return; }
      router.push(`/app/evenements/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/app/evenements" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← {t("backToList")}
      </Link>
      <h1 className="text-xl font-semibold mb-6">{t("createTitle")}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("titleField")} *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("date")} *</label>
            <input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("endDate")}</label>
            <input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("location")} *</label>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("description")} *</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} required rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("responsible")}</label>
            <input value={form.responsible} onChange={(e) => set("responsible", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("budget")}</label>
            <div className="relative">
              <input type="number" min="0" value={form.budget} onChange={(e) => set("budget", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-14" />
              <span className="absolute right-3 top-2 text-sm text-gray-400">FCFA</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/app/evenements"
            className="flex-1 text-center border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm disabled:opacity-60 transition-colors">
            {loading ? "…" : t("createSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}
