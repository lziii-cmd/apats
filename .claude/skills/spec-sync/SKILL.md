---
name: spec-sync
description: Maintient la synchronisation entre le code et le CDC tout au long de la vie du projet. Trois modes d'invocation. Mode "audit" — scanne le code existant et liste tous les écarts code/CDC avec avis d'expert pour chaque. Mode "regenerate-backlog" — régénère BACKLOG.md depuis un CDC modifié, présente un diff avant écrasement. Mode "divergence" — formalise un écart assumé entre code et CDC, trace dans MEMORY.md.
---

# Spec-Sync — Le pont vivant entre code et CDC

Cette skill possède **trois modes** d'invocation. Elle est la garante de la
règle "CDC = LOI" tout au long de la vie du projet.

L'utilisateur invoque par : `spec-sync audit`, `spec-sync regenerate-backlog`,
`spec-sync divergence`. Si seulement `spec-sync` est dit, demander quel mode.

---

## MODE 1 — AUDIT (scan code ↔ CDC)

### Quand l'invoquer

- Au démarrage d'un projet en cas A (code + CDC) — automatique après
  `spec-import`
- Sur demande explicite : *"vérifie que le code respecte le CDC"*,
  *"audit de cohérence"*, *"/spec-sync audit"*

### Pipeline

#### Étape 1 — Cartographie code

Lister tous les fichiers source du projet (selon les exclusions habituelles
dans `health-check.sh`). Pour chaque dossier fonctionnel principal,
identifier brièvement ce qu'il fait.

#### Étape 2 — Charger CDC par section

Lire `BACKLOG.md > INDEX DES SECTIONS DU CDC` pour savoir où chercher quoi.
Charger les sections pertinentes du CDC à la volée — **pas tout en bloc**.

#### Étape 3 — Détection systématique des écarts

Pour chaque feature du backlog (statut `livré` ou `livré, à valider`) :

- Vérifier que le code l'implémente bien
- Vérifier que l'implémentation correspond aux exigences EF-XX du CDC
- Vérifier que les contraintes non-fonctionnelles ENF-XX applicables sont
  respectées

Pour chaque section du CDC contenant des règles transversales (sécurité,
perf, accessibilité) :

- Scanner le code pour vérifier l'application
- Lister les violations observées

#### Étape 4 — Classification des écarts détectés

Pour chaque écart, classer :

