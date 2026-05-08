"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Category = { id: string; name: string };
type Post = { id: string; name: string };
type Membre = {
  id: string;
  name: string;
  email: string;
  isOverdue: boolean;
  category: { id: string; name: string; monthlyFee: number } | null;
  mandates: { id: string; startDate: string; endDate: string; post: { id: string; name: string } }[];
};

export default function MembresAppClient({
  categories,
  posts,
  canExport,
}: {
  categories: Category[];
  posts: Post[];
  canExport: boolean;
}) {
  const t = useTranslations("app.membres");
  const tc = useTranslations("common");

  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [postId, setPostId] = useState("");
  const [cotisationStatus, setCotisationStatus] = useState("all");

  const fetchMembres = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (postId) params.set("postId", postId);
    if (cotisationStatus !== "all") params.set("cotisationStatus", cotisationStatus);
    const res = await fetch(`/api/membres?${params}`);
    if (res.ok) setMembres(await res.json());
    setLoading(false);
  }, [categoryId, postId, cotisationStatus]);

  useEffect(() => {
    fetchMembres();
  }, [fetchMembres]);

  function handleExport() {
    window.open("/api/membres/export", "_blank");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {canExport && (
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            {t("export")}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("allPosts")}</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={cotisationStatus}
          onChange={(e) => setCotisationStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="overdue">{t("statusOverdue")}</option>
          <option value="upToDate">{t("statusUpToDate")}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">{tc("loading")}</p>
      ) : membres.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noMembers")}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t("name")}</th>
                <th className="px-4 py-3 text-left">{t("email")}</th>
                <th className="px-4 py-3 text-left">{t("category")}</th>
                <th className="px-4 py-3 text-left">{t("post")}</th>
                <th className="px-4 py-3 text-left">{t("mandateEnd")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {membres.map((m) => {
                const mandat = m.mandates[0];
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <span>{m.name}</span>
                      {m.isOverdue && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          {t("overdueTag")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3">{m.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {mandat ? (
                        <span>{mandat.post.name}</span>
                      ) : (
                        <span className="text-gray-400">{t("noPost")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {mandat
                        ? new Date(mandat.endDate).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/app/membres/${m.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {t("viewDetail")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
