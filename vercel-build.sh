#!/bin/bash

# Vercel Build Command
#
# Runs the production build under a hard wall-clock ceiling, once. There is no
# retry: the SIGKILL escalation is carved out of the ceiling rather than added
# on top, so the script cannot outlive it by any path.
#
# Eight minutes is roughly four times what a healthy build needs. On the pinned
# Enhanced machine (8 cores, 16 GB) `pnpm build` takes about two minutes cold.
# Builds that run materially past that are not slow, they are not going to
# finish: peak build memory measures ~7.8 GB, so a machine with 8 GB thrashes
# instead of completing, which is how a 2 minute build became a 15 minute wall
# of nothing when Vercel's elastic selection handed out a standard machine.
# There is no useful build between "finishes in three minutes" and "will never
# finish", so waiting longer only burns billed minutes before delivering the
# same failure.
#
# The script used to retry once with a cleaned .next cache, on the theory that a
# poisoned cache is a failure a second attempt can survive. That is not worth
# what it costs: the retry cannot help either failure we actually observe -- a
# timeout retries slower than the attempt that just ran out of time, and peak
# build memory does not depend on the .next cache -- and it made the ceiling
# meaningless, since a second attempt drew its own full allowance and doubled
# the worst case.
#
# Exit codes are preserved so Vercel still classifies the failure as
# BUILD_UTILS_SPAWN_124 / out_of_memory rather than a generic error. The two are
# not distinguishable from the code alone: `timeout -k` reports 124 when the
# build dies to its SIGTERM, but 137 when the build ignores SIGTERM and has to
# be SIGKILLed after the grace period -- the same 137 the kernel OOM killer
# produces. An earlier version mapped 137 to "ran out of memory"
# unconditionally, which sent a preview-build investigation after a memory
# ceiling that was never the problem: those builds had simply run past the
# deadline. Elapsed time is what separates the two, so that is what is used.

set -u

# Hard ceiling on this script. Nothing below may exceed it.
BUILD_CEILING_SECONDS=480
# Carved out of the ceiling, never added on top.
KILL_GRACE_SECONDS=15

SOFT_DEADLINE_SECONDS=$(( BUILD_CEILING_SECONDS - KILL_GRACE_SECONDS ))

# `timeout 0s` means no limit at all, so a grace period that swallows the whole
# ceiling would silently turn this script into the unbounded build it exists to
# prevent. Fail loudly instead.
if [ "$SOFT_DEADLINE_SECONDS" -le 0 ]; then
  echo "Misconfigured: KILL_GRACE_SECONDS (${KILL_GRACE_SECONDS}s) must be smaller than BUILD_CEILING_SECONDS (${BUILD_CEILING_SECONDS}s)." >&2
  exit 1
fi

# Match production.yml so preview and production share one memory profile.
export NODE_OPTIONS='--max-old-space-size=4096'

# Which machine Vercel assigned decides whether this build fits at all, so
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

# TEMPORARY (P2-6): `--debug-prerender` makes Next print the real server frame
# for each prerender failure instead of the shell component that happened to be
# holding the render. Remove once the failing-route count reaches zero — it
# disables some build optimisations and is only worth its cost while triaging.
NEXT_BUILD_ARGS="--debug-prerender"

SECONDS=0
timeout -k "${KILL_GRACE_SECONDS}s" "${SOFT_DEADLINE_SECONDS}s" pnpm build ${NEXT_BUILD_ARGS}
code=$?
elapsed=$SECONDS

if [ "$code" -eq 0 ]; then
  exit 0
fi

report_ceiling() {
  echo "Build hit the ${BUILD_CEILING_SECONDS}s ceiling (exit ${code}, ${elapsed}s elapsed)."
  echo "A healthy build takes about two minutes. Check the build machine line above -- 8 GB is not enough for this build."
  exit "$code"
}

# Elapsed time is the only reliable signal, because neither exit code is
# exclusively timeout's: `timeout` reports 124 when it kills the build and 137
# when it has to escalate to SIGKILL, but it also passes the build's own exit
# code straight through, and 124 and 137 are values a build can return by
# itself. Reaching the soft deadline is what timeout alone can cause.
if [ "$elapsed" -ge "$SOFT_DEADLINE_SECONDS" ]; then report_ceiling; fi

if [ "$code" -eq 137 ]; then
  echo "Build was killed after ${elapsed}s (exit 137), well short of the ${BUILD_CEILING_SECONDS}s ceiling, so the machine ran out of memory."
  echo "Check the build machine line above -- 8 GB is not enough for this build."
  exit "$code"
fi

echo "Build failed with exit ${code} after ${elapsed}s."
exit "$code"
