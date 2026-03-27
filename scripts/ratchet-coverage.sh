#!/usr/bin/env bash
# Coverage ratcheting script
# Reads coverage/coverage-summary.json, compares against .coverage-baseline.json,
# and fails if any metric drops below the baseline.
# On success with --update flag, updates the baseline file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COVERAGE_SUMMARY="$PROJECT_DIR/coverage/coverage-summary.json"
BASELINE_FILE="$PROJECT_DIR/.coverage-baseline.json"
UPDATE_BASELINE=false

usage() {
  echo "Usage: $0 [--update]"
  echo ""
  echo "  --update    Update .coverage-baseline.json on success"
  echo ""
  echo "Compares coverage/coverage-summary.json against .coverage-baseline.json."
  echo "Exits non-zero if any metric (branches, functions, lines, statements) drops."
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --update) UPDATE_BASELINE=true ;;
    --help|-h) usage ;;
    *) echo "Unknown argument: $arg"; usage ;;
  esac
done

# Check that required files exist
if [ ! -f "$COVERAGE_SUMMARY" ]; then
  echo "ERROR: Coverage summary not found at $COVERAGE_SUMMARY"
  echo "Run 'pnpm test:coverage' first to generate coverage data."
  exit 1
fi

if [ ! -f "$BASELINE_FILE" ]; then
  echo "ERROR: Baseline file not found at $BASELINE_FILE"
  echo "Create .coverage-baseline.json with initial thresholds."
  exit 1
fi

# Extract metrics from coverage-summary.json (total section)
# Uses node since jq may not be available everywhere
extract_coverage() {
  node -e "
    const summary = require('$COVERAGE_SUMMARY');
    const total = summary.total;
    if (!total) {
      console.error('ERROR: No \"total\" section in coverage summary');
      process.exit(1);
    }
    console.log(JSON.stringify({
      branches: total.branches ? total.branches.pct : 0,
      functions: total.functions ? total.functions.pct : 0,
      lines: total.lines ? total.lines.pct : 0,
      statements: total.statements ? total.statements.pct : 0
    }));
  "
}

# Read baseline
read_baseline() {
  node -e "
    const baseline = require('$BASELINE_FILE');
    console.log(JSON.stringify(baseline));
  "
}

CURRENT=$(extract_coverage)
BASELINE=$(read_baseline)

if [ -z "$CURRENT" ] || [ -z "$BASELINE" ]; then
  echo "ERROR: Failed to parse coverage or baseline data."
  exit 1
fi

# Compare metrics
FAILED=false
METRICS="branches functions lines statements"

echo "Coverage Ratchet Check"
echo "======================"
echo ""
printf "%-12s  %-10s  %-10s  %s\n" "Metric" "Baseline" "Current" "Status"
printf "%-12s  %-10s  %-10s  %s\n" "------" "--------" "-------" "------"

for metric in $METRICS; do
  baseline_val=$(echo "$BASELINE" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).$metric))")
  current_val=$(echo "$CURRENT" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).$metric))")

  # Compare using node for floating point
  status=$(node -e "
    const current = $current_val;
    const baseline = $baseline_val;
    if (current < baseline) {
      process.stdout.write('FAIL');
    } else if (current > baseline) {
      process.stdout.write('IMPROVED');
    } else {
      process.stdout.write('OK');
    }
  ")

  if [ "$status" = "FAIL" ]; then
    printf "%-12s  %-10s  %-10s  \033[31m%s (dropped by %s%%)\033[0m\n" \
      "$metric" "${baseline_val}%" "${current_val}%" "$status" \
      "$(node -e "process.stdout.write(String(Math.round(($baseline_val - $current_val) * 100) / 100))")"
    FAILED=true
  elif [ "$status" = "IMPROVED" ]; then
    printf "%-12s  %-10s  %-10s  \033[32m%s (+%s%%)\033[0m\n" \
      "$metric" "${baseline_val}%" "${current_val}%" "$status" \
      "$(node -e "process.stdout.write(String(Math.round(($current_val - $baseline_val) * 100) / 100))")"
  else
    printf "%-12s  %-10s  %-10s  %s\n" "$metric" "${baseline_val}%" "${current_val}%" "$status"
  fi
done

echo ""

if [ "$FAILED" = "true" ]; then
  echo "FAILED: Coverage has dropped below baseline. Fix the regression before merging."
  exit 1
fi

echo "PASSED: All coverage metrics meet or exceed the baseline."

if [ "$UPDATE_BASELINE" = "true" ]; then
  echo ""
  echo "Updating baseline..."
  node -e "
    const current = $CURRENT;
    const fs = require('fs');
    fs.writeFileSync('$BASELINE_FILE', JSON.stringify(current, null, 2) + '\n');
  "
  echo "Baseline updated to: $CURRENT"
fi
