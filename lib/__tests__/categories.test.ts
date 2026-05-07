import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    memberCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { POST as createCat } from "@/app/api/admin/categories/route";
import { PATCH as patchCat, DELETE as deleteCat } from "@/app/api/admin/categories/[id]/route";

const adminSession = { userId: "a1", email: "admin@apats.ensmg", role: "ADMIN" };
const params = Promise.resolve({ id: "c1" });

function req(method: string, body: unknown, url = "http://localhost/api/admin/categories") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(adminSession as never);
});

describe("POST /api/admin/categories", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await createCat(req("POST", { name: "X", monthlyFee: 1000 }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs manquants", async () => {
    const res = await createCat(req("POST", { name: "X" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si monthlyFee négatif", async () => {
    const res = await createCat(req("POST", { name: "X", monthlyFee: -100 }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si nom déjà utilisé", async () => {
    vi.mocked(db.memberCategory.findUnique).mockResolvedValue({ id: "c0" } as never);
    const res = await createCat(req("POST", { name: "CDI", monthlyFee: 3000 }) as never);
    expect(res.status).toBe(409);
  });

  it("crée la catégorie", async () => {
    vi.mocked(db.memberCategory.findUnique).mockResolvedValue(null);
    vi.mocked(db.memberCategory.create).mockResolvedValue({
      id: "c1", name: "CDI", monthlyFee: 3000, _count: { users: 0 },
    } as never);
    const res = await createCat(req("POST", { name: "CDI", monthlyFee: 3000 }) as never);
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/admin/categories/[id]", () => {
  it("retourne 404 si inexistant", async () => {
    vi.mocked(db.memberCategory.findUnique).mockResolvedValue(null);
    const res = await patchCat(req("PATCH", { name: "X" }) as never, { params } as never);
    expect(res.status).toBe(404);
  });

  it("retourne 409 si nom conflictuel", async () => {
    vi.mocked(db.memberCategory.findUnique)
      .mockResolvedValueOnce({ id: "c1", name: "CDI" } as never)
      .mockResolvedValueOnce({ id: "c2", name: "CDD" } as never);
    const res = await patchCat(req("PATCH", { name: "CDD" }) as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("met à jour avec succès", async () => {
    vi.mocked(db.memberCategory.findUnique)
      .mockResolvedValueOnce({ id: "c1", name: "CDI" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(db.memberCategory.update).mockResolvedValue({
      id: "c1", name: "CDI+", monthlyFee: 3500, _count: { users: 5 },
    } as never);
    const res = await patchCat(
      req("PATCH", { name: "CDI+", monthlyFee: 3500 }) as never,
      { params } as never
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/admin/categories/[id]", () => {
  it("bloque si des membres utilisent la catégorie", async () => {
    vi.mocked(db.memberCategory.findUnique).mockResolvedValue({
      id: "c1", _count: { users: 5 },
    } as never);
    const res = await deleteCat(req("DELETE", null) as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("supprime si aucun membre", async () => {
    vi.mocked(db.memberCategory.findUnique).mockResolvedValue({
      id: "c1", _count: { users: 0 },
    } as never);
    vi.mocked(db.memberCategory.delete).mockResolvedValue({} as never);
    const res = await deleteCat(req("DELETE", null) as never, { params } as never);
    expect(res.status).toBe(200);
  });
});
