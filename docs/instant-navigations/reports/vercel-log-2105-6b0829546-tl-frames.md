# Vercel frames — flip branch #2105 @ 6b0829546 (dpl 6P6Es8VJmu37AGGFGAqDQSq1eBKZ), windows 18:14:50–18:15:35Z

Consolidated base BEFORE the integration rebase (so #2102's toolbar split is NOT in this build). 48 paths.
Read by the Tech Leader. Every failing route now has a named frame.

| Routes | Frame | Owner / fix |
|---|---|---|
| community hub, `impact`, `impact/project-discovery`, `projects`, `updates`, `browse-applications`, `funding-opportunities` | `CommunityPageNavigator.tsx:120` `useSearchParams()` (+`:119 useParams()`, `:122 usePathname()`) via `NormalCommunityHeader` (`Header.tsx:272`) → `WithHeaderLayout:37` | **Alpha** — next frame after the `Header.tsx:58` prop fix; navigator links are crawlable: `communityId` + active section as props from the server layout; the `searchParams` read into a link-free leaf |
| `browse-applications/[referenceNumber]` | `NormalCommunityHeader` `Header.tsx:58` `useParams()` | **Alpha** (already in progress) |
| `funding-opportunities` (second frame) | `FundingOpportunitiesClient.tsx:35` `useSearchParams()` — likely already fixed by #2102 (toolbar slot), which this build predates; verify on the next build | Dev #2 (#2102) / Alpha verifies |
| `funding-map` | `src/features/funding-map/hooks/use-funding-filters.ts:77` `useQueryState("page")` (nuqs) via `FundingMapSearch:26` (`page.tsx:50`) and `FundingMapList:48` (`page.tsx:56`) | **Alpha** — Cache-class: list renders the server default page with no nuqs read; search + pagination controls move into a link-free leaf owning `useFundingFilters` |
| `programs/[programId]` | `page.tsx:126` top-level `await params`, no sample | **Alpha** — generateStaticParams sample (in progress) |
| `donate`, `donate/[programId]`, `donate/[programId]/checkout` | `donate/layout.tsx:27-29` uncached `getCommunityDetails` (axios) | **Dev #2** → `getCommunityDetailsCached` |
| `find-funders/{foundations,grants,nonprofits,search}/[id]` | `non-profits-navbar.tsx:106` `usePathname()` via `find-funders/layout.tsx:18` | Dev #2 (fixed on #2107 via route groups; pending rebase/merge) |
| `nonprofit-research/[reportId]`, `personas/[handleId]` | `DonorResearchSectionLayout:168` | Dev #2 (fixed on #2107) |
| nested `manage/*` | `ManageLayoutClient.tsx:8` | Dev #2 (fixed on #2107) |
| `(cover)` financials/reports | `(cover)/layout.tsx:23` uncached `getCommunityDetails` | Dev #2 (fixed on #2107) |
| nested `funding/[grantUid]/*` | `ProjectProfileLayout.tsx:107` | Alpha (in progress) |
| `project/[projectId]/updates` | raw `getProjectUpdates` → `cookies()` | Alpha |

## Warnings worth a later cleanup (routes still prerender)
`HANGING_PROMISE_REJECTION` on `cookies()` from `TokenManager.getServerToken` via raw `getCommunityPrograms`
(`services/community-programs.service.ts:22`) on `manage/portfolio-reports/config` and `manage/milestones-report`
— server reads still defaulting to authorized; move to `publicReadOptions()` or the cached twin.
