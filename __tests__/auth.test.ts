import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

const payload = { userId: "clx123", email: "test@ensmg.com", role: "MEMBER" as const };

describe("signToken / verifyToken", () => {
  it("signe et vérifie un token valide", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result?.userId).toBe(payload.userId);
    expect(result?.email).toBe(payload.email);
    expect(result?.role).toBe(payload.role);
  });

  it("retourne null pour un token invalide", async () => {
    const result = await verifyToken("token.invalide.ici");
    expect(result).toBeNull();
  });

  it("retourne null pour un token vide", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });
});
