# TASK-P2-READINESS — cacheComponents readiness on `8151558d9`

Throwaway local build, reverted. `feat/instant-navigations` @ `8151558d9`
(= `a0822acca` + the import-order fix from TASK-P2-BASELINE). Next 16.3.3, Turbopack.

**Verdict: the shell is ready. 46 of the 53 Cache-class routes already prerender.** The 7 that
do not are exactly the data-backed ones, which is P2-3 stage 2's scope and nothing else.

## Headline numbers

| | prior proof (@ `6f0f5dfd1`) | this build (@ `8151558d9`) |
|---|---:|---:|
| pages attempted | 1477 | **350** |
| paths failing | 161 | **77** |
| paths prerendered | — | **273** |
| distinct error classes | 3 | **1** |

`✓ Compiled successfully in 105s`, TypeScript 89s, then
`> Export encountered errors on 77 paths`. Build exit 1, which is the expected outcome of a
readiness probe, not a failure of the run.

The 4.2× drop in attempted pages is #2097's karma-only `generateStaticParams` — the 8-tenant
cross-product is gone. The drop in failures is #2095 + #2096: **the `new Date()` in a Client
Component class (81 routes) and the `usePathname()` outside `<Suspense>` class (80 routes) have
disappeared entirely.** Every one of the 77 remaining failures is the same single class:

```
Next.js encountered uncached or runtime data during prerendering.
`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()`
accessed outside of <Suspense> …
```

## The 53 Cache-class routes

Cache-class = the `SITEMAP_NO_LOADING` set in `__tests__/app/route-file-structure.test.ts`.
Route groups do not appear in a URL, so each entry was matched to the build's route by
stripping `(...)` segments.

### Failing: 7 of 53 — and all 7 are data-backed

| Route | Loader behind it | Covered by an open PR? |
|---|---|---|
| `projects` | `services/projects-explorer.service.ts` | **#2098** removes the `cookies()` read |
| `funding-map` | `src/features/funding-map/services/funding-programs.service.ts` | **#2098** |
| `community/[communityId]/(with-header)` | `utilities/queries/v2/getCommunityData.ts` | **#2098** |
| `community/[communityId]/(with-header)/funding-opportunities` | the above + the page's own program fetch | **#2098** (loader half) |
| `community/[communityId]/(whitelabel)/programs/[programId]` | funding-programs + the page's own program fetch | **#2098** (loader half) |
| `project/[projectId]/(profile)` | `services/project.service.ts` (+ grants/impacts/updates) | **#2098** |
| `blog/[slug]` | `sanity/lib/gateway.ts`, plus the page's `draftMode()` | **no — outside every open PR** |

### Passing: 46 of 53

All 45 no-data routes prerender clean — the root `""`, `about`, `communities`, `contact`,
`create-project-profile`, `donor-advisors`, `for-agents`, `foundations`, `funders`, `knowledge`
and all 25 knowledge articles, `mcp/connect`, `nonprofits`, the four `nonprofits/find-funders*`
pages, `privacy-policy`, `seeds`, `terms-and-conditions`.

Plus one data-backed route: **`blog` (the index) passes while `blog/[slug]` fails.**

This matches the triage matrix's prediction almost exactly. The matrix said 45 of 53 need no
`"use cache"` at all and 8 do; the build says 46 pass and 7 fail, the one-route difference
being the blog index.

## What P2-3 stage 2 still has to solve

Six of the seven are the loaders #2098 targets. **But #2098 alone will not make them
prerender**, and the report should not be read as saying it will:

- #2098 removes the `cookies()` read (`api.get` defaulting `isAuthorized` to true →
  `TokenManager.getToken()` → `import("next/headers")` → `cookies()`). That is what makes
  `"use cache"` *legal and safe* on these paths — a cached response provably carries no
  `Authorization` header.
- The **uncached `fetch` itself still blocks** the prerender. That needs the `"use cache"` +
  `cacheLife` work, which is #2100 — the PR flagged DO NOT MERGE BEFORE P2-6.

