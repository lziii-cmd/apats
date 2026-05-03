# BACKLOG.md — Backlog du projet

> Généré par `spec-import` à partir de `CDC.md`.
> Régénérable via `spec-sync regenerate-backlog` quand le CDC évolue.

**Dernière génération** : 2026-05-03
**Version du CDC suivie** : v1.1 — Mai 2026 (sha256 : 4c20839b4819a84856ef3602165314edf1b0024de78fab05d3a016427a78d477)

---

## INDEX DES SECTIONS DU CDC

> Permet à Claude de charger uniquement les sections pertinentes au lieu
> du CDC entier. Économie majeure de tokens.

| Section | Titre | Ancre | Lignes CDC.md |
|---------|-------|-------|---------------|
| 1 | Présentation du projet | `#1-présentation-du-projet` | 31–36 |
| 2 | Objectifs | `#2-objectifs` | 39–46 |
| 3 | Périmètre fonctionnel | `#3-périmètre-fonctionnel` | 50–65 |
| 4 | Utilisateurs & Rôles | `#4-utilisateurs--rôles` | 69–100 |
| 4.1 | Types d'utilisateurs | `#41-types-dutilisateurs` | 71–78 |
| 4.2 | Gestion dynamique des rôles | `#42-gestion-dynamique-des-rôles` | 80–100 |
| 5 | Modules fonctionnels | `#5-modules-fonctionnels` | 104–280 |
| 5.1 | Authentification | `#51-authentification` | 106–114 |
| 5.2 | Espace Admin Système | `#52-espace-admin-système` | 117–156 |
| 5.2.1 | Gestion des membres (admin) | `#521-gestion-des-membres` | 120–127 |
| 5.2.2 | Gestion des postes & permissions | `#522-gestion-des-postes--permissions` | 128–133 |
| 5.2.3 | Gestion des mandats du bureau | `#523-gestion-des-mandats-du-bureau` | 138–143 |
| 5.2.4 | Gestion des catégories & contributions | `#524-gestion-des-catégories--types-de-contribution` | 145–153 |
| 5.2.5 | Configuration générale | `#525-configuration-générale` | 155–161 |
| 5.3 | Gestion des Membres (bureau) | `#53-gestion-des-membres` | 163–169 |
| 5.4 | Gestion des Cotisations | `#54-gestion-des-cotisations` | 172–203 |
| 5.4.1 | Types de contribution | `#541-types-de-contribution` | 174–184 |
| 5.4.2 | Modes de paiement | `#542-modes-de-paiement` | 186–195 |
| 5.4.3 | Fonctionnalités cotisations | `#543-fonctionnalités` | 197–203 |
| 5.5 | Gestion des Réunions | `#55-gestion-des-réunions` | 206–249 |
| 5.5.1 | Création réunion | `#551-création-dune-réunion` | 208–220 |
| 5.5.2 | Convocation | `#552-convocation` | 222–227 |
| 5.5.3 | Émargement QR Code | `#553-émargement-par-qr-code` | 229–243 |
| 5.5.4 | Clôture & archivage | `#554-clôture-et-archivage-de-la-réunion` | 245–249 |
| 5.6 | Gestion des Événements | `#56-gestion-des-événements` | 252–257 |
| 5.7 | Trésorerie | `#57-trésorerie` | 260–270 |
| 5.8 | Communication interne | `#58-communication-interne` | 273–280 |
| 5.9 | Mon Profil | `#59-mon-profil` | 283–292 |
| 6 | Navigation & Structure des écrans | `#6-navigation--structure-des-écrans` | 296–334 |
| 7 | Exigences techniques | `#7-exigences-techniques` | 337–351 |
| 8 | Exigences non fonctionnelles | `#8-exigences-non-fonctionnelles` | 354–362 |
| 9 | Contraintes & Hypothèses | `#9-contraintes--hypothèses` | 365–375 |
| 10 | Glossaire | `#10-glossaire` | 378–397 |

---

## VUE D'ENSEMBLE

- **Total features** : 19
- **Estimation totale** : ~21 jours-homme
- **Jalons** :
  - M1 — Fondations : F-001 → F-009 (~8.5 j)
  - M2 — Cœur métier : F-010 → F-015 (~8 j)
  - M3 — Finance & Communication : F-016 → F-019 (~4 j)

### Arbre de dépendances

