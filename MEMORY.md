# MEMORY.md — Mémoire du projet

**Dernière mise à jour** : 2026-05-07

---

## ÉTAT VÉRIFIABLE

> Section mise à jour automatiquement par Claude à chaque session
> (procédure de reconnaissance dans CLAUDE.md). Sert à détecter les dérives.

- **Branche** : master
- **Dernier commit connu** : à compléter après premier commit git
- **Hash dépendances** : package-lock.json présent
- **Hash CDC.md** : 4c20839b4819a84856ef3602165314edf1b0024de78fab05d3a016427a78d477
- **Dossiers top-level** : .claude/, app/, lib/, prisma/, public/
- **Date de la vérification** : 2026-05-07T12:35Z

---

## CONTEXTE ACTUEL

- **Où on en est** : F-001 à F-004 livrés. RBAC dynamique en place. Prêt pour F-005 (mandats) et F-009 (i18n) en parallèle.
- **Dernière fonctionnalité travaillée** : F-004 — RBAC dynamique
- **Statut de cette feature** : livré, à valider
- **Prochaine fonctionnalité prévue** : F-005 — Gestion des mandats + F-009 — i18n FR/EN
- **Problèmes ouverts** : timeout Wave/OM sans réponse (à trancher avant F-011) ; catégories de dépenses trésorerie fixes ou configurables (à trancher avant F-016) ; clé Resend à configurer avant F-006
- **Blocages** : aucun

---

## CE QUI A ÉTÉ FAIT

| Date | Fonctionnalité | IDs CDC | Statut | Branche / Commit |
|------|----------------|---------|--------|------------------|
| 2026-05-03 | Bootstrap + initialisation SPEC/MEMORY | N/A | livré | — |
| 2026-05-03 | spec-import : génération BACKLOG.md (19 features) | N/A | livré | — |
| 2026-05-07 | F-001 — Scaffolding initial | N/A | livré, à valider | master |
| 2026-05-07 | F-002 — Base de données & modèles fondamentaux | §4.2, §7, §9 | livré, à valider | master |
| 2026-05-07 | F-003 — Authentification | §5.1 | livré, à valider | master |
| 2026-05-07 | F-004 — RBAC dynamique | §4.2, §5.2.2 | livré, à valider | master |

> Statuts possibles : `en cours` | `livré` | `livré, à valider` | `pause` | `abandonné`

---

## ÉCARTS ASSUMÉS (code ↔ CDC)

> Tracés par la skill `spec-sync divergence`. Chaque écart est une décision
> consciente de l'utilisateur. Le code et le CDC restent en désaccord
> volontaire jusqu'à résolution future.

| Date | ID CDC concerné | Écart | Raison | Validé par utilisateur le |
|------|------------------|-------|--------|----------------------------|
|      |                  |       |        |                            |

---

## DÉCISIONS DE SESSION

> Décisions techniques prises pendant le travail. Ce ne sont **PAS** encore
> des ADR — l'utilisateur seul peut les promouvoir dans `SPEC.md > Section 5`.

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

---

## PROBLÈMES RENCONTRÉS & SOLUTIONS

| Date | Problème | Cause | Solution appliquée |
|------|----------|-------|--------------------|
| 2026-05-07 | ts-node seed échoue sur Windows | Single quotes incompatibles PowerShell | Remplacé par tsx |
| 2026-05-07 | prisma migrate dev bloque (non-interactif) | TTY requis | Remplacé par prisma db push |
| 2026-05-07 | Next.js 16 middleware deprecated | Nouvelle API proxy | Renommé middleware.ts → proxy.ts, export fn → proxy |
| 2026-05-07 | Conflit routes / entre (admin) et (app) | Deux page.tsx au même chemin | Déplacé vers /admin/admin et /app/app |
| 2026-05-07 | Emails membres format incorrect | Dots entre prénoms | Migration oldEmail→email dans seed avec updateMany |

---

## DETTE TECHNIQUE EN COURS (depuis le dernier audit)

> Dette détectée pendant les sessions courantes, à consolider plus tard
> dans `SPEC.md > Section 7`.

| Priorité | Problème | Impact | Effort |
|----------|----------|--------|--------|
| Basse | Clé Resend non configurée | Reset mdp par email non fonctionnel | S — avant F-006 |

---

## POINTS DE VIGILANCE

> Choses à garder en tête à chaque session, qui ne sont pas encore stables
> dans SPEC.

- Permissions entièrement dynamiques (RBAC) — aucun rôle codé en dur
- Scan QR Code via caméra PWA — attention iOS Safari
- Paiement Wave/Orange Money déclaratif uniquement — pas d'API bancaire
- Volumétrie < 50 membres — ne pas sur-architecturer
- `hasPermission` est la brique centrale de sécurité — tout nouveau module doit l'appeler
- Email format membres : prénoms collés sans séparateur (ex: `papaibrahima.sy@ensmg.com`)

---

## NOTES DE SESSION

> Une note par session de travail. Plus récente en haut.

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
