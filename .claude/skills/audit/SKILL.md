---
name: audit
description: Audit complet de la codebase. Produit un état des lieux exhaustif (stack, architecture, qualité, sécurité, points critiques) puis un bilan honnête avec score de santé objectif et plan d'amélioration priorisé. À invoquer sur demande explicite ("audit complet", "où en est ce projet", "/audit") ou en reprise d'un projet inconnu.
---

# Audit complet

Pipeline en 2 phases avec stop entre chaque pour validation utilisateur.

---

## PHASE 1 — État des lieux (lecture seule, aucune modification)

Explorer la codebase en lecture seule. Produire un rapport structuré
**factuel**, sans jugement. Privilégier les statistiques agrégées plutôt
que la liste exhaustive de fichiers.

### Sections du rapport

#### STACK & DÉPENDANCES
- Langages utilisés et versions exactes
- Frameworks principaux avec version
- Dépendances critiques (≥10 % de l'usage) avec leur rôle
- Dépendances obsolètes / vulnérables / inutilisées (chiffres précis)
- Gestionnaire de paquets et lockfile

#### ARCHITECTURE
- Pattern architectural identifié (MVC, MVVM, Clean Arch, Hexagonal,
  Feature-based, Vertical Slice, etc.)
- Structure des dossiers et logique d'organisation
- Séparation des responsabilités (respect ou non, exemples concrets)
- Flux de données principaux (state management, API calls, bus d'événements)
- Communication entre modules (DI, imports directs, IPC)

#### INFRASTRUCTURE & DÉPLOIEMENT
- CI/CD : provider, étapes, robustesse
- Variables d'environnement (lister, signaler les sensibles)
- Stratégie de build et déploiement
- Containerisation (Dockerfile, docker-compose, Kubernetes)
- Environnements (dev/staging/prod)

#### QUALITÉ DU CODE
- Conventions de nommage (camelCase, snake_case, PascalCase…)
- Couverture de tests estimée (chiffre du health-check si disponible)
- Linting et formatage (présent + respecté ?)
- Dette technique visible :
  - Code dupliqué (signaler les patterns répétés)
  - Couplage fort entre modules
  - Fonctions / fichiers trop longs (lister les top 10 par taille)
  - Logique métier mélangée avec UI / I/O
  - Gestion d'erreurs absente ou incohérente
  - Magic numbers / strings hardcodés
  - Commentaires obsolètes ou TODO non résolus

#### SÉCURITÉ
- Secrets / credentials exposés (chercher patterns dans les fichiers, pas
  uniquement `.env`)
- Vulnérabilités connues (résultat audit deps)
- Validation des entrées utilisateur (présence + qualité)
- Authentification / autorisation (mécanisme + fragilités)
- Headers de sécurité (HSTS, CSP, X-Frame-Options) si applicable web
- Protection OWASP Top 10 visible

#### POINTS D'ATTENTION CRITIQUES
- Ce qu'il faut absolument **ne pas casser**
- Modules / fichiers identifiés comme fragiles (faible couverture +
  forte criticité)
- Couplages forts qui pourraient causer des régressions silencieuses
- Incohérences majeures (deux conventions parallèles, doublons)

### À la fin de Phase 1

> **STOP.** Attendre validation explicite avant Phase 2.
> Si quelque chose est flou ou ambigu, poser les questions maintenant.
> Ne supposer rien.

---

## PHASE 2 — Bilan & recommandations

Sur la base de l'état des lieux **validé**, produire un bilan honnête
et direct. Ne pas minimiser les problèmes.

### POINTS FORTS
- Ce qui est bien structuré et doit être conservé
- Bonnes pratiques en place
- Décisions techniques pertinentes détectées

### POINTS FAIBLES
- Dette technique réelle et son impact concret
- Risques court terme (semaines à venir)
- Risques moyen terme (mois à venir)
- Ce qui ralentira l'ajout de fonctionnalités
- Problèmes de sécurité identifiés
- Goulots d'étranglement de performance potentiels

### SCORE DE SANTÉ

Invoquer la skill `health-check` pour produire les métriques objectives
puis dériver les notes par axe via les ancres.

Présenter un tableau clair avec note actuelle et delta vs précédent rapport :

| Axe            | Note     | Δ      | Métriques clés         |
|----------------|----------|--------|------------------------|
| Architecture   | X/10     |        |                        |
| Qualité code   | X/10     |        |                        |
| Tests          | X/10     |        |                        |
| Sécurité       | X/10     |        |                        |
| Performance    | X/10     |        |                        |
| Maintenabilité | X/10     |        |                        |
| Infrastructure | X/10     |        |                        |
| **Global**     | **X/10** |        |                        |

### PLAN D'AMÉLIORATION PRIORISÉ

Format : `[Problème] → [Solution proposée] → [Effort : S / M / L]`
- **S** = moins d'une heure
- **M** = demi-journée
- **L** = plusieurs jours

#### CRITIQUE — à traiter avant nouvelles fonctionnalités
Risque immédiat pour la stabilité, la sécurité ou la capacité d'évolution.

#### IMPORTANT — à planifier dans les prochains sprints
Dégrade la qualité mais ne bloque pas immédiatement.

#### NICE TO HAVE — quand le temps le permet
Améliorations sans urgence.

### Pour chaque point CRITIQUE

Poser explicitement à l'utilisateur :

> *"Veux-tu que je traite [ce point] avant d'implémenter les nouvelles
> fonctionnalités ?"*

Attendre sa réponse pour chacun avant d'enchaîner.

### À la fin de Phase 2

> **STOP.** Attendre validation du bilan avant toute action.
