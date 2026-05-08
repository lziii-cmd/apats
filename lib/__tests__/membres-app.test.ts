import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    appConfig: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
  getUserFeatures: vi.fn(),
}));
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => Buffer.from("xlsx")),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { GET as getMembers } from "@/app/api/membres/route";
import { GET as getMember } from "@/app/api/membres/[id]/route";
import { GET as exportMembers } from "@/app/api/membres/export/route";

const adminSession = { userId: "a1", email: "admin@apats.ensmg", role: "ADMIN" };
const memberSession = { userId: "m1", email: "user@apats.ensmg", role: "MEMBER" };

const mockMembre = {
  id: "u1",
  name: "Ibrahima Sy",
  email: "ibrahima.sy@ensmg.com",
  locale: "fr",
  createdAt: new Date("2024-01-01"),
  category: { id: "c1", name: "CDI", monthlyFee: 3000 },
  mandates: [
    {
      id: "m1",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2026-01-01"),
      isActive: true,
      post: { id: "p1", name: "Président" },
    },
  ],
};

function req(url = "http://localhost/api/membres") {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(adminSession as never);
  vi.mocked(hasPermission).mockResolvedValue(true);
  vi.mocked(db.user.findMany).mockResolvedValue([mockMembre] as never);
  vi.mocked(db.user.findUnique).mockResolvedValue(mockMembre as never);
});

// ---------------------------------------------------------------------------
// GET /api/membres
// ---------------------------------------------------------------------------

describe("GET /api/membres", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getMembers(req() as never);
    expect(res.status).toBe(401);
  });

  it("refuse MEMBER sans permission MEMBERS_VIEW", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await getMembers(req() as never);
    expect(res.status).toBe(403);
  });

  it("autorise ADMIN sans vérifier les permissions RBAC", async () => {
    const res = await getMembers(req() as never);
    expect(res.status).toBe(200);
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it("autorise MEMBER avec MEMBERS_VIEW", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await getMembers(req() as never);
    expect(res.status).toBe(200);
    expect(hasPermission).toHaveBeenCalledWith("m1", "MEMBERS_VIEW");
  });

  it("retourne la liste des membres", async () => {
    const res = await getMembers(req() as never);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Ibrahima Sy");
  });

  it("filtre par categoryId", async () => {
    await getMembers(req("http://localhost/api/membres?categoryId=c1") as never);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "c1" }),
      })
    );
  });

  it("filtre par postId", async () => {
    await getMembers(req("http://localhost/api/membres?postId=p1") as never);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mandates: { some: { isActive: true, postId: "p1" } },
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/membres/[id]
// ---------------------------------------------------------------------------

describe("GET /api/membres/[id]", () => {
  const params = Promise.resolve({ id: "u1" });

  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getMember(req() as never, { params } as never);
    expect(res.status).toBe(401);
  });

  it("refuse MEMBER sans MEMBERS_VIEW_DETAIL", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await getMember(req() as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("retourne 404 si membre inexistant", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await getMember(req() as never, { params } as never);
    expect(res.status).toBe(404);
  });

  it("retourne la fiche du membre", async () => {
    const res = await getMember(req() as never, { params } as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Ibrahima Sy");
    expect(data.mandates).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/membres/export
// ---------------------------------------------------------------------------

describe("GET /api/membres/export", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await exportMembers();
    expect(res.status).toBe(401);
  });

  it("refuse MEMBER sans MEMBERS_EXPORT", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await exportMembers();
    expect(res.status).toBe(403);
  });

  it("retourne un fichier Excel", async () => {
    const res = await exportMembers();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("membres-apats-");
  });

  it("autorise MEMBER avec MEMBERS_EXPORT", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(hasPermission).mockResolvedValue(true);
    const res = await exportMembers();
    expect(res.status).toBe(200);
  });
});
