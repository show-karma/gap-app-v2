# TASK4B — Report (Frontend Dev #2)

Branch: `feat/tenant-root-param-proxy` (rebased onto `feat/instant-navigations` @ `6f0f5dfd1`)
Commit: `feat(routing): serve every page from the tenant root-param tree`
Clone: `%TEMP%\sg-next163` (real `node_modules`, next 16.3.3). Vercel untouched.

## Status: implementation DONE, proxy behaviour PROVEN end to end, PR open

**Draft PR: https://github.com/show-karma/gap-app-v2/pull/2093** -> `feat/instant-navigations`

Every gate that does not need `app/t/[tenant]/` is green, including a real prod-server run
(see "Verified end to end" below). Only the gates that need the real page tree are blocked.

## What landed

### 1. `utilities/tenant-param.ts` (new, 157 lines)

Exactly the agreed contract, plus the two additions 4A asked for — our two files agree on
all five names, so the merge is a straight take-4B:

```ts
export const KARMA_TENANT_PARAM = "karma";
export function resolveTenantParam(host: string): string;
export function listTenantParams(): string[];
export function resolveWhitelabelFromTenantParam(value: string): WhitelabelDomain | null;
export function isKnownTenantParam(value: string): boolean;
```

Plus three proxy-side helpers that belong with the param rather than in `proxy.ts`,
because the tests need them independently:

```ts
export const TENANT_ROUTE_PREFIX = "/t";
export function isTenantRoutePath(pathname: string): boolean;    // block public /t/*
export function isTenantExemptPath(pathname: string): boolean;   // keep own URL
export function tenantRewritePathname(param, pathname): string;  // build the target
```

Decisions worth knowing:

- The param value for a whitelabel host is the config `domain`, **not** the community
  slug. optimism, polygon and filecoin each have a production *and* a test domain pointing
  at one slug; collapsing onto the slug would give both the same `metadataBase`.
- `listTenantParams()` reads `WHITELABEL_DOMAINS` rather than re-reading
  `WHITELABEL_EXTRA_DOMAINS_JSON` — the same conclusion 4A reached. Re-reading the env here
  could emit a param `resolveTenantParam()` never produces, which would prerender a 404.
- Host matching is delegated to `getWhitelabelByDomain()` (normalize + equality). No
  `endsWith`/`includes` on any host. `resolveWhitelabelFromTenantParam()` is strict equality
  on the param value: `app.opgrants.io:443` and `evilapp.opgrants.io` both return `null`.
- No `next/headers`, no request-scoped imports — it runs in the proxy, in
  `generateStaticParams`, and in the root layout.

### 2. `proxy.ts` (+59 / -12)

- **`/t/*` 404s first**, before the whitelabel block and before the alias-host 308. It
  returns `404` + `X-Robots-Tag: noindex, follow` and no `Location`, so the internal URL is
  never advertised in a redirect header.
- **One funnel.** Every pass-through in the proxy now goes through a single
  `tenantRewrite(request, { pathname?, requestHeaders? })` helper, so a future pass-through
  cannot silently miss the prefix. It replaced all six `NextResponse.next()` page paths:
  whitelabel Sanity Studio, whitelabel top-level routes, the whitelabel community rewrite,
  the `/projects` listing, the proxy catch-all, and both pass-through exits in
  `handleProjectIndexability()`.
- The whitelabel community rewrite **composes**: `/programs/123` on `app.opgrants.io`
  becomes `/t/app.opgrants.io/community/optimism/programs/123`, in one rewrite.
- `X-Robots-Tag` behaviour is unchanged — `withRobots()` still decorates the response, it
  is now a rewrite instead of a `next()`.
- Every redirect (alias 308, `/blog` 301, `/my-projects` 301, whitelabel URL-stripping,
  legacy umbrella, indexer relocation) is untouched and its `Location` never carries the
  prefix. Tested.
- `x-is-whitelabel` / `x-community-slug` / `x-tenant-id` / `x-whitelabel-domain` request
  headers are still set. Nothing in `app/` reads them today (only
  `e2e/fixtures/whitelabel.ts` documents them), so they are kept as-is rather than removed
  in this PR.

### 3. Exemptions — the part that would have broken production silently

The middleware matcher only excludes **root-level** files with an extension, so
`/assets/hero.png`, `/logos/x.svg`, `/sitemaps/static/sitemap.xml`, `/.well-known/mcp.json`
and `/monitoring` all reach the proxy today and are served by `NextResponse.next()`.
Rewriting them under `/t/<tenant>` would 404 every one of them. `isTenantExemptPath()`
covers:

- paths: `/openapi.json`, `/robots.txt`, `/manifest.json`, `/favicon.ico`, `/sitemap.xml`,
  `/sitemap-index.xml`, `/sitemap_index.xml`, `/extended-sitemap.xml`
- prefixes: `/.well-known`, `/_next`, `/_static`, `/_vercel`, `/api`, `/monitoring` (the
  Sentry `tunnelRoute` in next.config.ts), `/sitemaps`, and every `public/` subdirectory —
  `/assets /fonts /icons /images /logo /logos /tenants` (the existing whitelabel asset
  guard misses `assets` and `logos`)
