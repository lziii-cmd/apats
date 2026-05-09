import { describe, it, expect } from "vitest";
import { Feature, Role, Locale, MeetingType } from "@prisma/client";

describe("Feature enum", () => {
  it("contient toutes les features attendues", () => {
    const expected: Feature[] = [
      "MEMBERS_VIEW",
      "MEMBERS_VIEW_DETAIL",
      "MEMBERS_EXPORT",
      "COTISATIONS_VIEW",
      "COTISATIONS_MANAGE",
      "COTISATIONS_CONFIRM",
      "MEETINGS_VIEW",
      "MEETINGS_CREATE",
      "MEETINGS_ATTENDANCE",
      "MEETINGS_UPLOAD_PV",
      "EVENTS_CREATE",
      "TREASURY_VIEW",
      "TREASURY_MANAGE",
      "TREASURY_EXPORT",
      "ANNOUNCEMENTS_CREATE",
    ];
    expected.forEach((f) => {
      expect(Object.values(Feature)).toContain(f);
    });
  });

  it("ne contient pas ANNOUNCEMENTS_VIEW (CDC §5.8 : lisible par tous)", () => {
    expect(Object.values(Feature)).not.toContain("ANNOUNCEMENTS_VIEW");
  });
});

describe("Role enum", () => {
  it("contient ADMIN et MEMBER", () => {
    expect(Object.values(Role)).toEqual(expect.arrayContaining(["ADMIN", "MEMBER"]));
  });
});

describe("Locale enum", () => {
  it("contient fr et en", () => {
    expect(Object.values(Locale)).toEqual(expect.arrayContaining(["fr", "en"]));
  });
});

describe("MeetingType enum", () => {
  it("contient BUREAU, AG et EXTRAORDINARY", () => {
    expect(Object.values(MeetingType)).toEqual(
      expect.arrayContaining(["BUREAU", "AG", "EXTRAORDINARY"])
    );
  });
});
