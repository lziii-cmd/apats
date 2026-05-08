import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    appConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { put, del } from "@vercel/blob";
import { GET, PATCH } from "@/app/api/admin/config/route";
import { POST as uploadLogo, DELETE as deleteLogo } from "@/app/api/admin/config/logo/route";

const adminSession = { userId: "a1", email: "admin@apats.ensmg", role: "ADMIN" };
const memberSession = { userId: "m1", email: "user@apats.ensmg", role: "MEMBER" };

const mockConfig = {
  id: "singleton",
  orgName: "Amicale des PATs — ENSMG",
  logoUrl: null,
  defaultLocale: "fr",
  academicYear: "2025-2026",
  mandateDurationDays: 730,
  updatedAt: new Date(),
};

function req(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/config", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(adminSession as never);
  vi.mocked(db.appConfig.upsert).mockResolvedValue(mockConfig as never);
  vi.mocked(db.appConfig.findUnique).mockResolvedValue(mockConfig as never);
});

// ---------------------------------------------------------------------------
// GET /api/admin/config
// ---------------------------------------------------------------------------

describe("GET /api/admin/config", () => {
  it("refuse sans session admin", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("refuse si rôle MEMBER", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("retourne la configuration", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orgName).toBe("Amicale des PATs — ENSMG");
    expect(data.academicYear).toBe("2025-2026");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/config
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/config", () => {
  it("refuse sans session admin", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH(req("PATCH", { orgName: "Test" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si body vide", async () => {
    const res = await PATCH(req("PATCH", {}) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si orgName vide", async () => {
    const res = await PATCH(req("PATCH", { orgName: "   " }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si locale invalide", async () => {
    const res = await PATCH(req("PATCH", { defaultLocale: "de" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse format academicYear invalide", async () => {
    const res = await PATCH(req("PATCH", { academicYear: "2025/2026" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse academicYear si fin ≠ début + 1", async () => {
    const res = await PATCH(req("PATCH", { academicYear: "2025-2027" }) as never);
    expect(res.status).toBe(400);
  });

  it("met à jour orgName", async () => {
    vi.mocked(db.appConfig.upsert).mockResolvedValue({ ...mockConfig, orgName: "Nouveau Nom" } as never);
    const res = await PATCH(req("PATCH", { orgName: "Nouveau Nom" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orgName).toBe("Nouveau Nom");
  });

  it("met à jour defaultLocale", async () => {
    vi.mocked(db.appConfig.upsert).mockResolvedValue({ ...mockConfig, defaultLocale: "en" } as never);
    const res = await PATCH(req("PATCH", { defaultLocale: "en" }) as never);
    expect(res.status).toBe(200);
  });

  it("met à jour academicYear avec format valide", async () => {
    vi.mocked(db.appConfig.upsert).mockResolvedValue({ ...mockConfig, academicYear: "2026-2027" } as never);
    const res = await PATCH(req("PATCH", { academicYear: "2026-2027" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.academicYear).toBe("2026-2027");
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/config/logo
// ---------------------------------------------------------------------------

describe("POST /api/admin/config/logo", () => {
  it("refuse sans session admin", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const formData = new FormData();
    const r = new Request("http://localhost/api/admin/config/logo", {
      method: "POST",
      body: formData,
    });
    const res = await uploadLogo(r as never);
    expect(res.status).toBe(403);
  });

  it("refuse si aucun fichier", async () => {
    const formData = new FormData();
    const r = new Request("http://localhost/api/admin/config/logo", {
      method: "POST",
      body: formData,
    });
    const res = await uploadLogo(r as never);
    expect(res.status).toBe(400);
  });

  it("refuse type MIME non autorisé", async () => {
    const file = new File(["data"], "logo.gif", { type: "image/gif" });
    const formData = new FormData();
    formData.append("file", file);
    const r = new Request("http://localhost/api/admin/config/logo", {
      method: "POST",
      body: formData,
    });
    const res = await uploadLogo(r as never);
    expect(res.status).toBe(400);
  });

  it("refuse fichier trop volumineux", async () => {
    const bigContent = new Uint8Array(600 * 1024);
    const file = new File([bigContent], "logo.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    const r = new Request("http://localhost/api/admin/config/logo", {
      method: "POST",
      body: formData,
    });
    const res = await uploadLogo(r as never);
    expect(res.status).toBe(400);
  });

  it("upload avec succès", async () => {
    vi.mocked(put).mockResolvedValue({ url: "https://blob.vercel.io/logo.png" } as never);
    vi.mocked(db.appConfig.upsert).mockResolvedValue({
      ...mockConfig,
      logoUrl: "https://blob.vercel.io/logo.png",
    } as never);
    const file = new File(["img"], "logo.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    const r = new Request("http://localhost/api/admin/config/logo", {
      method: "POST",
      body: formData,
    });
    const res = await uploadLogo(r as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.logoUrl).toContain("blob.vercel.io");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/config/logo
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/config/logo", () => {
  it("refuse sans session admin", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const r = new Request("http://localhost/api/admin/config/logo", { method: "DELETE" });
    const res = await deleteLogo();
    expect(res.status).toBe(403);
  });

  it("supprime le logo existant", async () => {
    vi.mocked(db.appConfig.findUnique).mockResolvedValue({
      ...mockConfig,
      logoUrl: "https://blob.vercel.io/logo.png",
    } as never);
    vi.mocked(del).mockResolvedValue(undefined as never);
    vi.mocked(db.appConfig.upsert).mockResolvedValue({ ...mockConfig, logoUrl: null } as never);
    const res = await deleteLogo();
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith("https://blob.vercel.io/logo.png");
  });

  it("ne plante pas si aucun logo", async () => {
    vi.mocked(db.appConfig.findUnique).mockResolvedValue({ ...mockConfig, logoUrl: null } as never);
    const res = await deleteLogo();
    expect(res.status).toBe(200);
    expect(del).not.toHaveBeenCalled();
  });
});