- an **allow-list of real asset extensions**, not "the last segment has a dot", so a slug
  like `/project/vitalik.eth` is still treated as a page.

Prefix matching here is on a `/` boundary against a path, not a host — the CLAUDE.md ban on
`endsWith`/`includes` is about origins and does not apply.

### 4. `next.config.ts` — no change, deliberately

16.3.3 has no `rootParams` key in the typed config, and `next/dist/server/config.js` warns
that `experimental.rootParams` "is no longer needed". Same finding as 4A. Nothing added;
`cacheComponents` stays off.

## Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `biome lint` (touched files) | clean |
| `__tests__/utilities/tenant-param.test.ts` (new, 27 tests) | pass |
| `__tests__/middleware-tenant-param.test.ts` (new, 46 tests) | pass |
| `middleware-indexability` / `middleware-query-preservation` | pass, unmodified |
| `middleware-dashboard` | pass, 3 assertions updated (see below) |
| Full unit suite (15 834 tests) | 15 833 pass, 1 pre-existing CRLF failure |
| `next build` | clean (exit 0, compiled in 78s) |

**The 3 updated assertions.** `middleware-dashboard.test.ts` asserted
`x-middleware-rewrite === null` for whitelabel `/project/...` and `/admin/studio/...`, and
the bare `/community/<slug>/admin/settings` target for the third. Those tests exist to prove
the *community* prefix is not added; they now assert the path keeps its shape and only picks
up the tenant prefix, via `tenantRewritePathname()`. Semantics preserved.

**The 1 full-suite failure** is `__tests__/public/gsc-site-verification.test.ts` —
`public/googleb231020e03517669.html` picks up a trailing `\r` from `core.autocrlf=true` on
this Windows checkout. Pre-existing, unrelated to this change, no file of mine involved.
(The 7 known parallel-load flakes did not fire this run.)

## Verified end to end (prod server, throwaway probe routes)

4A is not pushed yet, so I built the real thing against a **throwaway** `app/t/[tenant]/`
probe (a layout, a page and a `[...rest]` catch-all that echo the resolved param and path),
ran `next start`, probed 40 URLs, then deleted the probe. The working tree is clean and
nothing of this is committed. What it proves:

| Probe | Result |
|---|---|
| `/`, `/about`, `/communities`, `/knowledge`, `/blog`, `/projects`, `/community/<slug>/funding-opportunities`, `/community/<slug>/manage`, `/project/<slug>`, `/dashboard/projects` | 200, `tenant=karma`, path intact, **no `Location` header** |
| `Host: app.opgrants.io` `/` | `tenant=app.opgrants.io` `rest=/community/optimism/funding-opportunities` |
| `Host: app.opgrants.io` `/programs/123` | `tenant=app.opgrants.io` `rest=/community/optimism/programs/123` — one rewrite, composed |
| `Host: app.opgrants.io` `/project/…`, `/about` | top-level, `tenant=app.opgrants.io` |
| `Host: app.opgrants.io` `/community/optimism/programs/123` | still redirects to the clean `/programs/123` |
| `Host: app.opgrants.io` `/blog` | still 301 to `https://www.karmahq.org/blog` |
| `/sitemap.xml`, `/sitemap-index.xml`, `/robots.txt`, `/openapi.json`, `/manifest.json`, `/favicon.ico`, `/.well-known/mcp.json`, `/api/geo`, `/llms.txt`, `/images/coins-stacked.png` | 200, unrewritten |
| `/t`, `/t/karma`, `/t/karma/about`, `/t/app.opgrants.io/programs/1`, `/T/karma/about` | 404 + `noindex, follow`, no `Location` |
| `X-Robots-Tag` | `/projects?page=2` noindex; clean `/projects` indexable; `/project/<slug>/unknown-tab` noindex — all unchanged |
| `karmahq.org/about`, `gap.karmahq.xyz/about` | 308 to `https://www.karmahq.org/about` |
| `/my-projects`, `/my-reviews` | 301 to `/dashboard/…` — no prefix in any target |

One incidental finding: `/t/` (with the trailing slash) takes Next's own trailing-slash 308
to `/t` first, and *then* 404s. Net result is still a 404 on our own origin. It also confirms
Next normalizes trailing slashes **before** the proxy runs, so the trailing-slash strip in
`tenantRewritePathname()` is belt-and-braces rather than load-bearing.

## UPDATE — all remaining gates run on the real 4A + 4B merge

