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

/* Deterministic avatar color from initials */
const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#F1EFE8", color: "#444441" },
];

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Category badge style */
function CategoryBadge({ name }: { name: string }) {
  const lower = name.toLowerCase();
  let style: React.CSSProperties = { background: "#F1EFE8", color: "#444441" };
  if (lower.includes("cdi") || lower.includes("permanent")) style = { background: "#E6F1FB", color: "#0C447C" };
  else if (lower.includes("cdd") || lower.includes("contract")) style = { background: "#FAEEDA", color: "#633806" };
  return (
    <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, ...style }}>
      {name}
    </span>
  );
}

const PILL_BTN_STYLE = (active: boolean): React.CSSProperties => ({
  fontSize: "11px",
  padding: "5px 11px",
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  fontWeight: active ? 500 : 400,
  background: active ? "#14171c" : "var(--color-background-secondary)",
  color: active ? "white" : "var(--color-text-secondary)",
  whiteSpace: "nowrap" as const,
});

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
  const [search, setSearch] = useState("");
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

  const filtered = search
    ? membres.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : membres;

  return (
    <div style={{ padding: "22px 24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>{t("title")}</h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            {membres.length} membres
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {canExport && (
            <button
              onClick={handleExport}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-primary)",
                cursor: "pointer",
                color: "var(--color-text-primary)",
              }}
            >
              <i className="ti ti-download" style={{ fontSize: "13px" }} />
              {t("export")}
            </button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "180px", maxWidth: "280px" }}>
          <i
            className="ti ti-search"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
              fontSize: "13px",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={t("search") || "Rechercher un membre…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 30px",
              fontSize: "12px",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category pills */}
        <button style={PILL_BTN_STYLE(categoryId === "")} onClick={() => setCategoryId("")}>
          {t("allCategories")} · {membres.length}
        </button>
        {categories.map((c) => (
          <button key={c.id} style={PILL_BTN_STYLE(categoryId === c.id)} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}

        {/* Overdue filter */}
        <button
          style={{ ...PILL_BTN_STYLE(cotisationStatus === "overdue"), marginLeft: "auto" }}
          onClick={() => setCotisationStatus(cotisationStatus === "overdue" ? "all" : "overdue")}
        >
          <i className="ti ti-filter" style={{ fontSize: "11px", marginRight: "4px" }} />
          {t("statusOverdue")}
        </button>
      </div>

      {/* Post filter */}
      {posts.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <select
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            style={{
              fontSize: "12px",
              padding: "5px 10px",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">{t("allPosts")}</option>
            {posts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          <i className="ti ti-loader-2" style={{ fontSize: "18px", display: "block", marginBottom: "8px" }} />
          {tc("loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          {t("noMembers")}
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {[t("name"), t("category"), t("post"), "Cotisation", ""].map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: i === 4 ? "right" : "left",
                    padding: i === 0 ? "9px 24px" : i === 4 ? "9px 24px" : "9px 12px",
                    fontSize: "10px",
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const mandat = m.mandates[0];
              const palette = avatarStyle(m.name);
              const initials = getInitials(m.name);
              return (
                <tr
                  key={m.id}
                  style={{
                    borderTop: "0.5px solid var(--color-border-tertiary)",
                    background: m.isOverdue ? "rgba(216,90,48,0.04)" : undefined,
                  }}
                >
                  <td style={{ padding: "10px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: palette.bg,
                          color: palette.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "12.5px" }}>{m.name}</div>
                        <div style={{ fontSize: "10.5px", color: "var(--color-text-secondary)" }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {m.category ? <CategoryBadge name={m.category.name} /> : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: mandat ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                    {mandat ? mandat.post.name : t("noPost")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {m.isOverdue ? (
                      <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", background: "#FCEBEB", color: "#791F1F", fontWeight: 500 }}>
                        En retard
                      </span>
                    ) : (
                      <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", background: "#E1F5EE", color: "#085041", fontWeight: 500 }}>
                        À jour
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 24px", textAlign: "right" }}>
                    <Link
                      href={`/app/membres/${m.id}`}
                      style={{ color: "var(--color-text-tertiary)", textDecoration: "none" }}
                    >
                      <i className="ti ti-chevron-right" style={{ fontSize: "16px" }} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination info */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            borderTop: "0.5px solid var(--color-border-tertiary)",
            fontSize: "11px",
            color: "var(--color-text-secondary)",
            marginTop: "0",
          }}
        >
          <span>
            {filtered.length} membre{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            {search && ` · Recherche "${search}"`}
          </span>
        </div>
      )}
    </div>
  );
}
