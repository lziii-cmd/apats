---
name: bootstrap
description: Premier lancement sur un projet. Détecte le contexte (4 cas A/B/C/D selon présence de code et de CDC). Détecte la stack technique, identifie l'outillage présent (test, lint, format, audit), génère le script health-check.sh adapté, initialise SPEC.md et MEMORY.md avec les valeurs détectées. Délègue à spec-import si un CDC est présent. À invoquer UNE SEULE FOIS, quand MEMORY.md n'est pas initialisé.
---

# Bootstrap — Premier lancement

Cette skill s'invoque **une seule fois** par projet, au tout premier
lancement de Claude Code. Critère : MEMORY.md vide ou absent à la racine.

## Étape 0 — Détection du contexte (cas A/B/C/D)

Cf. CLAUDE.md > "DÉMARRAGE DE SESSION > Détection du contexte".

```
                    Lancement de Claude Code
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
   Code présent                            Pas de code
        │                                           │
   ┌────┴────┐                                 ┌────┴────┐
 Avec CDC  Sans CDC                         Avec CDC  Sans CDC
 (cas A)   (cas B)                          (cas C)   (cas D)
```

**Vérifications préliminaires** :
- `CDC.md` à la racine ? (oui/non)
- `CDC.docx` à la racine ? Si oui sans CDC.md correspondant, message :
  > *"CDC.docx détecté mais pas de CDC.md. Convertis ton CDC en Markdown
  > propre (par exemple via une session Claude.ai séparée), puis place-le
  > à la racine sous le nom `CDC.md`. Je m'arrête ici."*
  Arrêter Bootstrap immédiatement.
- Présence de fichiers de stack ? (cf. tableau étape 1)

Annoncer le cas identifié à l'utilisateur dès le début :
> *"Contexte détecté : Cas [A/B/C/D] — [code existant + CDC | code seul |
> CDC seul | projet vierge]. Je procède en conséquence."*

## Étape 1 — Détection de la stack

Scanner la racine et identifier les fichiers signature :

