# MEMORY.md — Mémoire du projet

**Dernière mise à jour** : 2026-05-03

---

## ÉTAT VÉRIFIABLE

> Section mise à jour automatiquement par Claude à chaque session
> (procédure de reconnaissance dans CLAUDE.md). Sert à détecter les dérives.

- **Branche** : aucun dépôt git initialisé
- **Dernier commit connu** : aucun
- **Hash dépendances** : aucun lockfile (pas de code)
- **Hash CDC.md** : 4c20839b4819a84856ef3602165314edf1b0024de78fab05d3a016427a78d477
- **Dossiers top-level** : .claude/
- **Date de la vérification** : 2026-05-03T17:30Z

---

## CONTEXTE ACTUEL

- **Où on en est** : Bootstrap + spec-import terminés. BACKLOG.md généré (19 features, 3 jalons, ~21 j-h). Stack décidée : Next.js + PostgreSQL (Supabase) + Prisma, déploiement Vercel ou Render. Prêt à démarrer F-001.
- **Dernière fonctionnalité travaillée** : aucune (pas encore de code)
- **Statut de cette feature** : -
- **Prochaine fonctionnalité prévue** : F-001 — Scaffolding initial
- **Problèmes ouverts** : timeout Wave/OM sans réponse (à trancher avant F-011) ; catégories de dépenses trésorerie fixes ou configurables (à trancher avant F-016)
- **Blocages** : aucun

---

## CE QUI A ÉTÉ FAIT

| Date | Fonctionnalité | IDs CDC | Statut | Branche / Commit |
|------|----------------|---------|--------|------------------|
| 2026-05-03 | Bootstrap + initialisation SPEC/MEMORY | N/A | livré | — (pas de git) |
| 2026-05-03 | spec-import : génération BACKLOG.md (19 features) | N/A | livré | — (pas de git) |

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

---

## PROBLÈMES RENCONTRÉS & SOLUTIONS

| Date | Problème | Cause | Solution appliquée |
|------|----------|-------|--------------------|
|      |          |       |                    |

---

## DETTE TECHNIQUE EN COURS (depuis le dernier audit)

> Dette détectée pendant les sessions courantes, à consolider plus tard
> dans `SPEC.md > Section 7`.

| Priorité | Problème | Impact | Effort |
|----------|----------|--------|--------|
|          |          |        |        |

---

## POINTS DE VIGILANCE

> Choses à garder en tête à chaque session, qui ne sont pas encore stables
> dans SPEC.

- Permissions entièrement dynamiques (RBAC) — aucun rôle codé en dur
- Scan QR Code via caméra PWA — attention iOS Safari
- Paiement Wave/Orange Money déclaratif uniquement — pas d'API bancaire
- Volumétrie < 50 membres — ne pas sur-architecturer

---

## NOTES DE SESSION

> Une note par session de travail. Plus récente en haut.

### 2026-05-03 — Bootstrap + spec-import complets

Bootstrap Cas C (CDC seul, pas de code). SPEC.md et MEMORY.md initialisés.
CDC v1.1 enrichi de 2 sections : §5.2.3 Gestion des mandats, type AG dans
§5.5.1. PV AG constitutive lu : postes réels du bureau identifiés, cotisation
mensuelle confirmée (3000/2000/1000 FCFA), Commissaire aux Comptes géré via
RBAC. Stack décidée : Next.js + Supabase (PostgreSQL) + Prisma, déploiement
Vercel ou Render. 19 features générées, ~21 j-h, 3 jalons. Prêt pour F-001.
