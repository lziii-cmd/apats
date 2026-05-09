import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    event: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    eventParticipant: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { GET, POST } from "@/app/api/evenements/route";
import { GET as getOne, PATCH, DELETE as deleteEvent } from "@/app/api/evenements/[id]/route";
import { POST as join, DELETE as leave } from "@/app/api/evenements/[id]/participer/route";

const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const mockMember = { userId: "u1", role: "MEMBER" };
const params = Promise.resolve({ id: "e1" });

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
});

// ---------------------------------------------------------------------------
// GET /api/evenements
// ---------------------------------------------------------------------------
describe("GET /api/evenements", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retourne la liste des événements", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.event.findMany).mockResolvedValue([{ id: "e1", title: "Fête" }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/evenements
// ---------------------------------------------------------------------------
describe("POST /api/evenements", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(makeReq({ title: "T", date: "2026-06-01", location: "L", description: "D" }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission EVENTS_CREATE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await POST(makeReq({ title: "T", date: "2026-06-01", location: "L", description: "D" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs requis manquants", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    const res = await POST(makeReq({ title: "T" }) as never);
    expect(res.status).toBe(400);
  });

  it("crée un événement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.event.create).mockResolvedValue({ id: "e1" } as never);
    const res = await POST(makeReq({ title: "Fête", date: "2026-06-01T10:00", location: "Salle", description: "Desc" }) as never);
    expect(res.status).toBe(201);
    expect(db.event.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/evenements/[id]
// ---------------------------------------------------------------------------
describe("PATCH /api/evenements/[id]", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await PATCH(makeReq({ title: "Nouveau" }) as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("met à jour l'événement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.event.update).mockResolvedValue({ id: "e1" } as never);
    const res = await PATCH(makeReq({ title: "Nouveau" }) as never, { params } as never);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/evenements/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/evenements/[id]", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await deleteEvent(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("supprime l'événement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.event.delete).mockResolvedValue({} as never);
    const res = await deleteEvent(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST/DELETE /api/evenements/[id]/participer
// ---------------------------------------------------------------------------
describe("POST /api/evenements/[id]/participer", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await join(makeReq() as never, { params } as never);
    expect(res.status).toBe(401);
  });

  it("s'inscrit à l'événement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.event.findUnique).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(db.eventParticipant.upsert).mockResolvedValue({} as never);
    const res = await join(makeReq() as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.eventParticipant.upsert).toHaveBeenCalled();
  });

  it("refuse si événement introuvable", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.event.findUnique).mockResolvedValue(null);
    const res = await join(makeReq() as never, { params } as never);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/evenements/[id]/participer", () => {
  it("se désinscrit de l'événement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    vi.mocked(db.eventParticipant.deleteMany).mockResolvedValue({ count: 1 } as never);
    const res = await leave(makeReq(undefined, "DELETE") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.eventParticipant.deleteMany).toHaveBeenCalledWith({ where: { eventId: "e1", userId: "u1" } });
  });
});