- **CRITIQUE** : viole le CDC sur un point fondamental (sécurité,
  conformité légale, contrat d'API public, intégrité des données)
- **MAJEUR** : viole le CDC sur un point important mais non critique
  (UX dégradée, performance hors SLA, fonctionnalité partiellement
  implémentée)
- **MINEUR** : écart sur un détail (nommage, organisation, optimisation
  manquée)
- **JUSTIFIABLE** : écart probablement assumé par un précédent choix
  technique

#### Étape 5 — Avis d'expert sur chaque écart

Pour CHAQUE écart, donner ton **avis de senior dans le domaine du projet** :

```
ÉCART #X — [titre court]
─────────────────────────────────────────────────────────
Sévérité       : CRITIQUE / MAJEUR / MINEUR / JUSTIFIABLE
ID CDC         : EF-XX (section Y.Z du CDC)
Code concerné  : path/to/file.ext (lignes XX-YY)
Description    : [ce qui est attendu vs ce qui est codé]

Avis d'expert  : [Ton analyse en tant que senior dans le domaine.
                  Pourquoi cet écart existe probablement, est-il
                  justifié par une bonne raison technique, ou est-ce
                  une dette à résorber ?]

Recommandation : CORRIGER / MODIFIER CDC / ÉCART ASSUMÉ
                 [argumentation en 2-3 lignes]
```

#### Étape 6 — Rapport global et action

Présenter :
- Tableau de synthèse : nombre d'écarts par sévérité
- Détail de chaque écart avec avis d'expert
- **Recommandation de priorisation** : quels écarts traiter avant la
  prochaine feature du backlog

> **STOP.** Demander à l'utilisateur :
> *"Je propose de traiter en priorité les écarts CRITIQUES suivants : [liste].
> Tu peux : (1) traiter chaque écart cas par cas avec moi maintenant, (2) les
> ajouter au backlog comme features de remédiation, (3) les marquer comme
> écarts assumés via spec-sync divergence. Que choisis-tu ?"*

**Ne JAMAIS bloquer** la suite du dev — informer mais laisser l'utilisateur
décider du tempo.

---

## MODE 2 — REGENERATE-BACKLOG (CDC modifié)

### Quand l'invoquer

- Au démarrage si la reconnaissance détecte un changement du sha256 de CDC.md
- Sur demande explicite : *"j'ai modifié le CDC, mets à jour le backlog"*

### Pipeline

#### Étape 1 — Comparer ancien et nouveau CDC

- Lire le sha256 stocké dans BACKLOG.md > en-tête (ancien)
- Lire le sha256 actuel de CDC.md (nouveau)
- Si identiques : annoncer qu'il n'y a rien à faire, arrêter.
- Sinon : continuer.

#### Étape 2 — Régénérer le backlog (en mémoire, pas écrit)

Refaire les Phases 2 et 3 de `spec-import` (cartographie + découpage) à
partir du nouveau CDC.

#### Étape 3 — Calculer le diff

Comparer le backlog actuel (BACKLOG.md) au backlog régénéré :

- **Features ajoutées** : présentes dans le nouveau, absentes dans l'ancien
- **Features supprimées** : présentes dans l'ancien, absentes dans le nouveau
- **Features modifiées** : titre, description, IDs CDC, dépendances, ou
  complexité changés
- **Features inchangées** : identiques, à garder telles quelles
- **Features livrées affectées** : features déjà au statut `livré` ou
  `livré, à valider` dont le périmètre a changé → impact à signaler

#### Étape 4 — Présenter le diff

Format clair :

```
RÉGÉNÉRATION DU BACKLOG — Diff CDC v[X.Y] → v[A.B]
═══════════════════════════════════════════════════════════

➕ FEATURES AJOUTÉES (N)
- F-XXX [titre] — IDs CDC : ...
- ...

➖ FEATURES SUPPRIMÉES (N)
- F-YYY [titre] — raison probable : exigence ZZ retirée du CDC
- ...

✏️  FEATURES MODIFIÉES (N)
- F-AAA : titre changé / dépendances changées / IDs CDC ajoutés
  Ancien : [...]
  Nouveau : [...]
- ...

⚠️  FEATURES LIVRÉES IMPACTÉES (N)
- F-BBB livré au commit XXX : nouveau périmètre demande [détail].
  → Recommandation : créer F-CCC "ajustement F-BBB" comme feature
                     de complément.
- ...

═══════════════════════════════════════════════════════════
```

#### Étape 5 — Validation utilisateur

> **STOP.** Demander :
> *"Je vais écraser BACKLOG.md avec la nouvelle version. Les statuts des
> features inchangées seront préservés. Les features livrées impactées
> seront signalées dans les notes. Tu valides ?"*

Si oui : écrire le nouveau BACKLOG.md, mettre à jour MEMORY.md > ÉTAT
VÉRIFIABLE avec le nouveau sha256, créer une entrée dans NOTES DE SESSION,
proposer un commit `chore(backlog): regenerate from CDC v[A.B]`.

---

## MODE 3 — DIVERGENCE (formaliser un écart assumé)

### Quand l'invoquer

- L'utilisateur dit *"on va faire X au lieu de ce que dit le CDC parce que..."*
- À la fin d'un débat sur un écart où l'utilisateur tranche pour ne pas
  modifier le CDC mais pour quand même implémenter différemment

### Pipeline

#### Étape 1 — Collecter les informations

Demander (ou récupérer du contexte de la conversation) :

- **ID CDC concerné** : EF-XX, ENF-XX, ou section
- **Texte exact du CDC** que l'écart concerne
- **Implémentation prévue** (qui diverge du CDC)
- **Raison de l'écart** : pourquoi ne pas suivre le CDC ?
- **Conséquences acceptées** : qu'est-ce qu'on perd, qu'est-ce qu'on gagne
- **Date prévisionnelle de résolution** : quand revoir ce choix (peut être "indéfini")

#### Étape 2 — Présenter pour confirmation

Format :

```
ÉCART ASSUMÉ — Formalisation
─────────────────────────────────────────────────────────
ID CDC concerné  : EF-XX (section Y.Z)
Texte CDC        : "[citation exacte]"
Impl. prévue     : [description]
Raison           : [argumentation]
Trade-offs       : Gains : [...] | Pertes : [...]
Résolution prévue: [date ou "indéfini"]
```

> **STOP.** Demander :
> *"Je vais tracer cet écart dans MEMORY.md > ÉCARTS ASSUMÉS et le mentionner
> dans SPEC.md > Section 2. Une fois fait, je pourrai implémenter la version
> dérogatoire. Tu confirmes ?"*

#### Étape 3 — Tracer

Si confirmé :

1. **Ajouter une ligne** dans `MEMORY.md > ÉCARTS ASSUMÉS` :
   ```
   | YYYY-MM-DD | EF-XX | [résumé écart] | [raison] | YYYY-MM-DD |
   ```

2. **Proposer un bloc à coller** dans `SPEC.md > Section 2 > Écarts assumés
   en cours` (l'utilisateur édite SPEC.md lui-même).

3. **Confirmer** la mise à jour de MEMORY.md (montrer le diff).

4. **Continuer** l'implémentation de la version dérogatoire.

### Important

Un écart assumé n'est **jamais** une porte dérobée pour ignorer le CDC.
C'est une décision tracée, datée, justifiée, avec une date de réexamen
prévue. À chaque audit (`spec-sync audit`), les écarts assumés sont relus
pour vérifier qu'ils sont toujours pertinents.

---

## Règles transversales aux 3 modes

- **Aucune écriture dans CDC.md** quel que soit le mode.
- **Aucune écriture dans SPEC.md** : présenter des blocs à coller.
- **MEMORY.md** : mises à jour autorisées via update-memory ou directement
  pour la section ÉCARTS ASSUMÉS si mode 3.
- **BACKLOG.md** : écrasement complet uniquement en mode 2 après validation.
