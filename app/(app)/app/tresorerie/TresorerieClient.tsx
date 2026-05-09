"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

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

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

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

  // Ajout transaction
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "EXPENSE",
    categoryId: "",
    description: "",
    amount: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  // Gestion catégories
  const [showCategories, setShowCategories] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"INCOME" | "EXPENSE" | "BOTH">("BOTH");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");

  // Suppression transaction
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
      const [sumRes, txRes] = await Promise.all([
        fetch("/api/tresorerie"),
        fetch(`/api/tresorerie/transactions?${qs}`),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Catégories filtrées selon le type sélectionné dans le formulaire d'ajout
  const addFormCategories = categories.filter(
    (c) => c.type === "BOTH" || c.type === addForm.type
  );

  async function handleAdd() {
    if (!addForm.description || !addForm.amount || !addForm.categoryId) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/tresorerie/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: addForm.date,
          type: addForm.type,
          categoryId: addForm.categoryId,
          description: addForm.description,
          amount: parseInt(addForm.amount),
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddForm({ date: new Date().toISOString().slice(0, 10), type: "EXPENSE", categoryId: "", description: "", amount: "" });
        fetchData();
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setCatLoading(true);
    setCatError("");
    try {
      const res = await fetch("/api/tresorerie/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), type: newCatType }),
      });
      if (res.ok) {
        setNewCatName("");
        fetchCategories();
      } else {
        const data = await res.json();
        setCatError(data.error ?? "Erreur");
      }
    } finally {
      setCatLoading(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    setCatLoading(true);
    setCatError("");
    try {
      const res = await fetch(`/api/tresorerie/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCategories();
      } else {
        const data = await res.json();
        setCatError(data.error ?? "Erreur");
      }
    } finally {
      setCatLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/tresorerie/transactions/${id}`, { method: "DELETE" });
      setDeleteId(null);
      fetchData();
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleExport() {
    window.open(`/api/tresorerie/export?${buildParams()}`, "_blank");
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          {canManage && (
            <button onClick={() => setShowCategories(true)}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              {t("manageCategories")}
            </button>
          )}
          {canExport && (
            <button onClick={handleExport}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              {t("export")}
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded transition-colors">
              {t("addTransaction")}
            </button>
          )}
        </div>
      </div>

      {/* Cartes résumé */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl p-5 ${summary.balance >= 0 ? "bg-teal-50 border border-teal-200" : "bg-red-50 border border-red-200"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("balance")}</p>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-teal-700" : "text-red-700"}`}>
              {fmt(summary.balance)}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("totalIncome")}</p>
            <p className="text-2xl font-bold text-green-700">{fmt(summary.totalIncome)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t("totalExpense")}</p>
            <p className="text-2xl font-bold text-orange-700">{fmt(summary.totalExpense)}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("filterYear")}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("allMonths")}</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{t(m)}</option>
          ))}
        </select>

        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setFilterCategoryId(""); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("allTypes")}</option>
          <option value="INCOME">{t("typeIncome")}</option>
          <option value="EXPENSE">{t("typeExpense")}</option>
        </select>

        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("allCategories")}</option>
          {categories
            .filter((c) => !filterType || c.type === "BOTH" || c.type === filterType)
            .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
          }
        </select>
      </div>

      {/* Liste transactions */}
      {loading ? (
        <p className="text-sm text-gray-500">{tc("loading")}</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noTransactions")}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("date")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("category")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("description")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("amount")}</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.type === "INCOME"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {tx.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{tx.description}</td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                    tx.type === "INCOME" ? "text-green-700" : "text-orange-700"
                  }`}>
                    {tx.type === "INCOME" ? "+" : "−"}{tx.amount.toLocaleString("fr-FR")} FCFA
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {tx.source === "manual" && (
                        <button onClick={() => setDeleteId(tx.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors">
                          {tc("delete")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ajout transaction */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold mb-4">{t("addTitle")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("date")}</label>
                <input type="date" value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("type")}</label>
                <select value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value, categoryId: "" })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="INCOME">{t("typeIncome")}</option>
                  <option value="EXPENSE">{t("typeExpense")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("category")}</label>
                <select value={addForm.categoryId}
                  onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="">{t("selectCategory")}</option>
                  {addFormCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("description")}</label>
                <input type="text" value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Description de la transaction" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("amount")} (FCFA)</label>
                <input type="number" min="1" value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="0" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button onClick={handleAdd}
                disabled={addLoading || !addForm.description || !addForm.amount || !addForm.categoryId}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {addLoading ? "…" : tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion catégories */}
      {showCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold mb-4">{t("manageCategories")}</h2>

            {/* Liste des catégories */}
            <div className="mb-4 max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 px-4 py-3">{t("noCategories")}</p>
              ) : categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-sm text-gray-800">{c.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      c.type === "INCOME" ? "bg-green-100 text-green-700"
                      : c.type === "EXPENSE" ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                    }`}>
                      {c.type === "INCOME" ? t("typeIncome") : c.type === "EXPENSE" ? t("typeExpense") : t("typeBoth")}
                    </span>
                  </div>
                  {!c.isSystem && (
                    <button onClick={() => handleDeleteCategory(c.id)} disabled={catLoading}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                      {tc("delete")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Ajout catégorie */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">{t("addCategory")}</p>
              <input type="text" value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder={t("categoryNamePlaceholder")} />
              <select value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as "INCOME" | "EXPENSE" | "BOTH")}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="INCOME">{t("typeIncome")}</option>
                <option value="EXPENSE">{t("typeExpense")}</option>
                <option value="BOTH">{t("typeBoth")}</option>
              </select>
              {catError && <p className="text-xs text-red-600">{catError}</p>}
              <button onClick={handleAddCategory} disabled={catLoading || !newCatName.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {catLoading ? "…" : t("addCategory")}
              </button>
            </div>

            <button onClick={() => { setShowCategories(false); setCatError(""); }}
              className="w-full mt-3 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression transaction */}
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
