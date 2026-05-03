---
name: update-memory
description: Met à jour MEMORY.md sur demande explicite uniquement. Consolide les informations de la session courante (features livrées, décisions prises, problèmes rencontrés, dette technique observée). Ne touche JAMAIS à SPEC.md. À invoquer uniquement quand l'utilisateur dit "mets à jour la mémoire", "sauvegarde l'état", ou équivalent.
---

# Mise à jour de MEMORY.md

Cette skill ne s'invoque **jamais automatiquement**. Elle ne s'exécute que
sur demande explicite de l'utilisateur :

- "mets à jour la mémoire"
- "sauvegarde l'état"
- "/update-memory"
- ou formulation équivalente claire

**Si la demande est ambiguë, demander confirmation avant d'écrire.**

---

## Étape 1 — Préparation : montrer avant d'écrire

**Ne jamais** écrire directement dans MEMORY.md sans avoir présenté le diff
proposé à l'utilisateur.

Présenter un récapitulatif structuré de ce que tu vas écrire, section par
section. L'utilisateur valide globalement ou demande des modifications.

---

## Étape 2 — Sections à mettre à jour

### `Dernière mise à jour`
Mettre la date du jour au format `YYYY-MM-DD HH:MM` (timezone locale).

### `ÉTAT VÉRIFIABLE`
Toujours mis à jour avec valeurs courantes :
- Branche actuelle (`git branch --show-current`)
- Dernier commit (`git log -1 --format='%H %s'`)
- Hash sha256 des lockfiles principaux
- Liste des dossiers top-level
- Timestamp de la vérification

### `CONTEXTE ACTUEL`
Reformuler en 2-3 lignes l'état réel de la session qui se termine :
- Où on en est sur la feature en cours
- Statut : `en cours` / `livré` / `livré, à valider` / `pause` / `bloqué`
- Prochaine étape envisagée (sans s'engager si pas discuté)

### `CE QUI A ÉTÉ FAIT`
Ajouter une ligne dans le tableau pour **chaque feature** terminée pendant
cette session (statut `livré` ou `livré, à valider`).

| Date | Fonctionnalité | Statut | Branche / Commit |
| YYYY-MM-DD | [résumé court] | livré, à valider | `feat/...` ou hash |

**Règle** : ne pas créer d'entrée pour des fonctionnalités encore en cours.
Celles-ci vivent dans `CONTEXTE ACTUEL`.

### `DÉCISIONS DE SESSION`
Pour chaque décision technique prise pendant la session qui n'est **pas**
encore un ADR dans SPEC.md :

| Date | Décision provisoire | Pourquoi | À promouvoir en ADR ? |
| YYYY-MM-DD | [décision] | [justification courte] | oui / non / à voir |

**Si "À promouvoir en ADR" = oui** : présenter un bloc ADR formaté à coller
dans SPEC.md (template `.claude/templates/adr.md`).

### `PROBLÈMES RENCONTRÉS & SOLUTIONS`
Pour chaque problème non trivial rencontré et résolu :

| Date | Problème | Cause | Solution appliquée |

**Pas pour les bugs triviaux** (typo, oubli d'import). Seulement ce qui
mérite d'être retrouvé dans 3 mois.

### `DETTE TECHNIQUE EN COURS`
Dette détectée pendant la session (pas l'audit global, qui va dans SPEC).
Format : Priorité (haute/moyenne/basse), problème, impact, effort estimé.

### `POINTS DE VIGILANCE`
Choses à garder en tête pour les prochaines sessions, qui ne sont pas
encore stables (sinon → SPEC).

### `NOTES DE SESSION`
Ajouter une nouvelle entrée **en haut** de la section :

```markdown
### YYYY-MM-DD — [résumé court de la session]

[Notes libres : ce qui était en cours, blocages, idées à explorer, contexte
émotionnel/business si pertinent. 5-15 lignes max.]
```

**Ne pas supprimer** les notes des sessions précédentes. Cette section est
chronologique et conserve l'historique.

---

## Étape 3 — Hygiène du fichier

Avant d'écrire, vérifier :

- **Tableaux trop longs** (>20 lignes) : proposer une archive dans
  `.claude/memory-archive/YYYY-MM.md` pour garder MEMORY lisible. Demander
  validation avant d'archiver.
- **Notes de session trop nombreuses** (>10) : proposer la même archivage
  pour les plus anciennes.
- **Doublons** : détecter et fusionner si évident, demander si ambigu.

---

## Étape 4 — Confirmation et commit

Après écriture :

1. Afficher `git diff MEMORY.md` pour que l'utilisateur voie exactement
   ce qui a été écrit.
2. Demander : *"Veux-tu que je commit cette mise à jour de MEMORY ?"*
3. Si oui, format de commit :
   `chore(memory): update session notes [YYYY-MM-DD]`
4. **Ne jamais** push automatiquement (cf. règles Git de CLAUDE.md).

---

## Cas limites

- **MEMORY.md a été modifié manuellement** depuis la dernière session : ne
  pas écraser. Présenter ton update comme un patch additif. Si conflit,
  demander à l'utilisateur quelle version garder.
- **Demande de "tout effacer"** : refuser. Proposer une archive complète
  (`.claude/memory-archive/YYYY-MM-DD-full.md`) avant la remise à zéro.
- **Demande d'écrire dans SPEC.md** : refuser. Rappeler que SPEC.md est
  sous contrôle exclusif de l'utilisateur, et présenter un bloc à coller
  manuellement.
