# Phase 2 triage matrix — Instant Navigations

Input for the `cacheComponents` + `partialPrefetching` flip. **Nothing here has been
implemented** — this is the plan. Measured on `feat/tenant-root-param-routes` @ `ec1676f1c`
(PR #2094), Next 16.3.3.

## How the numbers were produced

A static import graph, not grep. For each of the 161 page routes the walker starts at
`page.tsx` plus every `layout.tsx` on its chain up to the root layout, follows `@/…` and
relative `import` / `import()` / `require` edges, and records any module calling
`usePathname()` or `useSearchParams()`. The scripts (`graph.py`, `loaders.py`, `tm.py`) sit
in the scratch clone at `%TEMP%\sg\t4a\.phase2\` and are **not committed** — say the word and
they go into the repo, but they are throwaway analysis, not product code. Every count below is
reproducible from them rather than eyeballed.

Caveat worth stating up front: static reachability is an upper bound on runtime execution. A
module the graph finds may be behind a flag that never fires (see §1, where several loaders
reach `cookies()` only because a default argument says so). Where that mattered, it is called
out.

Grep alone finds 48 `useSearchParams` files and 46 `usePathname` files. The graph shows
**71 of them are actually reachable from a route**; 7 are reachable from nothing (§5). One
apparent hit — `app/t/[tenant]/layout.tsx` — is a false positive: the string only appears in
a comment.

**A correction to the readiness proof.** It reported "2 shell items". That was an artefact of
the export bailing at the first bad route. The graph shows the shell carries **nine**
hook-bearing modules plus the footer's `new Date()`. The readiness report has been annotated;
this document supersedes its §B.

---

## 1. Route classes

| Class | Count | Which |
|---|---:|---|
| **Cache** | 53 | exactly the `SITEMAP_NO_LOADING` set in `__tests__/app/route-file-structure.test.ts`. Crawlable, so DEV-612 forbids a Suspense boundary above their content — `"use cache"` is the only tool, never `[stream]`. |
| **Block** | 5 | `oauth/consent`, `auth/token-bridge`, `s/[slug]`, `nonprofit-research/shared/[token]`, `nonprofit-research/diligence/[token]` — token/capability routes. `export const instant = false`. Never `"use cache"` near `TokenManager`-authorized data (cache-poisoning gate). |
| **Stream** | 103 | everything else: app surfaces behind auth — `community/**` 50, `project/**` 12, `admin/**` 8, `nonprofits/**` 8, `nonprofit-research/**` 7, plus 18 singletons. Suspense is free here. |

### The Cache class is much cheaper than it looks

45 of the 53 crawlable routes make **no server data access at all** — the marketing pages, all
25 knowledge articles, `mcp/connect`, `nonprofits/find-funders*`, `seeds`, `privacy-policy`,
`terms-and-conditions`. Once the shell is unblocked they prerender for free, with no
`"use cache"` anywhere.

Only **8** need `"use cache"` + `cacheLife` on a loader:

| Route | Loader modules to annotate |
|---|---|
| `blog`, `blog/[slug]` | `sanity/lib/gateway.ts` |
| `projects` | `services/projects-explorer.service.ts` |
| `funding-map` | `src/features/funding-map/services/funding-programs.service.ts` |
| `community/[communityId]/(with-header)` | `utilities/queries/v2/getCommunityData.ts` |
| `community/[communityId]/(with-header)/funding-opportunities` | the above + the page's own program fetch |
| `community/[communityId]/(whitelabel)/programs/[programId]` | the above + the page's own program fetch |
| `project/[projectId]/(profile)` | `services/project.service.ts`, `project-grants`, `project-impacts`, `project-updates` |

All of them funnel through `utilities/api/client.ts`, so one decision about where the
directive sits — per service, or a cached wrapper inside the client — covers the set.
`cacheLife` values should follow the `revalidate` numbers already in the tree: 60s for blog
and project profile, 3600s for the sitemap/well-known family.

### …but six of those eight read `cookies()` first, and that is the real blocker

`utilities/api/client.ts:165` defaults `isAuthorized` to **true**, so every server-side
`api.get()` calls `TokenManager.getToken()` → `getServerToken()` → `await import("next/headers")`
→ `cookies()`. The import is dynamic, inside the function, which is why a static grep for
`next/headers` importers never showed it — Frontend Dev #2 caught it in the build output for
`/funding-map`, and the import graph confirms it reaches **every data-backed crawlable route**:

| Cache-class route | Loader | `isAuthorized` today |
|---|---|---|
| `projects` | `services/projects-explorer.service.ts` | defaults to **true** → reads cookies |
| `funding-map` | `src/features/funding-map/services/funding-programs.service.ts` | defaults to **true** → reads cookies |
| `community/[communityId]/(with-header)` and its two siblings | `utilities/queries/v2/getCommunityData.ts` | defaults to **true** → reads cookies |
| `project/[projectId]/(profile)` | `services/project.service.ts` | defaults to **true** → reads cookies |
| `project/[projectId]/(profile)` | `project-grants` / `project-impacts` / `project-updates` | already support `isAuthorized: false`, and the profile SSR path passes it |
| `blog`, `blog/[slug]` | `sanity/lib/gateway.ts` | no token, but the page reads `draftMode()` — same class of problem |

This is a hard conflict, not a mechanical fix. A Cache-class route may not put a boundary
above its content (DEV-612), `cookies()` may not appear inside `"use cache"`, and the plan's
own rule forbids `"use cache"` anywhere near `TokenManager`-authorized data — caching a
token-scoped response is precisely the cache-poisoning gate.

**The fix already exists in the codebase.** `services/project-grants.service.ts:9-15` documents
it: the public project-profile SSR path passes `isAuthorized: false` "to avoid touching the
browser-only `TokenManager` on the server". The repo uses `isAuthorized: false` in 52 places
already. Extending that convention to the four loaders that still default to `true` removes
the `cookies()` read *and* makes `"use cache"` provably safe, because the cached fetch then
demonstrably carries no `Authorization` header. Role-scoped extras (admin badges, "your
application" state) move to a client fetch or a boundary placed *below* the crawlable content.

Two things to confirm before doing it, neither of which is a refactor question:

1. That the indexer returns the same public payload with no `Authorization` header. It must —
   that is what crawlers get today — but it should be asserted in a test, not assumed.
2. What `/blog/[slug]` does about `draftMode()`. Preview is request state by definition; the
   likely answer is a separate preview route or an `instant = false` on a preview-only branch,
   which is a product decision about how editors preview.

This moves the Cache-class work from **M** to **L** and makes it the second design decision in
Phase 2 after the chrome restructure. It is also the highest-risk item in the whole phase: get
it wrong and a logged-in user's role-scoped payload gets served to everyone.

---

## 2. Module inventory — module-first, grouped

`C/S/B` = how many Cache / Stream / Block routes reach the module. **A module with C > 0
cannot be fixed with a boundary above content.**

### Group S — the app shell · 9 modules · C 53 / S 103 / B 5 (every route)

This is the whole game. Nine modules block all 161 routes, and five of them are the same
problem: `usePathname()` used to decide *whether the chrome renders at all*.

| Module | Hook | What the value drives | Fix |
|---|---|---|---|
| `src/components/navbar/global-navbar-slot.tsx:12` | `usePathname` | suppresses the entire navbar on `/nonprofits/find-funders*`, `/admin/studio*`, donor-research token routes | **server-side** |
| `src/components/footer/footer-switcher.tsx:9` | `usePathname` | the same three suppressions for the footer | **server-side** |
| `src/components/navbar/whitelabel-navbar.tsx:254` | `usePathname` | `startsWith(ADMIN_STUDIO)` → render nothing | **server-side** |
| `src/components/navbar/navbar-assistant-button.tsx:79` | `usePathname` | `isAskKarmaPathname()` → render nothing | **server-side** |
| `components/DeferredLayoutComponents.tsx:77` | `usePathname` | `isAskKarmaPathname()` → drop the chat bubble | **server-side**, or leaf Suspense (renders nothing crawlable) |
| `hooks/useAuth.ts:150` | `usePathname` | read **only inside the post-login effect** (`pathname === "/"`, line 208); line 473 already uses `window.location.pathname` | **effect-local read** — delete the hook |
| `hooks/useAgentContextSync.ts:17` | `usePathname` | effect-only store sync; renders nothing | **effect-local read** — delete the hook |
| `components/Dialogs/ContributorProfileDialog.tsx:101` | `useSearchParams` | `?invite-code`; the dialog is closed by default and renders nothing until opened | **leaf Suspense** |
| `src/components/navbar/navbar-auth-buttons.tsx` | both | `?login=true`, consumed in an effect | **DONE in PR #2094** — leaf Suspense whose fallback is the skeleton the server already renders, so the HTML is byte-identical |

**One decision unlocks five of them.** `GlobalNavbarSlot`, `FooterSwitcher`, `WhitelabelNavbar`
and `NavbarAssistantButton` all ask the same server-knowable question: *which section of the
site is this?* A layout cannot read the pathname on the server by design, so the answer is to
put the question in the file system — move the chrome decision into route structure instead of
a runtime string test. Two of the four suppressed sections already have their own layout
(`nonprofits/find-funders`, `admin/studio/[[...tool]]`); `ask-karma` and the two
donor-research token routes do not. The shape:

- the root layout renders `<html>`/`<body>`/providers only, no chrome;
- a `(chrome)` route group holds the navbar + footer and everything that wants them;
- the four bare sections sit outside it with their own shells — `TokenPageShell` already
  exists for the donor-research pair.

That deletes four `usePathname()` calls, drops four runtime string tests from the hot path,
and makes the suppression rules readable from the directory tree. It is also the largest item
in Phase 2 and the one most likely to regress visible chrome, so it wants its own PR and its
own no-JS parity check.

The remaining four are small and independent: two effect-local reads, one leaf Suspense, one
already done.

**Size.** Route-group restructure **L** (2–3 d, own PR, needs a full route sweep plus no-JS
parity on `/`, `/about`, `/knowledge`). `useAuth` + `useAgentContextSync` + the dialog **S**
(half a day together).

### Group M — manage chrome · 2 modules · C 0 / S 28

`components/Manage/ManageSidebar.tsx`, `components/Manage/ManageBreadcrumbs.tsx` — active-item
and breadcrumb state from `usePathname()`, on all 28 `community/[communityId]/manage/*` routes.
All Stream class, nothing crawlable. **Fix: leaf Suspense** around the sidebar and the
breadcrumb strip. Size **S** (one shared wrapper, ~2 h).

### Group P — project profile v2 · 6 modules · C 1 / S 11

`ProjectProfileLayout`, `ProjectInviteCodeWatcher`, `SidebarProfileCard`, `EndorsementDialog`,
`GrantDetailLayout`, `UpdatesContent`. The one Cache-class route is
`project/[projectId]/(profile)`, so **`SidebarProfileCard` and `ProjectProfileLayout` must not
get a boundary above content there** — they need the value handed down from the server segment
(`params.projectId` already identifies the page, and the tab is a route segment, not a query).
`ProjectInviteCodeWatcher` and `EndorsementDialog` render nothing → **leaf Suspense**.
Size **M** (1 d).

### Group C — community hub + impact dashboard · 11 modules · C 2 / S 6

`Community/Header`, `CommunityContentWrapper`, `CommunityPageNavigator` (C 2 — reachable from
the crawlable `(with-header)` hub, so **server-side or leaf only**), plus the Impact cluster:
`ImpactCharts`, `ProgramBanner`, `CategoryRow`, `TrackFilter`, `ProjectFilter`, `FilterRow`,
`ImpactTabNavigator`, `hooks/useAggregatedIndicators`. The Impact cluster is one coherent
URL-filter-state feature on Stream routes, so **a single Suspense boundary around the filter
panel covers all eight**. Size **M** (1 d), of which the crawlable navigator is the fiddly part.

### Group F — grant and update forms · 7 modules · C 1 / S ≤13

`Forms/ProjectUpdate`, `Forms/MilestoneUpdate`, `Milestone/MilestonesList`, the five
`Pages/GrantMilestonesAndUpdates/screens/NewGrant/*` screens, and `CompleteGrant`. All
authoring surfaces behind auth. **Leaf Suspense** at each form root; several are already
lazily mounted, which makes this mostly mechanical. Size **M** (1 d).

### Group N — non-profits + donor research · 5 modules · C 4 / S 7 / B 2

`non-profits-navbar` (C 4 — the crawlable `nonprofits/find-funders*` set), `foundation-detail`,
`grant-detail`, `nonprofit-detail`, `DonorResearchShell`, and
`app/t/[tenant]/nonprofit-research/layout.tsx`. The navbar is the same class of problem as
Group S and is fixed by the same route-group work. The three `*-detail` pages and the shell
are Stream/Block → **leaf Suspense**, and the two token routes take `instant = false`
regardless. Size **S–M** (half a day once Group S lands).

### Group A — admin, funding platform, one-offs · ~20 modules · C 0 / S 1 each

`useControlCenterUrlState`, `useApplicationListFilters`, `useApplicationDetailView`,
`use-url-tab-state`, `MilestonesReview`, `PortfolioReports/ReportConfigPage`, `QuestionBuilder`,
`SendEmailComposer`, `ApplicationFormClient`, `FundingOpportunitiesClient` (**C 1** — crawlable,
so it needs the leaf treatment, not a wrapper), `ProgramRegistry/*` ×3, `EvaluatePage`,
`useGrantsTable`, `useSlackInstallResultToast`, `PublicControlCenter`, `ProjectDialog`,
`AboutScrollHandler`, `ImpactContent`, `Project/Roadmap`, plus four `manage/funding-platform`
pages reading `searchParams` directly.

Single-route, URL-as-state widgets on Stream routes. **Leaf Suspense** each — or, better, for
the four pages that read `searchParams` in the server component, take `searchParams` as a prop
and pass the value down, which removes the hook entirely. Size **M** (1–2 d), fully
parallelisable: no shared decisions.

---

## 3. The 34 segment-config exports — 23 files

`cacheComponents` rejects these at compile time, before any route renders, so Phase 2 clears
them first or it cannot measure anything.

| Files | Current | Proposed |
|---|---|---|
| 8 × `app/.well-known/*/route.ts`, `app/openapi.json/route.ts` | `dynamic = "force-static"` + `revalidate = 3600` | `"use cache"` in the handler + `cacheLife({ revalidate: 3600 })`. Same semantics, and the cleanest conversions in the repo — pure JSON built from constants. |
| `app/sitemap.xml`, `sitemap_index.xml`, `sitemap-index.xml`, `sitemaps/[kind]/sitemap.xml`, `sitemaps/[kind]/sitemap/[chunk]` | `dynamic = "force-dynamic"` | drop it — these read live data, which is dynamic by default. Verify `api/cron/warm-sitemaps` still warms what it used to. |
| `app/api/cron/warm-sitemaps/route.ts` | `dynamic = "force-dynamic"` | drop it (cron, always dynamic). |
| `app/sitemaps/static/sitemap.ts` | `revalidate = 3600` | `"use cache"` + `cacheLife`. |
| `app/t/[tenant]/blog/page.tsx`, `blog/[slug]/page.tsx` | `revalidate = 60` | `"use cache"` + `cacheLife({ revalidate: 60 })` on the Sanity loader — Cache-class routes, so this is the same change §1 already asks for. |
| `app/t/[tenant]/project/[projectId]/layout.tsx` | `revalidate = 60` | same, on `services/project.service.ts`. |
| `nonprofit-research/{shared,diligence}/[token]/page.tsx` | `dynamic = "force-dynamic"` | replaced by `export const instant = false` (Block class). |
| `app/api/metadata/knowledge/route.tsx`, `app/api/scanner/og/[slug]/route.tsx` | `runtime = "edge"` | **⚠ needs a decision — below.** |

**⚠ Flag: the two edge-runtime OG routes.** Both render `next/og` `ImageResponse`, and the
comment in `scanner/og` records that the nodejs runtime "silently fails with empty responses
under turbopack dev when sharp is not installed". Moving them to nodejs therefore means adding
`sharp` as a dependency and re-verifying OG output on Vercel *and* on the self-hosted
standalone build. The alternatives are keeping them on edge and accepting that
`cacheComponents` cannot be enabled while they exist, or moving OG generation out of the app
entirely. This is a product/infra call, not a refactor, and it can block the flag on its own,
so it should be settled before Phase 2 starts. The runtime is deprecated regardless — the
build already warns *"The Edge Runtime is deprecated. You can use the 'nodejs' runtime
instead."*

Not among the 34, but deleted by the same work: `export const dynamic = "force-dynamic"` on
`app/t/[tenant]/layout.tsx`. It comes out segment by segment as each group above clears — it
is the ratchet, and the last line Phase 2 deletes.

---

## 4. The shell's non-hook blocker

`src/components/footer/footer.tsx:54` — `const currentYear = new Date().getFullYear()`.
*"Next.js encountered the unstable value `new Date()` in a Client Component."* Every route.
Fix: compute the year in the server component that renders the footer and pass it as a prop.
Size **XS**. `__tests__/components/Footer.test.tsx` asserts on the live year in three places
and needs the same prop. Watch the New Year edge: a prerendered footer shows a stale year
until the next deploy, so if that matters the year belongs in a `cacheLife`-d cached function
rather than a build-time constant.

---

## 5. Reachable from nothing — resolve before estimating

Seven hook-bearing modules are not reachable from any page route. Either they are dead, or the
graph missed a dynamic edge (a `next/dynamic` with a computed specifier). Worth settling early,
because dead code that looks like work inflates every estimate above:

`components/Forms/GrantUpdate.tsx`, `components/Pages/Admin/PayoutsAdminPage.tsx`,
`components/Pages/Communities/Impact/StatCards.tsx`, `components/Pages/Project/Impact/index.tsx`,
`components/Pages/Project/ProjectWrapper/ProjectNavigation.tsx`,
`components/Pages/Project/v2/Header/ProjectHeader.tsx`,
`components/Pages/Project/v2/Navigation/ProjectNavigationTabs.tsx`.

Also confirmed dead and unrelated to hooks: `src/infrastructure/providers/get-tenant-server.ts`
reads the request host via `headers()` and is imported by nothing — flagged during 4A, still
there.

---

## 6. Suggested sequencing and total size

| # | PR | Size | Unblocks |
|---|---|---|---|
| 1 | Segment configs: `"use cache"` + `cacheLife` conversions, drop the redundant `force-dynamic`s | **M**, 1 d | nothing renders under the flag until this lands |
| 1b | Edge-runtime OG decision | **?** | can block everything — decide first |
| 2 | Shell smalls: `useAuth`, `useAgentContextSync`, `ContributorProfileDialog`, footer year | **S**, 0.5 d | — |
| 3 | Chrome route-group restructure | **L**, 2–3 d | **all 161 routes**; the 45 no-data crawlable routes go green on this PR alone |
| 4a | `isAuthorized: false` on the four public loaders + a test that the indexer needs no token | **M**, 1 d | prerequisite for 4b — highest risk in the phase |
| 4b | Cache-class loaders: `"use cache"` + `cacheLife` (8 routes) | **M**, 1 d | the remaining 8 crawlable routes |
| 4c | `draftMode()` decision for `/blog/[slug]` | **?** | 2 crawlable routes |
| 5 | Group M + Group P + Group C | **M**, 2 d | 28 + 12 + 8 Stream routes |
| 6 | Group F + Group N + Group A | **M**, 2–3 d | the Stream tail |
| 7 | Block-class `instant = false` (5 routes), then flip `cacheComponents` | **S**, 0.5 d | — |

**≈ 10–12 engineer-days.** Two items need a decision before anyone writes code — item 3 (the
chrome route groups) and item 4a (dropping the auth token from public loaders); 4a is the
riskiest thing in the phase, because getting it wrong serves one user's role-scoped payload to
everyone. Item 1b may block the flag entirely on its own. Items 5 and 6 are fully
parallelisable and need no decisions.

---

## 7. Two process constraints worth planning around

- **The build bails at the first errored route.** `experimental.missingSuspenseWithCSRBailout`
  is gone in Next 16, so there is no sweep that lists every offender. That is why this matrix
  is built from a static import graph rather than build output — and why "run the build and
  fix what it says" is not a viable Phase-2 plan.
- **`"use cache"` requires the flag to be on.** It cannot be added incrementally ahead of the
  flip, so items 1 and 4b can only be *written* against a local `cacheComponents: true`, never
  merged in a working state. They belong in the same PR train as the flip — ordered behind it,
  but not separated from it by a release. Items 2, 3, 4a, 5 and 6 have no such constraint: they
  are all plain refactors that can land and ship one at a time, ahead of the flag, each
  verifiable on its own. Sequence the phase so that everything mergeable lands first and the
  flag-dependent remainder is one short train at the end.

## 8. Related work outside this matrix

Frontend Dev #2 flagged one Tech-Leader decision in the 4B report that touches Phase 2:
public `/t/*` currently answers a bodyless 404 rather than the branded not-found page. Either
answer is compatible with everything above — noting it so the two reports do not drift.
