#!/usr/bin/env bash
# Check test file sizes
# Warns on files > 500 lines, errors on files > 800 lines.
# Exit code 1 if any file exceeds the error threshold.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WARN_THRESHOLD=500
ERROR_THRESHOLD=800

warnings=0
errors=0
total=0

echo "Test File Size Check"
echo "===================="
echo ""
echo "Warn threshold:  ${WARN_THRESHOLD} lines"
echo "Error threshold: ${ERROR_THRESHOLD} lines"
echo ""

# Find all test files, excluding node_modules and .next
while IFS= read -r file; do
  total=$((total + 1))
  lines=$(wc -l < "$file")
  relative=$(echo "$file" | sed "s|^$PROJECT_DIR/||")

  if [ "$lines" -gt "$ERROR_THRESHOLD" ]; then
    printf "\033[31mERROR\033[0m  %6d lines  %s\n" "$lines" "$relative"
    errors=$((errors + 1))
  elif [ "$lines" -gt "$WARN_THRESHOLD" ]; then
    printf "\033[33mWARN \033[0m  %6d lines  %s\n" "$lines" "$relative"
    warnings=$((warnings + 1))
  fi
done < <(find "$PROJECT_DIR" \
  -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  | sort)

echo ""
echo "Summary"
echo "-------"
echo "Total test files: $total"
echo "Warnings (>${WARN_THRESHOLD} lines): $warnings"
echo "Errors (>${ERROR_THRESHOLD} lines): $errors"

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors test file(s) exceed ${ERROR_THRESHOLD} lines."
  echo "Split large test files into focused modules for better maintainability."
  exit 1
fi

if [ "$warnings" -gt 0 ]; then
  echo ""
  echo "PASSED with warnings: $warnings file(s) approaching the size limit."
  echo "Consider splitting these files proactively."
fi

if [ "$warnings" -eq 0 ] && [ "$errors" -eq 0 ]; then
  echo ""
  echo "PASSED: All test files are within size limits."
fi

exit 0