```
F-001 (scaffolding)
  ├── F-009 (i18n FR/EN) ← en parallèle de F-002
  └── F-002 (DB + modèles fondamentaux)
        └── F-003 (authentification)
              ├── F-008 (admin - config générale)
              └── F-004 (RBAC dynamique)
                    └── F-005 (gestion des mandats)
                          └── F-006 (admin - gestion membres)
                                └── F-007 (admin - catégories & cotisations)
                                      └── F-010 (membres - vue bureau)
                                            ├── F-011 (cotisations)
                                            │     └── F-016 (trésorerie)
                                            ├── F-012 (réunions - création & convocation)
                                            │     └── F-013 (émargement QR Code)
                                            │           └── F-014 (clôture & archivage réunion)
                                            ├── F-015 (événements)
                                            └── F-017 (communication interne)
                                                  └── F-018 (mon profil) ← dépend aussi F-011, F-014
                                                        └── F-019 (PWA finalisation)
```

---

## FEATURES — M1 : FONDATIONS

### F-001 — Scaffolding initial
- **Statut** : à faire
- **IDs CDC** : N/A (technique)
- **Description** : Init repo git, structure de dossiers (Next.js App Router + Prisma + PostgreSQL/Supabase), config ESLint/Prettier/TypeScript strict, CI minimale (GitHub Actions : lint + typecheck), README de base, `.env.example`, premier commit propre.
- **Dépendances** : aucune
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : stack définie (Next.js + PostgreSQL via Supabase, déploiement Vercel/Render). Toute modification de stack après cette feature est coûteuse.
- **Acteurs concernés** : développeur

---

### F-002 — Base de données & modèles fondamentaux
- **Statut** : à faire
- **IDs CDC** : §4.2, §7, §9
- **Description** : Connexion Supabase/PostgreSQL via Prisma. Migrations initiales. Modèles de base : `User`, `Post` (poste bureau), `Permission`, `Mandate`, `MemberCategory`, `AcademicYear`, `AppConfig`. Ces modèles sont la colonne vertébrale du projet — tout le reste en dépend.
- **Dépendances** : F-001
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : erreur de modélisation du RBAC ici = refactoring douloureux. Le modèle `Permission` doit permettre une matrice poste × fonctionnalité sans rôle codé en dur.
- **Acteurs concernés** : développeur

---

### F-003 — Authentification
- **Statut** : à faire
- **IDs CDC** : §5.1
- **Description** : Page de login email/pwd (hashing bcrypt), session persistante PWA (JWT ou NextAuth), reset mdp par email (token unique durée 1h, usage unique, révocation si reconnexion), reset mdp par admin depuis back-office, redirection post-login selon profil (admin / bureau / membre simple). Protection brute-force : rate limiting 5 tentatives / 15 min.
- **Dépendances** : F-002
- **Complexité** : M — 1 jour
- **Tier** : NORMAL *(auth = toujours NORMAL)*
- **Risques** : sécurité — expiration tokens, révocation, rate limiting. À ne pas négliger même pour une petite appli.
- **Acteurs concernés** : tous

---

### F-004 — RBAC dynamique (postes & permissions)
- **Statut** : à faire
- **IDs CDC** : §4.2, §5.2.2
- **Description** : Système de permissions entièrement dynamique — aucun rôle codé en dur. Middleware de contrôle d'accès sur toutes les routes protégées. UI admin : créer / renommer / supprimer des postes, configurer la grille de permissions (matrice poste × fonctionnalité). API de vérification de permission utilisée par tous les modules.
- **Dépendances** : F-002
- **Complexité** : L — 2 jours
- **Tier** : NORMAL
- **Risques** : module le plus risqué architecturalement. Un N+1 sur chaque requête authentifiée ou un permission bypass sont les deux dangers principaux. Tests de sécurité obligatoires.
- **Acteurs concernés** : Admin Système

---

