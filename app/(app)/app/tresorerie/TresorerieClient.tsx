"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { showToast } from "@/components/Toast";

type TxCategory = { id: string; name: string; type: "INCOME" | "EXPENSE" | "BOTH"; isSystem: boolean };

type TxRow = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  categoryName: string;
  description: string;
  amount: number;
  source: "auto" | "manual";
  createdBy?: string;
};

type Summary = { totalIncome: number; totalExpense: number; balance: number };
type Props = { canManage: boolean; canExport: boolean };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

function fmt(n: number) { return n.toLocaleString("fr-FR") + " FCFA"; }

/* ── Shared modal styles ── */
const OVERLAY: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" };
const MODAL: React.CSSProperties = { background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", width: "100%", maxWidth: "440px", margin: "0 16px", padding: "24px", border: "0.5px solid var(--color-border-tertiary)" };
const LABEL: React.CSSProperties = { fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: "5px", letterSpacing: "0.3px", textTransform: "uppercase" };
const INPUT: React.CSSProperties = { width: "100%", fontSize: "12px", padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" };
const BTN_SEC: React.CSSProperties = { flex: 1, fontSize: "12px", padding: "8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "transparent", cursor: "pointer", color: "var(--color-text-primary)" };
const BTN_PRI: React.CSSProperties = { flex: 1, fontSize: "12px", padding: "8px", background: "#14171c", color: "white", border: "1px solid #14171c", borderRadius: "var(--border-radius-md)", cursor: "pointer" };
const PILL = (active: boolean): React.CSSProperties => ({ fontSize: "11px", padding: "5px 11px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: active ? 500 : 400, background: active ? "#14171c" : "var(--color-background-secondary)", color: active ? "white" : "var(--color-text-secondary)", whiteSpace: "nowrap" as const });

export default function TresorerieClient({ canManage, canExport }: Props) {
  const t = useTranslations("app.tresorerie");
  const tc = useTranslations("common");
  const currentYear = new Date().getFullYear();

  const [filterYear, setFilterYear] = useState<string>(String(currentYear));
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [categories, setCategories] = useState<TxCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "EXPENSE", categoryId: "", description: "", amount: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"INCOME" | "EXPENSE" | "BOTH">("BOTH");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/tresorerie/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (filterYear) p.set("year", filterYear);
    if (filterMonth) p.set("month", filterMonth);
    if (filterType) p.set("type", filterType);
    if (filterCategoryId) p.set("categoryId", filterCategoryId);
    return p.toString();
  }, [filterYear, filterMonth, filterType, filterCategoryId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildParams();
      const [sumRes, txRes] = await Promise.all([fetch("/api/tresorerie"), fetch(`/api/tresorerie/transactions?${qs}`)]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const addFormCategories = categories.filter((c) => c.type === "BOTH" || c.type === addForm.type);

  async function handleAdd() {
    if (!addForm.description || !addForm.amount || !addForm.categoryId) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/tresorerie/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: addForm.date, type: addForm.type, categoryId: addForm.categoryId, description: addForm.description, amount: parseInt(addForm.amount) }) });
      if (res.ok) { setShowAdd(false); setAddForm({ date: new Date().toISOString().slice(0, 10), type: "EXPENSE", categoryId: "", description: "", amount: "" }); showToast("Transaction ajoutée."); fetchData(); }
    } finally { setAddLoading(false); }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setCatLoading(true); setCatError("");
    try {
      const res = await fetch("/api/tresorerie/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName.trim(), type: newCatType }) });
      if (res.ok) { setNewCatName(""); fetchCategories(); } else { const d = await res.json(); setCatError(d.error ?? "Erreur"); }
    } finally { setCatLoading(false); }
  }

  async function handleDeleteCategory(id: string) {
    setCatLoading(true); setCatError("");
    try {
      const res = await fetch(`/api/tresorerie/categories/${id}`, { method: "DELETE" });
      if (res.ok) { fetchCategories(); } else { const d = await res.json(); setCatError(d.error ?? "Erreur"); }
    } finally { setCatLoading(false); }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try { await fetch(`/api/tresorerie/transactions/${id}`, { method: "DELETE" }); setDeleteId(null); showToast("Transaction supprimée.", "info"); fetchData(); }
    finally { setDeleteLoading(false); }
  }

  function handleExport() { window.open(`/api/tresorerie/export?${buildParams()}`, "_blank"); }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const txIncomeCount = transactions.filter((t) => t.type === "INCOME").length;
  const txExpenseCount = transactions.filter((t) => t.type === "EXPENSE").length;

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 2px" }}>{t("title")}</h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
            Suivi financier · {filterYear || "Toutes années"} · {transactions.length} transaction{transactions.length > 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {canManage && (
            <button onClick={() => setShowCategories(true)} style={{ fontSize: "12px", padding: "7px 12px", display: "flex", alignItems: "center", gap: "6px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer" }}>
              <i className="ti ti-tag" style={{ fontSize: "13px" }} />{t("manageCategories")}
            </button>
          )}
          {canExport && (
            <button onClick={handleExport} style={{ fontSize: "12px", padding: "7px 12px", display: "flex", alignItems: "center", gap: "6px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer" }}>
              <i className="ti ti-download" style={{ fontSize: "13px" }} />{t("export")}
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowAdd(true)} style={{ fontSize: "12px", padding: "7px 13px", display: "flex", alignItems: "center", gap: "6px", background: "#14171c", color: "white", border: "1px solid #14171c", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>
              <i className="ti ti-plus" style={{ fontSize: "13px" }} />{t("addTransaction")}
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "9px", marginBottom: "18px" }}>
          {/* Balance — dark card */}
          <div style={{ background: "#14171c", color: "white", borderRadius: "var(--border-radius-md)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.5px" }}>SOLDE ACTUEL</span>
              <i className="ti ti-wallet" style={{ color: "#5DCAA5", fontSize: "14px" }} />
            </div>
            <div style={{ fontSize: "26px", fontWeight: 500, lineHeight: 1.1 }}>
              {summary.balance.toLocaleString("fr-FR")}
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginLeft: "4px", fontWeight: 400 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "10.5px", color: summary.balance >= 0 ? "#5DCAA5" : "#E24B4A", marginTop: "4px" }}>
              <i className={`ti ${summary.balance >= 0 ? "ti-trending-up" : "ti-trending-down"}`} style={{ fontSize: "11px", marginRight: "3px" }} />
              {summary.balance >= 0 ? "Solde positif" : "Solde négatif"}
            </div>
          </div>
          {/* Income */}
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--color-text-secondary)", letterSpacing: "0.5px" }}>TOTAL ENTRÉES</span>
              <i className="ti ti-arrow-down-right" style={{ color: "#1D9E75", fontSize: "14px" }} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: "#0F6E56", lineHeight: 1.1 }}>
              +{summary.totalIncome.toLocaleString("fr-FR")}
              <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginLeft: "3px", fontWeight: 400 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--color-text-secondary)", marginTop: "4px" }}>{txIncomeCount} transaction{txIncomeCount > 1 ? "s" : ""}</div>
          </div>
          {/* Expense */}
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--color-text-secondary)", letterSpacing: "0.5px" }}>TOTAL SORTIES</span>
              <i className="ti ti-arrow-up-right" style={{ color: "#A32D2D", fontSize: "14px" }} />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: "#791F1F", lineHeight: 1.1 }}>
              −{summary.totalExpense.toLocaleString("fr-FR")}
              <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginLeft: "3px", fontWeight: 400 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--color-text-secondary)", marginTop: "4px" }}>{txExpenseCount} dépense{txExpenseCount > 1 ? "s" : ""}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <button style={PILL(filterType === "")} onClick={() => setFilterType("")}>Toutes · {transactions.length}</button>
        <button style={PILL(filterType === "INCOME")} onClick={() => setFilterType("INCOME")}>{t("typeIncome")} · {txIncomeCount}</button>
        <button style={PILL(filterType === "EXPENSE")} onClick={() => setFilterType("EXPENSE")}>{t("typeExpense")} · {txExpenseCount}</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ fontSize: "11px", height: "28px", padding: "0 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", outline: "none" }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ fontSize: "11px", height: "28px", padding: "0 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", outline: "none" }}>
            <option value="">{t("allMonths")}</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{t(m)}</option>)}
          </select>
          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} style={{ fontSize: "11px", height: "28px", padding: "0 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", outline: "none" }}>
            <option value="">{t("allCategories")}</option>
            {categories.filter((c) => !filterType || c.type === "BOTH" || c.type === filterType).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transactions table */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
          <i className="ti ti-loader-2" style={{ fontSize: "18px", display: "block", marginBottom: "8px" }} />
          {tc("loading")}
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>{t("noTransactions")}</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                {[t("date"), t("category"), t("description"), t("amount"), ""].map((h, i) => (
                  <th key={i} style={{ textAlign: i >= 3 ? "right" : "left", padding: i === 0 ? "9px 16px" : "9px 12px", fontSize: "10px", color: "var(--color-text-secondary)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {new Date(tx.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, background: tx.type === "INCOME" ? "#E1F5EE" : "#FCEBEB", color: tx.type === "INCOME" ? "#085041" : "#791F1F" }}>
                      {tx.categoryName}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text-primary)" }}>{tx.description}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 500, whiteSpace: "nowrap", color: tx.type === "INCOME" ? "#0F6E56" : "#791F1F" }}>
                    {tx.type === "INCOME" ? "+" : "−"}{tx.amount.toLocaleString("fr-FR")} FCFA
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {canManage && tx.source === "manual" && (
                      <button onClick={() => setDeleteId(tx.id)} style={{ fontSize: "11px", color: "#791F1F", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                        <i className="ti ti-trash" style={{ fontSize: "13px" }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — Add transaction */}
      {showAdd && (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 18px" }}>{t("addTitle")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: t("date"), el: <input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} style={INPUT} /> },
                { label: t("type"), el: <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value, categoryId: "" })} style={INPUT}><option value="INCOME">{t("typeIncome")}</option><option value="EXPENSE">{t("typeExpense")}</option></select> },
                { label: t("category"), el: <select value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })} style={INPUT}><option value="">{t("selectCategory")}</option>{addFormCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> },
                { label: t("description"), el: <input type="text" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} style={INPUT} placeholder="Description" /> },
                { label: `${t("amount")} (FCFA)`, el: <input type="number" min="1" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} style={INPUT} placeholder="0" /> },
              ].map(({ label, el }) => (
                <div key={label}><label style={LABEL}>{label}</label>{el}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
              <button onClick={() => setShowAdd(false)} style={BTN_SEC}>{tc("cancel")}</button>
              <button onClick={handleAdd} disabled={addLoading || !addForm.description || !addForm.amount || !addForm.categoryId} style={{ ...BTN_PRI, opacity: (addLoading || !addForm.description || !addForm.amount || !addForm.categoryId) ? 0.5 : 1 }}>
                {addLoading ? "…" : tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Categories */}
      {showCategories && (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 14px" }}>{t("manageCategories")}</h2>
            <div style={{ maxHeight: "180px", overflowY: "auto", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", marginBottom: "14px" }}>
              {categories.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", padding: "12px 14px" }}>{t("noCategories")}</p>
              ) : categories.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderTop: i > 0 ? "0.5px solid var(--color-border-tertiary)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px" }}>{c.name}</span>
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: c.type === "INCOME" ? "#E1F5EE" : c.type === "EXPENSE" ? "#FCEBEB" : "var(--color-background-secondary)", color: c.type === "INCOME" ? "#085041" : c.type === "EXPENSE" ? "#791F1F" : "var(--color-text-secondary)" }}>
                      {c.type === "INCOME" ? t("typeIncome") : c.type === "EXPENSE" ? t("typeExpense") : t("typeBoth")}
                    </span>
                  </div>
                  {!c.isSystem && <button onClick={() => handleDeleteCategory(c.id)} disabled={catLoading} style={{ fontSize: "11px", color: "#791F1F", background: "none", border: "none", cursor: "pointer" }}><i className="ti ti-trash" style={{ fontSize: "13px" }} /></button>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              <label style={LABEL}>{t("addCategory")}</label>
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} style={INPUT} placeholder={t("categoryNamePlaceholder")} />
              <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as "INCOME" | "EXPENSE" | "BOTH")} style={INPUT}>
                <option value="INCOME">{t("typeIncome")}</option>
                <option value="EXPENSE">{t("typeExpense")}</option>
                <option value="BOTH">{t("typeBoth")}</option>
              </select>
              {catError && <p style={{ fontSize: "11px", color: "#791F1F", margin: 0 }}>{catError}</p>}
              <button onClick={handleAddCategory} disabled={catLoading || !newCatName.trim()} style={{ ...BTN_PRI, opacity: catLoading || !newCatName.trim() ? 0.5 : 1 }}>
                {catLoading ? "…" : t("addCategory")}
              </button>
            </div>
            <button onClick={() => { setShowCategories(false); setCatError(""); }} style={BTN_SEC}>{tc("cancel")}</button>
          </div>
        </div>
      )}

      {/* Modal — Delete confirm */}
      {deleteId && (
        <div style={OVERLAY}>
          <div style={{ ...MODAL, maxWidth: "360px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 18px" }}>{t("deleteConfirm")}</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setDeleteId(null)} style={BTN_SEC}>{tc("cancel")}</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleteLoading} style={{ ...BTN_PRI, background: "#791F1F", border: "1px solid #791F1F", opacity: deleteLoading ? 0.6 : 1 }}>
                {deleteLoading ? "…" : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
