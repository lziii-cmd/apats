import { describe, it, expect, vi, beforeEach } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

const payload = { userId: "clx123", email: "test@ensmg.com", role: "MEMBER" as const };

describe("signToken / verifyToken", () => {
  it("signe et vérifie un token valide", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result?.userId).toBe(payload.userId);
    expect(result?.email).toBe(payload.email);
    expect(result?.role).toBe(payload.role);
  });

  it("retourne null pour un token invalide", async () => {
    const result = await verifyToken("token.invalide.ici");
    expect(result).toBeNull();
  });

  it("retourne null pour un token vide", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });
});

// Tests getSession — vérification isActive
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession — isActive", () => {
  async function sessionWithToken(isActive: boolean) {
    const token = await signToken(payload);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === "apats_session" ? { value: token } : undefined),
    } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ isActive } as never);
  }

  it("retourne la session si le compte est actif", async () => {
    await sessionWithToken(true);
    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(payload.userId);
  });

  it("retourne null si le compte est désactivé", async () => {
    await sessionWithToken(false);
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retourne null si l'utilisateur n'existe plus en DB", async () => {
    const token = await signToken(payload);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === "apats_session" ? { value: token } : undefined),
    } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retourne null si pas de cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never);
    const session = await getSession();
    expect(session).toBeNull();
  });
});
