#!/bin/bash
# PostToolUse hook: Check for anti-patterns after Write/Edit
# Catches patterns that Biome doesn't enforce.
#
# NOTE: The syntactic checks (Radix "use client", hardcoded routes, hardcoded
# colors, raw confirm(), barrel exports, heavy eager imports) have migrated to
# Taskless ast-grep rules in .taskless/rules/ — enforced at pre-commit and CI.
# Only the semantic / absence-based checks that ast-grep can't express well
# remain here.

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
    # Match HTTP-client-like receivers only (axios/api/http/fetchData/etc.) to
    # avoid false positives from URLSearchParams.delete, Set/Map.delete, etc.
    if grep -q "useState" "$FILE_PATH" 2>/dev/null; then
      HAS_SERVICE_CALL=$(grep -nE "await.*Service\.|await.*service\.|\b(axios|api|http|client|fetchData)\.(post|put|patch|delete)\(" "$FILE_PATH" 2>/dev/null || true)
      if [ -n "$HAS_SERVICE_CALL" ] && ! grep -q "useMutation" "$FILE_PATH" 2>/dev/null; then
        ISSUES="${ISSUES}\n- MISSING_MUTATION: useState + direct service/API call without useMutation."
      fi
    fi

    # (Radix "use client" and hardcoded routes migrated to Taskless rules
    #  radix-use-client / no-hardcoded-route.)

    # 5. useRouter/useParams in useEffect deps (single-line and multi-line arrays)
    # Matches both inline deps (useEffect(..., [..., router])) and the closing
    # line of a multi-line dependency array such as `}, [searchTerm, router]);`.
    ROUTER_IN_DEPS=$(grep -nE "useEffect\(.*\[.*\b(router|params|searchParams|pathname)\b|^\s*\},\s*\[[^]]*\b(router|params|searchParams|pathname)\b" "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$ROUTER_IN_DEPS" ]; then
      ISSUES="${ISSUES}\n- ROUTER_IN_DEPS: Destructure router/params to primitives before useEffect deps, or use nuqs useQueryState for URL-synced state."
    fi

    # 5b. URL-synced state mirrored via router.push/replace inside an effect.
    # Flags files that build a URLSearchParams AND call router.push/replace —
    # the issue #1547 anti-pattern. Use nuqs useQueryState instead (see
    # hooks/useProjectFilters.ts) so the URL is the source of truth.
    if grep -qE "new URLSearchParams" "$FILE_PATH" 2>/dev/null &&
      grep -qE "router\.(push|replace)\(" "$FILE_PATH" 2>/dev/null; then
      ISSUES="${ISSUES}\n- URL_SYNC_EFFECT: Mirroring state to the URL with router.push/replace races and cancels Link navigations. Use nuqs useQueryState (hooks/useProjectFilters.ts)."
    fi

    # (Hardcoded colors and raw confirm() migrated to Taskless rules
    #  no-hardcoded-color / no-raw-confirm.)

    # 8. Raw navigator.clipboard instead of useCopyToClipboard
    if grep -q "navigator\.clipboard" "$FILE_PATH" 2>/dev/null; then
      if ! grep -q "useCopyToClipboard" "$FILE_PATH" 2>/dev/null; then
        ISSUES="${ISSUES}\n- RAW_CLIPBOARD: Use useCopyToClipboard hook from hooks/useCopyToClipboard.ts."
      fi
    fi
    ;;
esac

# (Barrel exports and heavy eager imports migrated to Taskless rules
#  no-barrel-export / no-heavy-eager-import.)

if [ -n "$ISSUES" ]; then
  jq -n --arg fp "$FILE_PATH" --arg issues "$ISSUES" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: ("Anti-pattern check found issues in " + $fp + ":" + $issues + "\nPlease fix these before continuing.")}}'
fi

exit 0
