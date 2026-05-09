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

  it("retourne les annonces pour un admin (toutes visibles)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      categoryId: "cat1",
      mandates: [],
    } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([
      {
        id: "ann1", title: "Test", content: "Contenu",
        targetType: "ALL", createdBy: { name: "Admin" },
        targetCategory: null, targetPost: null,
        createdAt: new Date().toISOString(),
      },
    ] as never);

    const res = await getAnnonces();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test");
  });

  it("retourne les annonces pour un membre (filtrées)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      categoryId: "cat1",
      mandates: [{ postId: "post1" }],
    } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    const res = await getAnnonces();
    expect(res.status).toBe(200);
    // La requête doit avoir un filtre OR avec targetType ALL / CATEGORY / POST / createdById
    expect(vi.mocked(db.announcement.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("utilise __none__ quand le membre n'a pas de mandat actif", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      categoryId: null,
      mandates: [],
    } as never);
    vi.mocked(db.announcement.findMany).mockResolvedValue([] as never);

    await getAnnonces();
    const call = vi.mocked(db.announcement.findMany).mock.calls[0][0] as never;
    const orClause = (call as { where: { OR: unknown[] } }).where.OR;
    const postFilter = orClause.find(
      (c: unknown) => (c as { targetType?: string }).targetType === "POST"
    ) as { targetPostId?: { in?: string[] } } | undefined;
    expect(postFilter?.targetPostId?.in).toContain("__none__");
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
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(403);
  });

  it("crée une annonce ciblée ALL (admin)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({
      id: "ann1", title: "Test", content: "Contenu", targetType: "ALL",
      targetCategoryId: null, targetPostId: null, createdById: "admin-1",
      createdAt: new Date().toISOString(),
    } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "u1", name: "Membre 1", email: "m1@test.com" },
    ] as never);

    const res = await postAnnonce(makeReq({ title: "Test", content: "Contenu", targetType: "ALL" }) as never);
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "ALL", targetCategoryId: null, targetPostId: null }),
      })
    );
    expect(vi.mocked(db.notification.createMany)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: "u1" })]) })
    );
  });

  it("crée une annonce ciblée CATEGORY", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({
      id: "ann2", title: "Cat", content: "Pour la catégorie", targetType: "CATEGORY",
      targetCategoryId: "cat1", targetPostId: null, createdById: "admin-1",
      createdAt: new Date().toISOString(),
    } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(
      makeReq({ title: "Cat", content: "Pour la catégorie", targetType: "CATEGORY", targetCategoryId: "cat1" }) as never
    );
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "CATEGORY", targetCategoryId: "cat1", targetPostId: null }),
      })
    );
  });

  it("crée une annonce ciblée POST", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({
      id: "ann3", title: "Post", content: "Pour le poste", targetType: "POST",
      targetCategoryId: null, targetPostId: "post1", createdById: "admin-1",
      createdAt: new Date().toISOString(),
    } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(
      makeReq({ title: "Post", content: "Pour le poste", targetType: "POST", targetPostId: "post1" }) as never
    );
    expect(res.status).toBe(201);
    expect(vi.mocked(db.announcement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "POST", targetPostId: "post1", targetCategoryId: null }),
      })
    );
  });

  it("refuse si title manquant", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ content: "C", targetType: "ALL" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si content manquant", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", targetType: "ALL" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si targetType invalide", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "INVALID" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse CATEGORY sans targetCategoryId", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "CATEGORY" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse POST sans targetPostId", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await postAnnonce(makeReq({ title: "T", content: "C", targetType: "POST" }) as never);
    expect(res.status).toBe(400);
  });

  it("autorise un membre avec permission ANNOUNCEMENTS_CREATE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(db.announcement.create).mockResolvedValue({
      id: "ann4", title: "Membre annonce", content: "Contenu",
      targetType: "ALL", targetCategoryId: null, targetPostId: null,
      createdById: "u1", createdAt: new Date().toISOString(),
    } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    const res = await postAnnonce(makeReq({ title: "Membre annonce", content: "Contenu", targetType: "ALL" }) as never);
    expect(res.status).toBe(201);
  });

  it("n'envoie pas de notification si aucun destinataire", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.create).mockResolvedValue({
      id: "ann5", title: "T", content: "C", targetType: "ALL",
      targetCategoryId: null, targetPostId: null, createdById: "admin-1",
      createdAt: new Date().toISOString(),
    } as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    await postAnnonce(makeReq({ title: "T", content: "C", targetType: "ALL" }) as never);
    expect(vi.mocked(db.notification.createMany)).not.toHaveBeenCalled();
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
    vi.mocked(db.announcement.findUnique).mockResolvedValue({
      id: "ann1", createdById: "other-user",
    } as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(403);
  });

  it("autorise le créateur de l'annonce", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue({
      id: "ann1", createdById: "u1",
    } as never);
    vi.mocked(db.announcement.delete).mockResolvedValue({} as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.announcement.delete)).toHaveBeenCalledWith({ where: { id: "ann1" } });
  });

  it("autorise l'admin même s'il n'est pas le créateur", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.announcement.findUnique).mockResolvedValue({
      id: "ann1", createdById: "other-user",
    } as never);
    vi.mocked(db.announcement.delete).mockResolvedValue({} as never);
    const res = await deleteAnnonce(makeReq(undefined, "DELETE") as never, { params: idParams });
    expect(res.status).toBe(200);
  });
});
