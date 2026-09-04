# TASK-P2-6B4 — #2107 rebased onto `5a089bffa`; the `(cover)` frame cleared (Frontend Dev #2, 2026-09-02)

**PR #2107 `feat/stream-page-params`, head `8174b8d9a`** (was `cefc42c46`, force-pushed with a
lease against that exact SHA). `tsc --noEmit` exit 0. `biome lint` clean on every touched file.
**288 tests / 29 files green** (`--pool=forks --maxWorkers=2`). No build run, no dev server,
nothing left in the background.

## 1. The rebase

`git rebase --empty=drop 5a089bffa`. The four flip commits this branch was carrying
(`dad43eca5`, `7e902f93b`, `758a6c3f6`, `822afcb7d`) were **skipped as already applied** — they are
`f92475455`, `17fd5e625`, `0c9a5be85`, `1af6f578f` upstream now. One conflict, one drop:

**`vercel-build.sh` conflicted because you and Alpha both added `--debug-prerender`.** Alpha's is on
the flip branch as `NEXT_BUILD_ARGS="--debug-prerender"` (string) with the ceiling left at 480; mine
was an array plus a 480→900 bump. I resolved by **taking upstream's file wholesale**, which made my
`chore(build)` commit empty and it dropped. So there is now exactly one definition of the flag and
one comment block, and the ceiling stays where Alpha has it — their debug builds complete inside
480s, so my bump was solving a problem that did not materialise. `vercel-build.sh` on this branch is
now byte-identical to the flip head.

Five commits remain, plus two new ones:

```
8174b8d9a fix(cache): read the community through the cached twin in the (cover) group   NEW
f33ec80e5 test(routes): pin the find-funders bare routes to their nav groups            NEW
ca1009f90 refactor(donor-research): name the section posture in the route tree
e7cd98400 refactor(find-funders): answer isHomepage from the route tree, not usePathname
f8545ce23 refactor(manage): pass communityId down instead of reading useParams
8a4f6bd67 docs(prerender): correct the sitemap claim on the find-funders detail pages
5f605f37d refactor(prerender): stream the page-level params reads on six Stream routes
```

`f33ec80e5` is rebase fallout worth naming: **#2104 landed `SITEMAP_BARE_ROUTES` while this branch
was splitting find-funders into nav groups.** Both are right, they had just never met — the four
entries now carry their group, the same way `SITEMAP_NO_LOADING` and `project/[projectId]/(profile)`
already do. The guard keeps both directions: a stale entry still fails, so a route leaving a group
cannot slip past.

## 2. ManageLayoutClient / Shell — survived, and composed with #2101

Confirmed by reading the rebased files, not by assuming:

- `manage/layout.tsx` is `async`, awaits its own `params`, passes `communityId`. **No `useParams`
  left in `ManageLayoutClient` or `ManageLayoutShell`.**
- #2101 also touched `ManageLayoutShell.tsx` (it added `ManageChromeBoundary`). Both changes are
  present and composed: the shell takes my `communityId` prop *and* renders their two boundaries.
- #2101 also touched `nonprofit-research/new/page.tsx`, which my donor-research commit **moved** to
  `(advisor)/new/page.tsx`. The move carried their change: the file at the new path has their
  `Suspense` + `searchParams`-below-the-boundary shape intact.

## 3. The `(cover)` frame — cleared, and extended one route family beyond the ask

`8174b8d9a` moves **every** remaining server-side `getCommunityDetails` caller in the group to
`getCommunityDetailsCached` — Alpha's existing twin, reused, **no second cached function**:

| File | Sites | Note |
|---|---|---|
| `(cover)/layout.tsx` | 1 | the named frame |
| `(cover)/financials/page.tsx` | 2 | also drops its local `cache(getCommunityDetails)` |
| `(cover)/reports/page.tsx` | 2 | one in `generateMetadata`, **one in the page body** |
| `(cover)/reports/[runDate]/page.tsx` | 1 | page body |
| `(cover)/reports/[runDate]/[configSlug]/page.tsx` | 1 | page body |

