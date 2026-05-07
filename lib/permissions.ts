import { Feature, Role } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Vérifie si un utilisateur a accès à une fonctionnalité.
 * - ADMIN : toujours autorisé.
 * - MEMBER : doit avoir un mandat actif dont le poste accorde la feature.
 */
export async function hasPermission(
  userId: string,
  feature: Feature
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;
  if (user.role === Role.ADMIN) return true;

  const mandate = await db.mandate.findFirst({
    where: { userId, isActive: true },
    select: {
      post: {
        select: {
          permissions: {
            where: { feature },
            select: { granted: true },
          },
        },
      },
    },
  });

  if (!mandate) return false;

  const perm = mandate.post.permissions[0];
  return perm?.granted ?? false;
}

/**
 * Retourne toutes les features accordées à un utilisateur.
 * Utile pour construire le menu de navigation dynamique.
 */
export async function getUserFeatures(userId: string): Promise<Feature[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return [];
  if (user.role === Role.ADMIN) return Object.values(Feature);

  const mandate = await db.mandate.findFirst({
    where: { userId, isActive: true },
    select: {
      post: {
        select: {
          permissions: {
            where: { granted: true },
            select: { feature: true },
          },
        },
      },
    },
  });

  if (!mandate) return [];

  return mandate.post.permissions.map((p) => p.feature);
}
