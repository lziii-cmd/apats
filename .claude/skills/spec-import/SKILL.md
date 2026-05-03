---
name: spec-import
description: Importe un CDC.md et le transforme en backlog de features atomiques. Découpe en granularité moyenne (user story cohérente). Présente le plan détaillé avec arbre de dépendances et estimations AVANT toute écriture pour validation utilisateur. Génère un index des sections du CDC pour économiser les tokens dans les sessions suivantes. À invoquer une seule fois par projet.
---

# Spec-Import — Du CDC au backlog priorisé

Cette skill s'invoque **une seule fois** par projet, au premier lancement,
quand `CDC.md` est présent et `BACKLOG.md` n'existe pas encore.

Pipeline en 5 phases avec stops obligatoires.

---

## PHASE 1 — Acquisition du CDC

### Vérifier la présence et la qualité du CDC

1. Vérifier que `CDC.md` existe à la racine.
   - Si absent mais `CDC.docx` présent : annoncer
     > *"J'ai détecté `CDC.docx` mais pas `CDC.md`. Je ne traite que des CDC
     > en Markdown. Convertis ton CDC en Markdown propre via une session
     > Claude.ai séparée (upload du .docx + demande de conversion en .md
     > préservant tableaux et hiérarchie), puis place le résultat à la racine
     > sous le nom `CDC.md`. Je m'arrête ici."*
   - Si rien : annoncer le besoin d'un CDC, proposer le passage en cas D.

2. Lire `CDC.md` intégralement.

3. Calculer son sha256 et le stocker pour MEMORY.md > ÉTAT VÉRIFIABLE et pour
   BACKLOG.md > en-tête.

### Identifier le domaine métier

Lire le CDC pour identifier le **domaine métier** (santé, finance, éducation,
e-commerce, SIGB, BTP, etc.). Ce domaine sera inscrit dans `SPEC.md > Section 1`
et déterminera la **posture d'expert** pour toutes les sessions suivantes.

Si le domaine est ambigu : demander à l'utilisateur de le préciser.

### À la fin de Phase 1

Annoncer :
- Domaine métier identifié
- Nombre de sections du CDC
- Présence ou absence d'identifiants normalisés (EF-XX, ENF-XX)

> **STOP.** Demander confirmation du domaine identifié avant de passer à
> la Phase 2.

---

## PHASE 2 — Cartographie & index

### Construire l'index des sections

Parcourir `CDC.md` et générer une table : pour chaque titre de niveau 1, 2 et
3, noter le numéro, le titre, l'ancre Markdown, et la plage de lignes du
fichier source.

Cet index ira dans `BACKLOG.md > INDEX DES SECTIONS DU CDC`. Il sert à
économiser les tokens dans les sessions suivantes : Claude pourra charger
uniquement les sections pertinentes au lieu du CDC entier.

### Identifier les exigences

Repérer toutes les exigences explicites :
- Identifiants normalisés (EF-XX, ENF-XX, US-XX, etc.) si présents
- Tableaux d'exigences
- Listes numérotées de fonctionnalités

Si aucun identifiant n'existe, attribuer des identifiants `REQ-001`, `REQ-002`...
en respectant l'ordre du CDC.

### Identifier les acteurs

Lister tous les acteurs / rôles / personas mentionnés dans le CDC.

### Identifier les jalons / phases

Si le CDC mentionne des phases (V1/MVP, V2, etc.), les recenser.

### À la fin de Phase 2

> **STOP.** Présenter à l'utilisateur :
> - Index des sections (les 10 premières en aperçu)
> - Nombre total d'exigences identifiées
> - Liste des acteurs
> - Jalons / phases identifiés
>
> Demander : *"Cette cartographie est-elle correcte ? On passe au découpage ?"*

---

## PHASE 3 — Découpage en features atomiques

### Granularité — règle d'or

Une feature = une **user story cohérente**, livrable indépendamment,
implémentable en 2-4h.

**Critères pour qu'un groupe d'exigences forme UNE feature** :
- Couvre un cas d'usage utilisateur complet (un acteur peut accomplir un but)
- Ne dépend pas d'une feature non encore implémentée (sauf prérequis explicite)
- Peut être démontrée seule à un utilisateur

**Si une exigence est trop grosse** (typiquement les modules complexes) :
la décomposer en plusieurs features atomiques avec des dépendances entre
elles.

