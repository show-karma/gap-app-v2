---
name: local-test-runs-freeze-machine
description: "Delegated devs running full vitest suites and next builds concurrently froze the user's Windows machine; cap concurrency, serialize builds, use CI for full suites"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 87410e44-4932-4121-bd51-44daadc31388
  modified: 2026-09-02T14:10:34.011Z
---

On 2026-09-02 the user reported "it froze my computer on the tests": two Maestri teammates (FE Dev Alpha, Frontend Dev #2) were each running the full gap-app-v2 vitest suite (~16k tests, 1,100 files) and `next build` readiness measurements at the same time, in parallel, on the user's own workstation. Even my trivial shell commands were timing out at 30 s during that window.

**Why:** the workstation is the only execution environment for every teammate; vitest defaults to one worker per core and two concurrent Turbopack builds plus the suites saturate CPU and RAM.

**How to apply:** put a resource clause in every teammate brief: never run the full unit suite locally (CI has 6 shards for that) — only touched files with `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 <files>`; at most ONE `next build` on the machine at a time, serialized by the Tech Leader; no local Playwright runs; kill background loops when a turn ends. If shell commands start timing out, assume the box is saturated and stop the devs before doing anything else. Related: [[instant-navigations-initiative]], [[maestri-agent-name-collisions]].

Preferred alternative to local builds: push a draft PR against the integration branch and read GitHub CI / Vercel build logs — they build on remote machines. The P2-6 flag-flip candidate (feat/cache-components-flip) gets its first cacheComponents build signal that way, not locally.

Also: the Vercel MCP tools can hang a teammate's process indefinitely (Frontend Dev #2 stuck 90 min on 'Calling Vercel'; Escape and Ctrl-C via `maestri ask --raw` did not break it). Fix was `maestri recruit <same name> --preset ... --replace <name>` (process restart, notes/connections kept) plus a restart brief file. Tell teammates to read Vercel results via `gh pr checks` / the bot comment / `timeout 120 npx vercel inspect <dpl> --logs`, never the MCP. Watch teammate context size (~490k tokens made it sluggish); restart with a handoff brief rather than letting it grow.
