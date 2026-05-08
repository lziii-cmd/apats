import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDeadline,
  getExpectedMonths,
  isMonthOverdue,
  daysSince,
  shouldEscalate,
  collectionRate,
} from "@/lib/cotisations";

// ──────────────────────────────────────────────────────────────────────────────
// Tests purs — lib/cotisations.ts (aucun mock DB nécessaire)
// ──────────────────────────────────────────────────────────────────────────────

describe("getDeadline", () => {
  it("retourne le 5 du mois suivant (cas normal)", () => {
    const d = getDeadline(2026, 3); // mars 2026 → 5 avril 2026
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // 0-based → avril
    expect(d.getDate()).toBe(5);
  });

  it("retourne le 5 janvier de l'année suivante pour décembre", () => {
    const d = getDeadline(2025, 12);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0); // janvier
    expect(d.getDate()).toBe(5);
  });
});

describe("getExpectedMonths", () => {
  it("retourne vide si le membre est inscrit ce mois-ci et la deadline n'est pas passée", () => {
    const today = new Date(2026, 4, 3); // 3 mai 2026 (< 5 juin 2026)
    const createdAt = new Date(2026, 4, 1); // 1er mai 2026
    const result = getExpectedMonths(createdAt, today);
    // deadline mai = 5 juin 2026, not passed yet
    expect(result).toHaveLength(0);
  });

  it("retourne 1 mois si deadline d'un mois est passée", () => {
    const today = new Date(2026, 4, 10); // 10 mai 2026 > 5 mai 2026 (deadline d'avril)
    const createdAt = new Date(2026, 3, 1); // 1er avril 2026
    const result = getExpectedMonths(createdAt, today);
    // Deadline avril = 5 mai 2026, today = 10 mai → avril attendu
    expect(result).toContainEqual({ year: 2026, month: 4 });
    // Deadline mai = 5 juin 2026, pas encore passé
    expect(result).not.toContainEqual({ year: 2026, month: 5 });
  });

  it("ne compte pas les mois avant inscription", () => {
    const today = new Date(2026, 5, 10); // 10 juin 2026
    const createdAt = new Date(2026, 4, 1); // inscrit le 1er mai
    const result = getExpectedMonths(createdAt, today);
    // Seul mai attendu (deadline = 5 juin passée)
    expect(result).toContainEqual({ year: 2026, month: 5 });
    // Pas de mois antérieurs à l'inscription
    expect(result).not.toContainEqual({ year: 2026, month: 4 });
  });

  it("retourne plusieurs mois consécutifs", () => {
    const today = new Date(2026, 3, 10); // 10 avril 2026
    const createdAt = new Date(2026, 0, 1); // inscrit le 1er janvier
    const result = getExpectedMonths(createdAt, today);
    // Deadlines passées : janv (5 fév), fév (5 mars), mars (5 avril) < 10 avril
    expect(result).toContainEqual({ year: 2026, month: 1 });
    expect(result).toContainEqual({ year: 2026, month: 2 });
    expect(result).toContainEqual({ year: 2026, month: 3 });
    expect(result).toHaveLength(3);
  });
});

describe("isMonthOverdue", () => {
  it("retourne true si deadline passée et membre inscrit", () => {
    const today = new Date(2026, 4, 10); // 10 mai 2026
    const createdAt = new Date(2025, 0, 1);
    expect(isMonthOverdue(2026, 4, createdAt, today)).toBe(true);
  });

  it("retourne false si deadline non passée", () => {
    const today = new Date(2026, 4, 3); // 3 mai 2026
    const createdAt = new Date(2025, 0, 1);
    expect(isMonthOverdue(2026, 4, createdAt, today)).toBe(false);
  });

  it("retourne false si membre pas encore inscrit ce mois-là", () => {
    const today = new Date(2026, 4, 10);
    const createdAt = new Date(2026, 4, 1); // inscrit en mai, pas avant
    // Mois avril 2026 : memberStart = 1er mai 2026 > monthStart = 1er avril 2026
    expect(isMonthOverdue(2026, 4, createdAt, today)).toBe(false);
  });
});

