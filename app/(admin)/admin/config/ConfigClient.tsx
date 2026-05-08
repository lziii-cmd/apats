"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";

type Config = {
  id: string;
  orgName: string;
  logoUrl: string | null;
  defaultLocale: string;
  academicYear: string;
  mandateDurationDays: number;
};

export default function ConfigClient({ config }: { config: Config }) {
  const t = useTranslations("admin.config");
  const tc = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    orgName: config.orgName,
    defaultLocale: config.defaultLocale,
    academicYear: config.academicYear,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(config.logoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
  const [logoError, setLogoError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Erreur");
        return;
      }
      setSaveMsg(t("saveSuccess"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setLogoMsg("");
    setLogoError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/config/logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        setLogoError(d.error ?? "Erreur");
        return;
      }
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      setLogoMsg(t("logoUploadSuccess"));
      router.refresh();
    } finally {
      setLogoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogoDelete() {
    if (!confirm(t("logoDeleteConfirm"))) return;
    setLogoLoading(true);
    setLogoMsg("");
    setLogoError("");
    try {
      const res = await fetch("/api/admin/config/logo", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setLogoError(d.error ?? "Erreur");
        return;
      }
      setLogoUrl(null);
      setLogoMsg(t("logoDeleteSuccess"));
      router.refresh();
    } finally {
      setLogoLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold mb-6">{t("title")}</h1>

      {/* Section Logo */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-3">{t("logo")}</p>

        <div className="flex items-center gap-4 mb-3">
          {logoUrl ? (
            <div className="relative w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50">
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
              {t("logoNone")}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={logoLoading}
              onClick={() => fileInputRef.current?.click()}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-60"
            >
              {logoLoading ? "…" : t("logoUpload")}
            </button>
            {logoUrl && (
              <button
                type="button"
                disabled={logoLoading}
                onClick={handleLogoDelete}
                className="text-sm text-red-500 hover:underline disabled:opacity-60"
              >
                {t("logoDelete")}
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <p className="text-xs text-gray-400">{t("logoHint")}</p>

        {logoMsg && (
          <p className="mt-2 text-sm text-green-600">{logoMsg}</p>
        )}
        {logoError && (
          <p className="mt-2 text-sm text-red-600">{logoError}</p>
        )}
      </div>

      {/* Formulaire config */}
      <form onSubmit={handleSave} className="space-y-5">
        {saveError && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("orgName")}</label>
          <input
            type="text"
            required
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("defaultLocale")}</label>
          <select
            value={form.defaultLocale}
            onChange={(e) => setForm({ ...form, defaultLocale: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fr">{t("localeFr")}</option>
            <option value="en">{t("localeEn")}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("academicYear")}</label>
          <input
            type="text"
            required
            placeholder="2025-2026"
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">{t("academicYearHint")}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm transition-colors disabled:opacity-60"
          >
            {saving ? "…" : tc("save")}
          </button>
          {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}
        </div>
      </form>
    </div>
  );
}