| Signature                                       | Stack                  |
|-------------------------------------------------|------------------------|
| `package.json`                                  | Node.js                |
| `pyproject.toml`, `requirements.txt`, `setup.py`| Python                 |
| `pom.xml`, `build.gradle`, `build.gradle.kts`   | Java / Kotlin          |
| `Cargo.toml`                                    | Rust                   |
| `go.mod`                                        | Go                     |
| `composer.json`                                 | PHP                    |
| `Gemfile`                                       | Ruby                   |
| `pubspec.yaml`                                  | Dart / Flutter         |
| `*.csproj`, `*.sln`                             | .NET (C#)              |
| `mix.exs`                                       | Elixir                 |
| `deno.json`, `deno.jsonc`                       | Deno                   |
| `bun.lockb`                                     | Bun                    |
| `Package.swift`                                 | Swift                  |

Identifier le **framework principal** en lisant le manifeste :

- Node : React, Vue, Angular, Next, Nuxt, Svelte, Astro, NestJS, Express,
  Fastify, Hono, ElysiaJS…
- Python : Django, Flask, FastAPI, Litestar, Starlette, Tornado, aiohttp…
- Java/Kotlin : Spring Boot, Quarkus, Micronaut, Ktor…
- PHP : Laravel, Symfony, Slim…
- Ruby : Rails, Sinatra, Hanami…

**Cas multi-stack (monorepo)** : identifier toutes les stacks, demander
laquelle est principale.

**Cas C (CDC sans code)** :
- Lire le CDC pour identifier la stack proposée (souvent dans une section
  "Stack technique" ou "Architecture").
- Si la stack est explicite dans le CDC : la mémoriser, signaler à
  l'utilisateur.
- Si non explicite : ne pas trancher ici, laisser `spec-import` proposer 2-3
  options en fin de Phase 5.

**Cas D (vide)** : demander à l'utilisateur la nature du projet.

## Étape 2 — Détection de l'outillage

Pour la stack identifiée, vérifier la présence des outils standards.
Lire les fichiers de config pour confirmer (ne pas se fier au PATH seul).

| Domaine          | Node.js                    | Python                          | Rust            | Go                   |
|------------------|----------------------------|---------------------------------|-----------------|----------------------|
| Tests            | jest, vitest, mocha, ava   | pytest, unittest                | cargo test      | go test              |
| Couverture       | jest --coverage, c8, nyc, vitest --coverage | pytest-cov, coverage | cargo-tarpaulin | go test -cover       |
| Lint             | eslint, biome              | ruff, flake8, pylint            | clippy          | golangci-lint        |
| Format           | prettier, biome            | black, ruff format              | rustfmt         | gofmt, goimports     |
| Sécurité deps    | npm audit, pnpm audit, yarn audit | pip-audit, safety        | cargo audit     | govulncheck          |
| Sécurité code    | (couvert par eslint)       | bandit, semgrep                 | clippy          | gosec                |
| Outdated         | npm outdated               | pip list --outdated             | cargo outdated  | go list -u -m all    |
| Type-checking    | tsc                        | mypy, pyright                   | (intégré)       | (intégré)            |

Pour les autres stacks, équivalents du même type (PHP : phpunit /
php-cs-fixer / phpstan ; Ruby : rspec / rubocop / brakeman ; Java : junit /
spotbugs / OWASP dep-check ; .NET : xunit / dotnet format / dotnet list
package --vulnerable ; Flutter : flutter test / dart format / dart analyze).

Lister à l'utilisateur :
- Outils détectés et leur version
- Outils standard ABSENTS (proposer leur installation, ne pas l'imposer)

## Étape 3 — Création de la structure

Créer si absents (sans écraser) :

```
.claude/
├── scripts/
│   └── health-check.sh         [généré à l'étape 6]
└── (skills/, templates/ déjà présents si extraits du zip)
```

Vérifier que `.gitignore` contient les exclusions du système (voir
`.gitignore.snippet`). Si non, le proposer.

## Étape 4 — Initialisation de SPEC.md

Si SPEC.md vide ou rempli de `[À COMPLÉTER]` :

Remplir automatiquement les sections que tu peux déduire :

- Section 1 : nom du projet (si déductible), domaine métier (À COMPLÉTER si
  pas en cas A ou C avec CDC clair)
- Section 2 : présence du CDC ou non, version vide
- Section 3 : stack technique détectée
- Section 4 : conventions détectées (linter, formateur, structure)

Marquer `[À COMPLÉTER]` les sections impossibles à deviner.

À la fin, **lister à l'utilisateur les sections à compléter** dans SPEC.md.

## Étape 5 — Initialisation de MEMORY.md

Remplir la section `ÉTAT VÉRIFIABLE` avec les valeurs courantes :

```bash
git branch --show-current
git log -1 --format='%H %s'
sha256sum [lockfiles]   # ex: package-lock.json, poetry.lock, Cargo.lock
sha256sum CDC.md 2>/dev/null   # si présent
ls -d */ 2>/dev/null
```

Laisser les autres sections vides avec leurs en-têtes en place.

## Étape 6 — Génération de `health-check.sh`

Si le fichier est déjà présent (livré dans le zip), vérifier qu'il est
exécutable et passer. Sinon, en générer un selon la stack détectée.

Le script doit :
- Détecter la stack au runtime
- Exécuter les outils détectés à l'étape 2
- Produire `.claude/health-report.json` avec les métriques objectives
- Archiver dans `.claude/health-history/YYYY-MM-DD.json`
- Être idempotent et non destructif
- Ne pas planter si un outil manque
- Tourner en moins de 60 secondes sur un projet moyen

Le template livré dans le zip est portable (Node, Python, Rust, Go, JVM, PHP,
Ruby couverts). Pour stacks rares, l'utilisateur ajustera.

## Étape 7 — Délégation à spec-import (cas A et C uniquement)

Si CDC.md est présent :
- Annoncer : *"Un CDC a été détecté. Je vais maintenant invoquer la skill
  `spec-import` pour le transformer en backlog de features atomiques."*
- Invoquer `spec-import`.

Si CDC.md absent (cas B et D) :
- Passer à l'étape 8.

## Étape 8 — Rapport de bootstrap

Présenter à l'utilisateur :

1. **Cas détecté** (A/B/C/D)
2. **Stack détectée** (langage, framework, version, package manager)
3. **Outillage présent** (vert) vs **absent** (jaune, suggestion d'install)
4. **Sections à compléter dans SPEC.md** (liste avec numéros)
5. **État initial** : exécuter une première fois `health-check.sh` et présenter
   les métriques de référence (T0)
6. **Proposition de suite** :
   - Cas A : *"Je propose maintenant `spec-sync audit` pour vérifier la
     cohérence entre code existant et CDC. OK ?"*
   - Cas B : *"Veux-tu un audit complet (skill `audit`) ? Ou attaquer une
     feature directement ?"*
   - Cas C : déjà géré par spec-import (passé à F-001 scaffolding)
   - Cas D : *"Que veux-tu faire ? Créer un CDC d'abord ? Bootstraper un
     projet avec une stack précise ?"*

> **STOP** — attendre la décision de l'utilisateur.
