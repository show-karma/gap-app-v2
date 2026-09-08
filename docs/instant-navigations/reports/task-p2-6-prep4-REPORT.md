# TASK-P2-6-PREP4 — the full failing-route list (Frontend Dev #2, 2026-09-02)

Branch `feat/cache-components-flip` @ **`822afcb7d`**. `tsc --noEmit` exit 0, `biome lint` clean.
Remote build only; no local build at any point.

Build `dpl_DgBpxALZ8mucgnxoKyqpiAnwmySs` — <https://vercel.com/karma-devs/gap-app-v2/DgBpxALZ8mucgnxoKyqpiAnwmySs>

---

## Headline

**The shell is fixed. 86 of 161 page routes now prerender; 75 fail.**

| | before (`758a6c3f6`) | now (`822afcb7d`) |
|---|---|---|
| Routes prerendered | **0** — build died on the first one | **86** |
| Routes failing | unknown (early exit) | **75**, fully enumerated |
| Footer `new Date()` errors | — | **0** |
| `usePathname()` errors | — | **0** |

The readiness proof's two dominant causes are gone: `new Date()` in the footer (79 of its 161)
and `usePathname()` outside Suspense (80) produce **not one error** in this log. #2095 and #2096
cleared those; the `"use cache"` on `getWhitelabelContext()` cleared the shell.

**One caveat, stated plainly.** Every remaining error still *prints* the same frame —
`utilities/whitelabel-context.tsx:41`. I do not read that as the cache having failed, because 86
routes now render through that identical provider, which could not happen if it still suspended
unconditionally. My reading is that the frame is the outermost *client* component holding while a
*server* ancestor suspends, and server frames do not appear in a client component stack. That is
an inference, not something this log proves. `next build --debug-prerender` — which the log itself
suggests — would settle it, and the classification below does not depend on it.

## Your hypothesis: confirmed, then sharpened

> passing routes have no dynamic segment beyond `[tenant]` and failing ones do

**72 of the 75 failing routes have a dynamic segment.** The 3 that do not are `blog`,
`funding-map` and `projects`.

But "has a dynamic segment" is the correlation, not the mechanism. Two checks I ran against the
route tree change what to do next:

**`loading.tsx` does not rescue a route. 66 of the 75 failing routes have one on their chain.**
So the failures are not page-level Suspense gaps.

**Because the `params` read is in a *layout*, above every page-level boundary.** 65 of the 75
failing routes sit under a layout that awaits `params`; only 10 do not. And the single route
whose layout reads `params` yet still passes is
`community/[communityId]/manage/payouts` — one of the six I marked `export const instant = false`.
Same layout, same read, opted out, passes. That is `instant = false` working exactly as intended,
and it is the cleanest evidence in the log that item 3 of the flip does its job.

## The 75, by cause

### Cause A — a layout on the chain awaits `params` (65 routes)

Concentrated in a handful of files. Two of them own 65 of the 75:

| Failing routes below it | Layout |
|---:|---|
| **52** | `app/t/[tenant]/(chrome)/community/[communityId]/layout.tsx` |
| **13** | `app/t/[tenant]/(chrome)/project/[projectId]/layout.tsx` |
| 12 | `…/project/[projectId]/(profile)/layout.tsx` |
| 8 | `…/community/[communityId]/(with-header)/layout.tsx` |
| 5 | `…/project/[projectId]/(profile)/funding/[grantUid]/layout.tsx` |
| 4 | `…/community/[communityId]/(cover)/layout.tsx` |
| 3 | `…/community/[communityId]/donate/layout.tsx` |
| 2 | `…/community/[communityId]/(with-header)/impact/layout.tsx` |
| 2 | `…/community/[communityId]/donate/[programId]/layout.tsx` |
| 1 each | `…/funding-opportunities/layout.tsx`, `…/updates/layout.tsx`, `…/funding/new/layout.tsx` |

(The nested ones are subsets of the two roots — a route under
`project/[projectId]/(profile)/funding/[grantUid]` is counted against all four layouts above it.)

**This is the whole bulk of P2-6, and it lives in about two files.** Whatever the fix is —
pushing the `params` read into a cached function, or into a Suspense-wrapped child below the
crawlable content — doing it in `community/[communityId]/layout.tsx` alone should clear ~52
routes.

### Cause B — no layout `params` read; the page itself is the blocker (10 routes)

```
/(bare)/nonprofits/find-funders/foundations/[id]
/(bare)/nonprofits/find-funders/grants/[id]
/(bare)/nonprofits/find-funders/nonprofits/[id]
/(bare)/nonprofits/find-funders/search/[id]
/(chrome)/nonprofit-research/[reportId]
/(chrome)/nonprofit-research/personas/[handleId]
/(chrome)/blog/[slug]
/(chrome)/blog                ← no dynamic segment
/(chrome)/funding-map         ← no dynamic segment
/(chrome)/projects            ← no dynamic segment
```

The last three are the pure uncached-loader cases and they are **exactly the P2-3 stage 2
targets**: `sanity/lib/gateway.ts` (blog, blog/[slug]),
`src/features/funding-map/services/funding-programs.service.ts` (funding-map),
`services/projects-explorer.service.ts` (projects). Two of them are where the flip commit already
left a `TODO(P2-3 stage 2)`. When Alpha adds `"use cache"` + `cacheLife` to those three loaders,
these four routes should clear without touching a layout.

## What passes, and why it is informative

86 routes prerender, including every marketing page, all 25 knowledge articles, `/`, `/about`,
`/communities`, `/nonprofits`, `/seeds`, `/contact`, the legal pages, and `mcp/connect`.

Eight passing routes *do* have a dynamic segment:

| Route | Why it passes |
|---|---|
| `community/[communityId]/manage/payouts` | `instant = false` (mine) |
| `nonprofit-research/shared/[token]` | `instant = false` (mine) |
| `nonprofit-research/diligence/[token]` | `instant = false` (mine) |
| `s/[slug]` | `instant = false` (mine) |
| `admin/studio/[[...tool]]` | no layout `params` read, page does not read them on the server |
| `dashboard/[module]` | ditto |
| `nonprofits/is-ai-ready/[site]` | ditto |
| `nonprofits/is-ai-ready/scans/[id]` | ditto |

`oauth/consent` and `auth/token-bridge` — the other two `instant = false` routes — have no dynamic
segment and also pass.

## Recommended order of work

1. **`community/[communityId]/layout.tsx`** — ~52 routes. Highest leverage in the codebase right now.
2. **`project/[projectId]/layout.tsx`** (+ its `(profile)` child) — ~13 more.
3. **P2-3 stage 2 on the three loaders** — clears `blog`, `blog/[slug]`, `funding-map`, `projects`.
4. The remaining six `[id]`/`[reportId]`/`[handleId]` pages, page by page.
5. **Remove `experimental.prerenderEarlyExit: false` before merge.** It is commented
   `TEMPORARY DIAGNOSTIC` in `next.config.ts` and exists only to produce this list.

## Also worth knowing

- All GitHub checks on the previous head were green — six `test` shards, `smoke`, `static-checks`,
  `quality-gate`, `react-doctor`, `checklist`, `baseline-guard`. Removing `force-dynamic` and the
  three `revalidate` exports breaks no test.
- `build` on GitHub Actions reports `skipping`, so **Vercel is the only place this actually
  builds**. Every signal in this report comes from there.
- 350 page *renders* attempted from 161 route definitions, and the install still reports
  "Lockfile is up to date, resolution step is skipped" — the release-age guard never runs in CI,
  as #2089 said.
