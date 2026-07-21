#!/bin/bash
# Anti-pattern checker for gap-app-v2
# Usage: ./scripts/check-anti-patterns.sh [file-or-directory]
# Without args, checks all TS/TSX files in the project

set -e

TARGET="${1:-.}"
ISSUES=0

check_file() {
  local FILE="$1"

  case "$FILE" in
    *__tests__*|*.test.*|*.spec.*|*cypress*|*__mocks__*|*node_modules*|*.next*) return ;;
  esac

  local FILE_ISSUES=""

  # === TSX-only checks ===
  case "$FILE" in
    *.tsx)
      # return null in data-fetching components
      if grep -q "useQuery\|useSuspenseQuery" "$FILE" 2>/dev/null; then
        LINES=$(grep -n "return null" "$FILE" 2>/dev/null | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//' || true)
        if [ -n "$LINES" ]; then
          FILE_ISSUES="${FILE_ISSUES}\n  [RETURN_NULL] L:${LINES} - Data component returns null"
          ISSUES=$((ISSUES + 1))
        fi
      fi

      # Radix import without "use client"
      if grep -q "@radix-ui" "$FILE" 2>/dev/null; then
        if ! head -5 "$FILE" | grep -q '"use client"' 2>/dev/null; then
          FILE_ISSUES="${FILE_ISSUES}\n  [USE_CLIENT] Radix UI import without \"use client\""
          ISSUES=$((ISSUES + 1))
        fi
      fi

      # useState + service call without useMutation
      if grep -q "useState" "$FILE" 2>/dev/null; then
        if grep -qE "await.*Service\.|\.post\(|\.put\(|\.patch\(|\.delete\(" "$FILE" 2>/dev/null; then
          if ! grep -q "useMutation" "$FILE" 2>/dev/null; then
            FILE_ISSUES="${FILE_ISSUES}\n  [MUTATION] useState + service call without useMutation"
            ISSUES=$((ISSUES + 1))
          fi
        fi
      fi

      # Hardcoded route strings
      ROUTE_LINES=$(grep -nE 'href="\/[a-z]|push\("\/[a-z]|replace\("\/[a-z]' "$FILE" 2>/dev/null | grep -v "http" | grep -v "PAGES" | head -3 || true)
      if [ -n "$ROUTE_LINES" ]; then
        LINES=$(echo "$ROUTE_LINES" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [ROUTES] L:${LINES} - Hardcoded routes (use PAGES constants)"
        ISSUES=$((ISSUES + 1))
      fi

      # Raw confirm() instead of DeleteDialog
      CONFIRM_LINES=$(grep -n "\bconfirm(" "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$CONFIRM_LINES" ]; then
        LINES=$(echo "$CONFIRM_LINES" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [CONFIRM] L:${LINES} - Use <DeleteDialog> not confirm()"
        ISSUES=$((ISSUES + 1))
      fi

      # Raw navigator.clipboard without useCopyToClipboard
      if grep -q "navigator\.clipboard" "$FILE" 2>/dev/null; then
        if ! grep -q "useCopyToClipboard" "$FILE" 2>/dev/null; then
          FILE_ISSUES="${FILE_ISSUES}\n  [CLIPBOARD] Use useCopyToClipboard hook"
          ISSUES=$((ISSUES + 1))
        fi
      fi

      # Missing loading/error for pages
      if [ "$(basename "$FILE")" = "page.tsx" ]; then
        DIR=$(dirname "$FILE")
        if [ ! -f "$DIR/loading.tsx" ]; then
          FILE_ISSUES="${FILE_ISSUES}\n  [LOADING] Missing loading.tsx"
          ISSUES=$((ISSUES + 1))
        fi
        if [ ! -f "$DIR/error.tsx" ]; then
          FILE_ISSUES="${FILE_ISSUES}\n  [ERROR] Missing error.tsx"
          ISSUES=$((ISSUES + 1))
        fi
      fi
      ;;
  esac

  # === All TS/TSX checks ===
  case "$FILE" in
    *.ts|*.tsx)
      # Barrel exports
      if [ "$(basename "$FILE")" = "index.ts" ] || [ "$(basename "$FILE")" = "index.tsx" ]; then
        EXPORT_STAR=$(grep -c "export \*" "$FILE" 2>/dev/null || echo "0")
        if [ "$EXPORT_STAR" -gt 0 ]; then
          FILE_ISSUES="${FILE_ISSUES}\n  [BARREL] Barrel export (export *) - import from source files directly"
          ISSUES=$((ISSUES + 1))
        fi
      fi

      # Heavy library eager imports
      HEAVY=$(grep -nE "^import.*from [\"']((@uiw|@streamdown|recharts|chart\.js|react-chartjs|d3|mermaid|katex|react-pdf|@monaco-editor|monaco-editor|react-quill|draft-js|slate-react|react-markdown|@codemirror))" "$FILE" 2>/dev/null || true)
      if [ -n "$HEAVY" ]; then
        LINES=$(echo "$HEAVY" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [HEAVY_IMPORT] L:${LINES} - Use dynamic() or lazy import()"
        ISSUES=$((ISSUES + 1))
      fi

      # console.log/debug
      CONSOLE_LINES=$(grep -n "console\.log\|console\.debug" "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$CONSOLE_LINES" ]; then
        LINES=$(echo "$CONSOLE_LINES" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [CONSOLE] L:${LINES} - console.log/debug"
        ISSUES=$((ISSUES + 1))
      fi

      # Hardcoded colors
      COLOR_LINES=$(grep -nE 'style=.*#[0-9a-fA-F]{3,8}|color:\s*"#' "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$COLOR_LINES" ]; then
        LINES=$(echo "$COLOR_LINES" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [COLORS] L:${LINES} - Hardcoded color values"
        ISSUES=$((ISSUES + 1))
      fi

      # Empty catch block with no Sentry/logger/suppression comment
      # Matches `catch (...) {}` or `catch {}` where the body has no `Sentry`, no `logger`, no `console`, and no `// SUPPRESSED:` justification
      EMPTY_CATCH=$(awk '
        /catch[[:space:]]*(\(|\{)/ {
          # Look at next ~3 lines for a non-empty body containing Sentry/logger/console/SUPPRESSED
          start = NR
          line = $0
          # Single-line catch (...) {} or catch {}
          if (match(line, /catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}/)) {
            print start
            next
          }
          # Multi-line: peek up to 5 lines for content
          body = ""
          for (i = 1; i <= 5 && (getline next_line) > 0; i++) {
            body = body next_line
            if (match(next_line, /\}/)) break
          }
          if (body !~ /Sentry|logger|console|SUPPRESSED|throw|return/) {
            print start
          }
        }
      ' "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$EMPTY_CATCH" ]; then
        LINES=$(echo "$EMPTY_CATCH" | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [EMPTY_CATCH] L:${LINES} - Empty catch swallows errors. Add Sentry.captureException, logger.warn, throw, or // SUPPRESSED: <reason>"
        ISSUES=$((ISSUES + 1))
      fi

      # Structural cast on optional method — e.g. `as { findByIdAny?: (...) => ... }` or `as unknown as { foo?: ... }`
      # This is the "duck-type a method that may not exist" pattern. Add the method to the interface instead.
      STRUCT_CAST=$(grep -nE 'as[[:space:]]+(unknown[[:space:]]+as[[:space:]]+)?\{[^}]*\?[[:space:]]*:[[:space:]]*\(' "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$STRUCT_CAST" ]; then
        LINES=$(echo "$STRUCT_CAST" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [STRUCT_CAST] L:${LINES} - Structural cast on optional method. Add the method to the interface, don't duck-type."
        ISSUES=$((ISSUES + 1))
      fi

      # Underscore-prefixed export — usually a hack to silence an unused-import warning
      UNDER_EXPORT=$(grep -nE '^export[[:space:]]+(const|let|var|function|type|interface|class)[[:space:]]+_[A-Za-z]' "$FILE" 2>/dev/null | head -3 || true)
      if [ -n "$UNDER_EXPORT" ]; then
        LINES=$(echo "$UNDER_EXPORT" | awk -F: '{print $1}' | tr '\n' ',' | sed 's/,$//')
        FILE_ISSUES="${FILE_ISSUES}\n  [UNDER_EXPORT] L:${LINES} - Underscore-prefixed export. If the import is unused, remove it; don't leak _SYMBOL as a public API."
        ISSUES=$((ISSUES + 1))
      fi
      ;;
  esac

  if [ -n "$FILE_ISSUES" ]; then
    echo -e "\n$FILE:$FILE_ISSUES"
  fi
}

echo "Anti-pattern check: $TARGET"
echo "================================"

if [ -f "$TARGET" ]; then
  check_file "$TARGET"
elif [ -d "$TARGET" ]; then
  while IFS= read -r -d '' FILE; do
    check_file "$FILE"
  done < <(find "$TARGET" -type f \( -name "*.tsx" -o -name "*.ts" \) -not -path "*/node_modules/*" -not -path "*/.next/*" -print0)
fi

echo ""
echo "================================"
if [ $ISSUES -gt 0 ]; then
  echo "Found $ISSUES issue(s)."
  exit 1
else
  echo "No issues found."
  exit 0
fi
