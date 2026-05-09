import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    notification: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/notifications/route";
import { signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

const payload = { userId: "user-1", email: "test@ensmg.com", role: "MEMBER" as const };

async function mockSession(active = true) {
  const token = await signToken(payload);
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === "apats_session" ? { value: token } : undefined),
  } as never);
  vi.mocked(db.user.findUnique).mockResolvedValueOnce({ isActive: active } as never);
}

async function mockNoSession() {
  vi.mocked(cookies).mockResolvedValue({
    get: () => undefined,
  } as never);
}

const sampleNotifications = [
  { id: "n1", type: "INFO", title: "Test", body: "Body", isRead: false, createdAt: new Date() },
  { id: "n2", type: "INFO", title: "Test 2", body: "Body 2", isRead: true, createdAt: new Date() },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/notifications", () => {
  it("retourne 401 si non authentifié", async () => {
    await mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retourne les notifications et le nombre non lu", async () => {
    await mockSession();
    vi.mocked(db.notification.findMany).mockResolvedValueOnce(sampleNotifications as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toHaveLength(2);
    expect(data.unreadCount).toBe(1);
  });

  it("retourne unreadCount 0 si toutes lues", async () => {
    await mockSession();
    const allRead = sampleNotifications.map((n) => ({ ...n, isRead: true }));
    vi.mocked(db.notification.findMany).mockResolvedValueOnce(allRead as never);
    const res = await GET();
    const data = await res.json();
    expect(data.unreadCount).toBe(0);
  });

  it("retourne liste vide si aucune notification", async () => {
    await mockSession();
    vi.mocked(db.notification.findMany).mockResolvedValueOnce([] as never);
    const res = await GET();
    const data = await res.json();
    expect(data.notifications).toHaveLength(0);
    expect(data.unreadCount).toBe(0);
  });
});

describe("PATCH /api/notifications", () => {
  it("retourne 401 si non authentifié", async () => {
    await mockNoSession();
    const res = await PATCH();
    expect(res.status).toBe(401);
  });

  it("marque toutes les notifications comme lues", async () => {
    await mockSession();
    vi.mocked(db.notification.updateMany).mockResolvedValueOnce({ count: 2 } as never);
    const res = await PATCH();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(vi.mocked(db.notification.updateMany)).toHaveBeenCalledWith({
      where: { userId: payload.userId, isRead: false },
      data: { isRead: true },
    });
  });
});
