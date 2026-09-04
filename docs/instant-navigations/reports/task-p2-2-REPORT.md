# TASK5-C / 5-D + TASK-P2-2 / P2-2B — Report (Frontend Dev #2)

---

# TASK5-C — the quality gate on PR #2095

**Root cause: a path rename, not new debt.** The oversized-file baseline keys on a path.
Alpha's move of the page tree left `oversizedFiles` pointing at
`app/community/[communityId]/manage/funding-platform/page.tsx`, which no longer exists — so the
same 717-line page read as a brand-new over-limit file and failed the gate. Exactly one baseline
entry was stale; nothing else in the file was affected.

Fix: rename the key to `app/t/[tenant]/community/[communityId]/manage/funding-platform/page.tsx`.
Same file, same 717 lines, same limits. **Offender count is 66 before and after** — nothing
added to the baseline, no limit relaxed, no allowlist widened.

Reproducing it locally took a detour worth recording: `pnpm quality` reports *zero* oversized
files on Windows regardless of the tree, because `scripts/quality-gate.js:444` runs
`execSync("git ls-files '*.ts' …")`, and under `cmd.exe` those single quotes are literal, so the
enumeration returns nothing. I re-ran the scan with the script's own `matchGlob` and a correct
file list: **66 offenders, 1 regression before the fix, 0 after.**

A second job then failed: `baseline-guard` requires the `quality-baseline` label on any PR
touching that file. That is the guard's designed authorization path, not something to work
around, so I added the label — noting it here because it is a deliberate repo-state change.

## TASK5-D — the second quality-gate failure on #2095

The oversized-files regression was gone (66/66, Δ0) but the gate went red again on a different
metric: **React Doctor errors 64 → 65 (+1)**. Pulled from the run log rather than waited on, as
you asked.

