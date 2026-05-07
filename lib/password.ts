import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const SHA256_HEX_LENGTH = 64;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isSha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean; newHash?: string }> {
  if (isSha256Hash(storedHash)) {
    const valid = sha256(password) === storedHash;
    if (!valid) return { valid: false, needsUpgrade: false };
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return { valid: true, needsUpgrade: true, newHash };
  }

  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsUpgrade: false };
}
