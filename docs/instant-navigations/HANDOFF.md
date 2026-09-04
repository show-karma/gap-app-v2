# HANDOFF — Next.js 16.3 Instant Navigations for gap-app-v2 (2026-09-02, ~21:00Z)

Written by the Tech Leader session so the work can be resumed from any machine. Everything below is
verified against GitHub/Vercel at the time of writing. Companion files: `docs/instant-navigations/briefs/*` (task briefs,
phase-2 queue, merge checklist), `docs/instant-navigations/reports/*` (every dev report and every Vercel log digest),
`docs/instant-navigations/memory/*.md` (the Tech Leader's memory notes, copied verbatim).

## 1. Where we are — one number
**161 → 4 failing paths (3 routes)** on the `cacheComponents` build. Everything else prerenders.
Remaining, each with a named frame (`docs/instant-navigations/reports/vercel-log-2111-a402088ce-tl-frames.md`):

| Route | Frame | Fix in progress (Alpha) |
|---|---|---|
| `community/[communityId]/programs/[programId]` (×2 samples) | `utilities/funding-programs.ts:78` `new Date()` in client render | compute deadline flag on the server / defer |
| community hub `community/[communityId]` | `hooks/useProjectFilters.ts:17` nuqs in `components/CommunityGrants.tsx:63` | third toolbar split (grid from server default, filters in a link-free leaf) |
| `community/[communityId]/funding-opportunities` | `src/features/programs/hooks/use-programs.ts:13` `matchesStatus` `new Date()` in a render-time filter | status computed in the cached seed / deferred |

Plus a warning-level item: grant routes' `generateMetadata` → `getProjectGrants` still authorized → `publicReadOptions()`.
Alpha was mid-way through a repo sweep of `new Date(`/`Date.now(` in Cache-class render paths when the handoff started;
see `docs/instant-navigations/reports/handoff-alpha.md` for its exact state.

## 2. Branches and PRs (repo `show-karma/gap-app-v2`) — NOTHING is merged to `main`
```
main
└─ feat/instant-navigations  @ a3603d882   integration branch (no CI runs on it — PR-only signal)
   ├─ merged in: #2089 next 16.3.3 · #2090 root layout · #2094+#2093 tenant root param (/t/[tenant]) ·
   │             #2095 shell fixes+global-not-found · #2096 chrome route groups · #2097 segment configs ·
   │             #2098 public loaders no auth · #2099 community hub cleanup · #2104 route-structure premise ·
   │             #2101 manage/admin leaf Suspense · #2102 funding-opportunities toolbar split · #2103 instant() suite
   ├─ feat/use-cache-route-handlers (#2100, use cache on JSON handlers) ─ rebased on integration
   └─ feat/cache-components-flip (#2105, DO NOT MERGE — the flag-flip candidate)  @ 2d8e25dc0
        flags ON, experimental.prerenderEarlyExit:false + --debug-prerender + build ceiling = TEMPORARY diagnostics
        ├─ merged in: #2108 (auto-merged) loaders/seeds/samples · #2107 (auto-merged) Dev #2 section fixes + Link hook fix
        └─ feat/cache-loaders (#2111, DO NOT MERGE) @ a402088ce+  ← Alpha's live branch, all remaining fixes
   open drafts vs integration: #2112 verify-flip-preview script · #2113 use-cache auth guard test
older, on main: #2051 (streaming community pages, green, awaiting human review) · #2089 branch-only until 2026-10-02 (release-age guard)
```
**Gotcha:** merging a stacked branch into its base PR branch auto-MERGES its PR on GitHub, and Vercel only
builds PR branches → after every such merge, open a NEW draft PR before judging a build.

## 3. Rules that are load-bearing (all learned the hard way)
- **Resource rules (user's machine froze once):** no full vitest suites locally (touched files only,
  `--pool=forks --maxWorkers=2`); NO local `next build` — Vercel builds PR branches; no local Playwright;
  Vercel MCP tools hang teammate processes — read logs via `gh pr checks`, the bot comment, or the
  Tech Leader's connector; kill loops when a turn ends.
- **No AI attribution** in commits/PR text (repo CLAUDE.md; history was rewritten once to enforce it).
- **Fix only from a named frame.** Inference-based fixes hit the wrong reader three times. `--debug-prerender`
  stays on until zero. Progress signal = per-frame, not the total (a route leaves the list only when its
  whole chain is clear).
- **Next internals rule** (`navigation.js`): `useSearchParams()` aborts a prerender unconditionally;
  `usePathname()`/`useParams()` abort only when a route param is not a build-time sample;
  `useSelectedLayoutSegment()` behaves like `useParams`. Hence: search-params reads → link-free leaf;
  params/pathname above content → `generateStaticParams` sample or server prop.
- **Every `generateStaticParams` must return ≥1 value** under cacheComponents (hard build error). Samples
  come from live data with a real-uid fallback; never fabricated, never `[]`. Redirect-only pages get
  `instant = false` instead.
- **`api.*` loaders are axios**: Next fetch-cache options never apply; only `'use cache'` works. Nothing
  inside a cache scope may reach the token (`publicReadOptions()`); #2113 is the ratchet.
- **React Query:** `staleTime: 'static'` avoids the observer's `Date.now()` (opt-in, above-content consumers
  on Cache-class routes only); server seeds (`prefetchQuery`/`setQueryData`/`dehydrate`) go inside the cached
  seed function (`buildDehydratedState`).
