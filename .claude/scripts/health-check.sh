#!/usr/bin/env bash
# .claude/scripts/health-check.sh
# Health-check stack-agnostique.
# Détecte la stack au runtime, lance les outils présents, produit un JSON
# dans .claude/health-report.json + archive dans .claude/health-history/.
#
# Garanties :
#   - Aucune modification du code source du projet
#   - Ne plante pas si un outil manque (skip silencieux)
#   - Tourne typiquement en < 60s sur un projet de taille moyenne

set -uo pipefail
# Note : pas de "set -e" volontairement — on veut continuer même si un outil échoue.

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CLAUDE_DIR="${PROJECT_ROOT}/.claude"
REPORT_FILE="${CLAUDE_DIR}/health-report.json"
HISTORY_DIR="${CLAUDE_DIR}/health-history"
TODAY="$(date +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "${HISTORY_DIR}"

cd "${PROJECT_ROOT}"

# ============================================================================
# UTILITAIRES
# ============================================================================

# Vérifie si une commande existe
has() { command -v "$1" >/dev/null 2>&1; }

# Lit la première valeur entière dans un texte (ou 0)
first_int() { grep -oE '[0-9]+' <<<"$1" | head -n1 || echo "0"; }

# Échappe les caractères spéciaux pour JSON
json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null \
    || node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))' 2>/dev/null \
    || sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n'
}

# Compteur de fichiers source
count_files() { find . -type f \( "$@" \) \
  -not -path './node_modules/*' \
  -not -path './.git/*' \
  -not -path './vendor/*' \
  -not -path './dist/*' \
  -not -path './build/*' \
  -not -path './target/*' \
  -not -path './.venv/*' \
  -not -path './venv/*' \
  -not -path './__pycache__/*' \
  -not -path './.next/*' \
  -not -path './.nuxt/*' \
  2>/dev/null | wc -l | tr -d ' '
}

# Compteur de lignes de code (approximatif, sans cloc/tokei)
count_loc() { find . -type f \( "$@" \) \
  -not -path './node_modules/*' \
  -not -path './.git/*' \
  -not -path './vendor/*' \
  -not -path './dist/*' \
  -not -path './build/*' \
  -not -path './target/*' \
  -not -path './.venv/*' \
  -not -path './venv/*' \
  -not -path './__pycache__/*' \
  -not -path './.next/*' \
  -not -path './.nuxt/*' \
  -exec cat {} + 2>/dev/null | wc -l | tr -d ' '
}

# ============================================================================
# DÉTECTION DE LA STACK
# ============================================================================

STACK="unknown"
STACKS_DETECTED=()

[ -f "package.json" ]                      && STACKS_DETECTED+=("node")
[ -f "deno.json" ] || [ -f "deno.jsonc" ]  && STACKS_DETECTED+=("deno")
[ -f "bun.lockb" ]                         && STACKS_DETECTED+=("bun")
[ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "setup.py" ] && STACKS_DETECTED+=("python")
[ -f "Cargo.toml" ]                        && STACKS_DETECTED+=("rust")
[ -f "go.mod" ]                            && STACKS_DETECTED+=("go")
[ -f "pom.xml" ] || [ -f "build.gradle" ] || [ -f "build.gradle.kts" ] && STACKS_DETECTED+=("jvm")
[ -f "composer.json" ]                     && STACKS_DETECTED+=("php")
[ -f "Gemfile" ]                           && STACKS_DETECTED+=("ruby")
[ -f "pubspec.yaml" ]                      && STACKS_DETECTED+=("dart")
[ -f "mix.exs" ]                           && STACKS_DETECTED+=("elixir")
[ -f "Package.swift" ]                     && STACKS_DETECTED+=("swift")
ls *.csproj *.sln 2>/dev/null | head -1 >/dev/null && STACKS_DETECTED+=("dotnet")

