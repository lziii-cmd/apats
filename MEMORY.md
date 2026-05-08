# MEMORY.md — Mémoire du projet

**Dernière mise à jour** : 2026-05-08 (session 2)

---

## COMITÉ DE PROJET

> Instauré le 2026-05-08. Représente l'utilisateur sur toutes les décisions techniques.
> Consulté sur tout sujet important. Réponse unanime en français.
> Rôle **consultatif** — pas de blocage. Si désaccord, discussion à trois (utilisateur + comité + Claude). L'utilisateur tranche en dernier.

| # | Rôle | Domaine de vigilance |
|---|------|---------------------|
| 1 | Architecte Logiciel | Structure globale, cohérence technique, scalabilité |
| 2 | Backend Senior | API, BDD, sécurité serveur, performance |
| 3 | Frontend Senior | Composants, rendu, accessibilité technique |
| 4 | Expert UX | Parcours utilisateur, ergonomie, friction |
| 5 | Expert UI | Design system, cohérence visuelle, responsive |
| 6 | Expert Métier | Conformité au CDC, logique association, cas réels |
| 7 | Expert Cybersécurité | Auth, RBAC, exposition données, vulnérabilités |
| 8 | Product Owner | Valeur délivrée, priorisation, périmètre |
| 9 | QA / Testeur | Cas limites, couverture tests, non-régression |
| 10 | DevOps | Build, déploiement, infra, observabilité |

**Format de réponse du comité :**
> 🏛️ **Avis du Comité** — [sujet]
> [Position de chaque membre en 1 ligne]
> **Unanime :** [recommandation finale]

---

## ÉTAT VÉRIFIABLE

> Section mise à jour automatiquement par Claude à chaque session
> (procédure de reconnaissance dans CLAUDE.md). Sert à détecter les dérives.

- **Branche** : master
- **Dernier commit connu** : d6e5dde — fix(i18n): add NextIntlClientProvider to root layout
- **Hash dépendances** : package-lock.json présent
- **Hash CDC.md** : 4c20839b4819a84856ef3602165314edf1b0024de78fab05d3a016427a78d477
- **Dossiers top-level** : .claude/, app/, lib/, prisma/, public/
- **Date de la vérification** : 2026-05-08T01:30Z

---

## CONTEXTE ACTUEL

- **Où on en est** : F-001 à F-009 + F-008 livrés. M1 complet. App déployée sur Vercel et fonctionnelle.
- **Dernière fonctionnalité travaillée** : F-008 — Configuration générale
- **Statut de cette feature** : livré, à valider en production
- **Prochaine fonctionnalité prévue** : F-010 — Membres : vue bureau + tableau de bord (M, 1j)
- **Problèmes ouverts** :
  - Colonne `mandateDurationDays` à ajouter manuellement dans Neon (SQL ci-dessous)
  - Mot de passe admin à mettre à jour dans Neon (SQL ci-dessous)
  - Clé Resend non configurée (reset mdp par email non fonctionnel)
  - Timeout Wave/OM sans réponse (à trancher avant F-011)
  - Catégories de dépenses trésorerie fixes ou configurables (à trancher avant F-016)
- **Blocages** : aucun

### SQL à exécuter dans Neon (en attente)
```sql
-- mandateDurationDays et mot de passe admin (session précédente)
ALTER TABLE "AppConfig"
ADD COLUMN IF NOT EXISTS "mandateDurationDays" INTEGER NOT NULL DEFAULT 730;

UPDATE "User"
SET "passwordHash" = '61706f4d1b0ef9d5bc29bca7a7e506e07f2923bfae84d6da887a57c9296d58a1'
WHERE email = 'admin@apats.ensmg';
```

> ✅ **academicYear** exécuté en Neon le 2026-05-08 (session 2)

---

## CE QUI A ÉTÉ FAIT

| Date | Fonctionnalité | IDs CDC | Statut | Branche / Commit |
|------|----------------|---------|--------|------------------|
| 2026-05-03 | Bootstrap + initialisation SPEC/MEMORY | N/A | livré | — |
| 2026-05-03 | spec-import : génération BACKLOG.md (19 features) | N/A | livré | — |
| 2026-05-07 | F-001 — Scaffolding initial | N/A | livré, à valider | master / e02ffbc |
| 2026-05-07 | F-002 — Base de données & modèles fondamentaux | §4.2, §7, §9 | livré, à valider | master |
| 2026-05-07 | F-003 — Authentification | §5.1 | livré, à valider | master |
| 2026-05-07 | F-004 — RBAC dynamique | §4.2, §5.2.2 | livré, à valider | master |
| 2026-05-08 | F-005 — Gestion des mandats | §5.2.3 | livré, à valider | master |
| 2026-05-08 | F-009 — Internationalisation FR/EN | §7 | livré, à valider | master |
| 2026-05-08 | F-006 — Admin : gestion des membres | §5.2.1, §5.2.3 | livré, à valider | master / 0ac6b76 |
| 2026-05-08 | F-007 — Admin : catégories & types de contribution | §5.2.4 | livré, à valider | master / 8a81a4b |
| 2026-05-08 | F-008 — Admin : configuration générale | §5.2.5 | livré, à valider | claude/thirsty-murdock-abe561 |

