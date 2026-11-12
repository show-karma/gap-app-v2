#!/bin/bash
#
# Does the change between two commits touch anything that can affect the built
# app? Platform-neutral: the Vercel ignored-build step (vercel-ignore.sh) calls
# it today, and any other deploy pipeline can call it the same way.
#
# Usage: scripts/ci/is-build-affecting.sh <base-sha> <head-sha>
#
# Run from inside the repository. Exit status:
#   0   build — at least one changed path may affect the build, OR the change
#       could not be inspected (missing/unreachable SHA, git error, empty diff)
#   10  skip  — every changed path is inert
#
# It fails OPEN: anything it cannot prove inert is treated as build-affecting,
# so a git hiccup can only cost a build, never skip one that was needed.
#
# "Skip" is a dedicated code rather than 1 on purpose. Callers must skip ONLY
# on exactly 10 and build on anything else, so that a missing script (127), a
# shell error (1, 2) or a kill still builds. Never write `if ! script; then
# skip` — that would turn every one of those failures into a skipped build.
#
# Reading it from a workflow:
#   status=0; scripts/ci/is-build-affecting.sh "$BASE" "$HEAD" || status=$?
#   if [ "$status" -eq 10 ]; then build=false; else build=true; fi

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

BUILD=0
SKIP=10

BASE_SHA="${1:-}"
HEAD_SHA="${2:-}"

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  echo "No base/head commit SHA available - treating the change as build-affecting"
  exit "$BUILD"
fi

if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  echo "Base SHA $BASE_SHA is not reachable (shallow clone?) - treating the change as build-affecting"
  exit "$BUILD"
fi

if ! git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null; then
  echo "Head SHA $HEAD_SHA is not reachable - treating the change as build-affecting"
  exit "$BUILD"
fi

if ! CHANGED_FILES=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" 2>&1); then
  echo "Could not compute diff - treating the change as build-affecting"
  echo "$CHANGED_FILES"
  exit "$BUILD"
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected between $BASE_SHA and $HEAD_SHA - treating the change as build-affecting"
  exit "$BUILD"
fi

echo "Changed files between $BASE_SHA and $HEAD_SHA:"
echo "$CHANGED_FILES"

while IFS= read -r changed_file; do
  [ -z "$changed_file" ] && continue
  if ! is_inert_path "$changed_file"; then
    echo "Build-affecting change detected: $changed_file"
    exit "$BUILD"
  fi
done <<CHANGED
$CHANGED_FILES
CHANGED

echo "All changed files are inert (docs/tests/CI/agent tooling)"
exit "$SKIP"
