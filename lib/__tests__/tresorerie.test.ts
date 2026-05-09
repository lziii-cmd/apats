import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    monthlyPayment: { aggregate: vi.fn(), findMany: vi.fn() },
    memberCard: { aggregate: vi.fn(), findMany: vi.fn() },
    transaction: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    txCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { GET as getSummary } from "@/app/api/tresorerie/route";
import { GET as getTransactions, POST as postTransaction } from "@/app/api/tresorerie/transactions/route";
import { DELETE as deleteTransaction } from "@/app/api/tresorerie/transactions/[id]/route";
import { GET as getCategories, POST as postCategory } from "@/app/api/tresorerie/categories/route";
import { DELETE as deleteCategory } from "@/app/api/tresorerie/categories/[id]/route";

const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const mockMember = { userId: "u1", role: "MEMBER" };
const txParams = Promise.resolve({ id: "tx1" });
const catParams = Promise.resolve({ id: "cat1" });

function makeReq(body?: unknown, method = "POST", url = "http://localhost"): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasPermission).mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// GET /api/tresorerie (summary)
// ---------------------------------------------------------------------------
describe("GET /api/tresorerie", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getSummary();
    expect(res.status).toBe(401);
  });

  it("refuse sans permission TREASURY_VIEW", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await getSummary();
    expect(res.status).toBe(403);
  });

  it("retourne le résumé financier", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.monthlyPayment.aggregate).mockResolvedValue({ _sum: { amountPaid: 30000 } } as never);
    vi.mocked(db.memberCard.aggregate).mockResolvedValue({ _sum: { pricePaid: 5000 } } as never);
    vi.mocked(db.transaction.groupBy).mockResolvedValue([
      { type: "INCOME", _sum: { amount: 10000 } },
      { type: "EXPENSE", _sum: { amount: 8000 } },
    ] as never);

    const res = await getSummary();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalIncome).toBe(45000);
    expect(data.totalExpense).toBe(8000);
    expect(data.balance).toBe(37000);
  });

  it("gère l'absence de transactions manuelles", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.monthlyPayment.aggregate).mockResolvedValue({ _sum: { amountPaid: 10000 } } as never);
    vi.mocked(db.memberCard.aggregate).mockResolvedValue({ _sum: { pricePaid: null } } as never);
    vi.mocked(db.transaction.groupBy).mockResolvedValue([] as never);

    const res = await getSummary();
    const data = await res.json();
    expect(data.totalIncome).toBe(10000);
    expect(data.totalExpense).toBe(0);
    expect(data.balance).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tresorerie/transactions
// ---------------------------------------------------------------------------
describe("GET /api/tresorerie/transactions", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getTransactions(makeReq(undefined, "GET") as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission TREASURY_VIEW", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await getTransactions(makeReq(undefined, "GET") as never);
    expect(res.status).toBe(403);
  });

  it("retourne la liste unifiée", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        date: new Date("2026-05-01"),
        type: "EXPENSE",
        categoryId: "cat1",
        category: { name: "Matériel", type: "EXPENSE" },
        description: "Achat chaises",
        amount: 50000,
        createdBy: { name: "Admin" },
      },
    ] as never);
    vi.mocked(db.monthlyPayment.findMany).mockResolvedValue([
      {
        id: "mp1",
        confirmedAt: new Date("2026-05-02"),
        updatedAt: new Date("2026-05-02"),
        amountPaid: 3000,
        month: 5,
        year: 2026,
        user: { name: "Jean Dupont" },
      },
    ] as never);
    vi.mocked(db.memberCard.findMany).mockResolvedValue([] as never);

    const res = await getTransactions(new Request("http://localhost") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(2);
    const names = data.map((d: { categoryName: string }) => d.categoryName);
    expect(names).toContain("Matériel");
    expect(names).toContain("Cotisation mensuelle");
  });
});

// ---------------------------------------------------------------------------
// POST /api/tresorerie/transactions
// ---------------------------------------------------------------------------
describe("POST /api/tresorerie/transactions", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", categoryId: "cat1", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission TREASURY_MANAGE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", categoryId: "cat1", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs manquants", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postTransaction(makeReq({ type: "EXPENSE" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si montant négatif", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1" } as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", categoryId: "cat1", description: "Test", amount: -100 }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si catégorie introuvable", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue(null);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", categoryId: "cat-inexistant", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(404);
  });

  it("crée une transaction", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1", name: "Matériel" } as never);
    vi.mocked(db.transaction.create).mockResolvedValue({ id: "tx1" } as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", categoryId: "cat1", description: "Achat chaises", amount: 50000 }) as never);
    expect(res.status).toBe(201);
    expect(db.transaction.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tresorerie/transactions/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/tresorerie/transactions/[id]", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params: txParams } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si transaction introuvable", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.findUnique).mockResolvedValue(null);
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params: txParams } as never);
    expect(res.status).toBe(404);
  });

  it("supprime la transaction", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.findUnique).mockResolvedValue({ id: "tx1" } as never);
    vi.mocked(db.transaction.delete).mockResolvedValue({} as never);
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params: txParams } as never);
    expect(res.status).toBe(200);
    expect(db.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } });
  });
});

// ---------------------------------------------------------------------------
// GET /api/tresorerie/categories
// ---------------------------------------------------------------------------
describe("GET /api/tresorerie/categories", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getCategories(makeReq(undefined, "GET") as never);
    expect(res.status).toBe(401);
  });

  it("retourne la liste des catégories", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findMany).mockResolvedValue([
      { id: "cat1", name: "Matériel", type: "EXPENSE", isSystem: false },
    ] as never);
    const res = await getCategories(new Request("http://localhost") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/tresorerie/categories
// ---------------------------------------------------------------------------
describe("POST /api/tresorerie/categories", () => {
  it("refuse sans permission TREASURY_MANAGE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await postCategory(makeReq({ name: "Don", type: "INCOME" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si nom manquant", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postCategory(makeReq({ type: "INCOME" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si catégorie déjà existante", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1" } as never);
    const res = await postCategory(makeReq({ name: "Matériel", type: "EXPENSE" }) as never);
    expect(res.status).toBe(409);
  });

  it("crée une catégorie", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue(null);
    vi.mocked(db.txCategory.create).mockResolvedValue({ id: "cat2", name: "Don", type: "INCOME" } as never);
    const res = await postCategory(makeReq({ name: "Don", type: "INCOME" }) as never);
    expect(res.status).toBe(201);
    expect(db.txCategory.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tresorerie/categories/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/tresorerie/categories/[id]", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await deleteCategory(makeReq(undefined, "DELETE") as never, { params: catParams } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si catégorie système", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1", isSystem: true, _count: { transactions: 0 } } as never);
    const res = await deleteCategory(makeReq(undefined, "DELETE") as never, { params: catParams } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si des transactions utilisent la catégorie", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1", isSystem: false, _count: { transactions: 3 } } as never);
    const res = await deleteCategory(makeReq(undefined, "DELETE") as never, { params: catParams } as never);
    expect(res.status).toBe(409);
  });

  it("supprime la catégorie", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.txCategory.findUnique).mockResolvedValue({ id: "cat1", isSystem: false, _count: { transactions: 0 } } as never);
    vi.mocked(db.txCategory.delete).mockResolvedValue({} as never);
    const res = await deleteCategory(makeReq(undefined, "DELETE") as never, { params: catParams } as never);
    expect(res.status).toBe(200);
  });
});
