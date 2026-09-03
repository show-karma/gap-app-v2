# Task 4 — Option B: tenant as a root param (unblocks cacheComponents)

## Why (read first)
PR #2090 made the root layout synchronous, but tenant context is still derived from the request
host on EVERY route (verified: proxy.ts:102-115 passes non-community routes through to tenant
hosts un-rewritten with tenant chrome). Host-derived data can never be in a prerendered shell,
and hiding it behind Suspense breaks DEV-612 (no-JS crawler visibility). So the tenant must be
URL-derivable. Next 16.3.0 ships `next/root-params` for exactly this.
Docs: https://nextjs.org/docs/app/api-reference/functions/next-root-params

## Target architecture (decided — do not relitigate)
- Internal-only URL prefix: every page request is rewritten by the proxy to
  `/t/<tenant>/<original-path>`. Browser URLs NEVER change. `PAGES` constants untouched.
  (Underscore-prefixed folders are private in Next, hence `t`, not `_t`. Confirm no public `/t` route exists.)
- `app/t/[tenant]/layout.tsx` becomes THE root layout (html/body/fonts/providers). All current
  page routes move under `app/t/[tenant]/`. Root param getter: `import { tenant } from "next/root-params"`.
- Route handlers stay where they are (`app/api/**`, `app/sitemap*`, `app/sitemaps/**`,
  `app/.well-known/**`, `app/openapi.json`, `app/robots.ts`, anything metadata-file based).
  Root params are NOT available in Route Handlers and they do not need tenant chrome.
- Param VALUE contract: `"karma"` for non-whitelabel hosts; for whitelabel hosts the whitelabel
  config `domain` string (unique per config entry, so `getWhitelabelByDomain(value)` keeps
  working and `metadataBase` stays correct). Unknown values → `notFound()` in the root layout.
- `getWhitelabelContext()` reads `await tenant()` instead of `headers()`. Zero `headers()` reads
  remain on the layout/page render path (8 importers of next/headers to audit; generateMetadata included).
- Public requests to `/t/*` must 404 at the proxy (otherwise `www.karmahq.org/t/karma/about`
  becomes duplicate indexable content).
- `generateStaticParams` on the root layout returns `karma` + every known tenant value
  (required by cacheComponents: each root param needs at least one value).
- cacheComponents / partialPrefetching stay OFF in these PRs. Acceptance proves readiness only.

