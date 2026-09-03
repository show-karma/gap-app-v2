# TASK-P2-4A — Report (Frontend Dev #2)

Branch `feat/leaf-suspense-manage-admin` @ `977d53745`, draft **PR #2101** -> `feat/instant-navigations`.

## Overview

P2-4a: leaf Suspense boundaries around the URL reads in the manage and funding-platform trees,
so those routes stop being forced dynamic by a `usePathname()`/`useSearchParams()` call.

Draft against `feat/instant-navigations`. Flags stay **off**.

## Result

**`usePathname()` outside a boundary: 80 routes → 0.** The whole cause class is gone.

| Cause | Before | After |
|---|---|---|
| `usePathname()` outside `<Suspense>` | 80 | **0** |
| uncached/runtime data outside `<Suspense>` | 69 | 82 |
| **distinct routes failing** | **82** | **82** |

The route *count* does not move, and that is the honest result rather than a disappointing one:
every route this PR unblocks is independently blocked by an uncached server read, which is
P2-3's Cache-class work (and the four loaders behind the D2 gate). Removing the URL reads is
what makes those the *only* remaining blocker — before this, 80 of them had two.

Measured with the same two-pass method as Task 4 (`cacheComponents: true` → strip the
segment-config compile errors → rebuild with `experimental.prerenderEarlyExit: false`), on a
throwaway that was reverted.

**Measured on a local merge with #2095, not on the integration branch.** On the current base the
footer's `new Date()` is still present, and it fires first on every route, so all 161 failures
collapse to that one cause and nothing else is observable. The before/after above is therefore
`#2095` vs `#2095 + this PR`, which is the comparison that means anything.

## Changes

**Group M — the manage chrome.** `ManageSidebar` and `ManageBreadcrumbs` both read
`usePathname()` and both render from `ManageLayoutShell`, which is in the layout — so between
them they held down all 28 routes under `/community/[communityId]/manage`. They now share one
`ManageChromeBoundary`. One wrapper rather than two inline `<Suspense>` tags so the two cannot
drift apart and the reasoning lives in one place; each caller passes the fallback that matches
its own footprint, because a `null` fallback in the sidebar slot would collapse the rail and
shift the page.

**Group A — the funding-platform one-offs.**

- `[programId]/applications/page.tsx` — the `useSearchParams()` read only fed `initialFilters`
  for the list, so it moved into an `ApplicationsListSection` child behind a boundary. The page
  header above it now prerenders. This also removed a `useFundingApplications` call whose only
  purpose was consuming those filters.
- `[programId]/milestones/[projectId]/page.tsx` — same shape as its sibling
  application-detail route, which already had this treatment; now matches it.
- `nonprofit-research/new/page.tsx` — resolves its `searchParams` promise in a child below the
  boundary instead of in the page body, so the shell prerenders.

Every one of these is noindex on its own layout, so nothing behind a boundary was ever in the
crawlable payload and DEV-612 does not apply.

## Two things deliberately left alone

**`FundingOpportunitiesClient` — needs its own change.** I implemented the leaf treatment and
then backed it out, because it cannot be done safely in this shape:

- Its route **is** crawlable, and its page server-fetches the programs and hydrates them into
  React Query specifically so the directory is in the initial HTML (DEV-596). A boundary around
  the component would stream that directory as a late chunk and undo it (DEV-612). So only the
  URL read may move, never the directory.
- The `useSearchParams()` read feeds two things: a seeding effect (safe to isolate) and
  `writeUrl`, which the filter toolbar calls. The toolbar is rendered by `ProgramsContent`,
  *together with* the directory — so isolating the toolbar means splitting that component too.
- My first attempt kept `writeUrl` in the parent and had it read `window.location` at call time
  instead. That is a real semantic change and
  `__tests__/app/funding-opportunities-hydration.test.tsx` caught it: the three interaction
  tests (tab click and search box writing the query string) failed. Reverted rather than
  shipped.

It should be its own PR that splits the toolbar from the directory, with the hydration test and
the no-JS numbers as the gate.

**`manage/payouts/page.tsx`** reads `searchParams` but is a pure `permanentRedirect` — nothing
renders, so there is no child to put behind a boundary. It is Block-class: `instant = false` at
P2-6.

## Testing

`tsc` clean, `biome` clean. Affected suites pass, including
`funding-platform/__tests__/page.regression.test.tsx` and
`__tests__/app/funding-opportunities-hydration.test.tsx` (green again after the revert).