Cause: `app/global-not-found.tsx` exported `metadata` next to the component, which is
react-doctor's `only-export-components` (`Fast refresh only works when a file only exports
components`). It was the file I added, so the +1 was mine.

Fix: drop the `metadata` export and render `<title>` and `<meta name="robots">` in the JSX —
React hoists both into `<head>`, so the branded title and the noindex hint survive with one
export left in the file. The 404 status is what actually keeps the page out of an index anyway.
Also collapsed `px-4 py-4` to `p-4`, which the same run flagged as a warning. **No allowlist
widened.**

Verified: react-doctor errors 113 → 112 locally with `global-not-found.tsx` contributing none,
and on a production build both hosts still answer `/does-not-exist-xyz`, `/t/karma/about` and
`/t/nope/about` with 404 + the branded page + the right title and robots tag.

**`quality-gate` now passes on #2095**, along with `baseline-guard`, `react-doctor` and
`static-checks`.

## Also on #2095, per your earlier message

`src/components/footer/footer-switcher.tsx` deleted and `TenantFooter` now picks the footer
directly, matching #2096's shape plus the
`copyrightYear` prop. It had no tests of its own; its two remaining references were comments,
now pointing at the route tree.

> **Ordering constraint — please hold this.** #2095 alone regresses: nothing then suppresses the
> footer on `/admin/studio`, `/nonprofits/find-funders` and the donor-research token routes. A
> server component cannot read the pathname, which is why the switcher was a client component;
> only #2096's route groups replace it. **#2096 must merge before or together with #2095.**
>
> And when the two merge, `TenantFooter` must keep `copyrightYear={COPYRIGHT_YEAR}`. #2096's
> copy calls `<Footer />` with no props, and `Footer` now requires it — taking #2096's version
> wholesale breaks the build.

---

# TASK-P2-2 — segment-config cleanup

Now **two** PRs after the split (see TASK-P2-2B below):

- **#2097** `feat/segment-config-cleanup` — flag-free. `connection()`, the OG `runtime`
  removals, D3.
- **#2100** `feat/use-cache-route-handlers` — the `"use cache"` conversions and
  `experimental.useCache`. **DO NOT MERGE BEFORE P2-6.**

`cacheComponents` and `partialPrefetching` stay **off** in both.

## Four compiler facts that changed the plan

A probe build settled these before any real work. None could have been known without running it:

1. **`"use cache"` only goes on an `async` function returning a serializable value.** A sync
   `export function GET()` fails, and a `Response` cannot be the cached value. So the cached
   unit is the JSON body and `GET` is a thin wrapper.
2. **`export const instant = false` is a hard build error with `cacheComponents` off** —
   *"Route segment config `instant` requires `nextConfig.cacheComponents` to be enabled."* It is
   **not inert**, so that sub-item cannot be done in this PR at all; it moves to P2-6.
3. **`experimental.useCache` alone already bans `runtime`** — any value, `"nodejs"` included.
   So D5 was not deferrable; it had to be answered here.
4. **Dropping `force-dynamic` is not the same as replacing it.** `/sitemap.xml` with the export
   simply deleted flips to `○` — statically prerendered, `x-nextjs-cache: HIT`. That is exactly
   what the file's own comment warns about: the indexer gets called during the build and the URL
   list is frozen. The matrix's "drop it — these read live data, which is dynamic by default"
   would have shipped a silent SEO regression. `connection()` is the replacement.

## D5 spike — **nodejs does not need `sharp`**

Your belief was right; the in-code comment claiming otherwise is scoped to turbopack *dev*.

- **Source:** `next/dist/compiled/@vercel/og/index.node.js` —
  `getSharp()` is `try { await import("sharp") } catch { return undefined }`, and `render()`
  branches `if (sharp) {…} else { new resvg.Resvg(svg, …) }`. Sharp is an optional accelerator;
  without it the node build uses the **same resvg-wasm renderer edge uses**.
- **Empirical**, production build, `sharp` neither installed nor in `package.json`: both routes
  return valid **1200×630 PNGs** — `/api/metadata/knowledge` 33 453 bytes,
  `/api/scanner/og/<slug>` 27 294 bytes, `image/png`, 200.

So: drop the `runtime` export, nodejs is the default. **No dependency, no infra decision, and
the OG routes do not block the flag.** Edge is deprecated in 16.3 regardless.

## Done — 15 of the 33 exports (all the route-handler ones), both `runtime` exports, and D3

Split across the two PRs: everything below the `connection()` line is #2097, the `"use cache"`
items are #2100.

- 7 `.well-known` handlers + `openapi.json` group → `async buildBody()` with `"use cache"` +
  `cacheLife("hours")` (= `revalidate: 3600`, exact parity), `GET` wraps it.
- `mcp-tools.json` and `openapi.json` keep their **fetch-level** `next: { revalidate: 3600 }`
  and are deliberately *not* wrapped: both answer 502 with different headers on upstream
  failure, and a cached function returning one value would cache the failure too.
- 5 sitemap handlers + `api/cron/warm-sitemaps` → `await connection()`.
- `sitemaps/static/sitemap.ts` → `"use cache"` + `cacheLife("hours")`.
- 2 donor-research token pages → `await connection()` (interim; `instant = false` in P2-6).
- **D3**: `generateStaticParams` returns karma only. 1477 page renders → ~185. Tenant shells
  render on demand and persist; `isKnownTenantParam()` is untouched so every tenant is still
  servable.

### Verified on a production build + `next start`

- All nine JSON handlers: `200`, `cache-control: public, max-age=3600` — identical to before.
- `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`: 200, 4 `<loc>`, **no
  `x-nextjs-cache`** → runtime-only, `connection()` works.
  `/sitemaps/static/sitemap.xml`: `x-nextjs-cache: HIT`, 50 entries — correct for the cached one.
- Both OG routes: valid PNGs. Every route in the build table is `ƒ`; nothing became static.
- `tsc` clean, `biome` clean, `next build` clean.

## Deliberately not done

- **`instant = false` on the 5 Block routes** — build error until the flag is on (fact 2). P2-6.
- **`revalidate = 60` on `project/[projectId]/layout.tsx`** — its replacement is `"use cache"`
  on `services/project.service.ts`, one of the four loaders behind the **D2 cache-poisoning
  gate**. Not crossing that line early.
- **`revalidate = 60` on the two blog pages** — replacement is `"use cache"` on the Sanity
  loader, which is P2-3's Cache-class work; doing it here splits that change across two PRs.
- **`force-dynamic` on `app/t/[tenant]/layout.tsx`** — the ratchet, and the last line Phase 2
  deletes. Also Alpha's file in P2-1.

## TASK-P2-2B — the split

You were right and I had found the same thing a moment earlier: `cacheLife()` throws under
vitest, which has no Next cache work-unit store. Split as instructed, and **this time I ran the
full suite locally before pushing** — which caught two more failures your message did not
predict.

**#2097 (`feat/segment-config-cleanup`) — flag-free, nothing turned on.** `connection()` on the
5 sitemap handlers + cron + the 2 token pages, both OG `runtime` removals, D3. Suite
**15960/15962**: the pre-existing CRLF byte and a `modal-integration` parallel-load flake that
passes 17/17 alone.

Two failures I had to fix that were not in your brief:

- **`connection()` throws outside a request scope too** — same class as `cacheLife()`, and it
  broke `sitemap-routes` and `orphaned-chunk-route`. Mocked as a no-op in the shared setup
  next to `next/headers` and `next/root-params`; partial, so `NextResponse`/`NextRequest` stay
  real.
- **D3 broke an existing assertion.** `layout.test.tsx` pinned "every whitelabel domain is a
  static param" — exactly what D3 removes. Rewritten to pin karma-only, plus a new test proving
  the narrower *prerender* list did not narrow what is *servable*.

**#2100 (`feat/use-cache-route-handlers`) — DO NOT MERGE BEFORE P2-6.** Stacked on #2097. The
nine `use cache` + `cacheLife("hours")` conversions, `sitemaps/static/sitemap.ts`, and the
`experimental.useCache` flag. Suite **15961/15962** — only the pre-existing CRLF byte.

Beyond the `next/cache` mock you specified, this needed test work the split implied but did not
spell out: **`GET` had to become `async`** for `"use cache"`, so 9 test files were awaiting a
Promise's `.status` and getting `undefined`; the sync-throw test became `rejects.toThrow`; and
the sitemap cadence test that pinned `export const revalidate === 3600` now pins
`cacheLife("hours")` — same hour, new home.

Noted for P2-6: Next warns `experimental.useCache` is *"no longer needed"* once `cacheComponents`
is on, so check whether it subsumes it and drop the line — recorded in #2100's body.

## The baseline fix recurs on every P2 branch

#2097 failed `quality-gate` with the *same* stale-path regression I fixed in TASK5-C — because
that fix lives on #2095, and #2097 branches from the integration branch, which still has the old
key. **Every branch cut from `feat/instant-navigations` will hit this until #2095 lands.**

I cherry-picked the one-line fix onto #2097 and rebuilt #2100 on top of it, and both carry the
`quality-baseline` label. But the right place for it is the integration branch itself: one
one-line commit there and no downstream PR needs the fix or the label at all. That is Alpha's
branch — worth doing before more P2 branches are cut.

While rebuilding #2100 I also found its history had picked up a duplicate copy of the #2097
commit from my earlier `rebase --onto`, which meant a straight cherry-pick carried only the test
changes and silently left the handler conversions behind. Rebuilt as
`feat/segment-config-cleanup` + one commit; verified 19 files in the diff, `"use cache"` present
in the handlers, the flag present in `next.config.ts`, and the suite at **15960/15962** (the
CRLF byte and the CommunityStats flake).

## One coordination note

D3 touches `generateStaticParams` in `app/t/[tenant]/layout.tsx`, which Alpha is restructuring
in P2-1. It is a single self-contained function, so the conflict surface is small, but it will
conflict.
