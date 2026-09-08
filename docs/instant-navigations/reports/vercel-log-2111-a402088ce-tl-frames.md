# Vercel frames — PR #2111 @ a402088ce (dpl 4kqVj2S1TikQUokMzsAFHDd3pr89), 5 → 4 paths (3 routes)

Cleared: `funding-map`. All three remaining frames MOVED again (previous readers fixed).

| Route | Frame (this build) | Fix |
|---|---|---|
| `programs/[programId]` ×2 | `utilities/funding-programs.ts:78` `isProgramEnabled` → `new Date(program.metadata.endsAt) < new Date()` in a Client Component (`ProgramDetailContent`, `ProgramDetailClient.tsx:85`) | compute `isApplicationDeadlinePassed` (and any other now-dependent flag) on the server from the cached program and pass it as data, or defer to an effect; the utility must not call `new Date()` during client render |
| community hub | `hooks/useProjectFilters.ts:17` nuqs `useQueryState("categories")` in `CommunityGrants` (`components/CommunityGrants.tsx:63`) via `(with-header)/page.tsx:117` | third toolbar-split: the community projects grid (crawlable) renders from the server default with no nuqs read; the category/maturity filter controls own `useProjectFilters` behind a link-free leaf and drive the grid through store/callback |
| `funding-opportunities` | `src/features/programs/hooks/use-programs.ts:13` `matchesStatus` → `const now = new Date()` inside the `.filter` at `:76` during render (`FundingOpportunitiesClient.tsx:162`) | status classification needs a stable `now`: compute program status on the server inside the cached seed (pass `status` per program), or defer the filter to an effect with a server-safe initial list |

## Pattern worth a sweep instead of one build per hit
`new Date()` / `Date.now()` inside client-render paths of crawlable routes keeps surfacing one at a time
(footer, funding-map-card ×2, funding-programs.ts, use-programs.ts). Grep the component trees of the
remaining Cache-class routes (community hub, funding-opportunities, programs/[programId], project profile)
for `new Date(` and `Date.now(` in render paths and fix them all in one push.

## Warnings (routes prerender)
grant routes' `generateMetadata` → `getProjectGrants` authorized (`project-grants.service.ts:40`) → `publicReadOptions()` still pending.
