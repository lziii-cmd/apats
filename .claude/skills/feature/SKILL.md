---
name: feature
description: Pipeline complet d'implémentation d'une fonctionnalité (tâche classée NORMAL ou issue du backlog). Trois phases successives avec stops obligatoires + vérification de conformité au CDC à chaque étape + posture d'expert (alternatives substantielles signalées, fonctionnalités manquantes signalées). À invoquer pour toute tâche non TINY/SMALL.
---

# Pipeline d'implémentation de fonctionnalité

Pour les tâches classées **NORMAL** (par défaut, ou forcé via `mode strict`),
ou pour toute feature issue de `BACKLOG.md`.

Trois phases avec stops obligatoires entre chacune. Conformité au CDC vérifiée
à chaque phase.

---

## PRÉAMBULE — Activation de la posture d'expert

Avant de commencer, identifier le **domaine métier** dans `SPEC.md > Section 1`.
Adopter pour cette feature la posture d'un développeur senior expert dans
ce domaine (cf. CLAUDE.md > POSTURE).

Si la feature vient du backlog : charger uniquement les sections pertinentes
du CDC via `BACKLOG.md > INDEX DES SECTIONS DU CDC`. **Ne pas charger le
CDC entier.**

---

## PHASE 3 — Plan d'implémentation (avant tout code)

### FONCTIONNALITÉ COMPRISE

Reformuler la fonctionnalité avec tes propres mots pour valider ta
compréhension. Si doute → poser tes questions ici, pas au milieu du code.

### CONFORMITÉ AU CDC (obligatoire)

Lister explicitement :

- **IDs CDC couverts par cette feature** : EF-XX, EF-YY (avec section)
- **Citation littérale** des extraits du CDC concernés (1-3 lignes par ID)
- **Confirmation explicite** : *"Mon plan d'implémentation est strictement
  conforme au CDC sur les points suivants"* — détail point par point.

### RÉFLEXION EXPERTE (obligatoire)

Avant de présenter ton plan, te poser explicitement ces 4 questions et y
répondre dans le rapport :

1. **Approche optimale ?** L'approche que je vais proposer est-elle la
   meilleure compte tenu du domaine métier et des contraintes du projet ?
   Une alternative substantiellement meilleure existe-t-elle (impact
   mesurable : perf x10, complexité divisée par 2, risque sécurité évité) ?
2. **Manque dans le CDC ?** Le CDC est-il complet sur ce point ? Manque-t-il
   une fonctionnalité structurellement importante qu'un utilisateur du
   domaine attendrait ?
3. **Ambiguïté ?** Y a-t-il un point ambigu ou contradictoire dans le CDC
   sur ce sujet ?
4. **Dette induite ?** Mon plan introduit-il de la dette technique ou des
   couplages problématiques ?

Si réponse "oui" à l'une → **STOP** avec présentation au format imposé
(constat / alternative / comparaison / recommandation).

### ANALYSE D'IMPACT

