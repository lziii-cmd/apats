import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me"
);

const COOKIE_NAME = "apats_session";
const TOKEN_TTL = "7d";

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Vérification isActive à chaque requête : un compte désactivé perd l'accès
  // immédiatement, même si son token JWT est encore valide.
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { isActive: true },
  });
  if (!user?.isActive) return null;

  return payload;
}

export { COOKIE_NAME, TOKEN_TTL };
