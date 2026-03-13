#!/bin/bash
# PreToolUse hook: Run tests before git commit
# Ensures tests pass before allowing commits

set -e

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
case "$COMMAND" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Skip if it's a --no-verify commit (user explicitly opted out)
case "$COMMAND" in
  *"--no-verify"*) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Find gap-app-v2 directory
if [ -d "$PROJECT_DIR/gap-app-v2" ]; then
  GAP_APP_DIR="$PROJECT_DIR/gap-app-v2"
elif [ -f "$PROJECT_DIR/biome.json" ] && grep -q "gap-app-v2" "$PROJECT_DIR/package.json" 2>/dev/null; then
  GAP_APP_DIR="$PROJECT_DIR"
else
  exit 0
fi

cd "$GAP_APP_DIR"

# Run tests with bail (stop on first failure) - only changed files
echo "Running tests before commit..." >&2
TEST_OUTPUT=$(pnpm test --bail --changedSince=HEAD 2>&1) || TEST_EXIT=$?

if [ "${TEST_EXIT:-0}" -ne 0 ]; then
  # Extract failure summary
  FAILURES=$(echo "$TEST_OUTPUT" | grep -A 5 "FAIL\|Tests:.*failed" | head -20)

  echo "Tests failed! Fix failing tests before committing:" >&2
  echo "$FAILURES" >&2
  exit 2
fi

# Tests passed - allow the commit
cat <<HOOKJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "decision": {
      "permissionDecision": "allow",
      "permissionDecisionReason": "All tests passed"
    }
  }
}
HOOKJSON
exit 0
