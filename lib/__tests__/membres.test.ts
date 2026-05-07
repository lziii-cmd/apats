import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    memberCategory: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
    mandate: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    appConfig: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { POST as createMembre } from "@/app/api/admin/membres/route";
import { PATCH as patchMembre } from "@/app/api/admin/membres/[id]/route";

const mockSession = { userId: "admin-1", email: "admin@apats.ensmg", role: "ADMIN" };

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/admin/membres", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeReqPatch(body: unknown): Request {
  return new Request("http://localhost/api/admin/membres/u1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(mockSession as never);
});

describe("POST /api/admin/membres", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await createMembre(makeReq({ name: "X", email: "x@x.com", categoryId: "c1" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs manquants", async () => {
    const res = await createMembre(makeReq({ name: "X" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si email déjà utilisé", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "existing" } as never);
    const res = await createMembre(makeReq({ name: "X", email: "x@x.com", categoryId: "c1" }) as never);
    expect(res.status).toBe(409);
  });

  it("crée le membre et retourne tempPassword", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "u1", name: "Test", email: "t@t.com", locale: "fr", createdAt: new Date(), category: null,
    } as never);
    vi.mocked(db.appConfig.findUnique).mockResolvedValue(null);

    const res = await createMembre(
      makeReq({ name: "Test", email: "t@t.com", categoryId: "c1" }) as never
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.tempPassword).toBeDefined();
    expect(data.tempPassword).toHaveLength(8); // 4 bytes hex = 8 chars
  });

  it("crée le mandat si postId fourni", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "u1", name: "Test", email: "t@t.com", locale: "fr", createdAt: new Date(), category: null,
    } as never);
    vi.mocked(db.appConfig.findUnique).mockResolvedValue({ mandateDurationDays: 730 } as never);
    vi.mocked(db.mandate.create).mockResolvedValue({ id: "m1" } as never);

    const res = await createMembre(
      makeReq({ name: "Test", email: "t@t.com", categoryId: "c1", postId: "p1" }) as never
    );
    expect(res.status).toBe(201);
    expect(db.mandate.create).toHaveBeenCalledOnce();
  });

  it("ne crée pas de mandat si postId absent", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "u1", name: "Test", email: "t@t.com", locale: "fr", createdAt: new Date(), category: null,
    } as never);

    await createMembre(makeReq({ name: "Test", email: "t@t.com", categoryId: "c1" }) as never);
    expect(db.mandate.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/membres/[id]", () => {
  const params = Promise.resolve({ id: "u1" });

  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await patchMembre(makeReqPatch({ name: "X" }) as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("retourne 404 si membre inexistant", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await patchMembre(makeReqPatch({ name: "X" }) as never, { params } as never);
    expect(res.status).toBe(404);
  });

  it("retourne 409 si nouvel email déjà pris", async () => {
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: "u1", email: "old@x.com" } as never) // membre existant
      .mockResolvedValueOnce({ id: "u2", email: "taken@x.com" } as never); // conflict
    const res = await patchMembre(
      makeReqPatch({ email: "taken@x.com" }) as never,
      { params } as never
    );
    expect(res.status).toBe(409);
  });

  it("met à jour les champs sans toucher aux mandats si postId absent", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u1", email: "old@x.com" } as never);
    vi.mocked(db.user.update).mockResolvedValue({
      id: "u1", name: "New", email: "old@x.com", locale: "fr", createdAt: new Date(),
      category: null, mandates: [],
    } as never);

    const res = await patchMembre(makeReqPatch({ name: "New" }) as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.mandate.updateMany).not.toHaveBeenCalled();
    expect(db.mandate.create).not.toHaveBeenCalled();
  });

  it("réattribue le poste si postId fourni", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u1", email: "old@x.com" } as never);
    vi.mocked(db.user.update).mockResolvedValue({
      id: "u1", name: "X", email: "old@x.com", locale: "fr", createdAt: new Date(),
      category: null, mandates: [],
    } as never);
    vi.mocked(db.appConfig.findUnique).mockResolvedValue({ mandateDurationDays: 730 } as never);

    await patchMembre(makeReqPatch({ postId: "p2" }) as never, { params } as never);
    expect(db.mandate.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", isActive: true },
      data: { isActive: false },
    });
    expect(db.mandate.create).toHaveBeenCalledOnce();
  });

  it("ferme le mandat actif si postId=null", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u1", email: "old@x.com" } as never);
    vi.mocked(db.user.update).mockResolvedValue({
      id: "u1", name: "X", email: "old@x.com", locale: "fr", createdAt: new Date(),
      category: null, mandates: [],
    } as never);

    await patchMembre(makeReqPatch({ postId: null }) as never, { params } as never);
    expect(db.mandate.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", isActive: true },
      data: { isActive: false },
    });
    expect(db.mandate.create).not.toHaveBeenCalled();
  });
});