4A (PR #2094, `feat/tenant-root-param-routes`) is pushed. Merged it into my branch locally
(`local/task4-merge`): **one conflict, `utilities/tenant-param.ts`, resolved take-4B as agreed.**
Everything else auto-merged — 510 files, almost all `git mv`.

### Contract items from the Tech Leader: all four were already satisfied

1. `KARMA_TENANT_PARAM` and `isKnownTenantParam` — both exported, both tested. Confirmed
   against 4A's `app/t/[tenant]/layout.tsx:55`, which imports `isKnownTenantParam` and
   `listTenantParams`, and `utilities/whitelabel-server.ts:5`, which imports
   `resolveWhitelabelFromTenantParam`. All resolve.
2. `parseExtraWhitelabelDomainsFromEnv` — not referenced; `listTenantParams()` reads the
   exported `WHITELABEL_DOMAINS`.
3. `experimental.rootParams` — absent from `next.config.ts`.
4. PR #2093 was already opened as a **draft** against `feat/instant-navigations`, and its body
   already states neither PR is deployable alone.

### One real semantic difference in the file we kept — worth knowing

4A's `resolveWhitelabelFromTenantParam` / `isKnownTenantParam` called `getWhitelabelByDomain(value)`,
which applies `bareHostname()` and therefore strips a port. Mine compares the param value for
exact (case-insensitive) equality. Practical effect: under mine, `/t/app.opgrants.io:443/x`
404s instead of rendering. That is the behaviour we want — `generateStaticParams()` only ever
emits the canonical `config.domain`, so accepting a port variant would create a second,
never-prerendered copy of a tenant. Covered by a negative test.

### Gates on the merged tree

| Gate | Result |
|---|---|
| `tsc --noEmit` (after a clean `.next` regen) | clean |
| `next build` | clean, exit 0 |
| `next typegen` emits the root-param getter | yes — `.next/types/root-params.d.ts` declares `export function tenant(): Promise<string>` |
| Route table on a prod server | every public URL resolves (below) |
| Whitelabel host | correct (below) |
| No-JS parity | **exact: 2615 / 2082 / 7162, h1 present on all three** |
| `cacheComponents` readiness | **READY** — see `.maestri/reports/task-4-cachecomponents-readiness.md` |
| Full unit suite on the merge (15 961 tests) | 15 959 pass, 2 known non-regressions |

The 2 failures: the pre-existing `gsc-site-verification` CRLF byte, and
`__tests__/components/CommunityStats.test.tsx > "should show loading when refreshing stats"` —
which **passes in isolation** (34/34), so it is one of the known parallel-load flakes. Neither
file is touched by either PR.

### Route table, real page tree, `next start`

`/`, `/about`, `/communities`, `/knowledge`, `/blog`, `/projects`, `/community/gitcoin`,
`/community/optimism/funding-opportunities`, `/community/optimism/manage`, `/project/paraswap`,
`/funding-map`, `/donations`, `/terms-and-conditions`, `/nonprofits`, `/stats` — all 200 with
the right `<title>`/`<h1>` (e.g. `/project/paraswap` → "ParaSwap", `/community/gitcoin` →
"Gitcoin Community Grants"). No `Location` header on any of them.

Unrewritten as intended: `/sitemap.xml`, `/sitemap-index.xml`, `/sitemap_index.xml`,
`/extended-sitemap.xml`, `/robots.txt`, `/openapi.json`, `/manifest.json`, `/favicon.ico`,
`/.well-known/mcp.json`, `/.well-known/agent.json`, `/api/geo`, `/llms.txt`,
`/images/coins-stacked.png` — all 200.

404 as intended: `/t`, `/t/karma`, `/t/karma/about`, `/t/app.opgrants.io/programs/1`,
`/T/karma/about`, and `/t/nope/about` (unknown param → the layout's `notFound()`).

Redirects unchanged: `/my-projects` and `/my-reviews` 301; `karmahq.org/about` and
`gap.karmahq.xyz/about` 308 to `https://www.karmahq.org/about`. No prefix in any target.

### Whitelabel host `app.opgrants.io`

`/` → Optimism funding opportunities (`<h1>Optimism`), `/programs/123` → program page,
`/project/test-project` → 200, `/dashboard` → `<title>Dashboard | Optimism`, `/funding-map` →
200. `/community/optimism/programs/123` still redirects to the clean `/programs/123`; `/blog`
still 301s to the main domain.

**`app.opgrants.io/about` → 404, and that is correct, not a regression.**
`app/t/[tenant]/about/page.tsx` calls `notFound()` when `isWhitelabel` (Karma marketing copy is
deliberately hidden on tenant domains). It is in fact the best single piece of evidence that
`getWhitelabelContext()` now resolves whitelabel from `await tenant()` rather than the host —
the gate still fires through the new path.

## One finding for 4A's `next/headers` audit

`next build` on the integration branch emits, for `/funding-map`:

```
Route /funding-map couldn't be rendered statically because it used `cookies`
  at utilities/auth/token-manager.ts:89  (dynamic import of next/headers)
  via src/features/funding-map/services/funding-programs.service.ts:32
```

That is a `cookies()` read reached from a **page render path**, not from a route handler, and
it is not in the list of 8 `next/headers` importers if the audit only grepped for a static
import — `token-manager.ts` imports it dynamically inside the function. It will show up as a
per-page error in the cacheComponents readiness run.

## One thing for the Tech Leader to decide

Public `/t/*` currently answers a **bodyless 404** rather than the styled not-found page. It
is an internal prefix that no legitimate client requests, so a bare 404 is the unambiguous,
cheap answer — but if you want the branded 404 there, say so and I will rewrite it into the
not-found route instead.