describe("daysSince", () => {
  it("retourne 0 pour une date aujourd'hui", () => {
    const now = new Date();
    expect(daysSince(now, now)).toBe(0);
  });

  it("retourne 3 pour une date il y a 3 jours", () => {
    const now = new Date(2026, 4, 10);
    const past = new Date(2026, 4, 7);
    expect(daysSince(past, now)).toBe(3);
  });
});

describe("shouldEscalate", () => {
  it("déclenche à J+3", () => {
    const created = new Date(2026, 4, 7);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(true);
  });

  it("déclenche à J+7", () => {
    const created = new Date(2026, 4, 3);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(true);
  });

  it("déclenche à J+14", () => {
    const created = new Date(2026, 3, 26);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(true);
  });

  it("déclenche à J+30", () => {
    const created = new Date(2026, 3, 10);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(true);
  });

  it("ne déclenche pas à J+5 (pas un jalons)", () => {
    const created = new Date(2026, 4, 5);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(false);
  });

  it("ne déclenche pas à J+0", () => {
    const created = new Date(2026, 4, 10);
    const today = new Date(2026, 4, 10);
    expect(shouldEscalate(created, today)).toBe(false);
  });
});

describe("collectionRate", () => {
  it("retourne 100 si expected est 0", () => {
    expect(collectionRate(0, 0)).toBe(100);
  });

  it("retourne 50 pour 1 confirmé sur 2 attendus", () => {
    expect(collectionRate(2, 1)).toBe(50);
  });

  it("retourne 100 pour tous confirmés", () => {
    expect(collectionRate(10, 10)).toBe(100);
  });

  it("retourne 0 pour aucun confirmé", () => {
    expect(collectionRate(10, 0)).toBe(0);
  });

  it("arrondit à l'entier", () => {
    expect(collectionRate(3, 1)).toBe(33); // 33.33...
    expect(collectionRate(3, 2)).toBe(67); // 66.66...
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests API — POST /api/cotisations/monthly
// ──────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    monthlyPayment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    memberCard: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    permission: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    appConfig: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { POST as postMonthly } from "@/app/api/cotisations/monthly/route";
import { POST as postCard } from "@/app/api/cotisations/card/route";
import { PATCH as patchMonthly } from "@/app/api/cotisations/monthly/[id]/route";
import { GET as getDashboard } from "@/app/api/cotisations/dashboard/route";

const mockAdmin = { userId: "admin-1", email: "admin@apats.ensmg", role: "ADMIN" };
const mockMember = { userId: "member-1", email: "m@m.com", role: "MEMBER" };

function makeReq(body: unknown, url = "http://localhost/api/cotisations/monthly"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatch(body: unknown, url = "http://localhost/api/cotisations/monthly/p1"): Request {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
  vi.mocked(hasPermission).mockResolvedValue(false);
  vi.mocked(db.notification.create).mockResolvedValue({} as never);
  vi.mocked(db.user.findMany).mockResolvedValue([] as never);
  vi.mocked(db.permission.findFirst).mockResolvedValue(null as never);
  vi.mocked(db.appConfig.findUnique).mockResolvedValue({ cardPriceFcfa: 5000, academicYear: "2025-2026" } as never);
});

describe("POST /api/cotisations/monthly", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse cash sans permission COTISATIONS_MANAGE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse cash sans memberId", async () => {
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse un mois invalide", async () => {
    const res = await postMonthly(makeReq({ month: 13, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse un mode de paiement invalide", async () => {
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "BITCOIN", memberId: "m1" }) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si membre introuvable", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null as never);
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(404);
  });

  it("refuse si paiement déjà existant pour ce mois", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "m1", category: { monthlyFee: 3000 } } as never);
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue({ id: "p1" } as never);
    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(409);
  });

  it("crée un paiement cash CONFIRMED (admin)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "m1", category: { monthlyFee: 3000 } } as never);
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.monthlyPayment.create).mockResolvedValue({ id: "p1", status: "CONFIRMED" } as never);

    const res = await postMonthly(makeReq({ month: 1, year: 2026, paymentMode: "CASH", memberId: "m1" }) as never);
    expect(res.status).toBe(201);
    expect(db.monthlyPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) })
    );
  });

  it("crée un paiement Wave PENDING (membre pour soi)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "member-1", category: { monthlyFee: 2000 } } as never);
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.monthlyPayment.create).mockResolvedValue({ id: "p2", status: "PENDING" } as never);

    const res = await postMonthly(makeReq({ month: 2, year: 2026, paymentMode: "WAVE", paymentRef: "REF123" }) as never);
    expect(res.status).toBe(201);
    expect(db.monthlyPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", userId: "member-1" }) })
    );
  });
});