- **DEV-612:** crawlable routes (53 `SITEMAP_NO_LOADING`) = Cache-class, never a boundary above content;
  acceptance = visible-char + link-graph parity with every hidden chunk audited.
- Quality gate: compare NON-format biome diagnostics vs merge-base; knipUnusedTypes is a separate metric;
  fix at source, never bump the baseline.

## 4. Decisions still open for the user
1. **Cache invalidation at launch:** only the blog webhook calls `revalidateTag`; community/project/program
   surfaces refresh on time only (60 s / minutes). Default = accept for launch, wire mutation/webhook
   invalidation as follow-up.
2. Blog draft-mode preview: default = separate `/blog/preview/[slug]` (Block) — implemented on #2111's lineage; veto if unwanted.
3. `/communities` renders no community links without JS (pre-existing, `finding-communities-cards-no-js.md`) — parked.
4. Human-gated: re-auth the repo's Claude OAuth secret (bot checks red everywhere); a staging staff Privy JWT
   for `scripts/record-d2-parity.mjs`; rename duplicate canvas terminals ("Frontend Dev" ×2, "Tech Leader" ×2).

## 5. How to resume
1. Read `docs/instant-navigations/reports/handoff-alpha.md` and `handoff-dev2.md` (dev-level state), then
   `docs/instant-navigations/briefs/instant-nav-p2-6-checklist.md` (flip merge checklist) and `instant-nav-phase-2-queue.md`.
2. Finish the 3 frames on `feat/cache-loaders` (PR #2111); read each Vercel build with
   `timeout 120 npx vercel inspect <dpl> --logs` or the PR's Vercel link; write digests to
   `docs/instant-navigations/reports/vercel-log-2111-<sha>-tl-frames.md`.
3. At zero paths: merge #2111 into the flip (then open a new PR!), run `scripts/verify-flip-preview.mjs <preview-url>`
   (#2112) for sample-prerender + no-JS parity + whitelabel, unskip the `instant()` Playwright suite (#2103) and
   read its skip count, remove the three diagnostics in one commit, delete `KNOWN_OFFENDERS` entry in #2113.
4. Then the flip PR (#2105) is a merge decision into `feat/instant-navigations`, and that branch → `main` is the
   user's review (nothing merges to main without them).
5. Team on the Maestri canvas: `FE Dev Alpha` (Opus [High], Frontend Specialist; scratch clone `%TEMP%\sg\t4a`)
   and `Frontend Dev #2` (Opus [High]; clones `%TEMP%\sg-next163`, `%TEMP%\sg\p25`). Both idle-safe; re-brief from
   `docs/instant-navigations/briefs/instant-nav-alpha-restart-brief.md` / `instant-nav-dev2-restart-brief.md` if restarted.
