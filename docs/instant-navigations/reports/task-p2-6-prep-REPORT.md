# TASK-P2-6-PREP — Report (Frontend Dev #2, 2026-09-02)

Branch prepared and committed **locally only**. No push, no PR, no build, no suite.
`tsc --noEmit -p tsconfig.json` → **exit 0** (80.8 s), plus one negative check. Nothing of mine
is still running.

---

## Branch state

```
feat/cache-components-flip   29d6e195c  feat(routing): enable cacheComponents and partialPrefetching
                             70bb6d2e7  refactor(routing): cache the JSON discovery handlers with use cache   <- #2100 head
                             df3e47e3b  refactor(routing): replace the segment configs cacheComponents rejects
```

Not on the remote. Working tree clean. One commit, no trailers.

### Read this before anything else: the base is stale

**#2100's head is not an ancestor of `feat/instant-navigations`.** Stacking on it, as instructed,
puts this branch behind the integration branch by four merges:

```
8151558d9 style(donor-research): fix the import order biome's assist reports
a0822acca Merge PR #2097  (segment configs)      <- 2100 carries #2097's own commit, so no loss here
9c6e4519c Merge PR #2096  (chrome route groups)  <- MISSING
e9ad0aa32 Merge PR #2095  (global chrome + branded 404) <- MISSING
```

Two consequences you should decide on before this becomes a PR:

1. **`experimental.globalNotFound` does not exist on this branch, so there was nothing to keep.**
   It arrives with #2095 — `git show origin/feat/instant-navigations:next.config.ts` has it at
   line 75 with a comment saying the flag still exists in 16.3.3 and defaults to false. **I did
   not add it**, because adding a flag that turns on a `app/global-not-found.tsx` this branch
   does not contain would be inventing state. When #2095 merges in, that entry comes with it and
   my `cacheComponents` / `partialPrefetching` lines sit above it untouched.
2. **Every file #2096 moved will conflict.** On this branch the routes are
   `app/t/[tenant]/blog/page.tsx`; on the integration branch they are
   `app/t/[tenant]/(chrome)/blog/page.tsx`. Four of my eleven touched files are in that set.
   Recommend rebasing **#2100** onto the integration head and then rebasing this branch, before
   the flip PR opens — otherwise Alpha resolves the same rename conflicts twice.

### The "23 remaining segment configs" number is stale

The readiness report's list was measured before #2097 and #2100 landed. On this branch **four**
rejected exports remained, not 23, and all four are now gone:

| File | Export |
|---|---|
| `app/t/[tenant]/layout.tsx` | `dynamic = "force-dynamic"` |
| `app/t/[tenant]/blog/page.tsx` | `revalidate = 60` |
| `app/t/[tenant]/blog/[slug]/page.tsx` | `revalidate = 60` |
| `app/t/[tenant]/project/[projectId]/layout.tsx` | `revalidate = 60` |

`grep -rnE "^export const (dynamic|revalidate|runtime|fetchCache|dynamicParams)" app/` now
returns **nothing**. The rest of the readiness list — the eight `.well-known` handlers,
`openapi.json`, the five sitemap routes, `sitemaps/static/sitemap.ts`, the two
`nonprofit-research` token pages, and the two `runtime` exports on `api/metadata/knowledge` and
`api/scanner/og/[slug]` — was already converted by #2097/#2100, each replaced with either
`connection()` or `"use cache"` + `cacheLife`, with a comment naming what it replaced.

**Seven `maxDuration` exports are deliberately untouched** (the five sitemap routes,
`api/cron/warm-sitemaps`, and the whitelabel program page). `maxDuration` never appeared in the
readiness build's own error list, which covered only `dynamic` / `revalidate` / `runtime`, and it
is a valid key in 16.3.3's segment-config schema. Flag if you want them removed anyway.

---

## Diff summary — 11 files, +87 / −28

```
 next.config.ts                                              | 18 +++++-
 app/t/[tenant]/layout.tsx                                   | 21 +++-----
 app/t/[tenant]/blog/page.tsx                                | 11 ++--
 app/t/[tenant]/blog/[slug]/page.tsx                         |  9 +--
 app/t/[tenant]/project/[projectId]/layout.tsx               |  8 ++-
 app/t/[tenant]/oauth/consent/page.tsx                       |  5 ++
 app/t/[tenant]/auth/token-bridge/page.tsx                   |  7 ++
 app/t/[tenant]/s/[slug]/page.tsx                            |  6 ++
 app/t/[tenant]/nonprofit-research/shared/[token]/page.tsx   | 12 ++--
 app/t/[tenant]/nonprofit-research/diligence/[token]/page.tsx| 12 ++--
 app/t/[tenant]/community/[communityId]/manage/payouts/page.tsx| 6 ++
```

