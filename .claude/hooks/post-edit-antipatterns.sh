#!/bin/bash
# PostToolUse hook: Check for anti-patterns after Write/Edit
# Catches patterns that Biome doesn't enforce

set -e

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Skip test files and non-TS/TSX
case "$FILE_PATH" in
  *__tests__*|*.test.*|*.spec.*|*cypress*|*__mocks__*) exit 0 ;;
esac

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

ISSUES=""

# === Checks for TSX files (React components) ===
case "$FILE_PATH" in
  *.tsx)
    # 1. return null in data-fetching components
    if grep -q "useQuery\|useSuspenseQuery\|useFetch" "$FILE_PATH" 2>/dev/null; then
      RETURN_NULL=$(grep -n "return null" "$FILE_PATH" 2>/dev/null || true)
      if [ -n "$RETURN_NULL" ]; then
        ISSUES="${ISSUES}\n- RETURN_NULL: Data component returns null (L:$(echo "$RETURN_NULL" | awk -F: '{print $1}' | tr '\n' ',')). Show error/empty state."
      fi
    fi

    # 2. useState + direct service call without useMutation
    if grep -q "useState" "$FILE_PATH" 2>/dev/null; then
      HAS_SERVICE_CALL=$(grep -n "await.*Service\.\|await.*service\.\|\.post(\|\.put(\|\.patch(\|\.delete(" "$FILE_PATH" 2>/dev/null || true)
      HAS_MUTATION=$(grep -c "useMutation" "$FILE_PATH" 2>/dev/null || echo "0")
      if [ -n "$HAS_SERVICE_CALL" ] && [ "$HAS_MUTATION" -eq 0 ]; then
        ISSUES="${ISSUES}\n- MISSING_MUTATION: useState + direct service/API call without useMutation."
      fi
    fi

    # 3. Radix imports without "use client"
    if grep -q "@radix-ui" "$FILE_PATH" 2>/dev/null; then
      if ! head -5 "$FILE_PATH" | grep -q '"use client"' 2>/dev/null; then
        ISSUES="${ISSUES}\n- MISSING_USE_CLIENT: Radix UI import without \"use client\" directive."
      fi
    fi

    # 4. Hardcoded route strings
    HARDCODED_ROUTES=$(grep -nE "href=[\"']/[a-z]|push\([\"']/[a-z]|replace\([\"']/[a-z]" "$FILE_PATH" 2>/dev/null | grep -v "http" | grep -v "PAGES" | head -5 || true)
    if [ -n "$HARDCODED_ROUTES" ]; then
      ISSUES="${ISSUES}\n- HARDCODED_ROUTES: Use PAGES constants from utilities/pages.ts."
    fi

    # 5. useRouter/useParams in useEffect deps
    ROUTER_IN_DEPS=$(grep -nE "useEffect\(.*\[.*router|useEffect\(.*\[.*params" "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$ROUTER_IN_DEPS" ]; then
      ISSUES="${ISSUES}\n- ROUTER_IN_DEPS: Destructure router/params to primitives before useEffect deps."
    fi

    # 6. Hardcoded colors
    HARDCODED_COLORS=$(grep -nE "style=.*#[0-9a-fA-F]{3,8}|className=.*#[0-9a-fA-F]{3,8}|color:[[:space:]]*[\"']#" "$FILE_PATH" 2>/dev/null | head -3 || true)
    if [ -n "$HARDCODED_COLORS" ]; then
      ISSUES="${ISSUES}\n- HARDCODED_COLORS: Use Tailwind theme classes or CSS variables."
    fi

    # 7. Raw confirm() instead of DeleteDialog
    if grep -qE "\bconfirm\(" "$FILE_PATH" 2>/dev/null; then
      ISSUES="${ISSUES}\n- RAW_CONFIRM: Use <DeleteDialog> from components/DeleteDialog.tsx instead of confirm()."
    fi

    # 8. Raw navigator.clipboard instead of useCopyToClipboard
    if grep -q "navigator\.clipboard" "$FILE_PATH" 2>/dev/null; then
      if ! grep -q "useCopyToClipboard" "$FILE_PATH" 2>/dev/null; then
        ISSUES="${ISSUES}\n- RAW_CLIPBOARD: Use useCopyToClipboard hook from hooks/useCopyToClipboard.ts."
      fi
    fi
    ;;
esac

# === Checks for all TS/TSX files ===
case "$FILE_PATH" in
  *.ts|*.tsx)
    # 9. New barrel exports (index.ts creating re-exports)
    if [ "$(basename "$FILE_PATH")" = "index.ts" ] || [ "$(basename "$FILE_PATH")" = "index.tsx" ]; then
      EXPORT_STAR=$(grep -c "export \*" "$FILE_PATH" 2>/dev/null || echo "0")
      if [ "$EXPORT_STAR" -gt 0 ]; then
        ISSUES="${ISSUES}\n- BARREL_EXPORT: Don't create barrel exports (export * from). Import directly from source files."
      fi
    fi

    # 10. Heavy library eager imports (should be dynamic/lazy)
    HEAVY_IMPORTS=$(grep -nE "^import.*from [\"']((@uiw|@streamdown|recharts|chart\.js|react-chartjs|d3|mermaid|katex|react-pdf|@monaco-editor|monaco-editor|react-quill|draft-js|slate-react|react-markdown|@codemirror))" "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$HEAVY_IMPORTS" ]; then
      ISSUES="${ISSUES}\n- HEAVY_IMPORT: Heavy library imported eagerly. Use dynamic() or lazy import()."
    fi
    ;;
esac

if [ -n "$ISSUES" ]; then
  cat <<HOOKJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Anti-pattern check found issues in $FILE_PATH:$ISSUES\nPlease fix these before continuing."
  }
}
HOOKJSON
fi

exit 0
