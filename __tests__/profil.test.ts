import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    appConfig: { findUnique: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

import { GET } from "@/app/api/me/route";
import { PATCH } from "@/app/api/me/password/route";
import { signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyPassword, hashPassword } from "@/lib/password";

const payload = { userId: "user-1", email: "test@ensmg.com", role: "MEMBER" as const };

async function mockSession(active = true) {
  const token = await signToken(payload);
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === "apats_session" ? { value: token } : undefined),
  } as never);
  vi.mocked(db.user.findUnique).mockResolvedValueOnce({ isActive: active } as never);
}

function makeRequest(body?: object) {
  return {
    json: () => Promise.resolve(body ?? {}),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.appConfig.findUnique).mockResolvedValue({
    academicYear: "2025-2026",
    cardPriceFcfa: 5000,
  } as never);
});

// ─── GET /api/me ───────────────────────────────────────────────────────────

describe("GET /api/me", () => {
  it("retourne 401 si non authentifié", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retourne les données profil de l'utilisateur connecté", async () => {
    await mockSession();

    const fakeUser = {
      id: "user-1",
      name: "Test User",
      email: "test@ensmg.com",
      locale: "fr",
      createdAt: new Date("2024-09-01"),
      category: { id: "cat-1", name: "Permanent", monthlyFee: 3000 },
      mandates: [
        {
          id: "man-1",
          startDate: new Date("2024-09-01"),
          endDate: new Date("2026-09-01"),
          post: { id: "post-1", name: "Président" },
        },
      ],
      memberCards: [
        { id: "card-1", academicYear: "2025-2026", pricePaid: 5000, paymentMode: "CASH", status: "CONFIRMED" },
      ],
      monthlyPayments: [
        { id: "mp-1", month: 1, year: 2026, amountDue: 3000, amountPaid: 3000, paymentMode: "CASH", status: "CONFIRMED" },
      ],
      meetingAttendances: [
        {
          attended: true,
          attendanceStatus: null,
          preConfirmed: true,
          meeting: { id: "m-1", title: "Réunion bureau", type: "BUREAU", date: new Date("2026-03-01"), status: "CLOSED" },
        },
      ],
    };

    vi.mocked(db.user.findUnique).mockResolvedValueOnce(fakeUser as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.name).toBe("Test User");
    expect(data.user.activeMandate.post.name).toBe("Président");
    expect(data.card.status).toBe("CONFIRMED");
    expect(data.attendance).toHaveLength(1);
    expect(data.academicYear).toBe("2025-2026");
  });
});

// ─── PATCH /api/me/password ────────────────────────────────────────────────

describe("PATCH /api/me/password", () => {
  it("retourne 401 si non authentifié", async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
    const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "newpass123" }));
    expect(res.status).toBe(401);
  });

  it("retourne 400 si currentPassword absent", async () => {
    await mockSession();
    const res = await PATCH(makeRequest({ newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/actuel/);
  });

  it("retourne 400 si newPassword trop court (< 8 chars)", async () => {
    await mockSession();
    const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "short" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 caractères/);
  });

  it("retourne 400 si le mot de passe actuel est incorrect", async () => {
    await mockSession();
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: "$2b$12$fakehash" } as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce({ valid: false, needsUpgrade: false });

    const res = await PATCH(makeRequest({ currentPassword: "wrongold", newPassword: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/incorrect/);
  });

  it("retourne 200 et met à jour le hash si tout est valide", async () => {
    await mockSession();
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: "$2b$12$fakehash" } as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce({ valid: true, needsUpgrade: false });
    vi.mocked(hashPassword).mockResolvedValueOnce("$2b$12$newhash");
    vi.mocked(db.user.update).mockResolvedValueOnce({} as never);

    const res = await PATCH(makeRequest({ currentPassword: "correctold", newPassword: "newpass123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "$2b$12$newhash" } })
    );
  });
});