**Si plusieurs petites exigences vont ensemble** (ex : EF-01, EF-02, EF-03
décrivent toutes les étapes de soumission d'un document) : les regrouper
en une seule feature.

### Première feature obligatoire : F-001 Scaffolding

La toute première feature du backlog est **toujours** un scaffolding initial :
- Init du repo (si pas déjà fait)
- Structure de dossiers
- Config linter / formateur / test runner
- CI minimale (.github/workflows ou équivalent)
- README de base
- Premier commit propre

**Niveau** : moyen. Pas la première DB, pas les premiers endpoints. Juste
de quoi démarrer proprement.

### Pour chaque feature, déterminer

- **Numéro** (F-001, F-002, ...)
- **Titre court** (≤ 60 caractères)
- **IDs CDC couverts** (EF-XX, REQ-XXX...)
- **Description** : 2-3 lignes de ce qui sera fait
- **Dépendances** : quelles features doivent être livrées avant
- **Complexité** : S (≤ ½ j) / M (½ j à 1 j) / L (> 1 j)
- **Tier** : TINY / SMALL / NORMAL (cf. CLAUDE.md). En général NORMAL pour
  les features venant du CDC.
- **Risques identifiés** (si applicable) : couplages, ambiguïtés du CDC,
  choix techniques sensibles, contraintes de perf/sécurité
- **Acteurs concernés** : qui utilise cette feature

### Ordonner le backlog

Respecter :
1. **Dépendances techniques** (F-002 ne peut commencer si F-001 pas fait)
2. **Valeur métier** (features qui débloquent le plus d'utilisateurs en tête)
3. **Risque** (les features risquées tôt pour échouer rapidement si besoin)

### Identifier les jalons

Proposer 3-5 jalons (M1, M2...) groupant les features de façon cohérente.

---

## PHASE 4 — Présentation détaillée pour validation

### C'est LE moment critique

Tu vas présenter à l'utilisateur **tout ce qui sera implémenté**, **avant
qu'une ligne de code ne soit écrite**. Ne mégotte pas sur la précision : il
faut que l'utilisateur puisse dire oui en connaissance de cause.

### Format de présentation

#### Vue d'ensemble (en haut)

```
═══════════════════════════════════════════════════════════
PROJET : [nom]
DOMAINE : [domaine métier]
CDC : [vX.Y, sha256 court]
═══════════════════════════════════════════════════════════

📊 CHIFFRES
- Features totales      : N
- Estimation totale     : X jours-homme
- Phases identifiées    : MVP (P1), Post-MVP (P2)
- Jalons proposés       : 4

🎯 JALONS
- M1 — [titre] — F-001 à F-006 (~3 j)
- M2 — [titre] — F-007 à F-012 (~5 j)
- M3 — [titre] — F-013 à F-020 (~6 j)
- M4 — [titre] — F-021 à F-028 (~4 j)

🌳 ARBRE DE DÉPENDANCES
[arbre ASCII compact]
═══════════════════════════════════════════════════════════
```

#### Liste détaillée (par jalon, par feature)

Pour chaque feature, le bloc complet (cf. Phase 3).

### Réflexion experte obligatoire

À la fin de la présentation, signaler **proactivement** :

1. **Points qui méritent attention** dans le CDC (ambiguïtés, contradictions,
   exigences non testables formulées floues, manques évidents)
2. **Suggestions d'alternatives substantielles** s'il y en a (cf. CLAUDE.md
   > Posture, point 2)
3. **Fonctionnalités potentiellement manquantes** au CDC (cf. Posture,
   point 3)
4. **Risques globaux** : techniques, de planning, de sécurité, de scope

Pour chaque point, format imposé : 4 lignes — constat / alternative ou
question / comparaison ou conséquences / recommandation.

### Validation

> **STOP.** Demander à l'utilisateur :
> *"Le plan ci-dessus te convient-il ? Tu peux : valider tout, modifier
> certaines features (ordre, découpage, descriptions), ou demander des
> précisions. Tant que tu n'as pas validé, je n'écris rien."*

Si l'utilisateur demande des modifications, itérer en restant en Phase 4
jusqu'à validation explicite.

---

## PHASE 5 — Génération des fichiers

### Une fois validé par l'utilisateur

1. **Écrire `BACKLOG.md`** avec :
   - En-tête (date, version CDC, sha256)
   - Index des sections du CDC
   - Vue d'ensemble (chiffres, jalons, arbre)
   - Toutes les features détaillées par phase
   - Section "Idées non priorisées" vide
   - Légende

2. **Pré-remplir `SPEC.md`** :
   - Section 1 : domaine métier identifié, statut "MVP"
   - Section 2 : lien avec CDC, version, sha256
   - Section 3 : stack si déterminée par bootstrap (ou À COMPLÉTER en cas C)
   - Section 4 : conventions héritées du CDC si présentes
   - Lister dans Section 10 ce qui reste À COMPLÉTER

3. **Mettre à jour `MEMORY.md`** :
   - ÉTAT VÉRIFIABLE : sha256 du CDC ajouté
   - CONTEXTE ACTUEL : "Backlog généré, prêt à démarrer F-001"
   - NOTES DE SESSION : entrée d'import du CDC

4. **NE PAS commiter** automatiquement — proposer le commit à l'utilisateur :
   ```
   chore(backlog): generate backlog from CDC v[X.Y]
   ```

5. **Annoncer la première feature** :
   > *"Backlog généré. La première feature est F-001 [titre]. Veux-tu qu'on
   > l'attaque maintenant via le pipeline `feature` ?"*

---

## CAS PARTICULIERS

### Cas A (code existant + CDC)

À l'issue de Phase 5, **invoquer immédiatement `spec-sync audit`** pour
détecter les écarts entre code existant et CDC. La 1ʳᵉ feature à proposer ne
sera pas F-001 scaffolding, mais la résolution des écarts critiques détectés
(ou la feature suivante du backlog si aucun écart critique).

### Cas C (CDC sans code)

À l'issue de Phase 5, vérifier que la stack mentionnée dans le CDC est bien
identifiée dans SPEC.md. Si le CDC ne précise pas la stack : présenter 2-3
options justifiées (en se basant sur le domaine métier et les contraintes
non-fonctionnelles) et demander à l'utilisateur de choisir avant d'attaquer
F-001.

### CDC très volumineux (> 5000 lignes)

Avant Phase 2 : prévenir l'utilisateur du coût en tokens et proposer de
travailler par module si le CDC le permet. L'index par section devient alors
critique.
