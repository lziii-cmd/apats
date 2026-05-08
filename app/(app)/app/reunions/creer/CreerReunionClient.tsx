"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Membre = { id: string; name: string };
type Props = { membres: Membre[] };

const EMPTY_FORM = {
  type: "BUREAU",
  title: "",
  date: "",
  endTime: "",
  location: "",
  speakers: "",
  agenda: "",
};

export default function CreerReunionClient({ membres }: Props) {
  const t = useTranslations("app.reunions");
  const tc = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAG = form.type === "AG";

  function toggleMembre(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(membres.map((m) => m.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reunions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          date: form.date,
          endTime: form.endTime || null,
          location: form.location,
          speakers: form.speakers || null,
          agenda: form.agenda,
          inviteeIds: isAG ? [] : Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      router.push(`/app/reunions/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/app/reunions" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        {t("backToList")}
      </Link>
      <h1 className="text-xl font-semibold mb-6">{t("create")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("type")}</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BUREAU">{t("typeBureau")}</option>
            <option value="AG">{t("typeAG")}</option>
            <option value="EXTRAORDINARY">{t("typeExtraordinary")}</option>
          </select>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("titleField")}</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date/heure */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t("date")}</label>
            <input
              type="datetime-local"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t("endTime")}</label>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lieu */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("location")}</label>
          <input
            type="text"
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Intervenants */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("speakers")}</label>
          <input
            type="text"
            value={form.speakers}
            onChange={(e) => setForm({ ...form, speakers: e.target.value })}
            placeholder="Noms séparés par des virgules"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Ordre du jour */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("agenda")}</label>
          <textarea
            required
            rows={4}
            value={form.agenda}
            onChange={(e) => setForm({ ...form, agenda: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Invités */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">{t("invitees")}</label>
          {isAG ? (
            <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded px-3 py-2">
              {t("agAutoInvite")}
            </p>
          ) : (
            <div>
              <div className="flex gap-3 mb-2">
                <button type="button" onClick={selectAll} className="text-xs text-blue-600 hover:underline">
                  Tout sélectionner
                </button>
                <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:underline">
                  Tout désélectionner
                </button>
                <span className="text-xs text-gray-400">{selectedIds.size} sélectionné(s)</span>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                {membres.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleMembre(m.id)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-800">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/app/reunions"
            className="flex-1 text-center border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
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
  );
}
