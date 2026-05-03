# SPEC.md — Spécification du projet

> Sous le **contrôle exclusif de l'utilisateur**. Claude propose des
> modifications (sous forme de blocs ADR à coller) mais ne les applique
> jamais lui-même.

**Dernière mise à jour** : 2026-05-03

---

## 1. IDENTITÉ DU PROJET

- **Nom** : APATS — Application de Gestion de l'Amicale des PATs
- **Domaine métier** : Gestion d'association (amicale de personnel administratif, technique et de service d'école supérieure)
  *Important : ce champ détermine la posture d'expert que Claude adopte
  pour toutes les sessions du projet.*
- **Objectif** : PWA centralisée bilingue (FR/EN) pour gérer membres, cotisations, réunions (émargement QR Code), événements, trésorerie et communication interne de l'Amicale des PATs de l'ENSMG
- **Statut** : prototype (démarrage)
- **Repo** : [À COMPLÉTER]
- **Mainteneur(s)** : [À COMPLÉTER]

## 2. LIEN AVEC LE CDC

- **CDC.md** présent : oui
- **Version du CDC** suivie : v1.1 — Mai 2026 (sha256 : 7cbadbea9a2377be59e131b90ec6cf641915eab2c529b069b43d6e13171a4c00)
- **Politique d'écart** : tout écart code/CDC suit la procédure définie dans
  CLAUDE.md > "CDC = LOI" (3 actions à présenter à chaque écart détecté).
- **Écarts assumés en cours** : voir `MEMORY.md > ÉCARTS ASSUMÉS` pour le
  détail. Synthèse :
  - [aucun pour l'instant]

## 3. STACK TECHNIQUE

> **⚠️ Stack non définie dans le CDC** — Le CDC précise uniquement "PWA"
> comme type d'application. La stack concrète sera proposée lors de
> `spec-import` (F-001 Scaffolding).

- **Type d'application** : Progressive Web App (PWA)
- **Langues interface** : Français + Anglais (switch utilisateur)
- **Langage(s) principal(aux)** : [À DÉCIDER — voir F-001]
- **Framework frontend** : [À DÉCIDER — voir F-001]
- **Backend / API** : [À DÉCIDER — voir F-001]
- **Base de données** : [À DÉCIDER — voir F-001]
- **Stockage fichiers** : Upload PDF (PV de réunion)
- **Notifications** : In-app + Email
- **Infrastructure / hébergement** : [À COMPLÉTER]
- **CI/CD** : [À COMPLÉTER]
- **Outils dev** : [À définir lors du scaffolding]

## 4. CONVENTIONS

> À remplir après le scaffolding (F-001).

- **Style de code** : [À COMPLÉTER après scaffolding]
- **Format** : [À COMPLÉTER après scaffolding]
- **Nommage fichiers** : [À COMPLÉTER après scaffolding]
- **Nommage variables** : [À COMPLÉTER après scaffolding]
- **Structure de dossiers** : [À COMPLÉTER après scaffolding]
- **Tests** : [À COMPLÉTER après scaffolding]
- **Commits** : Conventional Commits avec scopes : [à définir]
- **Branches** : feat/, fix/, refactor/, chore/ — branche principale : main

## 5. DÉCISIONS ARCHITECTURALES (ADR)

> Aucune décision structurante encore formalisée.
> Le premier ADR concernera le choix de stack (frontend + backend + BDD).

[Premier ADR à créer lors du scaffolding — voir F-001 dans BACKLOG.md]

## 6. FONCTIONNALITÉS CŒUR

> Extraites du CDC v1.1. Suivi détaillé dans `BACKLOG.md`.

| Module | Description courte | Statut |
|---|---|---|
| Authentification | Login email/pwd, reset par email ou admin | à faire |
| Gestion membres | CRUD membres, postes, catégories | à faire |
| Gestion cotisations | Carte annuelle + mensualités, Wave/Orange Money | à faire |
| Gestion réunions | Création, convocation, QR Code émargement, PV | à faire |
| Gestion événements | Création, inscription membres | à faire |
| Trésorerie | Transactions, solde, export PDF/Excel | à faire |
| Communication interne | Fil d'annonces, notifications | à faire |
| Mon Profil | Infos, cotisation, présence, langue, mdp | à faire |
| Admin Système (back-office) | Membres, postes/permissions dynamiques, config | à faire |

## 7. DETTE TECHNIQUE CONNUE & ASSUMÉE

| Priorité | Problème | Impact | Effort estimé | Échéance cible |
|----------|----------|--------|---------------|----------------|
| — | Aucune dette pour l'instant (projet vierge) | — | — | — |

## 8. POINTS DE VIGILANCE

> Identifiés à la lecture du CDC.

- **Permissions dynamiques (RBAC)** : postes et permissions entièrement configurables par l'admin. Aucun rôle codé en dur. Architecture RBAC flexible obligatoire dès le scaffolding.
- **Paiement déclaratif** : Wave/Orange Money sans intégration API. Workflow de confirmation manuelle trésorier. Ne pas tenter d'automatiser ce qui est volontairement déclaratif.
- **QR Code émargement** : scan caméra directement dans la PWA (sans app tierce). Accès caméra navigateur — tester impérativement sur iOS Safari (restrictions spécifiques WebRTC).
- **Session persistante PWA** : implique une stratégie de cache/service worker robuste. À architecturer dès le scaffolding.
- **Volumétrie faible (< 50 membres)** : ne pas sur-architecturer. Pas besoin de pagination complexe, cache distribué, microservices, etc.

## 9. CONTRAINTES NON-FONCTIONNELLES

- **Performance** : pages < 3 secondes sur connexion standard
- **Sécurité** : données accessibles uniquement aux utilisateurs authentifiés et selon permissions ; aucun rôle codé en dur
- **Disponibilité** : 24h/24, 7j/7
- **Responsive** : PC, tablette, mobile
- **Accessibilité** : [À COMPLÉTER — WCAG AA recommandé]
- **Sauvegarde** : backup quotidien recommandé
- **Évolutivité** : ajout de nouveaux modules ou types de contribution sans refonte

## 10. À COMPLÉTER (par l'utilisateur)

> Une fois une section complétée, la retirer de cette liste.

- **Section 1** : Repo (URL ou chemin local), Mainteneur(s)
- **Section 3** : Stack technique complète (après choix lors de F-001)
- **Section 4** : Toutes les conventions (après scaffolding F-001)
- **Section 9** : Niveau d'accessibilité cible (WCAG AA ?)
- **Section 9** : Infrastructure / hébergement prévu