### F-005 — Gestion des mandats
- **Statut** : à faire
- **IDs CDC** : §5.2.3
- **Description** : Attribution date début/fin de mandat lors de l'assignation d'un poste. Durée par défaut 2 ans (configurable). Renouvellement / clôture par admin. Job planifié (cron) : suspension automatique des permissions à expiration du mandat. Rappel automatique 30 jours avant expiration (in-app + email à l'admin). Historique des mandats consultable.
- **Dépendances** : F-004
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : couplage fort avec F-004 — un mandat expiré doit désactiver les permissions sans intervention manuelle. Le cron doit être idempotent.
- **Acteurs concernés** : Admin Système

---

### F-006 — Admin : gestion des membres
- **Statut** : à faire
- **IDs CDC** : §5.2.1
- **Description** : CRUD complet membres depuis le back-office admin : création (nom, prénom, email, catégorie, poste + mandat auto-créé) avec envoi automatique email de bienvenue incluant identifiants de connexion, modification des infos, désactivation / réactivation de compte, réattribution de poste (nouveau mandat créé automatiquement).
- **Dépendances** : F-004, F-005
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : délivrabilité email de bienvenue (utiliser Resend ou Brevo). Générer un mot de passe temporaire sécurisé à la création.
- **Acteurs concernés** : Admin Système

---

### F-007 — Admin : catégories & types de contribution
- **Statut** : à faire
- **IDs CDC** : §5.2.4
- **Description** : Créer / nommer / modifier / supprimer les catégories de membres (vacataire, permanent, contractuel…). Définir le montant de cotisation **mensuelle** par catégorie. Fixer le prix de la carte de membre annuelle (modifiable chaque année académique). Créer de nouveaux types de contribution futurs.
- **Dépendances** : F-006
- **Complexité** : S — ½ jour
- **Tier** : NORMAL
- **Acteurs concernés** : Admin Système

---

### F-008 — Admin : configuration générale
- **Statut** : à faire
- **IDs CDC** : §5.2.5
- **Description** : Paramètres globaux de l'amicale : nom, logo (upload image), langue par défaut de l'interface, année académique en cours.
- **Dépendances** : F-003
- **Complexité** : S — ½ jour
- **Tier** : NORMAL
- **Acteurs concernés** : Admin Système

---

### F-009 — Internationalisation FR/EN
- **Statut** : à faire
- **IDs CDC** : §7
- **Description** : Setup i18n dès le début (next-intl) — fichiers de traduction FR/EN, switch de langue persistant par utilisateur, toutes les chaînes UI externalisées. À réaliser en parallèle de F-002, pas après : retrofitter l'i18n sur une codebase existante est coûteux.
- **Dépendances** : F-001
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : si on oublie d'externaliser une chaîne pendant le développement, le dette s'accumule. Convention stricte : zéro string hardcodée dans les composants.
- **Acteurs concernés** : tous

---

## FEATURES — M2 : CŒUR MÉTIER

### F-010 — Membres : vue bureau + tableau de bord
- **Statut** : à faire
- **IDs CDC** : §5.3, §6
- **Description** : Liste des membres avec filtres (catégorie, poste, statut cotisation). Fiche détaillée par membre (infos personnelles, poste, catégorie, historique cotisations). Export liste membres PDF et Excel. **Tableau de bord général** post-login pour les membres du bureau : cotisations en retard, prochaine réunion, solde trésorerie, dernières annonces.
- **Dépendances** : F-006, F-007
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : Bureau (selon permissions)

---

### F-011 — Gestion des cotisations
- **Statut** : à faire
- **IDs CDC** : §5.4
- **Description** : Suivi carte de membre annuelle (prise / non prise par année académique) + cotisations **mensuelles** par membre (montant selon catégorie). Enregistrement paiement espèces par trésorier. Déclaration paiement Wave / Orange Money par membre (mode + référence transaction). Notification automatique au trésorier + workflow confirmation / rejet. Tableau de bord trésorier (taux cotisation, montant collecté vs attendu). Indicateurs visuels membres en retard. Rappels automatiques (in-app + email) aux membres en retard.
- **Dépendances** : F-007, F-010
- **Complexité** : L — 2 jours
- **Tier** : NORMAL
- **Risques** : workflow Wave/OM sans timeout — à définir avant implémentation (délai de confirmation max + action à l'expiration). Idempotence des paiements.
- **Acteurs concernés** : Membre Simple (déclaration), Trésorier (confirmation, selon permissions RBAC)

---

### F-012 — Réunions : création, convocation & types
- **Statut** : à faire
- **IDs CDC** : §5.5.1, §5.5.2
- **Description** : Création d'une réunion avec tous les champs (type : Bureau / Assemblée Générale / Extraordinaire, titre, date, heures, lieu, intervenants, ordre du jour, membres convoqués — pour une AG tous les membres sont convoqués automatiquement). Génération QR Code unique par réunion. Envoi convocations (in-app + email). Confirmation présence préalable par membre (sans remplacer l'émargement le jour J).
- **Dépendances** : F-010
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : Bureau (selon permissions), Membre Simple (confirmation préalable)

---

### F-013 — Émargement QR Code (temps réel)
- **Statut** : à faire
- **IDs CDC** : §5.5.3
- **Description** : Affichage QR Code plein écran côté secrétaire. Scan via caméra PWA côté membre (jsQR ou ZXing-js, sans app tierce). Enregistrement instantané de la présence. Corrections manuelles (cocher / décocher un membre). Mise à jour de la liste en **temps réel** via SSE (Server-Sent Events).
- **Dépendances** : F-012
- **Complexité** : L — 2 jours
- **Tier** : NORMAL
- **Risques** : ⚠️ iOS Safari — accès caméra dans une PWA installée instable avant iOS 16.4. Tester sur iPhone réel en priorité absolue. Fallback manuel obligatoire et robuste.
- **Acteurs concernés** : Secrétaire (affichage QR), Membre Simple (scan)

---

### F-014 — Clôture & archivage réunion
- **Statut** : à faire
- **IDs CDC** : §5.5.4
- **Description** : Clôture d'une réunion → récapitulatif complet figé et immuable (toutes les infos + liste de présence finale présents / absents / excusés + statistiques de présence). Upload du PV en PDF. Historique complet de toutes les réunions passées accessible.
- **Dépendances** : F-013
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : Secrétaire (upload PV), membres autorisés (consultation)

---

### F-015 — Gestion des événements
- **Statut** : à faire
- **IDs CDC** : §5.6
- **Description** : CRUD événements (titre, date, description, lieu, responsable, budget prévisionnel). Inscription membre via bouton "Je participe". Suivi de la liste des participants. Historique des événements passés et à venir.
- **Dépendances** : F-010
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : Bureau (création, selon permissions), Membre Simple (inscription)

---

## FEATURES — M3 : FINANCE & COMMUNICATION

### F-016 — Trésorerie
- **Statut** : à faire
- **IDs CDC** : §5.7
- **Description** : Vue synthétique (solde actuel, total entrées, total sorties). Enregistrement manuel de transactions (date, montant, catégorie, description). Alimentation automatique depuis les cotisations confirmées. Filtres par période et type de transaction. Export rapport financier PDF et Excel.
- **Dépendances** : F-011
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : catégories de transactions à définir avec l'utilisateur avant implémentation (fixes ou configurables par admin — point ouvert).
- **Acteurs concernés** : Trésorier, Commissaire aux Comptes (lecture selon permissions RBAC)

---

### F-017 — Communication interne
- **Statut** : à faire
- **IDs CDC** : §5.8
- **Description** : Fil d'annonces lisible par tous les membres connectés. Création d'annonce (titre, contenu, destinataires : tous ou groupe ciblé). Envoi notification in-app + email aux destinataires. Historique des annonces.
- **Dépendances** : F-010
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : Bureau (création, selon permissions), Membre Simple (lecture)

---

### F-018 — Mon Profil
- **Statut** : à faire
- **IDs CDC** : §5.9
- **Description** : Affichage des informations personnelles. Poste dans l'amicale et catégorie. Statut de cotisation (carte annuelle + mensualités). Historique de présence aux réunions. Changement de mot de passe. Switch langue FR/EN.
- **Dépendances** : F-011, F-014
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Acteurs concernés** : tous (chaque membre voit son propre profil)

---

### F-019 — PWA finalisation
- **Statut** : à faire
- **IDs CDC** : §7, §8
- **Description** : Service worker avec stratégie de cache offline partielle (consultation des réunions et profil hors connexion). Manifest PWA complet. Notifications push in-app. Optimisations performance (< 3s sur connexion standard). Tests responsive complets PC / tablette / iOS / Android.
- **Dépendances** : F-018
- **Complexité** : M — 1 jour
- **Tier** : NORMAL
- **Risques** : notifications push iOS Safari requièrent iOS 16.4+. Service worker dans PWA installée — tester impérativement sur iPhone réel. Stratégie cache à ne pas rendre trop agressive (données financières ne doivent pas rester en cache stale).
- **Acteurs concernés** : tous

---

## IDÉES NON PRIORISÉES

> Suggestions de fonctionnalités utiles non encore validées.
> L'utilisateur décide quand (et si) les promouvoir en feature priorisée.

| Date suggéré | Suggestion | Valeur ajoutée | IDs CDC impactés | Effort estimé |
|--------------|------------|----------------|------------------|---------------|
| 2026-05-03 | Notifications SMS / WhatsApp en complément email | Délivrabilité supérieure au Sénégal | §5.4, §5.5, §5.8 | M |
| 2026-05-03 | Déclaration protection données (CDP Sénégal — loi n°2008-12) | Conformité légale données personnelles/financières | N/A | S |

---

## LÉGENDE

**Statuts**
- `à faire` — pas encore commencé
- `en cours` — travail actif sur cette session
- `bloqué` — attend une décision ou un prérequis
- `livré, à valider` — implémenté, attend test utilisateur
- `livré` — validé et stable
- `abandonné` — décision de ne pas le faire (avec date + raison)

**Complexité**
- **S** : moins d'une demi-journée
- **M** : entre une demi-journée et une journée
- **L** : plus d'une journée

**Tier** : voir CLAUDE.md > CLASSIFICATION DE TÂCHE