You scoped this to "the layout and financials page callers". **I included the three reports pages
because two of their reads are in the page body** — they would have become the next frame the moment
the layout cleared, and they are the same swap against the same twin. If you would rather they were
separate, say so and I will split the commit.

The financials `cache(getCommunityDetails)` deserves its own line: React `cache()` dedupes *within*
one render and does not survive it, so that wrapper never made the read cacheable — it only made it
look cached. The twin does both jobs, and the metadata read and the body read now share one entry.

### What I tried, measured, and backed out

I also put the financials hydration seed behind a leaf boundary, because
`prefetchFinancialsData` is uncached `api.*` I/O awaited in the page body and **will be that route's
next frame**. I backed it out: `__tests__/app/community-cover-group.test.tsx` ("cover pages own
exactly one `<h1>`") went red, because the page's only `<h1>` lives inside `PublicControlCenter`,
under the `HydrationBoundary` — so wrapping the seed takes the heading out of the prerendered shell.
That guard is right and I am not going to rewrite it to make my change pass.

**So financials needs a decision, not a reflex.** Two shapes:

- **(a) Hoist the heading.** Move the page header out of `PublicControlCenter` into the page shell so
  the `<h1>` prerenders and only the table streams. Best result, touches a client component that is
  not obviously mine.
- **(b) Cache the seed** the way `10122364f` did for the React Query seeds. Needs a judgement I am
  not qualified to make alone: whether the payouts list and the KYC config are safely shareable, or
  whether they fall on the wrong side of the cache-poisoning line `publicReadOptions()` draws.

I noted the constraint in the commit body so it is not lost.

## 4. The remaining Stream routes — I need the frames, and here is what inspection says

**I cannot read `dpl 6P6Es8VJmu37AGGFGAqDQSq1eBKZ`.** This machine has never authenticated the
Vercel CLI (`%LOCALAPPDATA%\com.vercel.cli\` holds only `Cache/`, no `auth.json`; no `VERCEL_TOKEN`
anywhere), the MCP is off-limits, and `gh` only surfaces the one-line status. Nothing has changed
since I raised it in P2-6B. **Please send the frames** — or a Vercel token / one `npx vercel login`
and I stop asking.

Meanwhile, a structural survey of the six. Every one of these is the shape that has been confirmed
by a frame twice already, but **none is stack-confirmed, and I have pushed none of them**:

| Route | Suspected reader | Shape |
|---|---|---|
| `updates` | `(with-header)/updates/page.tsx:48,50` — the **page itself is `"use client"`** and reads `useParams` + `useSearchParams` | not a layout problem; the page is the reader |
| `browse-applications` (+`[referenceNumber]`) | `browse-applications/page.tsx:7` `useParams()` — client page | same |
| `donate` | `donate/page.tsx:15` `useParams()` — client page | same |
| `donate/[programId]` | `page.tsx:20` `await getCommunityProjects(...)` — the **raw** loader | one-line swap to `getCommunityProjectsCached`, the same twin, no new function |
| `projects` | `page.tsx:50` `parseCommunityProjectsPage(await props.searchParams)` at page top level, plus `:32` raw `getCommunityDetails` in metadata | the same searchParams shape Alpha hit on the `/projects` explorer |
| `impact`, `impact/project-discovery` | `ImpactTabNavigator.tsx:13` `useParams()` + `:15` `usePathname()`, rendered by `impact/layout.tsx` above `children` | needs a route-tree answer, see below |

**`impact` is the one that is not mechanical.** Its layout serves both tabs, so it cannot say which
is active — exactly the find-funders problem. The layout's own comment already records the house
answer ("asking which of the two routes is active meant a `usePathname()` read in a client
component, which is what kept both of them out of the prerender"), so the consistent fix is a group
split — `(index)` and `(discovery)` each passing `active` — plus `communityId` as a prop. That is a
third route-tree split and I would rather you approved it than found it.

`components/Community/Header.tsx` untouched, as instructed.

## Ready on your word

1. The frames for the six above — or approval to work from the inspection table, in which case
   `donate/[programId]` and `projects` are quick and `impact` is the split.
2. financials: shape (a) or (b).
3. Whether the three reports pages should be split out of `8174b8d9a`.
