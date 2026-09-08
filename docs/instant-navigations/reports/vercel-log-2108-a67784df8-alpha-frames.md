# Vercel frames — PR #2108 @ a67784df8 (dpl 55mHqzDNWzboTvtSr8Wm8asRi2Ah)

Read by FE Dev Alpha via the Vercel connector, errors-only, narrow time windows.
`Export encountered errors on 48 paths` — **unchanged from 20b6b167d**. The extension round
cleared nothing measurable, and the frames below say why: three of my last four fixes targeted a
reader that was not the one in the stack.

`--debug-prerender` is live on this branch (frames now carry real function names and the
"To debug the issue, start the app in development mode" wording).

## The five frames, verbatim

### 1. `funding-map` — nuqs, above the content
```
Error: Route "/t/[tenant]/funding-map": Next.js encountered URL data `useSearchParams()` in a Client Component outside of `<Suspense>`.
    at useFundingFilters (src/features/funding-map/hooks/use-funding-filters.ts:77:40)
    at FundingMapSearch (src/features/funding-map/components/funding-map-search.tsx:26:67)
    at FundingMapPage (app/t/[tenant]/(chrome)/funding-map/page.tsx:50:13)
  76 | export function useFundingFilters() {
> 77 |   const [page, setPage] = useQueryState(
  digest: 'CLIENT_HOOK_DYNAMIC'
```
A second, identical frame reports the same hook via
`FundingMapList (funding-map-list.tsx:48:76)` at `funding-map/page.tsx:56:11`.

**My `staleTime` change was not the blocker here.** `useFundingFilters` is a *different hook* from
`use-funding-programs`, and it reads the URL through nuqs.

### 2. `community/[communityId]` (the hub) — an uncached loader in the layout
```
Error: Route "/t/[tenant]/community/[communityId]": Next.js encountered uncached or runtime data during prerendering.
    at WithHeaderLayout (app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/layout.tsx:11:31)
> 11 | export default async function WithHeaderLayout(props: {
```

### 3. `community/[communityId]/funding-opportunities` — the same frame
```
Error: Route "/t/[tenant]/community/[communityId]/funding-opportunities": Next.js encountered uncached or runtime data during prerendering.
    at WithHeaderLayout (app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/layout.tsx:11:31)
```
Identical frames for `impact`, `updates`, `projects` (community) and `browse-applications`.

**Root cause, verified in source:** `(with-header)/layout.tsx:21` calls
`getCommunityDetails(communityId)` — **the uncached loader**. I wired `getCommunityDetailsCached`
into `community/[communityId]/layout.tsx` and the hub page and missed this layout. Every
`(with-header)` route inherits it, which is why the whole group fails on one frame.

**`FundingOpportunitiesClient`'s `useParams()` is NOT the blocker for that route** — worth stating
plainly, since that was the approved next fix. It is still worth doing as hygiene (it is a real
CLIENT_HOOK_DYNAMIC reader that would surface the moment the layout frame is cleared), but it will
not move the count on its own.

### 4. `community/[communityId]/programs/[programId]`
```
Error: Route "/t/[tenant]/community/[communityId]/programs/[programId]": Next.js encountered uncached or runtime data during prerendering.
```
The frame body fell outside the captured window; the message class matches #2/#3.
**Not yet confirmed — I will not act on it until I have the frame.**

### 5. `projects` — NOT CAPTURED
The frame did not appear in any window I sampled (17:57:00–17:58:16, errors-only). I am **not**
inferring it. The strongest hypothesis is nuqs, by analogy with frame #1: `ProjectsExplorer.tsx`
calls `useQueryState` four times (lines 50, 57, 63, 70) above the crawlable list, and frame #1
proves `useQueryState` raises exactly this `useSearchParams()` error. **Unconfirmed until the
frame is in hand.**

## Also visible, in my area

`/t/[tenant]/project/[projectId]/updates` still reaches `cookies()`:
```
    at TokenManager.getServerToken (utilities/auth/token-manager.ts:89:33)
    at async getProjectUpdates (services/project-updates.service.ts:107:18)
    route: '/t/[tenant]/project/[projectId]/updates'
    digest: 'HANGING_PROMISE_REJECTION'
```
Some caller on that route still uses the raw loader rather than `getProjectUpdatesCached`.

## The grant-route correction (confirms the Tech Leader's read)

```
Error: Route "/t/[tenant]/project/[projectId]/funding/[grantUid]": Next.js encountered URL data `useParams()` in a Client Component outside of `<Suspense>`.
    at ProjectProfileLayout (components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx:107:34)
    at ProfileLayout (app/t/[tenant]/(chrome)/project/[projectId]/(profile)/layout.tsx:29:25)
> 107 |   const { projectId } = useParams();
  108 |   const pathname = usePathname();
  digest: 'CLIENT_HOOK_DYNAMIC'
```
So `GrantDetailLayout` was the wrong target: the reader is `ProjectProfileLayout`, and the
non-nested profile routes pass only because their params are build-time samples.