## Integration branch (stacked — nothing merges to main yet)
`feat/instant-navigations` = origin/main + `chore/next-16-3-upgrade` (#2089) + `refactor/root-layout-static-shell` (#2090).
FE Dev Alpha creates and pushes it FIRST (step 0) and reports the SHA. Both Task-4 PRs target it.
#2051 stays out (orthogonal; avoids next.config conflicts).

## Split
### 4A — FE Dev Alpha (routing core) — branch `feat/tenant-root-param-routes`
0. Create/push the integration branch (above). Fresh `pnpm install` (16.3.3 lockfile); a
   node_modules junction cannot build under Turbopack — you found this already.
1. `git mv` the page tree under `app/t/[tenant]/` (layouts, pages, loading, error, templates,
   route groups). Leave route handlers/metadata routes at their current paths.
2. Root layout → `app/t/[tenant]/layout.tsx`; add `generateStaticParams` using
   `listTenantParams()` from 4B (stub locally with `[{ tenant: "karma" }]` until 4B lands);
   validate the param and `notFound()` on unknown values.
3. `utilities/whitelabel-server.ts`: `getWhitelabelContext()` uses `await tenant()` via
   `resolveWhitelabelFromTenantParam()` from 4B (stub: `"karma"` → non-whitelabel). Remove the
   `headers()` import. Audit the other 7 `next/headers` importers on the render path.
4. Fix the 18 test/script files that reference `app/` paths literally, incl.
   `__tests__/app/route-file-structure.test.ts` (SITEMAP_NO_LOADING paths gain the prefix; keep
   the rule's semantics). Check `next typegen` emits the `tenant` getter type.
5. Run the acceptance gates below.

### 4B — Frontend Dev #2 (proxy + tenant resolution) — branch `feat/tenant-root-param-proxy`
Reuse your sg-next163 clone (already on 16.3.3); rebase onto `feat/instant-navigations` once Alpha pushes it.
1. New `utilities/tenant-param.ts` (server-safe, no next/headers):
   - `resolveTenantParam(host: string): string` → `"karma"` | whitelabel `config.domain`
   - `listTenantParams(): string[]` → `["karma", ...all whitelabel config domains]` (built-in
     DOMAIN_CONFIGS + `parseExtraWhitelabelDomainsFromEnv`), deduped
   - `resolveWhitelabelFromTenantParam(value: string): WhitelabelDomain | null`
   Unit tests for all three, incl. anchored/negative cases (see CLAUDE.md domain rules — no
   endsWith/includes on hosts).
2. `proxy.ts`: after all existing redirect/whitelabel logic, rewrite every remaining PAGE request
   to `/t/${resolveTenantParam(host)}${pathname}` (preserve search). Exempt: `/_next/*`,
   `/api/*`, `/monitoring` (Sentry tunnel), `/sitemap*`, `/sitemaps/*`, `/.well-known/*`,
   `/openapi.json`, `/robots.txt`, `/manifest.json`, `/favicon.ico`, files with extensions,
   the public asset dirs already exempted for whitelabel. Keep the existing whitelabel
   `/community/<slug>` rewrite composing correctly (it becomes `/t/<domain>/community/<slug>/...`).
   Public `/t/*` → 404 (NextResponse with status 404 or rewrite to not-found) BEFORE any rewrite.
   Extend the proxy tests for: main host, whitelabel host, alias-host 308s still first,
   `/t/*` blocked, every exemption, redirects in next.config unaffected.
3. `next.config.ts`: confirm whether 16.3.3 needs any root-params flag (docs say none; if the
   typed config has `rootParams`, set it explicitly and note it). No cacheComponents.

## Acceptance gates (both PRs, on the integration branch with both merged)
- `pnpm typecheck`, `next build` clean; route table: every PUBLIC URL still resolves (spot-check
  with a prod server: `/`, `/about`, `/communities`, `/community/<slug>`, `/project/<slug>`,
  `/blog`, a manage page, `/sitemap.xml`, `/.well-known/mcp.json`, `/api/geo`).
- Whitelabel on the prod build (`Host: app.opgrants.io`): theme vars, navbar/footer, stripped URLs,
  `/programs/<id>` still works; main domain unchanged. `/t/karma/about` on the main host → 404.
- No-JS parity on `/`, `/about`, `/knowledge` (same numbers as #2090: 2615 / 2082 / 7162, h1, 0 hidden chunks).
- READINESS PROOF: in a throwaway local commit set `cacheComponents: true` and run `next build`.
  Required: the root layout prerenders (no root-level "uncached data / headers outside Suspense"
  error). Per-page errors are EXPECTED and are Phase-2 triage input — capture the list of
  routes that error into `.maestri/reports/task-4-cachecomponents-readiness.md`. Revert the flag.
- Full unit suite; the 7 known parallel-load flakes are pre-existing.

## Environment rules
Scratch clones only (never touch D:\super-gap\gap-app-v2); `biome lint` on touched files only;
surgical diffs (CRLF blobs); Conventional Commits; no AI mentions in commits/PR text; PRs target
`feat/instant-navigations`, opened as drafts. Coordinate the 4A/4B contract via the exact
function names above — do not rename them without telling the other dev through the Tech Leader.

## Reporting
`maestri ask "Tech Leader" "TASK4A|TASK4B <status>: ..."`; if the name is ambiguous, write
`.maestri/reports/task-4a-REPORT.md` / `task-4b-REPORT.md` plus a canvas note.
Alpha: report the integration-branch SHA immediately after step 0 (short message), then continue.
