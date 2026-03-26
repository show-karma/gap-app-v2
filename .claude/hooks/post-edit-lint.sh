#!/bin/bash
# PostToolUse hook: Auto-lint files after Write/Edit
# Runs Biome on the edited file and reports errors back to Claude

set -e

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only lint JS/TS/TSX/JSX files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# Resolve to project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Check if file is within gap-app-v2
case "$FILE_PATH" in
  */gap-app-v2/*|gap-app-v2/*)
    # Find gap-app-v2 root
    GAP_APP_DIR=$(echo "$FILE_PATH" | sed 's|\(.*gap-app-v2\)/.*|\1|')
    if [ ! -d "$GAP_APP_DIR" ]; then
      GAP_APP_DIR="$PROJECT_DIR/gap-app-v2"
    fi
    ;;
  *)
    # If we're already inside gap-app-v2
    if [ -f "$PROJECT_DIR/biome.json" ]; then
      GAP_APP_DIR="$PROJECT_DIR"
    else
      exit 0
    fi
    ;;
esac

if [ ! -f "$GAP_APP_DIR/biome.json" ]; then
  exit 0
fi

# Run Biome check (auto-fix mode)
cd "$GAP_APP_DIR"
LINT_OUTPUT=$(npx biome check --write "$FILE_PATH" 2>&1) || LINT_EXIT=$?

if [ "${LINT_EXIT:-0}" -ne 0 ]; then
  # Extract only error lines for concise feedback
  ERRORS=$(echo "$LINT_OUTPUT" | grep -E "^(error|warning|×|✖)" | head -20)

  if [ -n "$ERRORS" ]; then
    jq -n --arg fp "$FILE_PATH" --arg errors "$ERRORS" \
      '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: ("Biome found issues in " + $fp + ":\n" + $errors + "\nPlease fix these lint errors.")}}'
    exit 0
  fi
fi

exit 0
