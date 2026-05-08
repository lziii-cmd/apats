// Logique métier pure pour les cotisations — sans dépendance Prisma
// Facilement testable en isolation.

export type MonthRef = { year: number; month: number };

/**
 * Retourne la date limite de paiement d'un mois donné.
 * Règle CDC §5.4 : le 5 du mois suivant.
 */
export function getDeadline(year: number, month: number): Date {
  if (month === 12) return new Date(year + 1, 0, 5); // 5 janvier N+1
  return new Date(year, month, 5); // 5 du mois suivant (month est 0-based ici, donc month+1 = mois suivant)
}

/**
 * Retourne la liste des mois pour lesquels un membre est susceptible de devoir payer.
 * Un mois est "attendu" si :
 *   - La date limite (5 du mois suivant) est dépassée
 *   - Le membre était déjà inscrit au 1er de ce mois
 */
export function getExpectedMonths(memberCreatedAt: Date, today: Date = new Date()): MonthRef[] {
  const result: MonthRef[] = [];
  const start = new Date(memberCreatedAt.getFullYear(), memberCreatedAt.getMonth(), 1);

  let current = new Date(start);
  while (current <= today) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1; // 1-12
    const deadline = getDeadline(y, m);
    if (today > deadline) {
      result.push({ year: y, month: m });
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return result;
}

/**
 * Retourne true si un mois est "en retard" pour un membre.
 * = la date limite est dépassée ET le membre existait ce mois-là.
 */
export function isMonthOverdue(
  year: number,
  month: number,
  memberCreatedAt: Date,
  today: Date = new Date()
): boolean {
  const deadline = getDeadline(year, month);
  const memberStart = new Date(memberCreatedAt.getFullYear(), memberCreatedAt.getMonth(), 1);
  const monthStart = new Date(year, month - 1, 1);
  return today > deadline && monthStart >= memberStart;
}

/**
 * Calcule le nombre de jours écoulés depuis une date.
 * Utilisé pour la logique d'escalade de notifications Wave/OM.
 */
export function daysSince(date: Date, today: Date = new Date()): number {
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Détermine si un paiement PENDING Wave/OM doit déclencher une relance.
 * Jalons : J+3, J+7, J+14, J+30
 */
export function shouldEscalate(createdAt: Date, today: Date = new Date()): boolean {
  const days = daysSince(createdAt, today);
  return days === 3 || days === 7 || days === 14 || days === 30;
}

/**
 * Calcule le taux de cotisation pour un ensemble de mois attendus et de paiements confirmés.
 * Retourne un pourcentage (0–100) arrondi à l'entier.
 */
export function collectionRate(expected: number, confirmed: number): number {
  if (expected === 0) return 100;
  return Math.round((confirmed / expected) * 100);
}