> Statuts possibles : `en cours` | `livré` | `livré, à valider` | `pause` | `abandonné`

---

## ÉCARTS ASSUMÉS (code ↔ CDC)

| Date | ID CDC concerné | Écart | Raison | Validé par utilisateur le |
|------|------------------|-------|--------|----------------------------|
|      |                  |       |        |                            |

---

## DÉCISIONS DE SESSION

| Date | Décision provisoire | Pourquoi | À promouvoir en ADR ? |
|------|---------------------|----------|------------------------|
| 2026-05-03 | Stack : Next.js + Supabase + Prisma | Monorepo, TypeScript, natif Vercel, simple pour dev solo + successeur | Oui — ADR-001 |
| 2026-05-03 | Déploiement : Vercel (priorité) ou Render | Zéro admin serveur, plan gratuit suffisant pour < 50 users | Non |
| 2026-05-03 | Temps réel : SSE (Server-Sent Events) | Suffisant pour < 50 users, plus simple que WebSockets | Non |
| 2026-05-03 | Cotisation : mensuelle (non annuelle) | Confirmé par l'utilisateur — le PV AG indique des montants mensuels | Non |
| 2026-05-03 | AG = type de réunion (Bureau / AG / Extraordinaire) | Pas un module séparé, intégré dans F-012 | Non |
| 2026-05-07 | hasPermission DB-based (pas JWT) | Permissions modifiables en temps réel, incompatible avec cache JWT | Non |
| 2026-05-07 | Neon choisi à la place de Supabase | Interface Supabase complexe pour le dev solo, Neon plus simple | Non |
| 2026-05-07 | Email format membres : prénoms collés sans séparateur | Convention PV AG constitutive | Non |
| 2026-05-08 | Mot de passe temporaire : aléatoire 8 chars affiché une fois | Compromis sécurité/praticité pour association < 50 membres | Non |
| 2026-05-08 | Logo via Vercel Blob (pas URL saisie) | Conforme CDC "upload image", filesystem Vercel read-only | Non |
| 2026-05-08 | academicYear : String "AAAA-AAAA" avec regex | Convention naturelle, directement affichable, usage associatif | Non |
| 2026-05-08 | Comité de projet instauré (10 experts) | Représente l'utilisateur sur toutes les décisions techniques | Non |
| 2026-05-08 | proxy.ts = middleware Next.js 16 (pas middleware.ts) | Next.js 16 Turbopack exige proxy.ts + export fn proxy | Non |
| 2026-05-08 | NextIntlClientProvider dans root layout | Requis pour useTranslations dans Client Components | Non |

---

## PROBLÈMES RENCONTRÉS & SOLUTIONS

| Date | Problème | Cause | Solution appliquée |
|------|----------|-------|--------------------|
| 2026-05-07 | ts-node seed échoue sur Windows | Single quotes incompatibles PowerShell | Remplacé par tsx |
| 2026-05-07 | prisma migrate dev bloque (non-interactif) | TTY requis | Remplacé par prisma db push |
| 2026-05-07 | Next.js 16 middleware deprecated | Nouvelle API proxy | Renommé middleware.ts → proxy.ts, export fn → proxy |
| 2026-05-07 | Conflit routes / entre (admin) et (app) | Deux page.tsx au même chemin | Routes corrigées : /admin et /app |
| 2026-05-07 | Emails membres format incorrect | Dots entre prénoms | Migration oldEmail→email dans seed avec updateMany |
| 2026-05-08 | 404 sur /admin après login | Redirect vers /admin/admin incorrect (route = /admin) | Corrigé dans login/route.ts et layout.tsx |
| 2026-05-08 | Build Vercel échoue : deux fichiers middleware détectés | middleware.ts + proxy.ts coexistaient | Supprimé middleware.ts via git rm |
| 2026-05-08 | Pages admin crashent ("This page couldn't load") | NextIntlClientProvider absent du root layout | Ajouté dans app/layout.tsx |
| 2026-05-08 | Build Vercel : type Date vs string dans MembresClient | createdAt/startDate/endDate typés string au lieu de Date | Corrigé dans MembresClient.tsx |

