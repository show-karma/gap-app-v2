# TASK-P2-6B3 — three section-layout fixes pushed; the `(cover)` frame answered (Frontend Dev #2, 2026-09-02)

**PR #2107 `feat/stream-page-params`, head `cefc42c46`** (was `38e9dea11`). Three commits.
`tsc --noEmit` exit 0. `biome lint` clean on all 56 touched files. Touched tests: **252 passed /
28 files** (`--pool=forks --maxWorkers=2`). No local `next build`, no dev server, nothing left
running. No rebase needed — `origin/feat/cache-components-flip` is still `822afcb7d`, already this
branch's parent, so these builds still show the pre-#2108 count as you said.

| Item | State |
|---|---|
| (1) `NonProfitsNavbar` — route-tree split for `isHomepage` | **pushed** `dc955b8d5` |
| (2) `DonorResearchSectionLayout` — mode prop, hook deleted | **pushed** `cefc42c46` |
| (3a) `ManageLayoutClient` — `communityId` as a server prop | **pushed** `e0e70df84` |
| (3b) `(cover)/layout.tsx:23-24` — which access is really dynamic | **answered below, not yet fixed** |
| (3c) the remaining community Stream routes | two more readers found by inspection; not yet fixed |

---

## The `(cover)` frame: it is not the params read, and it is not fixable with a fetch option

You asked me to check whether `community/[communityId]/(cover)/layout.tsx:23-24` is really the
`await props.params`, or a later uncached call in the same layout. **It is the later call, and the
reason is sharper than "uncached".**

Line 30 of that layout is `await getCommunityDetails(communityId)`. That loader
(`utilities/queries/v2/getCommunityData.ts:22`) is `react.cache(...)` — per-render dedupe, not a
persistent cache — wrapping `api.get(...)` with `publicReadOptions()`. `publicReadOptions` already
does the hard part: it passes `isAuthorized: false` on the server so the read never touches
`cookies()`, which is the request-state trap its own doc comment describes. That is why the frame
is not a `cookies()` frame.

**But `api.get` is axios, not `fetch`** — `utilities/api/client.ts:1` imports axios and `:207`
calls `axios.request(...)`. On the server axios goes through Node's http module and never reaches
Next's patched `fetch`. So this read cannot participate in the prerender fetch cache **at any
setting**: it is invisible to it. `patch-fetch.js` only ever sees calls that go through `fetch`,
and its prerender path (`createCachedPrerenderResponse`, `:151`) is the branch that would have
cached it.

Three consequences worth stating:

1. **`await props.params` at :24 is a red herring here.** With Alpha's `generateStaticParams`
   sample, `communityId` is build-time known — which is exactly why the non-nested project profile
   routes started passing. The frame lands on the component, and the first genuinely runtime access
   inside it is the loader six lines later.
2. **No `next: { revalidate }` anywhere will fix an `api.*` loader.** If any part of the
   cache-the-loaders plan assumes fetch-level caching on these, it will silently do nothing. Worth
   telling Alpha explicitly — `"use cache"` still works, because it caches the *function result*
   rather than the fetch, so their approach is right; the fetch-option shortcut is not available.
3. **`(with-header)/layout.tsx` has the identical shape** — await params, `pagesOnRoot` guard,
   then `getCommunityDetails` — so `projects`, `updates`, `impact`, `browse-applications` almost
   certainly fail on the same read. Their frames were outside your tail window; this predicts what
   they will say.

### Why I did not fix it in this push, and what I would do

`getCommunityDetails` is a loader, and loaders are Alpha's by your split — it is awaited unguarded
from ~30 server components, so `"use cache"` on it is a change with a blast radius well outside my
lane. **If you want it, say so and I will take it; if it is Alpha's, this section of the report is
the handoff.**

In my lane, without touching the loader, the fix for the four `(cover)` routes is a leaf boundary,
and it has one real design question rather than being mechanical: the layout's not-found guard
(`if (!community) return <CommunityNotFound …>`) *gates children*, so a boundary that defers the
lookup also defers the decision to render the page. For Stream-class routes that is acceptable —
the child can call `notFound()` — but it changes when a bad slug is detected, and I would rather
you approve that than discover it. Both routes are noindex-adjacent (financials, portfolio
reports), so DEV-612 does not constrain the boundary.

## The other two community Stream readers, found by inspection

Their frames were not in either tail window, so these are structural findings, not stack-confirmed
— but they are the same shape as the two you have already confirmed, which is how the
`NonProfitsNavbar` and `DonorResearchSectionLayout` findings started:

