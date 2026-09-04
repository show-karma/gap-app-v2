# Phase 2 queue — clearing the way to `cacheComponents` + `partialPrefetching`

Source of truth for scope: `.maestri/reports/phase-2-triage-matrix.md` (module-first) and
`.maestri/reports/task-4-cachecomponents-readiness.md`. All PRs are drafts against
`feat/instant-navigations`; flags stay OFF until P2-6. Nothing merges to main.

## Decisions (Tech Leader, 2026-09-01)
- D1 **Chrome route groups — APPROVED.** Root layout renders html/body/providers only; a
  `(chrome)` route group owns navbar + footer; the four bare sections (`nonprofits/find-funders*`,
  `admin/studio`, `ask-karma`, the two donor-research token routes) sit outside it with their own
  shells. Deletes the four `usePathname()` section tests. Own PR, own no-JS parity gate.
- D2 **Public loaders drop the auth token — APPROVED with a hard gate.** The four loaders that
  still default `isAuthorized: true` (`services/projects-explorer.service.ts`,
  `src/features/funding-map/services/funding-programs.service.ts`,
  `utilities/queries/v2/getCommunityData.ts`, `services/project.service.ts`) pass
  `isAuthorized: false` on the server path. GATE: a test proving the indexer returns the same
  public payload with and without `Authorization` for each endpoint, and any role-scoped extras
  move to a client fetch or a boundary BELOW crawlable content. Only after that gate may
  `"use cache"` touch these loaders. This is the cache-poisoning line; do not cross it early.
- D3 **`generateStaticParams` builds only `karma`.** Tenant shells render on demand and persist
  after the first request (documented Next behavior). `listTenantParams()` stays for validation.
  Cuts the 1477-page cross-product to ~185.
- D4 **Blog `draftMode()` → product decision, routed to the user.** Default if unanswered: a
  separate preview route for editors (Block class), the public `/blog/*` never reads draftMode.
- D5 **Edge-runtime OG routes → spike first, not a decision.** Verify whether `ImageResponse`
  on the nodejs runtime needs `sharp` at all (belief: it does not). Report before changing runtime.

## Work items (owner assigned at dispatch)
| ID | Item | Size | Depends on |
|---|---|---|---|
| P2-1 | Group S chrome route-group restructure (D1) + the 3 small Group S items (useAuth, useAgentContextSync effect-local reads; ContributorProfileDialog leaf Suspense) | L | TASK4-MERGE, TASK5 |
| P2-2 | Segment-config cleanup: 34 exports / 23 files — `force-static` route handlers → `"use cache"` + `cacheLife("hours")` (3600s parity), remove `dynamic`/`revalidate` exports on blog, nonprofit-research token pages, project layout (replace with the class-appropriate mechanism), D5 spike on the two edge OG routes; plus D3; plus `export const instant = false` on the 5 Block routes (verify it is inert with flags off) | M | TASK4-MERGE |
| P2-3 | D2 gate + `"use cache"`/`cacheLife` on the 8 Cache-class loaders (60s blog/project, minutes community/programs/funding-map) with `cacheTag` per slug | L | P2-2, D2 gate passed |
| P2-4a | Leaf Suspense: Group M (manage sidebar/breadcrumbs) + Group A (admin/funding-platform one-offs; the 4 server `searchParams` readers take it as a prop into a Suspense child) | M | TASK4-MERGE |
| P2-4b | Leaf Suspense: Group P (project profile; server-handed values on the crawlable profile route), Group C (community hub navigator server-side; Impact filter panel single boundary), Group F (forms), Group N (details + token routes) | M-L | P2-1 (Group N navbar) |
| P2-5 | Playwright `instant()` suite for the top 10 navigations + rewrite the route-file-structure test premise (crawlable = Cache-class, never Stream) | S | P2-1..4 |
| P2-6 | Flip `cacheComponents` + `partialPrefetching` on the integration branch, full no-JS parity + whitelabel + Navigation Inspector pass, selective `<Link prefetch>` on high-intent links | M | all above |

Rule for every item: verify with the throwaway `cacheComponents: true` +
`experimental.prerenderEarlyExit: false` build and record the failing-route count before/after
in the PR body. Same environment rules as Task 4.
