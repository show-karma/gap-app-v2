# TASK3 REPORT — promise-based provider refactor (rev 2)

**Status: all five requirements met. Blocking finding from rev 1 is RESOLVED. CI fully green.**
PR **#2090** — <https://github.com/show-karma/gap-app-v2/pull/2090> — still a **draft**, not merged.

Branch `refactor/root-layout-static-shell`, based on `origin/main` (`e8b8b3e5b`).
- `79c30f8df` — rev 1, the layout split (note: I mis-transcribed this SHA as `29a59753d` in the last report; `79c30f8df` is correct).
- `a33a8f37a` — rev 2, this refactor.

## (1) children render in the primary no-JS-visible tree ✅

`RootLayout` is synchronous: it *starts* `getWhitelabelContext()` and passes the promise down,
never awaiting it. **There is no Suspense boundary anywhere in the layout.** Without one React
holds the shell until the host is known and emits one complete document — holding, not hiding.

I measured boundaries around only the navbar and footer as well: they cost `/` **203 characters**
of no-JS text — the whole internal link graph (Projects, Funders, Nonprofits, Resources, Blog,
Docs, Governance, Terms, Privacy, ©). So those are gone too. They bought nothing today anyway,
since the provider already holds the shell on the same promise.

## (2) providers take the context as a promise — the contracts that changed

| Contract | Before | After |
|---|---|---|
| `WhitelabelProvider` | `{isWhitelabel, communitySlug, config, tenantConfig}` as spread props | `value: WhitelabelContext \| Promise<WhitelabelContext>`, unwrapped with `use()` |
| `PrivyProviderWrapper` | `tenantConfig` | `whitelabel: TenantSource \| Promise<TenantSource>` |
| `useWhitelabel()` | plain value | **unchanged** — still plain and non-suspending |

**Which consumers can suspend: only `WhitelabelProvider` itself.** That is the crux of the design.
~25 call sites read `useWhitelabel()`, including `src/components/navigation/Link.tsx`, and `Link`
renders inside nearly every page. Had the *hook* started suspending, every page would have gone
back behind a boundary by another route. Keeping the unwrap in the provider means one component
changes behaviour and 25 consumers do not.

**`PrivyProviderWrapper` never blocks children at all.** It unwraps in a new `PrivyTenant` sibling
rather than around `children`: Privy only mounts after its dynamic `import()` resolves in an
effect, so the promise has long settled and nothing above `children` waits on it.

The chrome — `TenantThemeStyle`, `TenantNavbar`, `TenantFooter`, `TenantJsonLd` — takes the promise
**directly** instead of reading the provider's context, so each stays independent and can be given
its own boundary later. New `TenantStoreSync` seeds the tenant store from the resolved context.

## (3) acceptance gate — no-JS parity ✅

Production build, measured with `extractNoJsVisibleHtml` / `visibleTextLength` from
`scripts/indexability/crawl-sitemap.mjs`:

| Route | `main` | rev 1 | **rev 2** | h1 | hidden chunks |
|---|---|---|---|---|---|
| `/` | 2615 | 67 | **2615** | ✅ | **0** |
| `/about` | 2082 | 19 | **2082** | ✅ | **0** |
| `/knowledge` | 7162 | 36 | **7162** | ✅ | **0** |

Exact parity, `<h1>` restored, zero hidden chunks.

## (4) whitelabel re-verified on the prod build ✅

- `Host: app.opgrants.io` → `:root{--primary:353 100% 51%;--primary-foreground:0 0% 100%}`
  (`#FF0420` → correct Optimism red), whitelabel navbar + footer, no organization schema, 0 hidden chunks.
- Main domain → no tenant rule, organization schema present, global `<nav>` + `<footer>` present, 0 hidden chunks.

### Correction worth flagging: my rev-1 cascade explanation was wrong

Rev 1 claimed the theme rule wins because it is unlayered while `globals.css` sits in `@layer base`.
**Tailwind flattens `@layer` at build time** — the shipped CSS contains no `@layer` at all. The real
mechanism is document order at equal specificity: `:root` and `.dark` are both (0,1,0) and both
`<link>`ed from `<head>`; the tenant `<style>` is a `<body>` child React does not hoist (no
`precedence`), so it comes later and wins in both themes.

Verified in the build: the only two `--primary` declarations that ship are `:root` and `.dark`, and
the served HTML puts the tenant `<style>` at byte 6909 with the stylesheet links at 293/386/479.

That is weaker than the inline attribute it replaced — a future `html.dark { --primary: … }` would
outrank it — so `__tests__/app/tenant-chrome.test.tsx` now fails if `globals.css` ever declares
`--primary` at anything more specific than `:root` or `.dark`.

## (5) quality-gate FAILURE — root cause and fix ✅

The gate failed on the **unused-exports ratchet: 413 baseline → 414**. Cause: `getWhitelabelThemeCss`,
exported from `tenant-chrome.tsx` in rev 1 with no importer. It is module-private now, and every new
export is imported by `app/layout.tsx`. `knip` with the repo config reports the baseline exactly:

```
unused files  : 208 (baseline 208)
unused exports: 413 (baseline 413)
unused types  : 365 (baseline 365)
```

(The anti-pattern comment also lists `app/layout.tsx:92,93 - Hardcoded color values` — the
pre-existing `viewport.themeColor` `#ffffff`/`#000000`, surfacing only because the file is now in
the changed set. Non-blocking; `checklist` passes.)

## CI on `a33a8f37a` — zero failures

`quality-gate` **PASS**, `test (1)`–`test (6)` PASS, `report`, `smoke`, `static-checks`,
`baseline-guard`, `gate-guard`, `gate-check`, `checklist`, `react-doctor`, `Vercel`, `CodeRabbit` —
all pass. No failing check.

Locally: `tsc` clean, `next build` clean, `biome lint` clean, `design:check` 0 errors, build route
table unchanged vs `main`, and 127 files / 1573 tests passing across `app`, `integration/pages`,
`utilities`, `unit/components/Utilities`, `components/Pages/Communities`.

A full-repo single-process sweep surfaced 7 failures (`project-layout-h1`,
`project-layout-ssr-shell`, `project-profile-streaming-shell`, `IndicatorForm` ×2,
`MarkdownPreview.table` ×2). All 7 pass in isolation **both on this branch and on stashed `main`** —
parallel-load flake, which CI does not hit because it shards across 6 jobs.

## What this still does not do

`WhitelabelProvider` continues to block the tree until the host is known. The layout no longer
awaits — the Phase 1 prerequisite — but the shell is **not** yet prerenderable, so `cacheComponents`
stays off.

Finishing it means the provider must stop blocking, which runs into the same crawlable-route
question: the value is needed by ~25 client consumers throughout the tree, so it cannot be deferred
without either suspending content or accepting a default. The tractable path: `isWhitelabel === false`
is statically true for every sitemap-crawlable route — `proxy.ts` rewrites tenant traffic to
`/community/<slug>/…` and 301s `/blog` to the main origin — so crawlable routes can prerender against
the non-whitelabel default while tenant hosts take a dynamic path. That is the
"Cache-not-Stream for crawlable routes" split the initiative already anticipates, and it deserves
its own task.

## Environment

Scratch clone `D:\sg-t3` from `origin/main`, real `pnpm install --frozen-lockfile` (the node_modules
junction cannot build — Turbopack rejects any `node_modules` symlink outside the project root).
`D:\super-gap\gap-app-v2` was never checked out or modified.

## Note on delivery

`maestri ask "Tech Leader"` still refuses: *"Multiple terminals named 'Tech Leader' found (2)."*