| Routes | Reader | Fix |
|---|---|---|
| every `(with-header)` route — `projects`, `updates`, `impact`, `browse-applications`, … | `components/Community/Header.tsx:58` `useParams()`, rendered by `(with-header)/layout.tsx` above `children` | identical to ManageLayoutClient: the server layout already awaited `communityId` at `:15`; pass it. The component even falls back to `community.details.slug`, so the prop is nearly free |
| `impact`, `impact/project-discovery` | `components/Pages/Communities/Impact/ImpactTabNavigator.tsx:13` `useParams()` + `:15` `usePathname()`, rendered by `impact/layout.tsx` above `children` | `communityId` as a prop; the `usePathname()` tab active-state is the same shape as Alpha's `ProjectProfileLayout:108` and should get the same treatment, whatever you settle on there |
| `donate`, `donate/[programId]`, `donate/[programId]/checkout` | no client URL hook in the chain — `DonationHeader` is clean | `donate/[programId]/layout.tsx` awaits `params` for `[programId]`, which has no sample. Layout-params class, not hook class |

## What is pushed, in one line each

**`e0e70df84` manage** — `manage/layout.tsx` awaits its own params and passes `communityId` to
`ManageLayoutClient` **and** `ManageLayoutShell`, which read the same thing one level lower; fixing
only the first would have moved the failure down. `ManageBreadcrumbs`/`ManageSidebar`/
`ManageDeniedView` also read URL state but render only after `useCommunityDetails` and the
permission context settle, which cannot happen in a prerender — the shell renders its skeleton
branch instead, so they never mount there. That is why no boundary was needed.

**`dc955b8d5` find-funders** — the section splits into `(landing-nav)` (the landing page, passes
`isHomepage`) and `(workbench-nav)` (the `/connect` trio + the four detail routes). Navbar takes a
prop defaulting to false, so `find-funders-deep-research` keeps the variant it had. No boundary
over the navbar: that section is crawlable and DEV-612 forbids it — the same reasoning
`(chrome)/layout.tsx` records. Parent layout keeps the `.landing` wrapper and footer, so the
chrome and sticky-footer geometry are unchanged.

**`cefc42c46` donor-research** — `(advisor)`, `(gated-fullscreen)`, `(public)` under `(chrome)`,
the token routes keep their `(bare)` layout, and each of those four server layouts names its
`mode`. Gating and the React Query cache clearing are untouched; the mapping is one-for-one with
what the three pathname tests decided.

## No-JS parity: what I could measure, and what I could not

You asked for visible chars / links / h1 / hidden-chunks parity on `/nonprofits/find-funders` and
`/connect`, from the preview, before and after. **I could not run that**, and the reason is not the
change: the branch's Vercel build fails on the other ~70 routes, so there is no preview URL to
crawl, and `scripts/crawl-sitemap.mjs --visibility-mode no-js` needs a running origin. It is a real
gap and I am not claiming otherwise.

What I did measure is the test-level equivalent, which is the same property from the same angle:
`__tests__/app/aeo-crawl-eligibility.test.tsx` renders the landing page's server output and asserts
exactly one `h1` (the hero heading), the lead copy and every hero chip, and >2000 chars of visible
text across all five landing sections. All of it still passes after the split, unchanged. Two
structural facts back it up: the split adds **no Suspense boundary** anywhere, and the
loading-boundary guard now covers the two new group directories as well, so a `loading.tsx` cannot
appear there unnoticed. The first green preview is the moment to run the real crawl — say the word
and I will.

## Test churn, stated plainly

Two guard tests moved with the files and I want the changes visible rather than buried:

- `route-file-structure.test.ts` — four find-funders keys pick up their nav group. Route ids there
  already carry non-chrome groups (`project/[projectId]/(profile)`); the helper comment now says so
  explicitly instead of implying every group is stripped.
- `aeo-crawl-eligibility.test.tsx` — the import path follows `page.tsx`, and the forbidden-
  `loading.tsx` list gains `(landing-nav)/` and `(workbench-nav)/`.
- `DonorResearchLayout.account-switch.test.tsx` — now renders the four **real route layouts**
  instead of mocking `usePathname`, so it pins the group-to-posture mapping as well as the gate.
  Strictly stronger than before. The two token cases collapse to one because one layout now serves
  both routes. 8/8 pass.

Two files also needed a same-directory `error.tsx` (and one `loading.tsx`) because a group moved
`page.tsx` one level down and the route-trio rule wants them beside the page. Both re-export the
section file rather than duplicating it, so behaviour is identical.

## Next, on your word

1. `(cover)` — tell me whether `"use cache"` on `getCommunityDetails` is mine or Alpha's. If mine,
   it is one commit and it likely clears `(with-header)` too. If not, the leaf-boundary route needs
   your call on the deferred not-found guard.
2. `Header.tsx` and `ImpactTabNavigator` — ready to push as the same prop treatment; I held them
   only because their frames are not in a window yet and you asked me to fix from the frames.
3. Whenever #2108 lands in the flip head, rebase and read my six plus the nine nested manage routes
   out of the list.