if [ ${#STACKS_DETECTED[@]} -gt 0 ]; then
  STACK="${STACKS_DETECTED[0]}"
fi

# ============================================================================
# COLLECTE DES MÉTRIQUES
# ============================================================================

# Tous les outputs sont stockés dans des fichiers temporaires
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

LINT_ERRORS=0
LINT_WARNINGS=0
LINT_RAN="false"
TEST_PASSING=0
TEST_TOTAL=0
TEST_RAN="false"
COVERAGE_PCT=""
VULN_CRITICAL=0
VULN_HIGH=0
VULN_MEDIUM=0
VULN_LOW=0
AUDIT_RAN="false"
OUTDATED_COUNT=""
OUTDATED_RAN="false"
LOC_TOTAL=0
FILE_COUNT=0

echo "🔍 Stack détectée : ${STACK} (toutes : ${STACKS_DETECTED[*]:-aucune})"
echo "📂 Racine projet : ${PROJECT_ROOT}"

# ----------------------------------------------------------------------------
# Métriques par stack
# ----------------------------------------------------------------------------

case "${STACK}" in

  node|deno|bun)
    EXTS=( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" -o -name "*.cjs" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    # Linter
    if has eslint || [ -f "node_modules/.bin/eslint" ]; then
      ESLINT_BIN="eslint"
      [ -f "node_modules/.bin/eslint" ] && ESLINT_BIN="node_modules/.bin/eslint"
      "${ESLINT_BIN}" . --format json > "$TMP/eslint.json" 2>/dev/null || true
      if [ -s "$TMP/eslint.json" ]; then
        LINT_RAN="true"
        LINT_ERRORS=$(grep -oE '"errorCount":[0-9]+' "$TMP/eslint.json" | grep -oE '[0-9]+' | awk '{s+=$1}END{print s+0}')
        LINT_WARNINGS=$(grep -oE '"warningCount":[0-9]+' "$TMP/eslint.json" | grep -oE '[0-9]+' | awk '{s+=$1}END{print s+0}')
      fi
    elif has biome || [ -f "node_modules/.bin/biome" ]; then
      BIOME_BIN="biome"
      [ -f "node_modules/.bin/biome" ] && BIOME_BIN="node_modules/.bin/biome"
      "${BIOME_BIN}" check . > "$TMP/biome.txt" 2>&1 || true
      LINT_RAN="true"
      LINT_ERRORS=$(grep -cE '✖|error' "$TMP/biome.txt" 2>/dev/null; true)
      LINT_WARNINGS=$(grep -cE 'warning' "$TMP/biome.txt" 2>/dev/null; true)
    fi

    # Tests
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
      timeout 120 npm test --silent > "$TMP/test.txt" 2>&1 || true
      if [ -s "$TMP/test.txt" ]; then
        TEST_RAN="true"
        # Pattern Jest/Vitest
        TESTS_LINE=$(grep -E '(Tests:|Test Files)' "$TMP/test.txt" | tail -n1)
        if [ -n "$TESTS_LINE" ]; then
          TEST_PASSING=$(echo "$TESTS_LINE" | grep -oE '[0-9]+ passed' | head -1 | grep -oE '[0-9]+' || echo 0)
          TEST_TOTAL=$(echo "$TESTS_LINE" | grep -oE '[0-9]+ total' | head -1 | grep -oE '[0-9]+' || echo "$TEST_PASSING")
        fi
        # Coverage si présent
        COV_LINE=$(grep -E 'All files' "$TMP/test.txt" | head -n1)
        if [ -n "$COV_LINE" ]; then
          COVERAGE_PCT=$(echo "$COV_LINE" | grep -oE '[0-9]+\.[0-9]+' | head -n1)
        fi
      fi
    fi

    # Audit deps
    if has npm && [ -f "package.json" ]; then
      npm audit --json > "$TMP/audit.json" 2>/dev/null || true
      if [ -s "$TMP/audit.json" ]; then
        AUDIT_RAN="true"
        VULN_CRITICAL=$(grep -oE '"critical":[0-9]+' "$TMP/audit.json" | head -1 | grep -oE '[0-9]+' || echo 0)
        VULN_HIGH=$(grep -oE '"high":[0-9]+' "$TMP/audit.json" | head -1 | grep -oE '[0-9]+' || echo 0)
        VULN_MEDIUM=$(grep -oE '"moderate":[0-9]+' "$TMP/audit.json" | head -1 | grep -oE '[0-9]+' || echo 0)
        VULN_LOW=$(grep -oE '"low":[0-9]+' "$TMP/audit.json" | head -1 | grep -oE '[0-9]+' || echo 0)
      fi
    fi

    # Outdated
    if has npm && [ -f "package.json" ]; then
      npm outdated --json > "$TMP/outdated.json" 2>/dev/null || true
      if [ -s "$TMP/outdated.json" ]; then
        OUTDATED_RAN="true"
        OUTDATED_COUNT=$(grep -cE '"current"' "$TMP/outdated.json" 2>/dev/null | head -n1)
        OUTDATED_COUNT="${OUTDATED_COUNT:-0}"
      fi
    fi
    ;;

  python)
    EXTS=( -name "*.py" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    # Linter
    if has ruff; then
      ruff check . --output-format=json > "$TMP/ruff.json" 2>/dev/null || true
      if [ -s "$TMP/ruff.json" ]; then
        LINT_RAN="true"
        LINT_ERRORS=$(grep -cE '"code"' "$TMP/ruff.json" 2>/dev/null; true)
        LINT_WARNINGS=0
      fi
    elif has flake8; then
      flake8 . --statistics > "$TMP/flake8.txt" 2>/dev/null || true
      if [ -s "$TMP/flake8.txt" ]; then
        LINT_RAN="true"
        LINT_ERRORS=$(wc -l < "$TMP/flake8.txt")
      fi
    fi

    # Tests + couverture
    if has pytest; then
      timeout 120 pytest --tb=no -q > "$TMP/test.txt" 2>&1 || true
      if [ -s "$TMP/test.txt" ]; then
        TEST_RAN="true"
        SUMMARY=$(tail -n5 "$TMP/test.txt" | grep -E 'passed|failed|error')
        TEST_PASSING=$(echo "$SUMMARY" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
        TEST_FAILED=$(echo "$SUMMARY" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
        TEST_TOTAL=$((TEST_PASSING + TEST_FAILED))
      fi
      # Couverture si pytest-cov dispo
      if pytest --cov=. --cov-report=term --tb=no -q > "$TMP/cov.txt" 2>&1; then
        COV_LINE=$(grep -E 'TOTAL' "$TMP/cov.txt" | tail -n1)
        if [ -n "$COV_LINE" ]; then
          COVERAGE_PCT=$(echo "$COV_LINE" | grep -oE '[0-9]+%' | head -1 | tr -d '%')
        fi
      fi
    fi

    # Audit
    if has pip-audit; then
      pip-audit --format json > "$TMP/audit.json" 2>/dev/null || true
      if [ -s "$TMP/audit.json" ]; then
        AUDIT_RAN="true"
        VULN_HIGH=$(grep -cE '"id"' "$TMP/audit.json" 2>/dev/null; true)
      fi
    fi

    # Sécurité code
    if has bandit; then
      bandit -r . -f json -q > "$TMP/bandit.json" 2>/dev/null || true
      if [ -s "$TMP/bandit.json" ]; then
        VULN_HIGH=$((VULN_HIGH + $(grep -cE '"issue_severity": "HIGH"' "$TMP/bandit.json" 2>/dev/null; true)))
        VULN_MEDIUM=$((VULN_MEDIUM + $(grep -cE '"issue_severity": "MEDIUM"' "$TMP/bandit.json" 2>/dev/null; true)))
        AUDIT_RAN="true"
      fi
    fi
    ;;

  rust)
    EXTS=( -name "*.rs" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    if has cargo; then
      # Clippy
      cargo clippy --message-format json > "$TMP/clippy.json" 2>/dev/null || true
      if [ -s "$TMP/clippy.json" ]; then
        LINT_RAN="true"
        LINT_ERRORS=$(grep -cE '"level":"error"' "$TMP/clippy.json" 2>/dev/null; true)
        LINT_WARNINGS=$(grep -cE '"level":"warning"' "$TMP/clippy.json" 2>/dev/null; true)
      fi

      # Tests
      timeout 120 cargo test --no-fail-fast > "$TMP/test.txt" 2>&1 || true
      if [ -s "$TMP/test.txt" ]; then
        TEST_RAN="true"
        TEST_PASSING=$(grep -E 'test result:' "$TMP/test.txt" | grep -oE '[0-9]+ passed' | awk '{s+=$1}END{print s+0}')
        TEST_FAILED=$(grep -E 'test result:' "$TMP/test.txt" | grep -oE '[0-9]+ failed' | awk '{s+=$1}END{print s+0}')
        TEST_TOTAL=$((TEST_PASSING + TEST_FAILED))
      fi

      # Audit
      if has cargo-audit; then
        cargo audit --json > "$TMP/audit.json" 2>/dev/null || true
        if [ -s "$TMP/audit.json" ]; then
          AUDIT_RAN="true"
          VULN_HIGH=$(grep -cE '"id"' "$TMP/audit.json" 2>/dev/null; true)
        fi
      fi
    fi
    ;;

  go)
    EXTS=( -name "*.go" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    if has go; then
      # Vet (intégré)
      go vet ./... > "$TMP/vet.txt" 2>&1 || true
      if [ -s "$TMP/vet.txt" ]; then
        LINT_RAN="true"
        LINT_WARNINGS=$(wc -l < "$TMP/vet.txt")
      fi

      # Linter externe
      if has golangci-lint; then
        golangci-lint run --out-format json > "$TMP/lint.json" 2>/dev/null || true
        if [ -s "$TMP/lint.json" ]; then
          LINT_RAN="true"
          LINT_ERRORS=$(grep -cE '"FromLinter"' "$TMP/lint.json" 2>/dev/null; true)
        fi
      fi

      # Tests + cover
      timeout 120 go test -cover ./... > "$TMP/test.txt" 2>&1 || true
      if [ -s "$TMP/test.txt" ]; then
        TEST_RAN="true"
        TEST_PASSING=$(grep -cE '^ok' "$TMP/test.txt" 2>/dev/null; true)
        TEST_TOTAL=$(grep -cE '^(ok|FAIL)' "$TMP/test.txt" 2>/dev/null || echo 0)
        # Couverture moyenne
        COVERAGE_PCT=$(grep -oE 'coverage: [0-9]+\.[0-9]+' "$TMP/test.txt" | grep -oE '[0-9]+\.[0-9]+' | awk '{s+=$1;n++}END{if(n)printf "%.1f", s/n; else print ""}')
      fi

      # Audit
      if has govulncheck; then
        govulncheck ./... > "$TMP/audit.txt" 2>&1 || true
        if [ -s "$TMP/audit.txt" ]; then
          AUDIT_RAN="true"
          VULN_HIGH=$(grep -cE '^Vulnerability' "$TMP/audit.txt" 2>/dev/null; true)
        fi
      fi
    fi
    ;;

  jvm)
    EXTS=( -name "*.java" -o -name "*.kt" -o -name "*.scala" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    # Maven/Gradle test
    if [ -f "pom.xml" ] && has mvn; then
      timeout 180 mvn -q test > "$TMP/test.txt" 2>&1 || true
      TEST_RAN="true"
      TEST_PASSING=$(grep -oE 'Tests run: [0-9]+' "$TMP/test.txt" | tail -1 | grep -oE '[0-9]+' || echo 0)
      TEST_TOTAL="$TEST_PASSING"
    elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
      if has gradle || [ -x "./gradlew" ]; then
        GRADLE_BIN="gradle"
        [ -x "./gradlew" ] && GRADLE_BIN="./gradlew"
        timeout 180 "$GRADLE_BIN" test > "$TMP/test.txt" 2>&1 || true
        TEST_RAN="true"
      fi
    fi
    ;;

  php)
    EXTS=( -name "*.php" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    if has phpunit || [ -f "vendor/bin/phpunit" ]; then
      PHPUNIT_BIN="phpunit"
      [ -f "vendor/bin/phpunit" ] && PHPUNIT_BIN="vendor/bin/phpunit"
      timeout 120 "$PHPUNIT_BIN" > "$TMP/test.txt" 2>&1 || true
      TEST_RAN="true"
      TEST_PASSING=$(grep -oE 'OK \([0-9]+ test' "$TMP/test.txt" | grep -oE '[0-9]+' || echo 0)
      TEST_TOTAL="$TEST_PASSING"
    fi

    if has composer && [ -f "composer.json" ]; then
      composer audit --format json > "$TMP/audit.json" 2>/dev/null || true
      if [ -s "$TMP/audit.json" ]; then
        AUDIT_RAN="true"
      fi
    fi
    ;;

  ruby)
    EXTS=( -name "*.rb" )
    LOC_TOTAL=$(count_loc "${EXTS[@]}")
    FILE_COUNT=$(count_files "${EXTS[@]}")

    if has rspec || [ -f "bin/rspec" ]; then
      RSPEC_BIN="rspec"
      [ -f "bin/rspec" ] && RSPEC_BIN="bin/rspec"
      timeout 120 "$RSPEC_BIN" > "$TMP/test.txt" 2>&1 || true
      TEST_RAN="true"
      TEST_PASSING=$(grep -oE '[0-9]+ examples?, [0-9]+ failures?' "$TMP/test.txt" | head -1 | grep -oE '^[0-9]+' || echo 0)
      TEST_TOTAL="$TEST_PASSING"
    fi

    if has bundler-audit; then
      bundler-audit > "$TMP/audit.txt" 2>&1 || true
      AUDIT_RAN="true"
      VULN_HIGH=$(grep -cE 'Criticality:' "$TMP/audit.txt" 2>/dev/null; true)
    fi
    ;;

  *)
    # Stack inconnue : compter les fichiers texte génériques
    LOC_TOTAL=$(count_loc -name "*.*")
    FILE_COUNT=$(count_files -name "*.*")
    ;;
esac

# ============================================================================
# GÉNÉRATION DU JSON
# ============================================================================

# Fonction pour produire un nombre ou null
n() { [ -n "$1" ] && [ "$1" != "" ] && echo "$1" || echo "null"; }

cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "stack": "${STACK}",
  "stacks_detected": [$(printf '"%s",' "${STACKS_DETECTED[@]}" | sed 's/,$//')],
  "metrics": {
    "loc_total": $(n "${LOC_TOTAL}"),
    "file_count": $(n "${FILE_COUNT}"),
    "lint": {
      "ran": ${LINT_RAN},
      "errors": $(n "${LINT_ERRORS}"),
      "warnings": $(n "${LINT_WARNINGS}")
    },
    "tests": {
      "ran": ${TEST_RAN},
      "passing": $(n "${TEST_PASSING}"),
      "total": $(n "${TEST_TOTAL}"),
      "coverage_pct": $([ -n "${COVERAGE_PCT}" ] && echo "${COVERAGE_PCT}" || echo "null")
    },
    "security": {
      "ran": ${AUDIT_RAN},
      "critical": $(n "${VULN_CRITICAL}"),
      "high": $(n "${VULN_HIGH}"),
      "medium": $(n "${VULN_MEDIUM}"),
      "low": $(n "${VULN_LOW}")
    },
    "deps": {
      "ran": ${OUTDATED_RAN},
      "outdated": $(n "${OUTDATED_COUNT}")
    }
  },
  "git": {
    "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "last_commit": "$(git log -1 --format='%H' 2>/dev/null || echo 'none')",
    "last_message": $(git log -1 --format='%s' 2>/dev/null | json_escape || echo '"none"'),
    "uncommitted_files": $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  }
}
EOF

# Archive
cp "${REPORT_FILE}" "${HISTORY_DIR}/${TODAY}.json"

echo "✅ Rapport généré : ${REPORT_FILE}"
echo "📁 Archive : ${HISTORY_DIR}/${TODAY}.json"
echo ""
echo "Résumé :"
echo "  - Stack         : ${STACK}"
echo "  - LOC           : ${LOC_TOTAL}"
echo "  - Fichiers      : ${FILE_COUNT}"
echo "  - Lint          : ${LINT_RAN} (errors=${LINT_ERRORS}, warnings=${LINT_WARNINGS})"
echo "  - Tests         : ${TEST_RAN} (${TEST_PASSING}/${TEST_TOTAL})"
echo "  - Couverture    : ${COVERAGE_PCT:-n/a}%"
echo "  - Vulnérabilités: critical=${VULN_CRITICAL} high=${VULN_HIGH} medium=${VULN_MEDIUM}"
echo "  - Outdated deps : ${OUTDATED_COUNT:-n/a}"
