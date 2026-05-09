"use client";

import { useState, useTransition } from "react";
import { Feature } from "@prisma/client";
import { useTranslations } from "next-intl";

// Labels statiques conservés comme fallback (écrasés par les traductions à l'usage)
const FEATURE_LABELS: Record<Feature, string> = {
  MEMBERS_VIEW:         "Membres — Voir la liste",
  MEMBERS_VIEW_DETAIL:  "Membres — Voir le détail",
  MEMBERS_EXPORT:       "Membres — Exporter",
  COTISATIONS_VIEW:     "Cotisations — Voir",
  COTISATIONS_MANAGE:   "Cotisations — Gérer",
  COTISATIONS_CONFIRM:  "Cotisations — Confirmer paiements",
  MEETINGS_VIEW:        "Réunions — Voir",
  MEETINGS_CREATE:      "Réunions — Créer",
  MEETINGS_ATTENDANCE:  "Réunions — Émargement",
  MEETINGS_UPLOAD_PV:   "Réunions — Upload PV",
  EVENTS_CREATE:        "Événements — Créer",
  TREASURY_VIEW:        "Trésorerie — Voir",
  TREASURY_MANAGE:      "Trésorerie — Gérer",
  TREASURY_EXPORT:      "Trésorerie — Exporter",
  ANNOUNCEMENTS_CREATE: "Annonces — Créer",
};

type PostWithPermissions = {
  id: string;
  name: string;
  permissions: { feature: Feature; granted: boolean }[];
  _count: { mandates: number };
};

interface Props {
  posts: PostWithPermissions[];
  allFeatures: Feature[];
}

export default function PostesClient({ posts: initialPosts, allFeatures }: Props) {
  const t = useTranslations("admin.postes");
  const [posts, setPosts] = useState<PostWithPermissions[]>(initialPosts);
  const [newPostName, setNewPostName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getGranted(post: PostWithPermissions, feature: Feature): boolean {
    return post.permissions.find((p) => p.feature === feature)?.granted ?? false;
  }

  // Créer un poste
  async function handleCreate() {
    const name = newPostName.trim();
    if (!name) return;
    setError(null);

    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error); return; }

    setPosts((prev) => [...prev, { ...data, permissions: [], _count: { mandates: 0 } }]);
    setNewPostName("");
  }

  // Renommer un poste
  async function handleRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setError(null);

    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error); return; }

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, name: data.name } : p)));
    setEditingId(null);
  }

  // Supprimer un poste
  async function handleDelete(id: string, name: string) {
    if (!confirm(t("deleteConfirm", { name }))) return;
    setError(null);

    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  // Toggler une permission (envoi de la grille complète)
  function handleToggle(postId: string, feature: Feature) {
    startTransition(async () => {
      setError(null);
      const post = posts.find((p) => p.id === postId)!;
      const current = getGranted(post, feature);

      // Construire la nouvelle grille complète
      const existingFeatures = new Set(post.permissions.map((p) => p.feature));
      const newPermissions = allFeatures
        .filter((f) => existingFeatures.has(f) || f === feature)
        .map((f) => ({
          feature: f,
          granted: f === feature ? !current : (post.permissions.find((p) => p.feature === f)?.granted ?? false),
        }))
        .filter((p) => p.granted); // n'envoyer que les features accordées

      // Mise à jour optimiste locale
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const perms = allFeatures
            .map((f) => ({
              feature: f,
              granted: f === feature ? !current : (p.permissions.find((x) => x.feature === f)?.granted ?? false),
            }))
            .filter((x) => x.granted);
          return { ...p, permissions: perms };
        })
      );

      const res = await fetch(`/api/admin/posts/${postId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        // Rollback optimiste
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...post } : p))
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Erreur globale */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Créer un poste */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder={t("newPostPlaceholder")}
          value={newPostName}
          onChange={(e) => setNewPostName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="border rounded px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newPostName.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {t("addPost")}
        </button>
      </div>

      {/* Matrice permissions */}
      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">{t("noPost")}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[220px]">
                  {t("feature")}
                </th>
                {posts.map((post) => (
                  <th
                    key={post.id}
                    className="px-3 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[130px]"
                  >
                    {editingId === post.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(post.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="border rounded px-2 py-1 text-xs w-full"
                        />
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleRename(post.id)}
                            className="text-green-600 text-xs hover:underline"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 text-xs hover:underline"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span>{post.name}</span>
                        <span className="text-xs text-gray-400 font-normal">
                          {post._count.mandates} {t("members")}
                        </span>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => { setEditingId(post.id); setEditingName(post.name); }}
                            className="text-blue-500 hover:underline"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(post.id, post.name)}
                            className="text-red-400 hover:underline"
                            title={
                              post._count.mandates > 0
                                ? "Des membres ont ce poste"
                                : "Supprimer"
                            }
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature, i) => (
                <tr
                  key={feature}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                    {t(`features.${feature}` as Parameters<typeof t>[0])}
                  </td>
                  {posts.map((post) => {
                    const granted = getGranted(post, feature);
                    const featureLabel = t(`features.${feature}` as Parameters<typeof t>[0]);
                    return (
                      <td
                        key={post.id}
                        className="text-center border-r border-gray-200 py-2"
                      >
                        <button
                          onClick={() => handleToggle(post.id, feature)}
                          disabled={isPending}
                          aria-label={`${granted ? "Retirer" : "Accorder"} ${featureLabel} pour ${post.name}`}
                          className={`w-8 h-8 rounded-full text-sm transition-colors ${
                            granted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          } disabled:opacity-50`}
                        >
                          {granted ? "✓" : "–"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
