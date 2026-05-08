import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    meeting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    meetingAttendee: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { POST as createReunion, GET as listReunions } from "@/app/api/reunions/route";
import {
  GET as getReunion,
  PATCH as patchReunion,
  DELETE as deleteReunion,
} from "@/app/api/reunions/[id]/route";
import {
  POST as confirmPresence,
  DELETE as cancelPresence,
} from "@/app/api/reunions/[id]/confirm/route";

const mockSession = { userId: "u1", email: "user@apats.ensmg", role: "MEMBER" };
const mockAdminSession = { userId: "admin-1", email: "admin@apats.ensmg", role: "ADMIN" };
const params = Promise.resolve({ id: "meeting-1" });

function makeReq(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/reunions", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  type: "BUREAU",
  title: "Réunion de bureau",
  date: "2026-06-01T09:00:00.000Z",
  location: "Salle de réunion",
  agenda: "Point sur les cotisations",
  inviteeIds: ["u2", "u3"],
};

const mockMeeting = {
  id: "meeting-1", type: "BUREAU", title: "Réunion de bureau",
  date: new Date("2026-06-01T09:00:00Z"), endTime: null,
  location: "Salle", speakers: null, agenda: "ODJ", qrCode: "qr-abc",
  status: "PLANNED", _count: { attendees: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasPermission).mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// POST /api/reunions
// ---------------------------------------------------------------------------
describe("POST /api/reunions", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await createReunion(makeReq(validBody) as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission MEETINGS_CREATE", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    const res = await createReunion(makeReq(validBody) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si champs requis manquants", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    const res = await createReunion(makeReq({ type: "BUREAU", title: "X" }) as never);
    expect(res.status).toBe(400);
  });

  it("crée la réunion BUREAU avec inviteeIds fournis", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.create).mockResolvedValue(mockMeeting as never);
    vi.mocked(db.notification.createMany).mockResolvedValue({ count: 2 } as never);

    const res = await createReunion(makeReq(validBody) as never);
    expect(res.status).toBe(201);
    expect(db.meeting.create).toHaveBeenCalledOnce();
  });

  it("invite tous les membres actifs pour une AG", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "u1" }, { id: "u2" }, { id: "u3" },
    ] as never);
    vi.mocked(db.meeting.create).mockResolvedValue(mockMeeting as never);
    vi.mocked(db.notification.createMany).mockResolvedValue({ count: 3 } as never);

    const res = await createReunion(
      makeReq({ ...validBody, type: "AG", inviteeIds: [] }) as never
    );
    expect(res.status).toBe(201);
    const createCall = vi.mocked(db.meeting.create).mock.calls[0]?.[0];
    if (!createCall) throw new Error("create not called");
    const attendees = (createCall.data.attendees as { create: { userId: string }[] }).create;
    expect(attendees).toHaveLength(3);
  });

  it("envoie les notifications in-app aux invités", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.create).mockResolvedValue(mockMeeting as never);
    vi.mocked(db.notification.createMany).mockResolvedValue({ count: 2 } as never);

    await createReunion(makeReq(validBody) as never);
    expect(db.notification.createMany).toHaveBeenCalledOnce();
    const notifCall = vi.mocked(db.notification.createMany).mock.calls[0]?.[0];
    if (!notifCall) throw new Error("createMany not called");
    expect(notifCall.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// GET /api/reunions
// ---------------------------------------------------------------------------
describe("GET /api/reunions", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await listReunions(new Request("http://localhost/api/reunions") as never);
    expect(res.status).toBe(401);
  });

  it("retourne la liste si MEETINGS_VIEW", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(db.meeting.findMany).mockResolvedValue([mockMeeting] as never);

    const res = await listReunions(new Request("http://localhost/api/reunions") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/reunions/[id]
// ---------------------------------------------------------------------------
describe("PATCH /api/reunions/[id]", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await patchReunion(makeReq({ title: "X" }, "PATCH") as never, { params } as never);
    expect(res.status).toBe(401);
  });

  it("retourne 404 si réunion inexistante", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue(null);
    const res = await patchReunion(makeReq({ title: "X" }, "PATCH") as never, { params } as never);
    expect(res.status).toBe(404);
  });

  it("met à jour les champs", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue(mockMeeting as never);
    vi.mocked(db.meeting.update).mockResolvedValue({ ...mockMeeting, title: "Modifié" } as never);

    const res = await patchReunion(makeReq({ title: "Modifié" }, "PATCH") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meeting.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/reunions/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/reunions/[id]", () => {
  it("refuse si réunion clôturée", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ ...mockMeeting, status: "CLOSED" } as never);
    const res = await deleteReunion(new Request("http://localhost") as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("supprime la réunion PLANNED", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue(mockMeeting as never);
    vi.mocked(db.meeting.delete).mockResolvedValue(mockMeeting as never);

    const res = await deleteReunion(new Request("http://localhost") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meeting.delete).toHaveBeenCalledWith({ where: { id: "meeting-1" } });
  });
});

// ---------------------------------------------------------------------------
// POST/DELETE /api/reunions/[id]/confirm
// ---------------------------------------------------------------------------
describe("POST /api/reunions/[id]/confirm", () => {
  it("refuse si non convoqué", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue(null);
    const res = await confirmPresence(new Request("http://localhost") as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("confirme la présence (idempotent)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue({ meetingId: "meeting-1", userId: "u1", preConfirmed: false } as never);
    vi.mocked(db.meetingAttendee.update).mockResolvedValue({ preConfirmed: true } as never);

    const res = await confirmPresence(new Request("http://localhost") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { preConfirmed: true } })
    );
  });
});

describe("DELETE /api/reunions/[id]/confirm", () => {
  it("annule la pré-confirmation", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue({ meetingId: "meeting-1", userId: "u1", preConfirmed: true } as never);
    vi.mocked(db.meetingAttendee.update).mockResolvedValue({ preConfirmed: false } as never);

    const res = await cancelPresence(new Request("http://localhost") as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { preConfirmed: false } })
    );
  });
});
