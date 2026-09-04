# TASK-P2-6B5 — three frames fixed, per frame (Frontend Dev #2, 2026-09-02)

**PR #2107 `feat/stream-page-params`, head `24005bcf7`** (was `8174b8d9a`, fast-forward — no force
needed). `tsc --noEmit` exit 0. `biome lint` clean on all 7 touched files. **258 tests / 27 files
green** (`--pool=forks --maxWorkers=2`), including all 25 files that exercise the `Link` wrapper.
No build, no dev server, nothing left running.

Three commits, one per frame:

```
24005bcf7 fix(prerender): drop the useParams read from useUrlBuilder
c5654abca refactor(financials): keep the heading in the shell and stream the table
f85d3e7e8 fix(cache): read community data through the cached twins on the donate routes
```

---

## Frame 1 — `donate`, `donate/[programId]`, `donate/[programId]/checkout`

`donate/layout.tsx:27-29`, `await params` then uncached `getCommunityDetails`.

Both reads in that layout (the body one and the `generateMetadata` one) now go through
`getCommunityDetailsCached`. `donate/[programId]/page.tsx` gets the same treatment for
`getCommunityProjects` → `getCommunityProjectsCached`, which you approved as (c) — that twin takes
every argument into its key, so the per-program grid gets its own entry rather than colliding with
the default one. **Both twins are Alpha's, reused as-is: no second cached function, no new
`cacheLife` or `cacheTag`.**

The `await params` on line 28 is not the blocker — it resolves from the build-time community
sample. The loader was.

## Frame 2 — `financials`, option (a) as decided

`prefetchFinancialsData` (payouts + KYC config, uncached `api.*`) **and** `PublicControlCenter`
itself (it reads `useSearchParams()` for filter state) both sat in the page body. Either alone
stops the prerender, so both are now behind one Suspense boundary with the route's own
`loading.tsx` as fallback. **The seed is not cached**, per your call — payouts and KYC are
per-community operational data and a cached response has to belong to no one.

The `<h1>` stays in the shell: the `PageHero` moves up into the server component, above the
boundary.

**One consequence you should see coming, because it is inherent rather than incidental.** That hero
was a two-column grid — title on the left, four live counts on the right — and those counts are
derived from the payouts the boundary is waiting on. They cannot prerender. So the title block is
now full width in the shell and the counts render as a standalone `KpiStrip` inside the streamed
content. **Prerendering the heading and streaming the data cannot both happen and keep that grid.**
If you would rather keep the two-column look and give up the prerendered heading, say so and I will
put it back.

Tests followed the split rather than being loosened: the component suite asserts the KPI strip it
now owns (the heading assertions moved out because the heading did), the whitelabel smoke test
asserts the heading renders in the shell *and* that the control center does not, and
`community-cover-group.test.tsx`'s "exactly one `<h1>`" guard is **untouched and passes**.

## Frame 3 — `reports/[runDate]`, `reports/[runDate]/[configSlug]` — and a finding

`hooks/use-url-builder.ts:23` `useParams()` inside `Link`, via `CommunityCoverBar`, via the
`(cover)` layout. The `useParams()` call is gone. Diff is the hook only — **no provider, no layout
change** — and that needs explaining, because it is less than the shape you approved.

**There is no `[community]` segment anywhere in the route tree.** I checked before touching
anything: `find app -type d | grep '\[community\]'` returns nothing. Community routes are
`app/t/[tenant]/(chrome)/community/[communityId]/**`. So `params.community` resolved to `undefined`
on every route in the app, and `targetCommunity` — what `Link` passes as `communityFallback` — was
already the only source this hook has ever had. Deleting the read is therefore byte-identical
**everywhere**, not just outside community routes.

Which means the context-provider version would not have been a port of that fallback — **it would
be new behaviour**: links inside `/community/[communityId]/**` would start picking up a `/<slug>`
prefix on shared subdomains where today they do not. That may well be a bug worth fixing (the hook
is documented as "builds a URL with proper community prefix for shared subdomains" and it has
silently not been doing that outside explicit `communityFallback` callers), but it is a live
change to every link on those hosts and it deserves its own decision rather than riding in on a
prerender fix. **Your call — I will build the provider on your word.** The commit body records the
reasoning so the next reader does not re-derive it.

All 25 `Link` test files pass unchanged, which is the byte-identical claim under test rather than
asserted.

Worth flagging beyond my lane: `hooks/useDuplicateGrantCheck.ts:26,40,46` reads `params.community`
the same way and is therefore also always-undefined. I did not touch it — it is not in a frame and
not in my list.

## Notes

- `PublicControlCenter.tsx` carries a pre-existing
  `lint/complexity/noExcessiveCognitiveComplexity` warning at `:74`. It is not mine — I verified it
  on the stashed original, and my change only removes code from that function.
- Standing by on the pre-flip cleanup (raw `getCommunityPrograms` readers on
  `manage/portfolio-reports/config` and `manage/milestones-report` still reaching `cookies()`).
  Not started, as instructed.
- Still no Vercel credentials, so the frames file remains the channel. It has worked well.

---

## Addendum — the rule behind the frames (from the Tech Leader, read by Alpha in `next/dist/client/components/navigation.js`)

- `useSearchParams()` aborts a prerender **unconditionally**.
- `usePathname()` / `useParams()` abort **only** when a route param is not a build-time sample.
- `useSelectedLayoutSegment()` behaves like `useParams()`.
- Therefore: a `useSearchParams()` above content must move into a leaf regardless; a
  `usePathname`/`useParams` frame on a nested route can equally be answered by a
  `generateStaticParams` sample for that segment.

Checked against what I have pushed. Three notes:

**It retro-validates the financials decision, and narrows it.** `PublicControlCenter` reads
`useSearchParams()`, so the boundary there was mandatory — no sample and no prop could have
avoided it. That means hoisting the heading was not one of two ways to keep the `<h1>` in the
shell; it was the only one. Option (a) was the right call for a stronger reason than we had at the
time.

**Sampling was not the better answer for any frame I fixed.** The unsampled segments in my lane
were `[programId]`, `[reportId]` (manage), `[id]` (find-funders), `[handleId]`, `[runDate]` — all
unbounded, user-created ids where a `generateStaticParams` sample buys one prerendered instance and
leaves the rest on the runtime path. The prop / route-group / removed-hook fixes clear the whole
segment instead. Where a sample *is* the cheaper answer, it is on routes whose id space is small
and known — worth Alpha's attention on `[grantUid]` and `[programId]` more than mine.

**One possible pre-flip simplification, not acted on.** The page-level Suspense boundaries from
P2-6B (`5f605f37d`, the six Stream routes) were added when I still believed the page's own `params`
read was the blocker. It was not — the layouts were. Those boundaries may now be redundant. They
are cheap and harmless, and removing them risks re-breaking six routes that are currently verified
clear, so I have left them. If you want them gone before the flip merges, that is one build to
confirm, and I would rather do it deliberately than fold it into other work.

**My lane is empty** until the next build names something: donate ×3 and reports/[runDate] ×2 are
pushed, everything else on the 31 is Alpha's, and the `getCommunityPrograms` cleanup is on hold at
your instruction.
