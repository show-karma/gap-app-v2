#!/bin/bash

# Vercel Ignored Build Step
# This script determines whether Vercel should proceed with a build
# Exit 0 = Skip build, Exit 1 = Proceed with build
#
# Two skip conditions:
#   1. Pushes to main (deployed via GitHub Actions)
#   2. Pushes that only touch files which cannot affect the built output
#
# Everything else builds. Any error while inspecting the diff fails OPEN
# (exit 1 / build), so we never miss a preview because of a git hiccup.

echo "Branch: $VERCEL_GIT_COMMIT_REF"

# Skip builds on main branch - these are handled by GitHub Actions
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "Skipping build on main branch - deployed via GitHub Actions"
  exit 0
fi

# --- Path-based skip -------------------------------------------------------
#
# Paths that are inert with respect to the Next.js build. Anything not matched
# here is treated as build-affecting.
#
#   docs/                      documentation only
#   .github/                   CI workflows and templates
#   .claude/ .agents/          agent tooling
#   __tests__/ e2e/            test suites
#   *.test.* *.spec.*          co-located tests anywhere
#   *.md                       markdown anywhere EXCEPT public/, which is
#                              served verbatim (public/pricing.md, agents.md)
is_inert_path() {
  case "$1" in
    public/*) return 1 ;;
    docs/* | .github/* | .claude/* | .agents/* | __tests__/* | e2e/*) return 0 ;;
    *.md) return 0 ;;
    *.test.* | *.spec.*) return 0 ;;
    *) return 1 ;;
  esac
}

PREVIOUS_SHA="$VERCEL_GIT_PREVIOUS_SHA"
CURRENT_SHA="$VERCEL_GIT_COMMIT_SHA"

if [ -z "$PREVIOUS_SHA" ] || [ -z "$CURRENT_SHA" ]; then
  echo "No previous/current commit SHA available - proceeding with build"
  exit 1
fi

if ! git cat-file -e "${PREVIOUS_SHA}^{commit}" 2>/dev/null; then
  echo "Previous SHA $PREVIOUS_SHA is not reachable (shallow clone?) - proceeding with build"
  exit 1
fi

if ! git cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null; then
  echo "Current SHA $CURRENT_SHA is not reachable - proceeding with build"
  exit 1
fi

if ! CHANGED_FILES=$(git diff --name-only "$PREVIOUS_SHA" "$CURRENT_SHA" 2>&1); then
  echo "Could not compute diff - proceeding with build"
  echo "$CHANGED_FILES"
  exit 1
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected between $PREVIOUS_SHA and $CURRENT_SHA - proceeding with build"
  exit 1
fi

echo "Changed files between $PREVIOUS_SHA and $CURRENT_SHA:"
echo "$CHANGED_FILES"

while IFS= read -r changed_file; do
  [ -z "$changed_file" ] && continue
  if ! is_inert_path "$changed_file"; then
    echo "Build-affecting change detected: $changed_file"
    echo "Proceeding with preview build"
    exit 1
  fi
done <<EOF
$CHANGED_FILES
EOF

echo "All changed files are inert (docs/tests/CI/agent tooling) - skipping build"
exit 0
