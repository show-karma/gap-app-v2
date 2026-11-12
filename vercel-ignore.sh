#!/bin/bash

# Vercel Ignored Build Step
# This script determines whether Vercel should proceed with a build
# Exit 0 = Skip build, Exit 1 = Proceed with build
#
# Two skip conditions:
#   1. Pushes to main (deployed via GitHub Actions)
#   2. Pushes that only touch files which cannot affect the built output
#
# Everything else builds. The path check lives in
# scripts/ci/is-build-affecting.sh so other deploy pipelines share one list;
# it fails OPEN, so a git hiccup never costs us a preview.

echo "Branch: $VERCEL_GIT_COMMIT_REF"

# Skip builds on main branch - these are handled by GitHub Actions
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "Skipping build on main branch - deployed via GitHub Actions"
  exit 0
fi

# The shared script exits 10 only when every changed path is inert. Anything
# else -- build-affecting (0), a missing script (127), a shell error -- builds.
status=0
bash "$(dirname "$0")/scripts/ci/is-build-affecting.sh" \
  "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" || status=$?

if [ "$status" -eq 10 ]; then
  echo "All changed files are inert (docs/tests/CI/agent tooling) - skipping build"
  exit 0
fi

echo "Proceeding with preview build"
exit 1
