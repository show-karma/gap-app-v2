#!/bin/bash
# Mock boundary checker for gap-app-v2
#
# Prevents tests from directly mocking low-level data utilities (fetchData, indexer).
# Tests should mock at the service layer or use MSW handlers instead.
#
# Usage: ./scripts/check-mock-boundaries.sh
# Exit code: 0 = clean, 1 = violations found

set -e

VIOLATIONS=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Mock boundary check"
echo "================================"
echo "Rule: Do not vi.mock fetchData or indexer in test files."
echo "       Mock at the service layer or use MSW instead."
echo ""

# Allowed exceptions:
#   - fetchData's own unit test
#   - indexer's own unit test
#   - indexer-notification's own unit test
EXCLUDE_PATTERNS=(
  "__tests__/unit/utilities/fetchData.test"
  "utilities/fetchData.test"
  "utilities/__tests__/fetchData.test"
  "__tests__/unit/utilities/indexer.test"
  "utilities/indexer.test"
  "utilities/__tests__/indexer.test"
  "utilities/__tests__/indexer-notification.test"
  "__tests__/unit/utilities/indexer-notification.test"
)

is_excluded() {
  local file="$1"
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    if [[ "$file" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# Search for vi.mock calls targeting fetchData or indexer
while IFS= read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  content=$(echo "$line" | cut -d: -f3-)

  # Make path relative for readability
  rel_file="${file#$ROOT/}"

  if is_excluded "$rel_file"; then
    continue
  fi

  echo "  VIOLATION: $rel_file:$lineno"
  echo "    $content"
  VIOLATIONS=$((VIOLATIONS + 1))
done < <(grep -rn --include='*.test.ts' --include='*.test.tsx' --include='*.spec.ts' --include='*.spec.tsx' \
  -E 'vi\.mock\(["\x27]@/utilities/(fetchData|indexer)["\x27]' "$ROOT" 2>/dev/null || true)

echo ""
echo "================================"
if [ $VIOLATIONS -gt 0 ]; then
  echo "Found $VIOLATIONS mock boundary violation(s)."
  echo ""
  echo "Instead of mocking fetchData/indexer directly, either:"
  echo "  1. Mock the service function that calls fetchData"
  echo "  2. Use MSW to intercept HTTP requests"
  echo "  3. Use dependency injection in the service layer"
  exit 1
else
  echo "No mock boundary violations found."
  exit 0
fi
