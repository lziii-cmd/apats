import { describe, it, expect, vi, beforeEach } from "vitest";
import { Feature, Role } from "@prisma/client";

// Mock du module db
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    mandate: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { hasPermission, getUserFeatures } from "@/lib/permissions";

const mockUserFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;
const mockMandateFindFirst = db.mandate.findFirst as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe("hasPermission", () => {
  it("retourne false si l'utilisateur n'existe pas", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await hasPermission("user-inexistant", Feature.MEMBERS_VIEW);
    expect(result).toBe(false);
  });

  it("retourne true pour un ADMIN quelle que soit la feature", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.ADMIN });

    const result = await hasPermission("admin-id", Feature.TREASURY_MANAGE);
    expect(result).toBe(true);
    // L'admin ne doit pas interroger les mandats
    expect(mockMandateFindFirst).not.toHaveBeenCalled();
  });

  it("retourne false si le membre n'a aucun mandat actif", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue(null);

    const result = await hasPermission("member-id", Feature.MEMBERS_VIEW);
    expect(result).toBe(false);
  });

  it("retourne true si le poste accorde la feature (granted: true)", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue({
      post: {
        permissions: [{ granted: true }],
      },
    });

    const result = await hasPermission("member-id", Feature.COTISATIONS_VIEW);
    expect(result).toBe(true);
  });

  it("retourne false si la feature est explicitement refusée (granted: false)", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue({
      post: {
        permissions: [{ granted: false }],
      },
    });

    const result = await hasPermission("member-id", Feature.TREASURY_MANAGE);
    expect(result).toBe(false);
  });

  it("retourne false si la feature n'est pas configurée pour le poste (permission absente)", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue({
      post: {
        permissions: [], // aucune entrée pour cette feature
      },
    });

    const result = await hasPermission("member-id", Feature.MEETINGS_CREATE);
    expect(result).toBe(false);
  });

  it("ne remonte que les mandats actifs (isActive: true passé à la requête)", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue(null);

    await hasPermission("member-id", Feature.MEMBERS_VIEW);

    expect(mockMandateFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("filtre les mandats dont la date de fin est dépassée (endDate gt now)", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue(null); // mandat expiré exclu par la requête

    await hasPermission("member-id", Feature.MEMBERS_VIEW);

    expect(mockMandateFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          endDate: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getUserFeatures
// ---------------------------------------------------------------------------

describe("getUserFeatures", () => {
  it("retourne un tableau vide si l'utilisateur n'existe pas", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await getUserFeatures("user-inexistant");
    expect(result).toEqual([]);
  });

  it("retourne toutes les features pour un ADMIN", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.ADMIN });

    const result = await getUserFeatures("admin-id");
    expect(result).toEqual(expect.arrayContaining(Object.values(Feature)));
    expect(result).toHaveLength(Object.values(Feature).length);
  });

  it("retourne les features accordées au poste du membre", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue({
      post: {
        permissions: [
          { feature: Feature.MEMBERS_VIEW },
          { feature: Feature.COTISATIONS_VIEW },
        ],
      },
    });

    const result = await getUserFeatures("member-id");
    expect(result).toEqual([Feature.MEMBERS_VIEW, Feature.COTISATIONS_VIEW]);
  });

  it("retourne un tableau vide si le membre n'a aucun mandat actif", async () => {
    mockUserFindUnique.mockResolvedValue({ role: Role.MEMBER });
    mockMandateFindFirst.mockResolvedValue(null);

    const result = await getUserFeatures("member-id");
    expect(result).toEqual([]);
  });
});
