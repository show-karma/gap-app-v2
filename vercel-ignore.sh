#!/bin/bash

# Vercel Ignored Build Step
# This script determines whether Vercel should proceed with a build
# Exit 0 = Skip build, Exit 1 = Proceed with build

echo "Branch: $VERCEL_GIT_COMMIT_REF"

# Skip builds on main branch - these are handled by GitHub Actions
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "Skipping build on main branch - deployed via GitHub Actions"
  exit 0
fi

# Proceed with build for all other branches (PR previews)
echo "Proceeding with preview build"
exit 1
