# Template ADR (Architecture Decision Record)

> Format à coller dans `SPEC.md > Section 4`. Un ADR par décision
> architecturale structurante (choix de framework, stratégie d'auth,
> approche de stockage, etc.). N'utilise PAS d'ADR pour des choix
> tactiques qui peuvent être revus à la volée.

---

### ADR-XXX — [Titre court de la décision]

- **Date** : YYYY-MM-DD
- **Statut** : proposé | accepté | déprécié | remplacé par ADR-YYY
- **Décideur(s)** : [qui a tranché]

#### Contexte

[Le problème qui a motivé cette décision. Quelles forces étaient en
présence ? Quelles contraintes ? Quels objectifs ?]

#### Décision

[Ce qui a été décidé, en une ou deux phrases claires et actionnables.]

#### Alternatives écartées

- **Option A** — [description] — Rejetée parce que [raison]
- **Option B** — [description] — Rejetée parce que [raison]

#### Conséquences

**Bénéfices**
- [bénéfice 1]
- [bénéfice 2]

**Coûts / risques**
- [coût 1]
- [risque 1 + plan de mitigation si pertinent]

#### Références (optionnel)

- [Lien vers une discussion, un benchmark, une doc externe]

---

## Quand promouvoir une décision en ADR ?

- ✅ Choix de framework, langage, base de données, file de messages
- ✅ Stratégie d'authentification ou d'autorisation
- ✅ Pattern architectural global (monolithe / microservices / hexagonal)
- ✅ Convention forte (ex : "toutes les API en gRPC, jamais de REST")
- ✅ Décision de NE PAS utiliser quelque chose (ex : "pas de Redux")

## Quand NE PAS faire d'ADR

- ❌ Choix de nommage d'une variable
- ❌ Refactoring local d'une fonction
- ❌ Choix d'algorithme dans une fonction interne
- ❌ Décisions tactiques réversibles en une heure

> Règle de pouce : si défaire la décision prend plus d'une journée à un dev
> qui connaît le projet, c'est un ADR.
