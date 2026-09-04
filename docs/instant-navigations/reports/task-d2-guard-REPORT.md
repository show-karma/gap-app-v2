# TASK-D2-GUARD — draft PR #2113 (Frontend Dev #2, 2026-09-02)

**Draft PR #2113**, `feat/use-cache-auth-guard` → `feat/instant-navigations`, head `d02e24a8c`,
one commit, no trailers. **25 tests pass** (`--pool=forks --maxWorkers=2`), `tsc --noEmit` exit 0,
`biome lint` + `format` clean. No build, no network, nothing left running.

## What it does

Starts from **every `"use cache"` function in the tree**, walks the call graph, and fails on any
reachable `api.*` call that has not provably dropped the token. Not another list of loaders — the
hub failure was three hops down, so a per-loader gate could not have found it by construction.

`ts.createSourceFile` per file with hand-rolled name resolution; no `ts.Program`, so it runs as an
ordinary unit test. It follows local functions, named imports, `export … from`, `cache(fn)`
wrappers and `service.method()` on object literals, and stops at package boundaries rather than
guessing.

## The offender list is one entry, and that is the interesting part

Confirmed exactly what you named:

```
utilities/queries/v2/getCommunityData.cached.ts#getCommunityCategoriesCached
  chain: getCommunityCategoriesCached -> getCommunityCategories -> getCommunityCategoriesOrThrow
  at:    utilities/queries/v2/getCommunityData.ts:180  (no options argument at all)
```

**The first pass reported four more, and all four were false positives.** `getProjectGrantsCached`,
`getProjectImpactsCached`, `getProjectUpdatesCached` and `getProjectSeedCached` reach services that
do `const { isAuthorized = true, signal } = options` then `api.get(url, { isAuthorized, signal })` —
and `services/project.cached.ts` passes `{ isAuthorized: false }` down at every one of those call
sites. The reads are anonymous in fact.

I fixed the analyzer rather than padding the allowlist: the walk now carries "the caller passed a
literal `isAuthorized: false`" and accepts a forwarded `isAuthorized` only under that fact, with
fixtures both ways. Listing safe code as debt would have been the worse outcome — a gate that cries
wolf is a gate people learn to override, which is roughly how the original D2 gate ended up narrow
enough to miss the hub.

Worth noting for corroboration: `project-updates.service.ts:107` is the same line your earlier
frames digest flagged on `project/[projectId]/updates` (`TokenManager.getServerToken`,
warning-level). The static walk found it independently — it is safe *from the cached entry points*
because those pass `isAuthorized: false`; the build frame comes from a different, uncached caller.
Two different questions, same line, and the guard answers only the one it is scoped to.

## Ratchet behaviour

`KNOWN_OFFENDERS` fails in **both** directions: a new offender fails immediately, a fixed one fails
as stale. One entry today. When Alpha lands the fix, the stale check fires until the line is
deleted — which is the intended handoff.

**Green on both trees**, which the base makes non-obvious: `feat/instant-navigations` has zero
`"use cache"` functions (they arrive with the flip), so there is nothing to walk and nothing to be
stale against; the stale check is skipped with a comment saying why. The fixture suite is what keeps
the file meaningful there — a synthetic module graph covering the `cache()` wrapper, service
objects, re-exports, cycles, package boundaries and the per-method options index, none of it
dependent on the checkout.

I added `D2_GUARD_ROOT` so it can be pointed at another tree; that is how the offender list was
produced against the flip head `2d8e25dc0` (extracted with `git archive`, deleted afterwards).

## Two bugs the fixtures caught while writing it

Both would have made the guard quietly useless, which is the failure mode that matters most here:

1. **Concise arrow bodies were skipped.** `const load = async () => api.get("/x")` — the call *is*
   the body, and walking only its children stepped straight past it. Every cross-file case failed
   until fixed.
2. **The forwarding rule above** — without it, four safe loaders read as offenders.

## Scope

Test and tooling only, no application code, no offender fixed — Alpha owns those loaders. Two files:
`__tests__/architecture/use-cache-auth.test.ts` and `__tests__/architecture/use-cache-auth/analyzer.ts`.

One thing I did **not** do: wire this into a CI workflow. It is a vitest test in `__tests__/`, so the
existing test job picks it up automatically — no workflow change needed, unlike #2112's `node --test`
suite.
