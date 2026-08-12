#!/bin/bash

# Vercel Build Command
#
# Runs the production build and retries ONCE with a cleaned .next cache.
#
# The retry exists for one failure class: a poisoned build cache, where the
# second attempt genuinely can succeed. It is deliberately skipped for the two
# failure classes we actually observe in production, because for those a retry
# cannot help and only doubles the billed build time:
#
#   exit 124 (timeout)  the retry starts from a cleaned .next, so it is slower
#                       than the attempt that just exceeded the limit and times
#                       out as well. One observed deployment burned 30m 18s
#                       this way (900s + 900s) and deployed nothing.
#
#   exit 137 (OOM)      peak build memory does not depend on the .next cache,
#                       so the retry is killed at the same point.
#
# The original exit code is always preserved so Vercel still classifies the
# failure as BUILD_UTILS_SPAWN_124 / out_of_memory rather than a generic error.

set -u

BUILD_TIMEOUT="900s"
KILL_GRACE="30s"

# Match production.yml so preview and production share one memory profile.
export NODE_OPTIONS='--max-old-space-size=4096'

run_build() {
  timeout -k "$KILL_GRACE" "$BUILD_TIMEOUT" pnpm build
}

run_build
code=$?

if [ "$code" -eq 0 ]; then
  exit 0
fi

case "$code" in
  124)
    echo "Build timed out after ${BUILD_TIMEOUT} (exit 124)."
    echo "Not retrying: a clean-cache retry is slower than the attempt that just timed out."
    exit "$code"
    ;;
  137)
    echo "Build ran out of memory (exit 137)."
    echo "Not retrying: peak build memory does not depend on the .next cache."
    exit "$code"
    ;;
esac

echo "Build failed with exit ${code}. Retrying once with a clean .next cache."
rm -rf .next
run_build
