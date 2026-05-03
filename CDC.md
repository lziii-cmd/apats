# Cahier des Charges — Application de Gestion de l'Amicale des PATs
**École Nationale Supérieure des Mines et Géologie (ENSMG)**
**Version 1.1 — Mai 2026**

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Objectifs](#2-objectifs)
3. [Périmètre fonctionnel](#3-périmètre-fonctionnel)
4. [Utilisateurs & Rôles](#4-utilisateurs--rôles)
5. [Modules fonctionnels](#5-modules-fonctionnels)
   - 5.1 [Authentification](#51-authentification)
   - 5.2 [Espace Admin Système](#52-espace-admin-système)
     - 5.2.1 Gestion des membres
     - 5.2.2 Gestion des postes & permissions
     - 5.2.3 Gestion des mandats du bureau
     - 5.2.4 Gestion des catégories & types de contribution
     - 5.2.5 Configuration générale
   - 5.3 [Gestion des Membres](#53-gestion-des-membres)
   - 5.4 [Gestion des Cotisations](#54-gestion-des-cotisations)
   - 5.5 [Gestion des Réunions](#55-gestion-des-réunions)
   - 5.6 [Gestion des Événements](#56-gestion-des-événements)
   - 5.7 [Trésorerie](#57-trésorerie)
   - 5.8 [Communication interne](#58-communication-interne)
   - 5.9 [Mon Profil](#59-mon-profil)
6. [Navigation & Structure des écrans](#6-navigation--structure-des-écrans)
7. [Exigences techniques](#7-exigences-techniques)
8. [Exigences non fonctionnelles](#8-exigences-non-fonctionnelles)
9. [Contraintes & Hypothèses](#9-contraintes--hypothèses)
10. [Glossaire](#10-glossaire)

---

## 1. Présentation du projet

L'Amicale des PATs de l'ENSMG regroupe moins de 50 membres. Aujourd'hui, aucun outil structuré n'est utilisé pour gérer les activités de l'amicale. La communication se fait de manière informelle et le suivi administratif (membres, cotisations, réunions, trésorerie) est inexistant ou éparpillé.

L'objectif est de doter l'amicale d'une **application web progressive (PWA)** centralisée, bilingue (Français / Anglais), accessible sur navigateur et sur mobile, couvrant l'ensemble des besoins de gestion.

---

## 2. Objectifs

- Centraliser la gestion des membres et de leurs cotisations
- Assurer un suivi rigoureux des réunions (convocations, présences, PV)
- Organiser les événements de l'amicale
- Suivre la trésorerie de façon transparente
- Faciliter la communication interne entre membres et bureau
- Offrir une gestion des rôles et permissions totalement flexible, pilotée par l'admin système

---

## 3. Périmètre fonctionnel

| Module | Inclus |
|---|---|
| Authentification | ✅ |
| Gestion des membres | ✅ |
| Gestion des cotisations | ✅ |
| Gestion des réunions (avec émargement QR Code) | ✅ |
| Gestion des événements | ✅ |
| Trésorerie | ✅ |
| Communication interne | ✅ |
| Gestion des rôles & permissions (dynamique) | ✅ |
| Back-office admin système | ✅ |
| Application mobile native | ❌ (hors périmètre) |
| Paiement via Wave / Orange Money (avec confirmation trésorier) | ✅ |
| Paiement en ligne direct (API bancaire) | ❌ (hors périmètre) |

---

## 4. Utilisateurs & Rôles

### 4.1 Types d'utilisateurs

L'application distingue trois niveaux d'accès :

| Niveau | Description |
|---|---|
| **Admin Système** | Responsable technique unique. Gère la configuration globale, crée les comptes, attribue les postes et définit les permissions. |
| **Membres du Bureau** | Membres ayant un poste attribué par l'admin. Leurs permissions dépendent exclusivement du poste qui leur est assigné. |
| **Membres Simples** | Membres sans poste de bureau. Accès limité à la consultation de leurs informations, des réunions et événements. |

### 4.2 Gestion dynamique des rôles

Les postes du bureau ne sont **pas définis en dur** dans l'application. L'admin système :
- Crée librement les postes (ex : Président, Trésorier, Secrétaire Général…)
- Définit pour chaque poste une grille de permissions sur chaque fonctionnalité
- Peut modifier les postes et permissions à tout moment
- Attribue un poste à chaque membre lors de la création de son compte
- Peut changer le poste d'un membre sans recréer son compte

**Exemple de grille de permissions (configurable par l'admin) :**

| Fonctionnalité | Poste A | Poste B | Poste C |
|---|---|---|---|
| Créer une réunion | ✅ | ❌ | ✅ |
| Voir la trésorerie | ✅ | ✅ | ❌ |
| Envoyer une annonce | ✅ | ❌ | ✅ |
| Gérer les cotisations | ❌ | ✅ | ❌ |
| Uploader un PV | ✅ | ❌ | ✅ |

> Les noms des colonnes (postes) sont créés librement par l'admin système.

---

## 5. Modules fonctionnels

### 5.1 Authentification

- Page de connexion commune à tous les utilisateurs (email + mot de passe)
- Après connexion, redirection automatique vers le bon espace selon le profil
- Réinitialisation du mot de passe via deux canaux :
  - **Par email** : le membre clique sur "Mot de passe oublié" et reçoit un lien de réinitialisation
  - **Par l'admin système** : sur demande du membre, l'admin peut réinitialiser manuellement le mot de passe depuis le back-office
- Session persistante sur mobile (PWA)

---

### 5.2 Espace Admin Système

Interface de back-office réservée exclusivement à l'admin système.

#### 5.2.1 Gestion des membres
- Créer un compte membre (nom, prénom, email, catégorie, poste)
- Modifier les informations d'un membre
- Désactiver / réactiver un compte
- Réattribuer un poste à un membre
- Envoi automatique d'un **email de bienvenue** à la création du compte avec les identifiants de connexion

#### 5.2.2 Gestion des postes & permissions
- Créer, renommer, supprimer des postes du bureau
- Définir la grille de permissions pour chaque poste (par fonctionnalité)
- Modifier les permissions à tout moment sans impact sur les comptes existants

#### 5.2.3 Gestion des mandats du bureau
- Chaque membre du bureau se voit attribuer une date de début et une date de fin de mandat au moment de l'attribution de son poste
- La durée de mandat par défaut est de **2 ans** (modifiable par l'admin)
- L'admin peut renouveler, modifier ou clore un mandat à tout moment
- Un **rappel automatique** (notification in-app + email à l'admin) est envoyé **30 jours avant** l'expiration d'un mandat
- L'historique des mandats passés est conservé et consultable par l'admin

#### 5.2.4 Gestion des catégories & types de contribution
- Créer et nommer des catégories de membres (ex : vacataire, permanent, contractuel…)
- Définir pour chaque catégorie le montant de cotisation mensuelle associé
- Créer de nouveaux types de contribution si nécessaire à l'avenir
- Fixer le prix de la carte de membre annuelle (modifiable chaque année)

#### 5.2.5 Configuration générale
- Nom de l'amicale
- **Logo de l'amicale** : modifiable à tout moment par l'admin système (upload d'une nouvelle image)
- Langue par défaut de l'interface
- Année académique en cours

---

### 5.3 Gestion des Membres

Accessible aux membres du bureau selon permissions.

- Liste de tous les membres avec filtres (par catégorie, par poste, par statut de cotisation)
- Fiche détaillée de chaque membre : informations personnelles, poste, catégorie, historique des cotisations
- Export de la liste des membres

---

### 5.4 Gestion des Cotisations

#### 5.4.1 Types de contribution

Il existe actuellement **deux types de contribution** :

| Type | Description |
|---|---|
| **Carte de membre annuelle** | Achetée une fois par an académique. Prix fixé par l'admin. Statut : prise / non prise. |
| **Cotisation mensuelle** | Montant variable selon la catégorie du membre. Suivi mois par mois. |

> De nouveaux types de contribution pourront être créés ultérieurement par l'admin système sans développement supplémentaire.

#### 5.4.2 Modes de paiement

Les cotisations peuvent être réglées de deux façons :

| Mode | Processus |
|---|---|
| **Espèces** | Le trésorier enregistre directement le paiement dans l'app |
| **Wave / Orange Money** | Le membre effectue le virement mobile, puis renseigne dans l'app le **mode de paiement** et la **référence de la transaction**. Le trésorier reçoit une **notification automatique** et confirme (ou rejette) le paiement depuis l'app. |

> Le paiement n'est considéré comme validé qu'après confirmation explicite du trésorier.

#### 5.4.3 Fonctionnalités
- Tableau de bord trésorier : vue globale du taux de cotisation, montant collecté vs attendu
- Pour chaque membre : statut carte annuelle + historique des paiements mensuels
- Enregistrement manuel d'un paiement par le trésorier
- Indicateurs visuels des membres en retard de cotisation
- Rappels automatiques (notification dans l'app + email) pour les membres en retard

---

### 5.5 Gestion des Réunions

#### 5.5.1 Création d'une réunion
Champs à renseigner :
- Type de réunion (Bureau / Assemblée Générale / Extraordinaire) — pour une AG, tous les membres sont convoqués automatiquement
- Titre de la réunion
- Date
- Heure de début et heure de fin
- Lieu
- Intervenants / animateurs
- Ordre du jour
- Membres convoqués (tous ou sélection)

À la création, un **QR Code unique** est généré automatiquement pour cette réunion.

#### 5.5.2 Convocation
- Envoi automatique d'une notification (in-app + email) aux membres convoqués
- Le membre peut **confirmer sa présence en amont** depuis l'app (intention de présence)
- ⚠️ La confirmation préalable **ne remplace pas l'émargement** : un membre qui a confirmé sa présence mais n'a pas scanné le QR Code le jour J est considéré comme **absent**

#### 5.5.3 Émargement par QR Code
**Côté Secrétaire :**
- Affiche le QR Code unique de la réunion sur son écran

**Côté Membre :**
1. Ouvre l'application sur son téléphone
2. Appuie sur le bouton **"Scanner ma présence"**
3. La caméra s'ouvre directement dans l'app
4. Il scanne le QR Code affiché par le secrétaire
5. Sa présence est enregistrée instantanément

**Corrections manuelles :**
- Le secrétaire peut cocher ou décocher manuellement un membre si nécessaire (problème technique, téléphone déchargé…)
- La liste de présence se met à jour en temps réel

#### 5.5.4 Clôture et archivage de la réunion

À la clôture d'une réunion, la fiche devient un **récapitulatif complet et consultable** par les membres autorisés, contenant :
- Toutes les informations de la réunion (titre, date, heure début/fin, lieu, intervenants, ordre du jour)
- La **liste de présence finale** (présents, absents, excusés)
- Le **PV de réunion** uploadé en PDF (téléchargeable)
- Les statistiques de présence

L'historique complet de toutes les réunions passées reste accessible à tout moment.

---

### 5.6 Gestion des Événements

- Créer un événement : titre, date, description, lieu, responsable, budget prévisionnel
- Les membres peuvent s'inscrire à un événement depuis l'app (bouton "Je participe")
- Suivi de la liste des participants
- Historique des événements passés et à venir

---

### 5.7 Trésorerie

Accessible selon les permissions du poste.

- Vue synthétique : solde actuel, total des entrées, total des sorties
- Enregistrement manuel de chaque transaction (entrée ou sortie) avec : date, montant, catégorie, description
- Alimentation automatique depuis les cotisations enregistrées
- Filtres par période, par type de transaction
- Export d'un rapport financier (PDF ou Excel)

---

### 5.8 Communication interne

- Fil d'annonces lisible par tous les membres connectés
- Création d'une annonce (selon permission) : titre, contenu, destinataires (tous ou groupe ciblé)
- Envoi d'une notification in-app + email aux destinataires
- Historique des annonces

---

### 5.9 Mon Profil

Accessible à tous les membres connectés.

- Affichage des informations personnelles
- Poste dans l'amicale et catégorie
- Statut de cotisation (carte annuelle + mensualités)
- Historique de présence aux réunions
- Changement de mot de passe
- Choix de la langue d'interface (Français / Anglais)

---

## 6. Navigation & Structure des écrans

```
Page de Connexion
    │
    ├── Admin Système
    │       ├── Membres
    │       ├── Postes & Permissions
    │       ├── Catégories & Cotisations
    │       └── Configuration générale
    │
    └── Membres & Bureau
            ├── Tableau de bord (accueil)
            ├── Réunions
            │       ├── Liste des réunions
            │       ├── Détail d'une réunion
            │       ├── Créer une réunion (si permission)
            │       ├── Liste de présence (si permission)
            │       └── Scanner ma présence (QR Code)
            ├── Événements
            │       ├── Liste des événements
            │       ├── Détail / Inscription
            │       └── Créer un événement (si permission)
            ├── Cotisations (si permission)
            │       ├── Vue globale
            │       └── Fiche par membre
            ├── Trésorerie (si permission)
            │       ├── Tableau de bord financier
            │       ├── Liste des transactions
            │       └── Export rapport
            ├── Communication
            │       ├── Fil d'annonces
            │       └── Créer une annonce (si permission)
            └── Mon Profil
                    ├── Informations personnelles
                    ├── Statut cotisation
                    ├── Historique de présence
                    └── Paramètres (langue, mot de passe)
```

---

## 7. Exigences techniques

| Critère | Choix retenu |
|---|---|
| **Type d'application** | Progressive Web App (PWA) |
| **Accessibilité** | Navigateur web (PC) + mobile (sans installation obligatoire) |
| **Langues** | Français et Anglais (switch disponible dans l'interface) |
| **Notifications** | In-app + Email |
| **Upload de fichiers** | PDF uniquement (PV de réunion) |
| **Export** | PDF et Excel (rapports financiers, listes membres) |
| **Scan QR Code** | Via caméra du téléphone, directement dans l'app (sans app tierce) |
| **Authentification** | Email + mot de passe, réinitialisation par email ou par l'admin système |
| **Paiement mobile** | Wave et Orange Money (déclaratif avec référence de transaction, confirmation trésorier) |

---

## 8. Exigences non fonctionnelles

- **Sécurité** : Les données des membres sont accessibles uniquement aux utilisateurs authentifiés et selon leurs permissions
- **Disponibilité** : L'application doit être accessible 24h/24, 7j/7
- **Responsive** : Interface adaptée à tous les formats d'écran (PC, tablette, mobile)
- **Performance** : Les pages doivent se charger en moins de 3 secondes sur une connexion standard
- **Sauvegarde** : Les données doivent être sauvegardées régulièrement (backup quotidien recommandé)
- **Évolutivité** : L'architecture doit permettre l'ajout de nouveaux modules ou types de contribution sans refonte majeure

---

## 9. Contraintes & Hypothèses

- Le nombre de membres est estimé à **moins de 50** pour le moment
- La création de comptes membres est **réservée à l'admin système** — aucune inscription en libre-service
- Les montants de cotisation et les types de contribution sont entièrement **configurables par l'admin système**
- Les postes du bureau et leurs permissions sont **entièrement dynamiques** — aucun rôle n'est codé en dur
- Le paiement des cotisations peut être effectué en espèces ou via **Wave / Orange Money** (déclaratif, avec référence de transaction et confirmation trésorier) — aucune intégration API bancaire directe
- La réinitialisation du mot de passe se fait **par email** ou **par l'admin système** sur demande du membre
- Les PV de réunion sont **uploadés en PDF** depuis un fichier existant (pas de rédaction dans l'app)
- L'application sera gérée par un **admin système unique** responsable de la configuration

---

## 10. Glossaire

| Terme | Définition |
|---|---|
| **PAT** | Personnel Administratif Technique et de Service de l'ENSMG |
| **Amicale** | Association regroupant les PATs de l'ENSMG |
| **Admin Système** | Responsable technique de l'application, niveau d'accès le plus élevé |
| **Bureau** | Membres élus ou désignés pour gérer l'amicale, avec des postes attribués |
| **Poste** | Rôle attribué à un membre du bureau par l'admin système (ex : Trésorier) |
| **Catégorie** | Classification d'un membre selon son statut professionnel (vacataire, permanent…) |
| **Carte de membre** | Contribution annuelle donnant droit à l'adhésion pour l'année académique |
| **Cotisation mensuelle** | Contribution récurrente mensuelle dont le montant dépend de la catégorie |
| **PV** | Procès-Verbal — compte-rendu officiel d'une réunion |
| **PWA** | Progressive Web App — application web utilisable comme une app mobile sans installation |
| **QR Code** | Code-barres 2D généré par l'app pour l'émargement lors des réunions |
| **Émargement** | Enregistrement de la présence d'un membre à une réunion |
| **Wave / Orange Money** | Services de paiement mobile utilisés pour le règlement des cotisations. Le paiement est déclaratif : le membre renseigne la référence de transaction, le trésorier confirme. |
| **Permission** | Droit d'accès à une fonctionnalité spécifique de l'application |

---

*Document rédigé en Mai 2026 — Amicale des PATs / ENSMG*
