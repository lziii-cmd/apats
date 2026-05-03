# Template d'écart assumé code/CDC

> Format à utiliser dans `MEMORY.md > ÉCARTS ASSUMÉS` pour formaliser une
> divergence consciente entre le code et le CDC. Géré par la skill
> `spec-sync` mode `divergence`.

---

## Quand utiliser un écart assumé ?

Un écart assumé est utilisé **uniquement** quand :

1. **Tu** (l'utilisateur) prends la décision de t'écarter du CDC pour une
   raison claire et argumentée
2. La modification du CDC n'est **pas** souhaitée à ce stade (peut-être
   plus tard, ou jamais)
3. La divergence doit rester **tracée**, **datée**, **justifiée**

L'écart assumé n'est **jamais** un mécanisme par défaut pour ignorer le CDC.

## Format de l'entrée

À ajouter en ligne dans `MEMORY.md > ÉCARTS ASSUMÉS` :

```markdown
| 2026-05-02 | EF-12 | Retour HTTP 200 au lieu de 201 sur création | Compatibilité API legacy v1, refactor prévu Q3 | 2026-05-02 |
```

## Bloc complet à présenter avant la trace

Avant d'ajouter l'écart à MEMORY.md, présenter ce bloc à l'utilisateur pour
validation :

```
ÉCART ASSUMÉ — Formalisation
─────────────────────────────────────────────────────────
ID CDC concerné  : EF-XX (section Y.Z du CDC)
Texte CDC        : "[citation exacte de l'extrait du CDC]"

Implémentation prévue :
[Ce qui va être codé, qui diverge du CDC]

Raison de l'écart :
[Pourquoi on ne suit pas le CDC sur ce point. Doit être substantielle :
- contrainte technique
- compatibilité legacy
- contrainte business / deadline
- décision de simplification temporaire
- évolution probable du CDC dans cette direction]

Trade-offs acceptés :
- Gains : [...]
- Pertes / risques : [...]

Date de réexamen prévue : [YYYY-MM-DD ou "indéfini"]

Validé par utilisateur le : [date]
─────────────────────────────────────────────────────────
```

## Bloc à coller dans SPEC.md > Section 2

Après validation, présenter à l'utilisateur ce bloc à coller manuellement
dans `SPEC.md > Section 2 > Écarts assumés en cours` :

```markdown
- **EF-XX** ([date]) — [résumé en 1 ligne].
  Détail dans MEMORY.md > ÉCARTS ASSUMÉS.
  Réexamen prévu : [date ou indéfini].
```

## Cycle de vie d'un écart assumé

1. **Création** via `spec-sync divergence` (ce template)
2. **Vie** : tracé dans MEMORY.md, mentionné dans SPEC.md
3. **Audit périodique** : à chaque `spec-sync audit`, les écarts assumés
   sont relus pour vérifier qu'ils sont toujours pertinents
4. **Résolution** : trois sorties possibles
   - **Le code est mis en conformité** avec le CDC → l'écart est marqué
     comme "résolu - code aligné" avec date
   - **Le CDC est modifié** pour refléter l'écart → l'écart est marqué
     comme "résolu - CDC aligné" avec date, et `spec-sync regenerate-backlog`
     est invoqué
   - **L'écart est confirmé pour la durée** → date de réexamen reportée

## Anti-patterns (à ne jamais faire)

- ❌ Créer un écart assumé pour éviter d'avoir à argumenter avec l'utilisateur
- ❌ Créer un écart assumé sans date de réexamen
- ❌ Accumuler les écarts assumés au point qu'ils deviennent ingérables
  (> 10 actifs simultanément = signal d'alarme, le CDC mérite une refonte)
- ❌ Utiliser l'écart assumé pour camoufler un bug
- ❌ Modifier le CDC silencieusement pour qu'il colle au code (c'est le
  contraire de l'écart assumé : c'est de la falsification)