### 1. `next.config.ts`

```diff
+  cacheComponents: true,
+  partialPrefetching: true,
   experimental: {
-    useCache: true,
```

Both are **top-level** options in 16.3.3, not experimental — verified against the installed
`config-shared.d.ts` (`cacheComponents?: boolean` at 1538, `partialPrefetching?: boolean |
'unstable_eager'` at 1553). `experimental.cacheComponents` and `experimental.useCache` are both
marked `@deprecated use top-level cacheComponents instead`.

**On removing `experimental.useCache` — verified in `server/config.js:1220-1236`, not assumed.**
Removing it (undefined) is the intended path: the option is backfilled from `cacheComponents` and,
when both are set, Next logs `warnOnce("no longer needed … You can remove it")`. Removing is not
the same as disabling — an explicit `useCache: false` alongside `cacheComponents` throws **E1465**.
The type still declares the property (deprecated, not deleted), so removal is type-safe either way.

### 2. The four segment configs

`force-dynamic` on the root layout is deleted outright rather than migrated. Its own comment said
Phase 2 would delete it "one segment at a time"; `cacheComponents` replaces the question it was
holding open, so nothing takes its place — a route that must stay dynamic now says so itself with
`connection()` or an uncached read. The stale comment about `headers()` went with it.

The three `revalidate = 60` exports were real caching, so each leaves a **`TODO(P2-3 stage 2)`**
naming the loader that has to carry it, for Alpha:

| File | TODO points at |
|---|---|
| `blog/page.tsx` | `getPublishedPosts()` in `sanity/lib/gateway.ts` — `"use cache"` + `cacheLife` (60s) + a `cacheTag` the M4 webhook invalidates |
| `blog/[slug]/page.tsx` | the post loader in `sanity/lib/gateway.ts`, per-slug `cacheTag` |
| `project/[projectId]/layout.tsx` | `services/project.service.ts`, project-grants, project-impacts, project-updates, tagged per project |

Each TODO states the interim behaviour plainly: **those pages now render per request — correct,
but uncached** — so nobody reads the flip as having preserved the ISR ceiling.

### 3. `export const instant = false` — six routes

`oauth/consent`, `auth/token-bridge`, `s/[slug]`, `nonprofit-research/shared/[token]`,
`nonprofit-research/diligence/[token]`, and `community/[communityId]/manage/payouts`.

**The phase-2 queue asked whether this export is inert with the flags off. It is not.**
`build/analysis/get-page-static-info.js:501` throws
`Route "…" cannot use \`export const instant = ...\` without enabling \`cacheComponents\`.`
That is why the flip is one commit and cannot be split — and #2097 had already reached the same
conclusion: both token pages carried a comment saying the marker "is a hard build error until
cacheComponents is on, so it lands with the flag in P2-6". Those comments are updated to point at
the export instead of promising it.

Semantics, from the schema: `instant?: Instant` where `Instant = InstantConfig | true | false`,
documented as "How this segment should be prefetched" — `false` opts the segment out, which is
what a capability/token route needs, since the token in the URL is the authorization and the
server has to see the request.

---

## Validation

- **`tsc --noEmit -p tsconfig.json` → exit 0**, 80.8 s, whole repo.
- **Negative check, because a passing typecheck proves nothing unless it can fail.**
  `next.config.ts` declares `const nextConfig: NextConfig = { … }`, so excess-property checking is
  live on the literal. Injecting `cacheComponentsTypo: true` gives
  `next.config.ts(83,3): error TS2561: Object literal may only specify known properties,
  but 'cacheComponentsTypo' does not exist in type 'NextConfig'. Did you mean to write
  'cacheComponents'?` — which both proves the gate bites and confirms `cacheComponents` is a known
  top-level key in 16.3.3. Reverted.
- `biome lint` on all 11 touched files — clean.
- CRLF blobs preserved on every touched file (each was read, edited on LF, written back as CRLF).

## What I did not do

No build, no suite, no push, no PR — per instruction. So **nothing here proves the app builds
with the flags on.** The readiness proof said 161 routes fail to prerender, with
`src/components/footer/footer.tsx:54` (`new Date()`) alone accounting for 79 of them; none of
that work is in this branch, and #2095/#2096 — which this branch is missing — are where the shell
fixes live. Expect the first build on this branch to fail loudly, and expect it to fail less once
it is rebased onto the integration head.

Alpha owns P2-3 stage 2 on top of this. The three TODOs are addressed to that work by name.
