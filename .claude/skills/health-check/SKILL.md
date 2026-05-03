---
name: health-check
description: Score de santé objectif basé sur des métriques mesurées (linter, tests, audit deps, complexité) + rubrique avec ancres explicites par axe + différentiel vs précédent rapport. Évite l'évaluation au feeling. À invoquer sur demande explicite ("score", "santé du projet", "/health-check") ou par la skill audit en Phase 2.
---

# Score de santé du projet

Système en 4 étapes pour produire un score crédible et reproductible.

---

## Étape 1 — Collecte des métriques objectives

Exécuter `.claude/scripts/health-check.sh`.

Le script :
- Détecte la stack
- Lance les outils détectés (linter, test runner, audit deps, complexité)
- Écrit `.claude/health-report.json` avec les métriques brutes
- Archive une copie dans `.claude/health-history/YYYY-MM-DD.json`

**Si le script n'existe pas** → invoque la skill `bootstrap` pour le créer.

**Si le script échoue** → ne pas inventer de métriques. Présenter les sorties
brutes des outils qui ont fonctionné, et signaler ceux qui ont échoué avec
le message d'erreur. Demander à l'utilisateur d'aider à débugger.

---

## Étape 2 — Dérivation des notes (ancres explicites)

Pour chaque axe, **comparer les métriques aux ancres ci-dessous**, ne pas
inventer une note "au feeling". Si une métrique manque (outil non disponible
sur la stack), le signaler explicitement plutôt que de combler.

### Tests
- **0** : aucun test, aucune commande de test configurée
- **3** : quelques tests, < 30 % de couverture, pas de CI
- **5** : couverture 30–60 %, peu de tests d'intégration
- **7** : couverture 60–75 %, tests d'intégration présents, CI en place
- **9** : couverture > 80 %, tests E2E sur flux critiques
- **10** : couverture > 90 %, mutation testing, tests de charge

### Sécurité
- **0** : secrets en dur dans le repo, vulnérabilités critiques non corrigées
- **3** : 1+ vulnérabilité critique, validation entrées partielle
- **5** : aucune vuln critique, mais des high non patchées
- **7** : seulement low/medium, validation systématique des entrées
- **9** : aucune vuln high+, audit deps en CI, secrets en vault/secret manager
- **10** : pentest récent passé, SAST + DAST en CI, modèle de menace documenté

### Qualité du code
- **0** : pas de linter, pas de formateur, complexité ingérable
- **3** : linter présent mais nombreux warnings ignorés
- **5** : linter respecté, mais code dupliqué, complexité moyenne élevée
- **7** : linter strict, format auto, complexité maîtrisée (avg < 5, max < 15)
- **9** : règles strictes en CI, faible duplication, métriques saines
- **10** : revues systématiques, métriques objectivement excellentes

### Architecture
- **0** : pas de structure, tout mélangé
- **3** : structure existe mais incohérente, couplages forts
- **5** : pattern reconnaissable, séparation partielle des responsabilités
- **7** : pattern clair (MVC, Clean Arch, etc.), responsabilités séparées
- **9** : pattern strict, modulaire, ADR documentés
- **10** : architecture documentée, évolutivité prouvée par expérience

### Maintenabilité
- **0** : aucune doc, naming incohérent, fichiers énormes
- **3** : README minimal, naming partiel
- **5** : README complet, conventions tenues
- **7** : doc API, conventions strictes, fichiers raisonnables (<300 LOC)
- **9** : doc complète (architecture + API + onboarding)
- **10** : doc vivante, ADR, runbook ops

### Performance
- **0** : pas mesurée, problèmes connus non traités
- **3** : pas mesurée mais OK perçu
- **5** : mesures ponctuelles, pas d'optimisation systématique
- **7** : métriques en place, optimisations clés faites
- **9** : monitoring continu, perf tests en CI
- **10** : SLO définis et tenus, observabilité complète (traces, metrics, logs)

### Infrastructure
- **0** : déploiement manuel, pas de CI
- **3** : CI basique, déploiement semi-manuel
- **5** : CI/CD fonctionnel mais fragile
- **7** : CI/CD robuste, plusieurs environnements
- **9** : IaC (Terraform/Pulumi/etc.), monitoring, sauvegardes testées
- **10** : DR testé, déploiement zero-downtime, autoscaling

---

## Étape 3 — Score différentiel

Charger le précédent rapport (le plus récent dans
`.claude/health-history/`, hors celui d'aujourd'hui).

Calculer le delta par axe. Présenter sous forme de tableau :

```
| Axe            | Note     | Δ      | Métriques clés                         |
|----------------|----------|--------|----------------------------------------|
| Architecture   | 7/10     | =      | 12 modules, profondeur max 4           |
| Qualité code   | 6/10     | +0.5   | 14 lint warns (était 32)               |
| Tests          | 5/10     | +1     | couverture 58 % (était 47 %)           |
| Sécurité       | 7/10     | -1     | 1 high apparue (npm audit)             |
| Performance    | n/a      | -      | non mesurée                            |
| Maintenabilité | 6/10     | =      | doc partielle                          |
| Infrastructure | 5/10     | =      | CI OK, pas d'IaC                       |
| **Global**     | **6.0**  | +0.1   |                                        |
```

**Tendance globale** : 1 ligne explicite à la fin :
- "En amélioration : Tests (+1), Qualité code (+0.5)"
- "En dégradation : Sécurité (-1) — à traiter"
- "Stable sur les autres axes"

---

## Étape 4 — Présentation finale

Format de réponse à l'utilisateur :

1. **Tableau** comme ci-dessus
2. **Tendance globale** en 1 phrase
3. **3 points d'action** prioritaires découlant des métriques (pas d'invention :
   citer la métrique qui justifie chaque action)
4. **Mention** de l'archive : *"Rapport archivé dans
   `.claude/health-history/YYYY-MM-DD.json` pour comparaisons futures."*

**Ne pas** mettre à jour MEMORY.md ni SPEC.md. Si l'utilisateur veut tracer
ce score, il invoquera `update-memory` lui-même.