- **Fichiers existants impactés** : `[chemin]` → [nature exacte de la modif]
- **Fichiers à créer** : `[chemin]` → [rôle et contenu prévu]
- **Tables / schémas DB impactés** : [si applicable]
- **APIs / endpoints touchés** : [si applicable]
- **Configuration impactée** : [variables d'env, feature flags, etc.]

### RISQUES DE RÉGRESSION

- [risque identifié] → [mesure de précaution prévue]

### CONFLITS DÉTECTÉS

Si la feature entre en conflit avec :
- une décision de `SPEC.md` (un ADR)
- un point du plan d'amélioration de l'audit
- une convention existante

→ **signale-le** avec proposition de résolution. Ne pas implémenter avant
arbitrage de l'utilisateur.

### PRÉREQUIS

Y a-t-il un point CRITIQUE du plan d'amélioration ou un écart code/CDC
critique à traiter d'abord ?

### APPROCHE TECHNIQUE

Décrire la stratégie étape par étape.

Si **deux ou trois approches** sont possibles, présenter chacune avec
avantages/inconvénients, puis recommander celle que tu privilégies et
**pourquoi**.

### ORDRE D'EXÉCUTION

1. ...
2. ...
3. ...

### TESTS PRÉVUS

Lister les tests qui seront écrits :
- **Tests unitaires** : [liste avec ce qu'ils couvrent]
- **Tests d'intégration** : [si applicable]
- **Tests E2E** : [si applicable]

### IMPACT SUR LE SCORE DE SANTÉ

Cette implémentation va-t-elle améliorer / maintenir / dégrader certains
axes ? Sois honnête (ex : "+0.5 sur Tests, -0.3 sur Architecture si on
introduit ce couplage").

### À la fin de Phase 3

> **STOP.** Attendre feu vert explicite avant de commencer à coder.

---

## PHASE 4 — Implémentation

### Vigilance CDC continue

À chaque écart potentiel détecté pendant l'écriture du code (cf. CLAUDE.md
> CDC = LOI > Comportement obligatoire) :
- **STOPPER immédiatement**
- **Présenter le point précis**, la référence CDC, les options, la question
- **Ne reprendre** qu'après décision de l'utilisateur

### Respect des conventions existantes

- Même style de nommage que le reste du projet
- Même structure et organisation des fichiers
- Même patterns de gestion d'erreurs
- Même approche pour les tests existants
- Si une convention semble mauvaise : signale-le, mais respecte-la jusqu'à
  instruction contraire.

### Modifications de fichiers existants

- Justifier chaque modification.
- **Jamais** supprimer de code sans le signaler ET expliquer pourquoi.
- Conserver les commentaires existants sauf s'ils sont incorrects.
- **Jamais** toucher à un fichier non directement lié à la tâche.

### Génération de tests (interleaved, exécutés)

- Écrire les tests **EN MÊME TEMPS** que le code, fonctionnalité par
  fonctionnalité. Pas tout le code puis tous les tests.
- Tests unitaires pour chaque nouvelle fonction publique.
- Tests d'intégration pour les nouveaux flux critiques.
- Respecter le style et les conventions des tests existants (lire 2-3 tests
  existants avant d'écrire).
- Chaque cas limite identifié dans le plan doit avoir son test.

**Après écriture, EXÉCUTION OBLIGATOIRE** :

1. Lancer la suite ciblée (commande détectée à l'étape bootstrap).
2. Si **échec** → ne pas rendre la main. Diagnostiquer, corriger, relancer.
3. Si **succès** → noter le résumé (X passants / Y skipped / Z s) pour le
   rapport Phase 5.

### Refactoring en cours de route

- Si tu réalises qu'un refactor est nécessaire pour avancer proprement :
  **STOP** et demande l'autorisation avant.
- Sépare clairement le refactoring du code fonctionnel (commits distincts).

### Suggestions pendant l'implémentation

Si pendant l'implémentation tu découvres :
- Une **fonctionnalité manquante** structurellement importante (cf. Posture)
- Une **alternative** substantiellement meilleure pour la suite

→ **STOP** avec présentation au format imposé. Ne pas implémenter sans
décision utilisateur.

---

## PHASE 5 — Validation

Après chaque fonctionnalité implémentée, produire ce rapport :

### CE QUI A ÉTÉ FAIT

Description claire et concise de ce qui a été implémenté.

### CONFORMITÉ AU CDC (vérification finale)

Checklist des IDs CDC couverts. Pour chaque :

- [x] **EF-XX** — [intitulé court] — couvert par [fichier(s)] — testé par
  [test(s)]

S'il y a des points du CDC partiellement couverts ou non couverts → les
lister explicitement et proposer une feature complémentaire dans le backlog.

### FICHIERS TOUCHÉS

- **Créés** : [liste avec rôle de chaque fichier]
- **Modifiés** : [liste avec nature de chaque modification]
- **Supprimés** : [liste avec justification — exception, normalement aucun]

### TESTS ÉCRITS & RÉSULTATS

- Liste des tests générés et ce qu'ils couvrent
- Résultat de la suite ciblée : `X passants / Y skipped / Z secondes`
- Si tests d'intégration ajoutés : commande à lancer pour les rejouer

### À TESTER MANUELLEMENT

Ce que l'utilisateur doit vérifier de son côté, avec les cas concrets à
tester.

### CONFIGURATIONS NÉCESSAIRES

- Migrations de base de données à appliquer
- Nouvelles variables d'environnement (avec valeurs d'exemple)
- Nouvelles dépendances installées
- Étapes spécifiques (rebuild d'index, redémarrage de service, etc.)

### AUTO-REVIEW (honnête, non complaisante)

- **Régressions possibles** : oui / non — détail si oui
- **Cohérence avec l'existant** : oui / non — détail si non
- **Optimisations possibles** : liste si applicable
- **Dette technique introduite** : oui / non — détail si oui
- **Suggestions d'amélioration** (avis d'expert) : si tu vois des choses
  qui mériteraient d'être améliorées dans le périmètre couvert ou autour,
  signaler-les ici (sans les implémenter — c'est pour discussion).

### IMPACT SUR SCORE DE SANTÉ

Différentiel par axe touché. Honnête.

### MISES À JOUR DES FICHIERS

#### BACKLOG.md (auto)

Mettre à jour le statut de la feature : `à faire` → `livré, à valider`.
Indiquer la branche / commit.

#### À coller dans SPEC.md (si applicable)

Si une décision architecturale a été prise pendant cette feature, présenter
un bloc ADR formaté (template `.claude/templates/adr.md`) à coller dans
`SPEC.md > Section 5`.

#### À ajouter à BACKLOG.md > Idées non priorisées (si applicable)

Si l'utilisateur a validé une suggestion de feature pendant le travail mais
veut la traiter plus tard, ajouter une ligne dans la section "Idées non
priorisées" de BACKLOG.md.

#### À ajouter dans MEMORY.md (sur demande explicite)

Présenter l'entrée à ajouter à `MEMORY.md > CE QUI A ÉTÉ FAIT` :

```
| YYYY-MM-DD | F-XXX [titre] | EF-XX, EF-YY | livré, à valider | feat/... |
```

Demander : *"Tu veux que j'exécute la mise à jour de MEMORY.md ?"*

### GIT — proposition de commit

- Branche actuelle : [détectée]
- Format suggéré :
  ```
  feat(scope): description courte [CDC: EF-XX, EF-YY]
  ```
  ou `fix(scope): ...`, `refactor(scope): ...`, etc.
- Afficher `git status` et `git diff --stat`
- Demander validation explicite avant `git commit`
- **Ne jamais** `git push` automatiquement

### PROCHAINES ÉTAPES SUGGÉRÉES

- **Prochaine feature** du backlog (selon l'ordre actuel)
- **Si écarts CDC détectés** pendant cette feature → les lister
- **Si suggestions** non implémentées → rappeler les principales (3 max)
