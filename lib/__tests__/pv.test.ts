import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    meeting: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { put, del } from "@vercel/blob";
import { POST as uploadPV, DELETE as deletePV } from "@/app/api/reunions/[id]/pv/route";

const mockAdmin = { userId: "admin-1", role: "ADMIN" };
const mockMember = { userId: "u1", role: "MEMBER" };
const params = Promise.resolve({ id: "m1" });

function makeFormReq(file?: File): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost", { method: "POST", body: form });
}

function makeDeleteReq(): Request {
  return new Request("http://localhost", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasPermission).mockResolvedValue(false);
  vi.mocked(del).mockResolvedValue(undefined as never);
  vi.mocked(put).mockResolvedValue({ url: "https://blob.test/pv.pdf" } as never);
});

describe("POST /api/reunions/[id]/pv", () => {
  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await uploadPV(makeFormReq() as never, { params } as never);
    expect(res.status).toBe(401);
  });

  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await uploadPV(makeFormReq() as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("refuse si réunion non clôturée", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "OPEN", pvUrl: null } as never);
    const pdf = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const res = await uploadPV(makeFormReq(pdf) as never, { params } as never);
    expect(res.status).toBe(409);
  });

  it("refuse si pas de fichier", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "CLOSED", pvUrl: null } as never);
    const res = await uploadPV(makeFormReq() as never, { params } as never);
    expect(res.status).toBe(400);
  });

  it("refuse si pas un PDF", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "CLOSED", pvUrl: null } as never);
    const img = new File(["img"], "test.png", { type: "image/png" });
    const res = await uploadPV(makeFormReq(img) as never, { params } as never);
    expect(res.status).toBe(400);
  });

  it("upload le PV et retourne l'URL", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "CLOSED", pvUrl: null } as never);
    vi.mocked(put).mockResolvedValue({ url: "https://blob.test/pv.pdf" } as never);
    vi.mocked(db.meeting.update).mockResolvedValue({ pvUrl: "https://blob.test/pv.pdf" } as never);

    const pdf = new File(["pdf content"], "pv.pdf", { type: "application/pdf" });
    const res = await uploadPV(makeFormReq(pdf) as never, { params } as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pvUrl).toBe("https://blob.test/pv.pdf");
    expect(put).toHaveBeenCalled();
  });

  it("supprime l'ancien PV avant le nouvel upload", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ id: "m1", status: "CLOSED", pvUrl: "https://old.url/pv.pdf" } as never);
    vi.mocked(put).mockResolvedValue({ url: "https://new.url/pv.pdf" } as never);
    vi.mocked(db.meeting.update).mockResolvedValue({ pvUrl: "https://new.url/pv.pdf" } as never);

    const pdf = new File(["pdf"], "pv.pdf", { type: "application/pdf" });
    await uploadPV(makeFormReq(pdf) as never, { params } as never);
    expect(del).toHaveBeenCalledWith("https://old.url/pv.pdf");
  });
});

describe("DELETE /api/reunions/[id]/pv", () => {
  it("refuse sans permission", async () => {
    vi.mocked(getSession).mockResolvedValue(mockMember as never);
    const res = await deletePV(makeDeleteReq() as never, { params } as never);
    expect(res.status).toBe(403);
  });

  it("supprime le blob et vide pvUrl", async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin as never);
    vi.mocked(db.meeting.findUnique).mockResolvedValue({ pvUrl: "https://blob.test/pv.pdf" } as never);
    vi.mocked(db.meeting.update).mockResolvedValue({} as never);

    const res = await deletePV(makeDeleteReq() as never, { params } as never);
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith("https://blob.test/pv.pdf");
    expect(db.meeting.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { pvUrl: null } });
  });
});
