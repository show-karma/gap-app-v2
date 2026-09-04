# Vercel frames — PR #2111 @ 065cd402c (dpl GbqJMAjnBEDfBMqA4GEDVZnCL33c), 9 → 5 paths (4 routes)

Cleared: `projects` (explorer split), `project/[projectId]/updates` (cached seed). Frames moved on three routes — progress, not regression.

| Route | Frame (this build) | Fix |
|---|---|---|
| community hub `/community/gitcoin` | **`cookies()` inside "use cache"** — `TokenManager.getServerToken` ← `getCommunityCategoriesOrThrow` (`utilities/queries/v2/getCommunityData.ts:180`) called from the cached function at `getCommunityData.ts:231` (`environmentName: 'Cache'`) | **D2-class.** The cached community loader calls a sub-loader that still defaults `isAuthorized: true`. `publicReadOptions()` on `getCommunityCategoriesOrThrow` (categories are public), plus audit every `api.*` call reachable from inside the cached community/project/program loaders for the same default — no read inside a cache scope may touch the token |
| `programs/[programId]` ×2 | moved from the server seed to `useProgram` (`src/features/programs/hooks/use-program.ts:17` `useQuery`, `Date.now()` in a Client Component) via `ProgramDetailContent` (`ProgramDetailClient.tsx:20`) | `staleTime: 'static'` opt-in scoped to this above-content consumer (the seed fix worked; this is the next reader) |
| `funding-opportunities` | still `usePrograms` — now `use-programs.ts:50` `useQuery` via `FundingOpportunitiesClient.tsx:158` | the opt-in did not reach this query (line shifted 48→50, so the file changed but the hydrated query still runs without `staleTime: 'static'`); check which query in the hook actually renders above content |
| `funding-map` | moved from `funding-map-card.tsx:71` to **`:44` `isPendingReview`** `new Date().toISOString()` (second occurrence) | same defer/server-pass treatment as line 71 — grep the card for every `new Date()` |

## Warnings (routes prerender)
`generateMetadata` on the grant routes (`funding/[grantUid]/page.tsx:23`, `.../milestones-and-updates/page.tsx:23`) → `getProjectGrants` authorized → `cookies()` HANGING_PROMISE_REJECTION. `publicReadOptions()`.