describe("POST /api/cotisations/card", () => {
  it("refuse un format academicYear invalide", async () => {
    const res = await postCard(makeReq({ academicYear: "2025/2026", paymentMode: "CASH", memberId: "m1" }, "http://localhost/api/cotisations/card") as never);
    expect(res.status).toBe(400);
  });

  it("refuse si carte déjà existante pour l'année", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "m1" } as never);
    vi.mocked(db.memberCard.findUnique).mockResolvedValue({ id: "c1" } as never);
    const res = await postCard(makeReq({ academicYear: "2025-2026", paymentMode: "CASH", memberId: "m1" }, "http://localhost/api/cotisations/card") as never);
    expect(res.status).toBe(409);
  });

  it("crée une carte cash CONFIRMED", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "m1" } as never);
    vi.mocked(db.memberCard.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.memberCard.create).mockResolvedValue({ id: "c1", status: "CONFIRMED" } as never);

    const res = await postCard(makeReq({ academicYear: "2025-2026", paymentMode: "CASH", memberId: "m1" }, "http://localhost/api/cotisations/card") as never);
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/cotisations/monthly/[id]", () => {
  it("refuse sans permission COTISATIONS_CONFIRM", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await patchMonthly(makePatch({ action: "confirm" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
  });

  it("refuse action invalide", async () => {
    const res = await patchMonthly(makePatch({ action: "approve" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("refuse rejet sans motif", async () => {
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue({ id: "p1", status: "PENDING", userId: "m1" } as never);
    const res = await patchMonthly(makePatch({ action: "reject" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("refuse si paiement pas PENDING", async () => {
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue({ id: "p1", status: "CONFIRMED", userId: "m1" } as never);
    const res = await patchMonthly(makePatch({ action: "confirm" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(409);
  });

  it("confirme un paiement PENDING", async () => {
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue({ id: "p1", status: "PENDING", userId: "m1", month: 1, year: 2026 } as never);
    vi.mocked(db.monthlyPayment.update).mockResolvedValue({ id: "p1", status: "CONFIRMED" } as never);
    const res = await patchMonthly(makePatch({ action: "confirm" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(db.monthlyPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) })
    );
  });

  it("rejette un paiement avec motif", async () => {
    vi.mocked(db.monthlyPayment.findUnique).mockResolvedValue({ id: "p1", status: "PENDING", userId: "m1", month: 1, year: 2026 } as never);
    vi.mocked(db.monthlyPayment.update).mockResolvedValue({ id: "p1", status: "REJECTED" } as never);
    const res = await patchMonthly(makePatch({ action: "reject", rejectReason: "Référence introuvable" }) as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(db.monthlyPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED", rejectReason: "Référence introuvable" }) })
    );
  });
});

describe("GET /api/cotisations/dashboard", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await getDashboard(new Request("http://localhost/api/cotisations/dashboard") as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission COTISATIONS_VIEW (membre simple)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    const res = await getDashboard(new Request("http://localhost/api/cotisations/dashboard") as never);
    expect(res.status).toBe(403);
  });

  it("retourne les stats pour un admin", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "m1", createdAt: new Date(2025, 0, 1), category: { monthlyFee: 3000 }, monthlyPayments: [] },
    ] as never);
    vi.mocked(db.monthlyPayment.findMany).mockResolvedValue([] as never);
    vi.mocked(db.memberCard.findMany).mockResolvedValue([] as never);
    vi.mocked(db.monthlyPayment.aggregate).mockResolvedValue({ _sum: { amountPaid: 0 } } as never);

    const res = await getDashboard(new Request("http://localhost/api/cotisations/dashboard") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("stats");
    expect(data.stats).toHaveProperty("rate");
  });
});
