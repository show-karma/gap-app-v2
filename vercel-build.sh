#!/bin/bash

# Vercel Build Command
#
# Runs the production build and retries ONCE with a cleaned .next cache.
#
# The retry exists for one failure class: a poisoned build cache, where the
# second attempt genuinely can succeed. It is deliberately skipped for the two
# failure classes we actually observe, because for those a retry cannot help and
# only doubles the billed build time:
#
#   timed out       the retry starts from a cleaned .next, so it is slower than
#                   the attempt that just exceeded the limit and times out as
#                   well. One observed deployment burned 30m 18s this way
#                   (900s + 900s) and deployed nothing.
#
#   out of memory   peak build memory does not depend on the .next cache, so the
#                   retry is killed at the same point.
#
# The exit code alone cannot tell those two apart. `timeout -k` reports 124 when
# the build dies to its SIGTERM, but 137 when the build ignores SIGTERM and has
# to be SIGKILLed after the grace period -- the same 137 the kernel OOM killer
# produces. An earlier version of this script mapped 137 to "ran out of memory"
# unconditionally, which sent a preview-build investigation after a memory
# ceiling that was never the problem: those builds had simply run past
# BUILD_TIMEOUT_SECONDS on an undersized build machine. Elapsed time is what
# separates the two, so that is what is used below.
#
# The original exit code is always preserved so Vercel still classifies the
# failure as BUILD_UTILS_SPAWN_124 / out_of_memory rather than a generic error.

set -u

BUILD_TIMEOUT_SECONDS=900
KILL_GRACE_SECONDS=30

# Match production.yml so preview and production share one memory profile.
export NODE_OPTIONS='--max-old-space-size=4096'

# Peak build cost sits close enough to the standard 4-core/8GB machine's ceiling
# that the machine Vercel assigned decides whether the build finishes at all, so
# record it beside the failure rather than leaving the next reader to go dig the
# header line out of the build log. Falls back to "?" rather than erroring on a
# host without nproc or /proc, since this line is diagnostics, not control flow.
report_build_machine() {
  local cores mem_gb
  cores=$(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo "?")
  mem_gb=$(awk '/MemTotal/ {printf "%.1f", $2 / 1048576}' /proc/meminfo 2>/dev/null || echo "?")
  echo "Build machine: ${cores} cores, ${mem_gb} GB"
}

report_build_machine

run_build() {
  timeout -k "${KILL_GRACE_SECONDS}s" "${BUILD_TIMEOUT_SECONDS}s" pnpm build
}

SECONDS=0
run_build
code=$?
elapsed=$SECONDS

if [ "$code" -eq 0 ]; then
  exit 0
fi

report_timeout() {
  echo "Build timed out after ${BUILD_TIMEOUT_SECONDS}s (exit ${code}, ${elapsed}s elapsed)."
  echo "Not retrying: a clean-cache retry is slower than the attempt that just timed out."
  exit "$code"
}

# 124 is timeout's own report. Anything else that survived to the SIGTERM mark
# was ended by the timeout too -- it just needed the SIGKILL escalation, which
# lands KILL_GRACE_SECONDS later and surfaces as 137.
[ "$code" -eq 124 ] && report_timeout
[ "$elapsed" -ge "$BUILD_TIMEOUT_SECONDS" ] && report_timeout

if [ "$code" -eq 137 ]; then
  echo "Build was killed after ${elapsed}s (exit 137), well short of the ${BUILD_TIMEOUT_SECONDS}s timeout, so the machine ran out of memory."
  echo "Not retrying: peak build memory does not depend on the .next cache."
  exit "$code"
fi

echo "Build failed with exit ${code} after ${elapsed}s. Retrying once with a clean .next cache."
rm -rf .next
run_build
