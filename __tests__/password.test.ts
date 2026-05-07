import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "@/lib/password";

function sha256(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

describe("hashPassword", () => {
  it("produit un hash bcrypt (commence par $2)", async () => {
    const hash = await hashPassword("secret");
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("deux appels donnent des hashs différents (salt aléatoire)", async () => {
    const h1 = await hashPassword("secret");
    const h2 = await hashPassword("secret");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword — hash bcrypt", () => {
  it("retourne valid=true pour le bon mot de passe", async () => {
    const hash = await hashPassword("correct");
    const result = await verifyPassword("correct", hash);
    expect(result.valid).toBe(true);
    expect(result.needsUpgrade).toBe(false);
  });

  it("retourne valid=false pour un mauvais mot de passe", async () => {
    const hash = await hashPassword("correct");
    const result = await verifyPassword("wrong", hash);
    expect(result.valid).toBe(false);
  });
});

describe("verifyPassword — migration SHA-256 → bcrypt", () => {
  it("valide un hash SHA-256 et demande la migration", async () => {
    const storedHash = sha256("ENSMG2026");
    const result = await verifyPassword("ENSMG2026", storedHash);
    expect(result.valid).toBe(true);
    expect(result.needsUpgrade).toBe(true);
    expect(result.newHash).toMatch(/^\$2[ab]\$/);
  });

  it("rejette un mauvais mot de passe même sur hash SHA-256", async () => {
    const storedHash = sha256("ENSMG2026");
    const result = await verifyPassword("mauvais", storedHash);
    expect(result.valid).toBe(false);
    expect(result.needsUpgrade).toBe(false);
  });
});
