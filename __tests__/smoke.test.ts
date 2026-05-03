import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("lib/utils", () => {
  it("cn() merge les classes Tailwind correctement", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("cn() ignore les valeurs falsy", () => {
    expect(cn("base", false && "ignored", undefined, "active")).toBe(
      "base active"
    );
  });
});
