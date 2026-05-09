import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    announcement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    notification: { createMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { GET as getAnnonces, POST as postAnnonce } from "@/app/api/annonces/route";
import { DELETE as deleteAnnonce } from "@/app/api/annonces/[id]/route";

const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const mockMember = { userId: "u1", role: "MEMBER" };
const idParams = Promise.resolve({ id: "ann1" });

function makeReq(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasPermission).mockResolvedValue(false);
  vi.mocked(db.notification.createMany).mockResolvedValue({ count: 0 });
});

// ---------------------------------------------------------------------------
// GET /api/annonces
// ---------------------------------------------------------------------------
describe("GET /api/annonces", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getAnnonces();
    expect(res.status).toBe(401);
  });

  it("retourne les annonces pour un admin", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ categoryId: "cat1", mandates: [] } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([
      {
        id: "ann1", title: "Test", content: "Contenu", targetType: "ALL",
        createdBy: { name: "Admin" }, targetCategory: null,
        targetPosts: [], _count: { targetRecipients: 0 },
        createdAt: new Date().toISOString(),
      },
    ] as never);

    const res = await getAnnonces();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test");
  });

  it("inclut BUREAU dans l'OR si le membre a un mandat actif", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      categoryId: "cat1",
      mandates: [{ postId: "post1" }],
    } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    await getAnnonces();
    const call = vi.mocked(db.announcement.findMany).mock.calls[0][0] as never;
    const orClause = (call as { where: { OR: unknown[] } }).where.OR;
    const hasBureau = orClause.some(
      (c: unknown) => (c as { targetType?: string }).targetType === "BUREAU"
    );
    expect(hasBureau).toBe(true);
  });

  it("n'inclut pas BUREAU mais inclut HORS_BUREAU si le membre n'a pas de mandat", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      categoryId: null,
      mandates: [],
    } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    await getAnnonces();
    const call = vi.mocked(db.announcement.findMany).mock.calls[0][0] as never;
    const orClause = (call as { where: { OR: unknown[] } }).where.OR;
    const hasBureau = orClause.some((c: unknown) => (c as { targetType?: string }).targetType === "BUREAU");
    const hasHorsBureau = orClause.some((c: unknown) => (c as { targetType?: string }).targetType === "HORS_BUREAU");
    expect(hasBureau).toBe(false);
    expect(hasHorsBureau).toBe(true);
  });

  it("inclut le filtre SELECT avec userId", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ categoryId: null, mandates: [] } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    await getAnnonces();
    const call = vi.mocked(db.announcement.findMany).mock.calls[0][0] as never;
    const orClause = (call as { where: { OR: unknown[] } }).where.OR;
    const selectFilter = orClause.find(
      (c: unknown) => (c as { targetType?: string }).targetType === "SELECT"
    );
    expect(selectFilter).toBeDefined();
    expect((selectFilter as { targetRecipients?: { some: { userId: string } } })?.targetRecipients?.some.userId).toBe("u1");
  });

  it("n'inclut pas de filtre POST quand le membre n'a pas de mandat", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ categoryId: null, mandates: [] } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    await getAnnonces();
    const call = vi.mocked(db.announcement.findMany).mock.calls[0][0] as never;
    const orClause = (call as { where: { OR: unknown[] } }).where.OR;
    const postFilter = orClause.find(
      (c: unknown) => (c as { targetType?: string }).targetType === "POST"
    );
    expect(postFilter).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/annonces
// ---------------------------------------------------------------------------
describe("POST /api/annonces", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse un membre sans permission ANNOUNCEMENTS_CREATE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(403);
  });

  it("crée une annonce ALL (admin)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann1" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([{ id: "u1", name: "M1", email: "m1@test.com" }] as never);

    const res = await postAnnonce(makeReq({ title: "Test", content: "Contenu", targetType: "ALL" }) as never);
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "ALL", targetCategoryId: null }),
      })
    );
  });

  it("crée une annonce BUREAU", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann2" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(makeReq({ title: "Bureau", content: "Info", targetType: "BUREAU" }) as never);
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ targetType: "BUREAU" }) })
    );
  });

  it("crée une annonce HORS_BUREAU", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann3" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(makeReq({ title: "HB", content: "Info", targetType: "HORS_BUREAU" }) as never);
    expect(res.status).toBe(201);
  });

  it("crée une annonce CATEGORY avec targetCategoryId", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann4" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(
      makeReq({ title: "Cat", content: "C", targetType: "CATEGORY", targetCategoryId: "cat1" }) as never
    );
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "CATEGORY", targetCategoryId: "cat1" }),
      })
    );
  });

  it("crée une annonce POST avec plusieurs postes", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann5" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(
      makeReq({ title: "P", content: "C", targetType: "POST", targetPostIds: ["p1", "p2"] }) as never
    );
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetType: "POST",
          targetPosts: { create: [{ postId: "p1" }, { postId: "p2" }] },
        }),
      })
    );
  });

  it("crée une annonce SELECT avec plusieurs membres", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann6" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(
      makeReq({ title: "S", content: "C", targetType: "SELECT", targetUserIds: ["u1", "u2"] }) as never
    );
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetType: "SELECT",
          targetRecipients: { create: [{ userId: "u1" }, { userId: "u2" }] },
        }),
      })
    );
  });

  it("refuse POST sans targetPostIds", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "POST" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse POST avec tableau vide", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(
      makeReq({ title: "T", content: "C", targetType: "POST", targetPostIds: [] }) as never
    );
    expect(res.status).toBe(400);
  });

  it("refuse SELECT sans targetUserIds", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "SELECT" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse CATEGORY sans targetCategoryId", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "CATEGORY" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse targetType invalide", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "INVALID" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si title manquant", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(400);
  });

  it("autorise un membre avec ANNOUNCEMENTS_CREATE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann7" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(makeReq({ title: "M", content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(201);
  });

  it("ne crée pas de notification si aucun destinataire", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann8" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(vi.mocked(db.notification.createMany)).not.toHaveBeenCalled();
  });

  it("crée une notification par destinataire", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({ id: "ann9" } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "u1", name: "M1", email: "m1@test.com" },
      { id: "u2", name: "M2", email: "m2@test.com" },
    ] as never);

    await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(vi.mocked(db.notification.createMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u1" }),
          expect.objectContaining({ userId: "u2" }),
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/annonces/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/annonces/[id]", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(401);
  });

  it("retourne 404 si annonce inexistante", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue(null);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(404);
  });

  it("refuse si ni admin ni créateur", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue({ id: "ann1", createdById: "other" } as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(403);
  });

  it("autorise le créateur", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue({ id: "ann1", createdById: "u1" } as never);
    vi.mocked(db.announcement.delete).mockResolvedValue({} as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.announcement.delete)).toHaveBeenCalledWith({ where: { id: "ann1" } });
  });

  it("autorise l'admin même s'il n'est pas créateur", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue({ id: "ann1", createdById: "other" } as never);
    vi.mocked(db.announcement.delete).mockResolvedValue({} as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(200);
  });
});