---

## DETTE TECHNIQUE EN COURS

| Priorité | Problème | Impact | Effort |
|----------|----------|--------|--------|
| Basse | Clé Resend non configurée | Reset mdp par email non fonctionnel | S — avant F-006 validé |
| Basse | `mandateDurationDays` colonne non migrée en DB | Cron mandats peut échouer | SQL à exécuter dans Neon |

---

## POINTS DE VIGILANCE

- Permissions entièrement dynamiques (RBAC) — aucun rôle codé en dur
- Scan QR Code via caméra PWA — attention iOS Safari
- Paiement Wave/Orange Money déclaratif uniquement — pas d'API bancaire
- Volumétrie < 50 membres — ne pas sur-architecturer
- `hasPermission` est la brique centrale de sécurité — tout nouveau module doit l'appeler
- Email format membres : prénoms collés sans séparateur (ex: `papaibrahima.sy@ensmg.com`)
- `proxy.ts` = middleware Next.js 16 (pas `middleware.ts`) — ne jamais créer middleware.ts
- `NextIntlClientProvider` doit rester dans root layout — ne jamais le supprimer

---

## NOTES DE SESSION

> Une note par session de travail. Plus récente en haut.

### 2026-05-08 (session 2) — F-008 livré + Comité de projet instauré

F-008 : page Configuration générale admin. Champ `academicYear` ajouté à AppConfig
(schéma Prisma + SQL Neon exécuté). API GET/PATCH config + API POST/DELETE logo
(Vercel Blob). 20 tests passants. Lien "Configuration" dans sidebar admin.
Comité de projet instauré (10 experts, consultatif, FR, utilisateur tranche en dernier).
À faire avant test en prod : configurer BLOB_READ_WRITE_TOKEN dans Vercel Dashboard.
M1 complet (F-001 → F-009 + F-008).

### 2026-05-08 — F-005 à F-007 livrés + bugs routing/i18n corrigés

Routing : 404 sur /admin corrigé (redirect était /admin/admin). middleware.ts supprimé
(Next.js 16 Turbopack utilise proxy.ts). NextIntlClientProvider ajouté au root layout
(Client Components crashaient en SSR faute de contexte i18n).
F-005 : mandats (attribution poste, cron expiration, rappels 30j, historique).
F-009 : i18n FR/EN (next-intl, cookie apats_locale, switch persistant).
F-006 : CRUD membres admin (liste, création mot de passe aléatoire affiché, édition,
réattribution poste → mandat auto). 12 tests.
F-007 : CRUD catégories (nom, montant mensuel, blocage suppression si membres liés). 10 tests.
App déployée sur apats.vercel.app et fonctionnelle (après fix NextIntlClientProvider).
SQL Neon en attente : mandateDurationDays + hash admin APATS2026.

### 2026-05-07 — F-001 à F-004 livrés

F-001 : scaffolding Next.js 16 + Prisma + Neon (PostgreSQL). Neon choisi à la
place de Supabase (plus simple). tsx remplace ts-node pour le seed sur Windows.
F-002 : schéma Prisma complet (User, Post, Permission, Mandate, Notification,
AppConfig, MemberCategory). 20 membres seedés depuis PV AG constitutive.
F-003 : auth JWT (jose), bcrypt 12 rounds, migration SHA-256→bcrypt transparente,
rate limiting 5/15min, reset mdp par email (Resend — clé à configurer) + par admin.
Emails membres corrigés : format sans séparateur entre prénoms.
F-004 : RBAC dynamique. hasPermission() DB-based (pas JWT). API CRUD postes +
grille permissions. UI matrice admin interactive avec rollback optimiste.
11 tests unitaires. 0 erreur TypeScript.

### 2026-05-03 — Bootstrap + spec-import complets

Bootstrap Cas C (CDC seul, pas de code). SPEC.md et MEMORY.md initialisés.
CDC v1.1 enrichi de 2 sections : §5.2.3 Gestion des mandats, type AG dans
§5.5.1. PV AG constitutive lu : postes réels du bureau identifiés, cotisation
mensuelle confirmée (3000/2000/1000 FCFA), Commissaire aux Comptes géré via
RBAC. Stack décidée : Next.js + Supabase (PostgreSQL) + Prisma, déploiement
Vercel ou Render. 19 features générées, ~21 j-h, 3 jalons. Prêt pour F-001.
