# P2-6 — merge checklist for the cache-components flip

**Branch:** `feat/cache-components-flip` @ `2d8e25dc0` (Dev #2's #2107 merged; Alpha's #2108 in).
Everything below was read off that commit, not from memory. Line numbers are that commit's.

This is the list to work through **before the flip PR is merged**, in order. Sections 1–2 are
blocking and mechanical. Sections 3–6 are the record of what the flip changed and what must still
be true afterwards. Sections 7–8 are the verification that has to happen on a preview. Section 9 is
what is knowingly left undone.

---

## 1. Remove the two temporary diagnostics — BLOCKING

Both exist only to triage the failing-route list. They must not reach `main`.

| Where | What | Restore to |
|---|---|---|
| `next.config.ts:96` | `prerenderEarlyExit: false` inside `experimental` | delete the line and its `TEMPORARY DIAGNOSTIC` comment block (`:89-95`) |
| `vercel-build.sh` | `NEXT_BUILD_ARGS="--debug-prerender"` and the comment above it | delete both; the `timeout … pnpm build ${NEXT_BUILD_ARGS}` line goes back to `pnpm build` |

`--debug-prerender` runs the prerender pass with `NODE_ENV='development'`
(`next/dist/cli/next-build.js:66`) — Next itself prints *"should not be used for production"*.
`prerenderEarlyExit: false` makes the build enumerate every failure instead of dying on the first;
useful for triage, wrong for a gate.

**If the build ceiling in `vercel-build.sh` has been raised above 480, put it back in the same
commit.** It is currently 480 (Alpha's), which is where it belongs — a debug build fits inside it.

**Do all three in one commit.** They were added together and they are only coherent together: a
build with `prerenderEarlyExit: false` and no `--debug-prerender` reports many failures and names
the cause of none.

## 2. Confirm the flag set is exactly what is intended — BLOCKING

Read `next.config.ts` and check all four:

- [ ] **`cacheComponents: true`** (`:82`) — top level, not `experimental`. It is not experimental in
      16.3.3.
- [ ] **`partialPrefetching: true`** (`:87`) — requires `cacheComponents`; does nothing without it.
- [ ] **`experimental.useCache` is ABSENT.** `cacheComponents` subsumes it; `server/config.js`
      backfills it and warns "no longer needed" when both are set. **Absent is not the same as
      `false`** — an explicit `useCache: false` alongside `cacheComponents` throws E1465.
- [ ] **`experimental.globalNotFound: true` STAYS** (`:100`). Unrelated to the flip and still
      needed: the flag defaults to false in 16.3.3, and without it `app/global-not-found.tsx` is
      ignored and Next serves its own unbranded 404.

Also confirm no `export const dynamic`, `revalidate`, or `fetchCache` has crept back into a
segment. `cacheComponents` rejects them; the flip removed the last of them (`app/t/[tenant]/layout.tsx`
records the `force-dynamic` deletion in its comment).

## 3. `instant = false` — the Block-class routes and why each one is opted out

Seven routes. The export is only legal with `cacheComponents` on, so this list is entirely new with
the flip and it is the complete inventory.

| Route | Reason |
|---|---|
| `(bare)/nonprofit-research/shared/[token]` | The token in the URL **is** the authorization. Must never be painted from a prefetched shell — the server has to see the request. Noindex, donor-facing private link. |
| `(bare)/nonprofit-research/diligence/[token]` | Same: capability link, never indexed. |
| `(chrome)/auth/token-bridge` | Token in the URL is the credential. Not a destination — the marketing site frames it, nobody navigates to it. |
| `(chrome)/oauth/consent` | An authorization decision, never reached by prefetch: the consent screen must reflect the live request. |
| `(chrome)/s/[slug]` | Public scorecard addressed by an opaque slug that acts as the capability to view it. |
| `(chrome)/community/[communityId]/manage/payouts` | Only issues a `permanentRedirect` — nothing to prefetch, and an instant navigation would paint an empty page before the redirect resolved. |
| `(chrome)/blog/preview/[slug]` | `draftMode()` reads a cookie, so it can never prerender — correct rather than a limitation. Saying so explicitly is what frees the public `/blog/[slug]` to be cached instead of being held dynamic by a preview concern it does not serve. |

Each of these replaced an `export const dynamic = "force-dynamic"` that `cacheComponents` rejects.
**Check none of them has lost its export in a merge.**

## 4. `generateStaticParams` samples — what is baked, and where the values come from

The sample's *presence* is load-bearing, not just its contents: with it, a layout may keep a
top-level `await params`, because the values are build-time known. Everything not sampled renders
on first request and is then persisted, so these bound build time without bounding what is
servable.

| Segment | Sample | Source of the values |
|---|---|---|
| `app/t/[tenant]/layout.tsx:65` | the karma shell only (`KARMA_TENANT_PARAM`) | hard-coded, deliberately. Returning every tenant multiplied the build by 8 full copies of ~185 routes (1477 page renders) for shells identical apart from theme. `isKnownTenantParam()` still accepts every tenant — this changes what is *built*, not what is *servable*. |
| `community/[communityId]/layout.tsx:35` | 3 communities | `chosenCommunities()` — the same list the homepage and the communities sitemap use, so they are real on staging and production rather than hand-picked and liable to rot. |
| `project/[projectId]/layout.tsx:41` | 3 projects | `getExplorerProjectsPaginatedCached({page:1, limit:3})`, slug or uid. Wrapped in try/catch: a failure degrades to prerendering **no** projects — never a failed build, never a fabricated slug. |
| `blog/[slug]/page.tsx:41` | newest N posts | `getPublishedSlugs()`, which already backs the sitemap. Returns `[]` when Sanity is unconfigured → a build with no prerendered posts rather than a failed one. |

**Check on the flip preview that each sample actually produced prerendered routes.** A sample that
silently returns `[]` looks identical to one that worked, and the layouts' top-level `await params`
depends on it.

## 5. `staleTime: "static"` opt-ins — where and why

`utilities/queries/prerenderStaleTime.ts` exports `PRERENDER_SAFE_STALE_TIME`. React Query reads
`Date.now()` when deciding staleness, which `cacheComponents` rejects during prerender; the usual
fix is a Suspense boundary, but DEV-612 forbids one above the content of a crawlable route. In
query-core 5.87.1 both gates short-circuit on `"static"` *before* any clock read (`query.js:118`,
`queryObserver.js:446`), so this works by construction.

Applied through a `prerenderSafe?: boolean` option on four hooks — `useProject`,
`useProjectGrants`, `useProjectImpacts`, `useProjectUpdates` — composed by
`hooks/v2/useProjectProfile.ts`. **There is exactly one call site that turns it on:**
`components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx:145`, which renders above the
crawlable project content.

**The trade-off is why it is opt-in and must stay opt-in:** a `"static"` query is never stale, so it
never refetches on mount, focus or reconnect, and `isStaleByTime` returns false before it even
checks `isInvalidated`. The hydrated payload is what the reader sees until something calls
`refetch()`. Defensible where the server data is already a 60s-revalidated cached document; wrong
anywhere a user expects their own edits to appear. **Do not let this become a global default, and
check no new call site passes `prerenderSafe: true` on an editable surface.**

## 6. `cacheLife` / `cacheTag` — every cached loader and seed

`cacheLife("minutes")` = `{ stale: 300, revalidate: 60, expire: 3600 }`; the 60s revalidate is the
same ceiling the routes carried as `export const revalidate = 60` before the flip.

| Cached function | Life | Tags |
|---|---|---|
| `utilities/whitelabel-server.ts:67` `getWhitelabelContext` | `max` | — (pure function of the `[tenant]` root param; the tenant is recorded on the entry via `readRootParamNames`) |
| `utilities/queries/v2/getCommunityData.cached.ts` `getCommunityDetailsCached` | minutes | `communityTag(slug)` |
| ” `getCommunityCategoriesCached` | minutes | `communityTag(communityId)` |
| ” `getCommunityProjectsCached` | minutes | `communityTag(slug)`, `communityProjectsTag(slug)` |
| `services/project.cached.ts` `getProjectCached` / `getProjectGrantsCached` / `getProjectImpactsCached` / `getProjectUpdatesCached` | minutes | `projectTag(projectIdOrSlug)` |
| ” `getProjectSeedCached` (React Query seed) | minutes | `projectTag(projectIdOrSlug)` — same life and tag as the loaders it seeds from |
| `services/projects-explorer.cached.ts` `getExplorerProjectsPaginatedCached` | minutes | `projectListTag()` |
| `src/features/funding-map/services/funding-programs.cached.ts` `getAllFundingProgramsCached` | minutes | `programListTag()` |
| ” `getFundingMapSeedCached` (seed) | minutes | `programListTag()` — matches the loader exactly |
| `sanity/lib/gateway.ts:129` `getPublishedPosts` | minutes | `blogListTag()` |
| ” `:137` `getPublishedPostBySlug` | minutes | `blogPostTag(slug)`, `blogListTag()` |
| `(with-header)/funding-opportunities/page.tsx:25` `fetchCommunityPrograms` | minutes | `communityTag(communityId)`, `programListTag()` |
| ” `:55` `getFundingOpportunitiesSeedCached` (seed) | minutes | same pair |
| `(whitelabel)/programs/[programId]/page.tsx:44` `fetchProgramDetails` | minutes | `programTag(programId)` |
| `app/sitemaps/static/sitemap.ts:86` | hours | — (replaced `export const revalidate = 3600`) |
| `app/.well-known/*` (7 route handlers) + `app/openapi.json` | hours | — |

Tag helpers live in `utilities/cache/tags.ts`. **Only the blog currently invalidates**:
`app/api/blog/revalidate/route.ts:63,65` calls `revalidateTag(blogListTag(), "max")` and
`revalidateTag(blogPostTag(slug), "max")`. Everything else is self-healing on the 60s revalidate
only — **that is a known gap, not an oversight**: nothing calls `revalidateTag` for community,
project or program mutations yet. Decide before merge whether that is acceptable for launch or
whether the write paths need tagging first.

**Two seeds are deliberately NOT cached** and must stay that way:
`(cover)/financials` (payouts + KYC config are per-community operational data — a cached response
has to belong to no one) and anything behind auth. They stream behind a boundary instead.

## 7. No-JS parity to re-measure on the flip preview — BLOCKING

This is the regression the flip is most likely to cause and the one no unit test can catch: a route
whose content moves into a hidden late chunk that only JavaScript reveals.

- **The 53 routes in `SITEMAP_NO_LOADING`** (`__tests__/app/route-file-structure.test.ts`). That set
  is the source of truth — do not copy the list into this file, it will rot. Every one is a
  sitemap-crawlable route where a `loading.tsx` is forbidden along the whole segment chain.
- **Tool:** `node scripts/crawl-sitemap.mjs --visibility-mode no-js --output artifacts/…`, pointed
  at the flip preview. Same extractor (`extractNoJsVisibleHtml` + `visibleTextLength`) the DEV-612
  work used, so the numbers are comparable to what is on record.
- **Measure before and after**, production vs flip preview, and compare per route: visible chars,
  `<h1>` presence, internal link count, and whether any content sits in a `<div hidden id="S:n">`
  chunk.
- **Whitelabel spot checks on `app.opgrants.io`** (tenant `optimism`, `domain-constants.ts:29`):
  the tenant shell is *not* prerendered — only the karma shell is (§4) — so a whitelabel host takes
  one cold render per deploy and is the case most likely to differ from the karma measurement. Spot
  check the community root, a project profile, and `/programs` on that host.

Fail condition: any route whose no-JS visible text drops, or which loses its `<h1>`, versus
production.

## 8. Turn the `instant()` Playwright suite on — BLOCKING

`e2e/tests/instant/instant-navigations.spec.ts` — the ten navigations from P2-5. Every test
currently skips: `INSTANT_NAV_ENABLED = process.env.INSTANT_NAV_E2E === "1"` (`:46`), gated at
`:228` with a reason rather than a failure, so CI stays green pre-flip.

```
INSTANT_NAV_E2E=1 BASE_URL=https://<flip-preview> pnpm e2e:pw e2e/tests/instant
```

Two conditions, both from the suite's own header:

- It must be a **production build**. `next dev` does not prefetch the way a build does; a dev
  server makes every assertion pass or fail for the wrong reason.
- The target needs **real data**. Nothing in the spec hardcodes a slug — every case discovers its
  link from the index page and calls `skipUnlessFound`, so an empty environment skips rather than
  fails. **A run where most cases skipped is not a green run**; check the skip count.

After the flip lands, decide whether `INSTANT_NAV_E2E` becomes the default in CI or stays opt-in
against a preview.

## 9. Known deferred items — carried, not fixed

State these in the PR body so they are not discovered later as regressions.

1. **`/blog/preview/[slug]`** — new route, `instant = false`, never prerenders (`draftMode()` reads
   a cookie). Reached only via `/api/blog/preview`, which validates the Sanity preview secret
   before enabling draft mode; landing on it without draft mode redirects to the published post
   rather than rendering a second indexable copy. Working as designed, but it is a new
   permanently-dynamic route and belongs on the list.
2. **`/communities` renders no community links without JavaScript** — pre-existing and live in
   production, measured identical on production and on a preview (685 visible chars, `<h1>`
   present, 8 internal links, **0 community links**). See
   `.maestri/reports/finding-communities-cards-no-js.md`. **Explicitly out of scope for the flip**;
   the flip must not make it worse, and the §7 crawl is what proves that.
3. **The staff-JWT parity leg was never run.** `__tests__/fixtures/d2/public-payload-parity.json`
   records `tokenPresent: false` — the anonymous half only, which is the half that matters for
   caching (it proves each endpoint serves a complete public payload with no credential). The
   authenticated diff needs a staging Privy JWT this suite does not have:
   `INDEXER_TOKEN=<staging privy jwt> node scripts/record-d2-parity.mjs`. The two
   `optionalAuthentication` endpoints are covered by argument instead — a session adds exactly
   `metadata.ingestionSource`, `metadata.ingestionRunId`, `metadata.rawData`, only for a staff
   address, and both consumers fetch on the client and keep their token. **Someone with a staging
   token should run the leg before the flip is called done.**

---

## Order of work

1. §2 flag audit (read-only, five minutes) — do it first so §1 is the only config change.
2. §1 remove both diagnostics + restore the ceiling, one commit.
3. Push, get a clean build with `prerenderEarlyExit` back on: **the build must now succeed**, which
   is itself the proof that the failing-route count reached zero.
4. §7 no-JS crawl against that preview, plus the whitelabel spot checks.
5. §8 `instant()` suite against the same preview.
6. §3–§6 are a read-through of the diff, not new work — use them as the reviewer's map.
7. §9 into the PR body.
