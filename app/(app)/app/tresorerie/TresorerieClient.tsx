"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type TxRow = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  source: "auto" | "manual";
  createdBy?: string;
};

type Summary = { totalIncome: number; totalExpense: number; balance: number };

type Props = { canManage: boolean; canExport: boolean };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const MANUAL_CATEGORIES = ["EVENEMENT", "MATERIEL", "FRAIS_ADMIN", "AUTRE"] as const;

const CATEGORY_KEY: Record<string, string> = {
  COTISATION: "catCotisation",
  CARTE_MEMBRE: "catCarteMembre",
  EVENEMENT: "catEvenement",
  MATERIEL: "catMateriel",
  FRAIS_ADMIN: "catFraisAdmin",
  AUTRE: "catAutre",
};

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
  const [filterCategory, setFilterCategory] = useState<string>("");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "EXPENSE",
    category: "AUTRE",
    description: "",
    amount: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (filterYear) p.set("year", filterYear);
    if (filterMonth) p.set("month", filterMonth);
    if (filterType) p.set("type", filterType);
    if (filterCategory) p.set("category", filterCategory);
    return p.toString();
  }, [filterYear, filterMonth, filterType, filterCategory]);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdd() {
    if (!addForm.description || !addForm.amount) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/tresorerie/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: addForm.date,
          type: addForm.type,
          category: addForm.category,
          description: addForm.description,
          amount: parseInt(addForm.amount),
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddForm({ date: new Date().toISOString().slice(0, 10), type: "EXPENSE", category: "AUTRE", description: "", amount: "" });
        fetchData();
      }
    } finally {
      setAddLoading(false);
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
    const qs = buildParams();
    window.open(`/api/tresorerie/export?${qs}`, "_blank");
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex gap-2">
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

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("allTypes")}</option>
          <option value="INCOME">{t("typeIncome")}</option>
          <option value="EXPENSE">{t("typeExpense")}</option>
        </select>

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">{t("allCategories")}</option>
          {Object.entries(CATEGORY_KEY).map(([val, key]) => (
            <option key={val} value={val}>{t(key as never)}</option>
          ))}
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
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.type === "INCOME"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {t(CATEGORY_KEY[tx.category] as never)}
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

      {/* Modal ajout */}
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
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="INCOME">{t("typeIncome")}</option>
                  <option value="EXPENSE">{t("typeExpense")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t("category")}</label>
                <select value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  {MANUAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(CATEGORY_KEY[c] as never)}</option>
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
              <button onClick={handleAdd} disabled={addLoading || !addForm.description || !addForm.amount}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded text-sm disabled:opacity-60">
                {addLoading ? "…" : tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
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