So the sequence for these six is unchanged and both halves are required: #2098 (make caching
safe) → flag flip → #2100 (actually cache). Neither half prerenders them on its own.

`blog/[slug]` is the one that no open PR addresses. Its blocker is not the auth token —
Sanity carries none — it is `draftMode()`, which is request state by definition. That remains
the open product question the matrix already flagged: a separate preview route, or
`instant = false` on a preview-only branch.

## The other 70 failures

| Class | Failing | Notes |
|---:|---|---|
| Stream | 68 | `community/**` 50, `project/**` 12, `nonprofit-research/**` 4, `nonprofits/**` 4. Suspense is free here — this is ordinary P2 per-route work, not a blocker. |
| Block | 2 | `nonprofit-research/shared/[token]`, `nonprofit-research/diligence/[token]` — token routes that are *supposed* to be dynamic. `export const instant = false` is the intended answer, not a fix. |

## An important limitation of this build's stack traces

**The per-route stack traces in this log do not identify the data access.** All 77 report an
identical component stack:

```
at <unknown> (utilities\whitelabel-context.tsx:41:3)     ← WhitelabelProvider's use(value)
at k (components\Utilities\PrivyProviderWrapper.tsx:70:3)
at <unknown> (contexts\privy-bridge-context.tsx:82:39)
at l (components\Utilities\PrivyProviderWrapper.tsx:138:48)
```

That is the outermost component holding the shell, not the cause. `WhitelabelProvider`
deliberately has no Suspense boundary above it (DEV-612 forbids one over crawlable content),
so it is where every render is held — but **46 routes render through that exact same provider
and prerender fine**, which proves it is not itself a blocker. Reading it as the root cause
would be wrong.

Next says so itself in the log: *"Rerun the production build with `next build
--debug-prerender` to generate better stack traces."* That is a second build, so I have not
run it. If you want per-route attribution for the 68 Stream-class routes rather than the
route-level list above, that is the build to authorize.

Eight routes did carry one extra frame beyond the common stack:

- `src/features/donor-research/components/common/donor-research-section-layout.tsx:167` —
  `nonprofit-research/[reportId]`, `personas/[handleId]`, `shared/[token]`, `diligence/[token]`
- `src/features/non-profits/components/non-profits-navbar.tsx:104` —
  `nonprofits/find-funders/{foundations,grants,nonprofits,search}/[id]`

## Method and cleanup

Throwaway patch (`.phase2/readiness-patch.py`): stripped all 23 remaining
`dynamic`/`revalidate`/`runtime`/`fetchCache` segment configs across 14 files, then set
`cacheComponents: true`, `experimental.prerenderEarlyExit: false`, `experimental.cpus: 2`,
`experimental.staticGenerationMaxConcurrency: 2`. Run with
`NODE_OPTIONS=--max-old-space-size=6144` as a freeze guard.

`prerenderEarlyExit: false` was accepted. Next prints it as `⨯ prerenderEarlyExit`, which is
just how `app-info-log.js` renders a boolean experiment set to **false** (`✓` = true, `·` = a
number/string value, `?` + strikethrough = an invalid key). The 77-path list is therefore
complete, not the truncated 5-route list that made pass 2 of the original proof unusable.

**Cleanup, verified:** `git checkout -- .` restored all 23 segment configs and left
`next.config.ts` with no trace of the four throwaway keys; `git status` shows 0 tracked
changes at `8151558d9`; 0 line-ending flips; `.next` removed. No node process from the build
survives (`Get-Process`: 0 started in the last 40 min, 0 above 250 MB, none referencing `t4a`
or `next build`); free memory 11.9 GB.

### One resource note worth keeping

An earlier start of this build was cancelled via `TaskStop`. **That killed the shell but not
the `next build` process tree** — a 7.5 GB `next` process and six turbopack workers were left
orphaned and still growing. I identified them by command line and stopped only that tree with
`Stop-Process`; free memory went from 8.5 GB back to 11.4 GB. A cancelled build here does not
clean up after itself, which is a plausible contributor to the original freeze.

Exactly one build was run to completion, on `8151558d9`, alone on the machine.
