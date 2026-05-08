import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    meeting: { findUnique: vi.fn(), update: vi.fn() },
    meetingAttendee: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { POST as scan } from "@/app/api/reunions/scan/route";
import { POST as openMeeting } from "@/app/api/reunions/[id]/open/route";
import { POST as closeMeeting } from "@/app/api/reunions/[id]/close/route";
import { PATCH as patchAttendee } from "@/app/api/reunions/[id]/attendees/[userId]/route";

const mockSession = { userId: "u1", email: "user@apats.ensmg", role: "MEMBER" };
const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const params = Promise.resolve({ id: "m1" });
const attendeeParams = Promise.resolve({ id: "m1", userId: "u2" });

function makeReq(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasPermission).mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// POST /api/reunions/scan
// ---------------------------------------------------------------------------
describe("POST /api/reunions/scan", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await scan(makeReq({ qrCode: "abc" }) as never);
    expect(res.status).toBe(401);
  });

  it("refuse si qrCode manquant", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    const res = await scan(makeReq({}) as never);
    expect(res.status).toBe(400);
  });

  it("refuse si QR Code invalide", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue(null);
    const res = await scan(makeReq({ qrCode: "bad" }) as never);
    expect(res.status).toBe(404);
  });

  it("refuse si réunion non OPEN (PLANNED)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", title: "T", status: "PLANNED" } as never);
    const res = await scan(makeReq({ qrCode: "qr1" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si réunion CLOSED", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", title: "T", status: "CLOSED" } as never);
    const res = await scan(makeReq({ qrCode: "qr1" }) as never);
    expect(res.status).toBe(403);
  });

  it("refuse si non convoqué", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", title: "T", status: "OPEN" } as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue(null);
    const res = await scan(makeReq({ qrCode: "qr1" }) as never);
    expect(res.status).toBe(403);
  });

  it("enregistre la présence", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", title: "T", status: "OPEN" } as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue({ attended: false } as never);
    vi.mocked(db.meetingAttendee.update).mockResolvedValue({ attended: true } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ name: "Test User" } as never);

    const res = await scan(makeReq({ qrCode: "qr1" }) as never);
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attended: true, attendanceStatus: "PRESENT" } })
    );
  });

  it("idempotent : double scan retourne 200 sans re-écrire", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", title: "T", status: "OPEN" } as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue({ attended: true } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ name: "Test User" } as never);

    const res = await scan(makeReq({ qrCode: "qr1" }) as never);
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.update).not.toHaveBeenCalled();
    const data = await res.json();
    expect(data.alreadyScanned).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/reunions/[id]/open
// ---------------------------------------------------------------------------
describe("POST /api/reunions/[id]/open", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    const res = await openMeeting(makeReq({}) as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si déjà OPEN", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "OPEN" } as never);
    const res = await openMeeting(makeReq({}) as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("passe le statut à OPEN", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "PLANNED" } as never);
    vi.mocked(db.meeting.update).mockResolvedValue({ status: "OPEN" } as never);

    const res = await openMeeting(makeReq({}) as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meeting.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { status: "OPEN" } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/reunions/[id]/close
// ---------------------------------------------------------------------------
describe("POST /api/reunions/[id]/close", () => {
  it("refuse si réunion PLANNED (pas OPEN)", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "PLANNED" } as never);
    const res = await closeMeeting(makeReq({}) as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("marque les absents et clôture", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "OPEN" } as never);
    vi.mocked(db.meetingAttendee.updateMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(db.meeting.update).mockResolvedValue({ status: "CLOSED" } as never);

    const res = await closeMeeting(makeReq({}) as never, { params } as never);
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.updateMany).toHaveBeenCalledWith({
      where: { meetingId: "m1", attended: null },
      data: { attended: false, attendanceStatus: "ABSENT" },
    });
    expect(db.meeting.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { status: "CLOSED" } });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/reunions/[id]/attendees/[userId]
// ---------------------------------------------------------------------------
describe("PATCH /api/reunions/[id]/attendees/[userId]", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    const res = await patchAttendee(
      makeReq({ attended: true }) as never,
      { params: attendeeParams } as never
    );
    expect(res.status).toBe(403);
  });

  it("marque présent manuellement", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ status: "OPEN" } as never);
    vi.mocked(db.meetingAttendee.findUnique).mockResolvedValue({ userId: "u2" } as never);
    vi.mocked(db.meetingAttendee.update).mockResolvedValue({ attended: true } as never);

    const res = await patchAttendee(
      makeReq({ attended: true }) as never,
      { params: attendeeParams } as never
    );
    expect(res.status).toBe(200);
    expect(db.meetingAttendee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attended: true, attendanceStatus: "PRESENT" } })
    );
  });

  it("refuse si réunion clôturée", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ status: "CLOSED" } as never);
    const res = await patchAttendee(
      makeReq({ attended: true }) as never,
      { params: attendeeParams } as never
    );
    expect(res.status).toBe(409);
  });
});
