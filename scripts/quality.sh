#!/usr/bin/env bash
# Full quality gate for telly-web. CI and the pre-commit hook both call this.
# Every gate must pass — fix the code, never the gate.
#   --fast  skips the Playwright acceptance suite (pre-commit); CI runs it all.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAST=0; [ "${1:-}" = "--fast" ] && FAST=1
step() { printf '\n=== %s ===\n' "$1"; }

step "typecheck (tsc -b)"
npx tsc -b
step "lint (eslint, no any, explicit return types)"
npx eslint .
step "format (prettier --check)"
npx prettier --check . >/dev/null
step "file length (<=100 logic lines per src file)"
node scripts/check-file-lines.mjs
step "unit tests + coverage (>=80% lines)"
npx vitest run --coverage --coverage.reporter=text-summary --coverage.reporter=json
step "CRAP (<=15 per function)"
node scripts/crap-check.mjs
step "Halstead difficulty (<=20 per function)"
node scripts/check-halstead.mjs
step "duplication (jscpd, threshold 0)"
npx jscpd src
step "e2e feature coverage mapping"
node scripts/check-feature-coverage.mjs
step "state-machine catalog"
node scripts/check-state-machines.mjs
step "build"
npx vite build
if [ "$FAST" = 0 ]; then
  step "acceptance (Gherkin via Playwright, keyboard only)"
  npx bddgen && npx playwright test
fi
printf '\nAll quality gates passed.\n'
