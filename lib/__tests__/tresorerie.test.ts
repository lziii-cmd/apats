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

const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const mockMember = { userId: "u1", role: "MEMBER" };
const params = Promise.resolve({ id: "tx1" });

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
    expect(data.totalIncome).toBe(45000); // 30000 + 5000 + 10000
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
        category: "MATERIEL",
        description: "Achat chaises",
        amount: 50000,
        source: "manual",
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
    const categories = data.map((d: { category: string }) => d.category);
    expect(categories).toContain("MATERIEL");
    expect(categories).toContain("COTISATION");
  });
});

// ---------------------------------------------------------------------------
// POST /api/tresorerie/transactions
// ---------------------------------------------------------------------------
describe("POST /api/tresorerie/transactions", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", category: "MATERIEL", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission TREASURY_MANAGE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", category: "MATERIEL", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs manquants", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postTransaction(makeReq({ type: "EXPENSE" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si montant négatif", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", category: "MATERIEL", description: "Test", amount: -100 }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si catégorie invalide", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", category: "COTISATION", description: "Test", amount: 5000 }) as never);
    expect(res.status).toBe(400);
  });

  it("crée une transaction", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.create).mockResolvedValue({ id: "tx1" } as never);
    const res = await postTransaction(makeReq({ date: "2026-05-01", type: "EXPENSE", category: "MATERIEL", description: "Achat chaises", amount: 50000 }) as never);
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
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si transaction introuvable", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.findUnique).mockResolvedValue(null);
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(404);
  });

  it("supprime la transaction", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.transaction.findUnique).mockResolvedValue({ id: "tx1" } as never);
    vi.mocked(db.transaction.delete).mockResolvedValue({} as never);
    const res = await deleteTransaction(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } });
  });
});
