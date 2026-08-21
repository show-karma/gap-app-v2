# Domain Migration Strategy

> **This file records two separate migrations.**
>
> - **2025 — the gov split** (everything from "Overview" down): `karmahq.xyz` moved from
>   `frontend-nextjs` to `gap-app-v2`, and governance routes moved to `gov.karmahq.xyz`.
>   Historical record; the `middleware.ts` it describes is now `proxy.ts`.
> - **2026-08 — the TLD flip**: `karmahq.xyz` → `karmahq.org`. See
>   [§ 2026-08 — karmahq.xyz → karmahq.org](#2026-08--karmahqxyz--karmahqorg) at the bottom.
>   Operational procedure lives in
>   [`docs/runbooks/domain-migration-karmahq-org.md`](runbooks/domain-migration-karmahq-org.md).

---

# 2025 — karmahq.xyz / gov.karmahq.xyz split

## Overview

This document describes the domain migration strategy implemented to transition from the current domain structure to a new one, with automatic redirects to maintain backwards compatibility.

## Current State (Before Migration)

- `karmahq.xyz` → `frontend-nextjs` project (governance/DAO features)
- `www.karmahq.xyz` → `gap-app-v2` project (grants accountability protocol)

## Target State (After Migration)

**Production:**
- `karmahq.xyz` → `gap-app-v2` project (main domain for GAP)
- `gov.karmahq.xyz` → `frontend-nextjs` project (governance subdomain)

**Staging:**
- `gapstag.karmahq.xyz` → `gap-app-v2` project (staging for GAP)
- `govstag.karmahq.xyz` → `frontend-nextjs` project (governance staging)

## Implementation Details

### File Structure

The redirect implementation is organized across three files:

- **`middleware.ts`** - Main middleware entry point (clean and minimal)
- **`utilities/frontendNextjsRoutes.ts`** - Route configuration list
- **`utilities/redirectHelpers.ts`** - Redirect logic and helper functions

### Redirect Logic

The redirect logic is implemented in the middleware and utilities. When a request comes to the main domain, the middleware:

1. Checks if the path matches any route from the old frontend-nextjs application
2. If matched, issues a 308 Permanent Redirect to the governance subdomain with the same path
3. If not matched, allows gap-app-v2 to handle the request normally

**Environment-Aware Redirects:**
- **Production**: `karmahq.xyz/dao/optimism` → `gov.karmahq.xyz/dao/optimism`
- **Staging**: `gapstag.karmahq.xyz/dao/optimism` → `govstag.karmahq.xyz/dao/optimism`

### Routes Redirected to gov.karmahq.xyz

All frontend-nextjs routes are automatically redirected, including:

**Exact Path Matches:**
- `/actions` - User actions page
- `/daos` - DAO listing
- `/delegation-week` - Delegation week event page
- `/find-contributor` - Contributor discovery
- `/gov` - Governance overview
- `/governance-tools` - Governance tooling page
- `/how-it-works` - Information page
- `/nft-badge-minting-service` - NFT badge minting
- `/endorse-governance-contributor` - Contributor endorsement
- `/oldhome` - Legacy homepage

**Path Prefix Matches:**
- `/dao/*` - All DAO-specific pages (delegates, delegators, participants, etc.)
- `/case-study/*` - Case studies (Gitcoin, ENS, Optimism, Idle Finance)
- `/profile/*` - User profile pages
- `/github/linking` - GitHub integration
- `/twitter/linking` - Twitter integration
- `/discord/linking` - Discord integration
- `/dynamic-nft/*` - Dynamic NFT pages
- `/app/badge-template` - Badge template

### Routes Handled by gap-app-v2

All gap-app-v2 routes continue to work normally on `karmahq.xyz`:

- `/` - GAP homepage
- `/project/*` - Project pages
- `/projects` - Project listing
- `/community/*` - Community pages
- `/admin/*` - Admin pages
- `/funding-map/*` - Funding visualization
- `/stats` - Statistics
- And all other gap-app-v2 routes

## Examples

### Redirects (frontend-nextjs → gov.karmahq.xyz)

| Old URL | New URL |
|---------|---------|
| `karmahq.xyz/dao/optimism` | `gov.karmahq.xyz/dao/optimism` |
| `karmahq.xyz/profile/0x123...` | `gov.karmahq.xyz/profile/0x123...` |
| `karmahq.xyz/case-study/gitcoin` | `gov.karmahq.xyz/case-study/gitcoin` |
| `karmahq.xyz/daos` | `gov.karmahq.xyz/daos` |
| `karmahq.xyz/gov` | `gov.karmahq.xyz/gov` |

### No Redirect (gap-app-v2 routes)

| URL | Handled By |
|-----|------------|
| `karmahq.xyz/` | gap-app-v2 |
| `karmahq.xyz/project/123` | gap-app-v2 |
| `karmahq.xyz/community/optimism` | gap-app-v2 |
| `karmahq.xyz/projects` | gap-app-v2 |
| `karmahq.xyz/admin` | gap-app-v2 |

## Technical Implementation

### Code Implementation

**Main Middleware** (`middleware.ts`):

```typescript
import { shouldRedirectToGov, redirectToGov } from "./utilities/redirectHelpers";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Redirect frontend-nextjs routes to gov.karmahq.xyz
  if (shouldRedirectToGov(path)) {
    return redirectToGov(request);
  }

  // ... rest of middleware logic
}
```

**Route Configuration** (`utilities/frontendNextjsRoutes.ts`):

```typescript
export const FRONTEND_NEXTJS_ROUTES = [
  // Exact path matches
  "/actions",
  "/daos",
  "/delegation-week",
  "/find-contributor",
  "/gov",
  "/governance-tools",
  "/how-it-works",
  "/nft-badge-minting-service",
  "/endorse-governance-contributor",
  "/oldhome",

  // Path prefixes that should redirect
  "/dao/",
  "/case-study/",
  "/profile/",
  "/github/linking",
  "/twitter/linking",
  "/discord/linking",
  "/dynamic-nft/",
  "/app/badge-template",
] as const;
```

**Redirect Helpers** (`utilities/redirectHelpers.ts`):

```typescript
function getGovSubdomain(): string {
  const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
  return isProduction ? "gov.karmahq.xyz" : "govstag.karmahq.xyz";
}

export function shouldRedirectToGov(path: string): boolean {
  // Check exact matches
  if (FRONTEND_NEXTJS_ROUTES.includes(path as any)) {
    return true;
  }

  // Check prefix matches
  return FRONTEND_NEXTJS_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return path.startsWith(route);
    }
    return false;
  });
}

export function redirectToGov(request: NextRequest): NextResponse {
  const govUrl = new URL(request.nextUrl.pathname, request.url);
  govUrl.hostname = getGovSubdomain(); // Environment-aware!
  govUrl.search = request.nextUrl.search; // Preserve query params
  return NextResponse.redirect(govUrl, 308); // 308 = Permanent Redirect
}
```

### HTTP Status Code

We use **308 Permanent Redirect** which:
- Indicates the resource has permanently moved
- Preserves the HTTP method (GET remains GET, POST remains POST)
- Signals to search engines to update their indexes
- Is cached by browsers for better performance

### Query Parameter Preservation

Query parameters are preserved during the redirect:
- `karmahq.xyz/dao/optimism?tab=delegates` → `gov.karmahq.xyz/dao/optimism?tab=delegates`

## Deployment Checklist

When deploying this migration:

1. **DNS Configuration (Production)**
   - [ ] Update `karmahq.xyz` DNS to point to gap-app-v2 production deployment
   - [ ] Create `gov.karmahq.xyz` DNS entry pointing to frontend-nextjs production deployment
   - [ ] Verify SSL certificates for both domains

2. **DNS Configuration (Staging)**
   - [ ] Update `gapstag.karmahq.xyz` DNS to point to gap-app-v2 staging deployment
   - [ ] Create `govstag.karmahq.xyz` DNS entry pointing to frontend-nextjs staging deployment
   - [ ] Verify SSL certificates for both staging domains

3. **Application Configuration (Production)**
   - [ ] Update frontend-nextjs environment variables to use `gov.karmahq.xyz`
   - [ ] Update gap-app-v2 environment variables to use `karmahq.xyz`
   - [ ] Set `NEXT_PUBLIC_ENV=production` in gap-app-v2
   - [ ] Update any hardcoded domain references in both applications
   - [ ] Update API endpoint configurations

4. **Application Configuration (Staging)**
   - [ ] Update frontend-nextjs environment variables to use `govstag.karmahq.xyz`
   - [ ] Update gap-app-v2 environment variables to use `gapstag.karmahq.xyz`
   - [ ] Set `NEXT_PUBLIC_ENV=staging` in gap-app-v2
   - [ ] Update any hardcoded domain references in both applications
   - [ ] Update API endpoint configurations

5. **Testing (Staging First)**
   - [ ] Test all redirect paths work correctly on staging
   - [ ] Verify staging redirects to `govstag.karmahq.xyz`
   - [ ] Verify query parameters are preserved
   - [ ] Test gap-app-v2 routes work normally on `gapstag.karmahq.xyz`
   - [ ] Verify no redirect loops
   - [ ] Test mobile and desktop views

6. **Testing (Production)**
   - [ ] Test all redirect paths work correctly on production
   - [ ] Verify production redirects to `gov.karmahq.xyz`
   - [ ] Verify query parameters are preserved
   - [ ] Test gap-app-v2 routes work normally on `karmahq.xyz`
   - [ ] Verify no redirect loops
   - [ ] Test mobile and desktop views

7. **Monitoring**
   - [ ] Monitor 4xx and 5xx error rates after deployment
   - [ ] Track redirect performance metrics
   - [ ] Monitor user feedback channels
   - [ ] Set up alerts for increased error rates
   - [ ] Monitor both staging and production environments

8. **SEO Considerations**
   - [ ] Submit updated sitemap to search engines
   - [ ] Update Google Search Console properties
   - [ ] Monitor search rankings during transition period
   - [ ] Update any external links pointing to old URLs

## Potential Issues and Solutions

### Issue: Redirect Loop

**Symptom:** Browser shows "too many redirects" error

**Solution:**
- Ensure frontend-nextjs is properly deployed to `gov.karmahq.xyz`
- Verify DNS records are correct
- Check that frontend-nextjs doesn't have its own redirect back to `karmahq.xyz`

### Issue: Query Parameters Lost

**Symptom:** Query parameters disappear after redirect

**Solution:**
- The middleware already preserves query params via `govUrl.search = request.nextUrl.search`
- Verify this line is present in the middleware

### Issue: Some Frontend Routes Not Redirecting

**Symptom:** A frontend-nextjs route shows 404 on `karmahq.xyz` instead of redirecting

**Solution:**
- Add the missing route pattern to `FRONTEND_NEXTJS_ROUTES` array in middleware.ts
- Redeploy gap-app-v2

### Issue: Gap-app-v2 Route Incorrectly Redirecting

**Symptom:** A gap-app-v2 route redirects when it shouldn't

**Solution:**
- Check if the path pattern is too broad in `FRONTEND_NEXTJS_ROUTES`
- Make path patterns more specific or add exceptions

## Rollback Plan

If issues arise, to rollback:

1. **Immediate Rollback (DNS)**
   - Revert DNS changes to restore original domain mapping
   - This takes 5-60 minutes depending on TTL

2. **Code Rollback**
   - Deploy previous version of gap-app-v2 without redirect logic
   - Revert middleware.ts changes

3. **Full Rollback**
   - Restore DNS configuration
   - Remove redirect logic from middleware
   - Update environment variables back to original state

## Future Maintenance

To add new routes that should redirect to `gov.karmahq.xyz`:

1. Edit `/home/amaury/gap/gap-app-v2/middleware.ts`
2. Add the route pattern to `FRONTEND_NEXTJS_ROUTES` array
3. Deploy gap-app-v2
4. Test the new redirect

## Testing Validation

All redirect logic has been tested with the following scenarios:

✅ DAO routes redirect correctly (`/dao/optimism`, `/dao/optimism/delegators`)
✅ Profile routes redirect correctly (`/profile/0x123`)
✅ Case study routes redirect correctly (`/case-study/gitcoin`)
✅ Static pages redirect correctly (`/daos`, `/gov`, `/actions`)
✅ Integration routes redirect correctly (`/github/linking`)
✅ Gap-app-v2 routes work normally (`/project/123`, `/community/optimism`, `/admin`)
✅ Homepage works normally (`/`)

## Contact

For questions about this migration:
- Review the middleware implementation: `/home/amaury/gap/gap-app-v2/middleware.ts`
- Check this documentation: `/home/amaury/gap/gap-app-v2/docs/DOMAIN_MIGRATION.md`

> **Stale-path note (2026-08):** the paths above are one developer's local checkout, and
> `middleware.ts` no longer exists — the single interception file is `proxy.ts` at the repo
> root (Next 16 recognises `proxy` as an interception filename). The gov redirect logic
> itself is unchanged and still lives in `utilities/redirectHelpers.ts` +
> `utilities/frontendNextjsRoutes.ts`.

---

# 2026-08 — karmahq.xyz → karmahq.org

**Date:** 2026-08 · **Linear:** DEV-617 (epic), DEV-624 (frontend), DEV-628 (docs)
**Runbook (live state, open items, permanent constraints):**
[`docs/runbooks/domain-migration-karmahq-org.md`](runbooks/domain-migration-karmahq-org.md)

The registrable domain changes TLD. The 2025 host topology above is otherwise preserved:
one canonical host serves 200s, everything else collapses onto it.

## Before / after

| | 2025 → 2026-07 | 2026-08 onwards |
|---|---|---|
| Canonical host (serves 200) | `www.karmahq.xyz` | **`www.karmahq.org`** |
| Apex | `karmahq.xyz` → 301/308 to canonical | `karmahq.org` → 308 to canonical |
| Legacy GAP subdomain | `gap.karmahq.xyz` → 308 | unchanged, now targets `.org` |
| Staging | `staging.karmahq.xyz` (200) | **`staging.karmahq.org`** (200) |
| `www.karmahq.xyz` | *was* the canonical | **now a 308 alias** — this is the biggest single change |
| Governance | `gov.karmahq.xyz` / `govstag.karmahq.xyz` | **unchanged, stays `.xyz`** (separate repo) |
| API | `gapapi.karmahq.xyz` / `gapstagapi.karmahq.xyz` | **unchanged, stays `.xyz`** |
| Docs | `docs.gap.karmahq.xyz` | **unchanged, stays `.xyz`** (GitBook) |
| Email — role addresses | `info@` / `support@` / `hello@` / `engineering@karmahq.xyz` | **`@karmahq.org`** — gated on SPF/DKIM/DMARC, see runbook §3 |
| Email — individual mailboxes | `@karmahq.xyz` | **unchanged, stays `.xyz`** (per-user provisioning) |
| Legacy umbrella | `app.` / `testapp.karmahq.xyz` → 301 | unchanged hosts, now 301 to the `.org` canonical in **one** hop |

## Single source of truth

Every karmahq host in this repo now comes from **`utilities/domains.ts`**. It imports
nothing, so it is safe from `proxy.ts` (per-request Node hot path), from build-time
`metadata` evaluation, and from client bundles.

```ts
ROOT_DOMAIN          = "karmahq.org"
LEGACY_ROOT_DOMAINS  = ["karmahq.xyz"]          // permanent — see the warning below
CANONICAL_HOST       = "www.karmahq.org"
CANONICAL_ORIGIN     = "https://www.karmahq.org"
STAGING_HOST/ORIGIN  = "staging.karmahq.org"
GOV_HOST             = "gov.karmahq.xyz"        // not flipping
GOV_STAGING_HOST     = "govstag.karmahq.xyz"    // not flipping
LEGACY_UMBRELLA_HOSTS= { prod: "app.karmahq.xyz", staging: "testapp.karmahq.xyz" }
ALIAS_HOSTS          // 4 hosts that each owe exactly one 308
appOrigin()          // env-aware canonical origin (NEXT_PUBLIC_ENV, read at call time)
bareHostname()       // the ONE normaliser: strips port, lower-cases, drops one trailing DNS dot
isAliasHost()        // bareHostname + membership + the !== CANONICAL_HOST loop guard
canonicalUrl()       // the only way to build a 308 target
```

**Rule: no other file in `gap-app-v2` may contain a literal `karmahq.org` or `karmahq.xyz`**,
except the deliberate exceptions listed under "What stayed `.xyz`" below.

### The one sanctioned second copy: `scripts/indexability/domains.mjs`

The indexability scripts (`scripts/verify-indexability.mjs`,
`scripts/indexability/verify-indexability.mjs`, `scripts/indexability/crawl-sitemap.mjs`)
cannot import `domains.ts`. The `indexability-monitor` workflow runs them as
`node scripts/verify-indexability.mjs` on Node 20 — no TypeScript loader, and
`--experimental-strip-types` did not land until Node 22.6. Their host constants therefore live
in `scripts/indexability/domains.mjs`, and every script imports from there rather than
redeclaring them.

`__tests__/unit/scripts/indexability-domains-parity.test.ts` asserts the two files agree, so
the copy cannot drift. If those scripts ever move onto a TypeScript loader, delete
`domains.mjs` and import `utilities/domains.ts` directly.

`ALIAS_HOSTS` resolves to four members — `karmahq.org`, `karmahq.xyz`,
`www.karmahq.xyz`, `gap.karmahq.xyz`. There is deliberately no `gap.karmahq.org`: `gap.` only
ever existed on the legacy root, so synthesising `gap.${ROOT_DOMAIN}` would claim a host that
does not exist in DNS — and `scripts/indexability/domains.mjs` would then aim the `gap-alias`
check at an NXDOMAIN. It is built by filtering `CANONICAL_HOST` out of the
candidate list, and `domains.ts` **throws at module load** if `CANONICAL_HOST` ever appears in
the set. That assertion is the redirect-loop circuit breaker: nothing in `proxy.ts` compares
the redirect target host to the request host, so a canonical host inside `ALIAS_HOSTS` would
308 to itself forever.

## What changed in code

| Area | Change |
|---|---|
| `proxy.ts` | Local `CANONICAL_ORIGIN` / `ALIAS_HOSTS` / `bareHostname` deleted; imports `appOrigin`, `canonicalUrl`, `isAliasHost`. All three 308 targets build through `canonicalUrl()`. The whitelabel `/blog` 301 and the four legacy-umbrella 301s now target `appOrigin()` directly, **collapsing five pre-existing 301→308 double hops into one hop each**. No status code changed. |
| `src/infrastructure/config/domain-constants.ts` | `DOMAIN_CONFIGS` **gains** `karmahq.org` + `staging.karmahq.org` and **keeps** all four `.xyz` rows (`isSharedDomain()` fails open, so an omission degrades silently). `getDomainInfo()` routes through the shared `bareHostname`. `getDefaultSharedDomain()` returns `ROOT_DOMAIN`. **No `www.*` row** — see deferred work §5. |
| `utilities/meta.ts` | `SITE_URL = CANONICAL_ORIGIN`. Everything derived from it follows automatically: `metadataBase`, OG URLs, `robots.txt` `sitemap:`/`host:`, all eight `.well-known` routes, both sitemap generators, and every JSON-LD emitter. |
| `utilities/getBaseUrl.ts`, `utilities/enviromentVars.ts`, `hooks/useInviteLink.ts` | All now `appOrigin()`. `envVars.VERCEL_URL` was **renamed to `envVars.APP_ORIGIN`** — it never read `process.env.VERCEL_URL`; the name was a lie. |
| `utilities/redirectHelpers.ts` | Gov hosts come from `GOV_HOST` / `GOV_STAGING_HOST`. Values and the 308 status are unchanged. |
| `next.config.ts` | CSP `frame-src` **adds** `https://privy.karmahq.org` **alongside** `https://privy.karmahq.xyz`. Nothing removed. The 12 `redirects()` entries are path-only and needed no edit. |
| Content, components, SEO scripts | ~60 files repointed at `SITE_URL` / `CANONICAL_ORIGIN` / `CANONICAL_HOST` / `ROOT_DOMAIN` / `appOrigin()`. |

## Bugs fixed on the way

- **Staging emitted production invite links.** `useInviteLink.ts` compared
  `NEXT_PUBLIC_ENV === "dev"` while the rest of the app uses `"staging"` / `"production"`, so
  `isDev` was false on staging.
- **Five 301→308 double hops** in the whitelabel `/blog` and legacy-umbrella branches, now one
  hop each.
- **OG image routes self-fetched through a redirect.** `app/api/metadata/{projects,communities}`
  loaded their own icons/background/logo from the hardcoded **apex**; now `SITE_URL`.
- **Three normalisers, two incomplete.** `proxy.ts`, `whitelabel-config.ts` and
  `domain-constants.ts` each normalised hostnames differently; only `proxy.ts` dropped the
  trailing DNS dot. All three now route through `bareHostname`.
- **Four disagreeing app-origin sources** (`SITE_URL` and `proxy.ts` said `www`;
  `envVars.VERCEL_URL`, `getBaseUrl()`, `getDefaultSharedDomain()`, `useInviteUrl` and
  `SOCIALS.WEBSITE` said apex; one admin preview fell back to `gap.karmahq.xyz`). One source now.

## What stayed `.xyz` — and why

| Kept | Reason |
|---|---|
| `gapapi.karmahq.xyz` / `gapstagapi.karmahq.xyz` | Moving them rotates the MCP OAuth audience, which is verified by **scalar exact-string equality** — every live MCP access token would be invalidated instantly. Needs byte-exact coordination with `karma-oauth`, a service outside this tree. |
| `gov.karmahq.xyz` / `govstag.karmahq.xyz` | Separate repository, separate schedule. |
| `docs.gap.karmahq.xyz` / `docs.karmahq.xyz` | Externally hosted on GitBook. |
| `privy.karmahq.xyz` | Privy custom auth domain. `privy.karmahq.org` was **added** to the CSP alongside it, never substituted — a CSP violation blanks the login iframe with **no catchable JS error**. |
| `api.karmahq.xyz`, `anon.karmahq.xyz`, `gap-api.karmahq.xyz` | Not served by any repo in this tree; ownership unverified. |
| Individual `@karmahq.xyz` mailboxes and every email test fixture | Per-user provisioning, not just domain records. Role addresses (`info@`, `support@`, `hello@`, `engineering@`) **did** flip — that flip is gated on MX/SPF/DKIM/DMARC existing for `karmahq.org`. As of 2026-08-17 SPF, DMARC and MX are **verified absent** (no apex `TXT`, `_dmarc` NXDOMAIN, no `MX`); DKIM is `UNVERIFIED` because no provider selector has been chosen to query. Shipping a `.org` `From` header first **silently degrades deliverability** — no error, no bounce we can see. Runbook §3. |
| Security negative-test fixtures | Assertions such as `https://fakekarmahq.xyz → false` and `https://karmahq.xyz.evil.com → false` prove the anchoring of the origin regexes. They were **duplicated** for `.org`, never replaced — replacing them preserves the assertion text while destroying the coverage. |

## ⚠️ karmahq.xyz must be renewed indefinitely and never sunset

Immutable on-chain EAS attestation payloads embed `karmahq.xyz` URLs, and the indexer
re-derives those payloads from chain on every re-index. They cannot be rewritten.

`ALIAS_HOSTS` is the only mechanism keeping those immutably-published URLs resolvable.
**Any future ticket proposing removal of `karmahq.xyz` or `www.karmahq.xyz` from
`LEGACY_ROOT_DOMAINS` / `ALIAS_HOSTS` is wrong by construction.** The registration is a
permanent operating cost.

## Known operational facts (re-measured 2026-08-17 — post-cutover)

- ~~`karmahq.org` is parked at Namecheap and not attached to Vercel; `staging.karmahq.org` does
  not resolve.~~ **Resolved.** The zone is now Route 53, `www.karmahq.org` serves 200 as the
  canonical host, and `staging.karmahq.org` serves 200 with `robots.txt` = `Disallow: /`.
  The `indexability-monitor` passes all 16 domain-topology checks; it is red only on three
  unrelated `banned-slug` junk projects. Full table in runbook §1 and §6.
- **The `.xyz` apex is not served by this app.** `https://karmahq.xyz/` is answered by an
  S3 bucket behind CloudFront that 301s to `www` — the request never reaches `proxy.ts`, so
  the `karmahq.xyz` entry in `ALIAS_HOSTS` has never executed in production. It also emits
  `https://www.karmahq.xyz//` (double slash) for the bare root. Decide during DEV-618 whether
  to retire that bucket and point the apex at Vercel.
- Verified live host table, the apex fix, the email prerequisites, the analytics/Search Console
  checklist and the monitoring status are in
  [`docs/runbooks/domain-migration-karmahq-org.md`](runbooks/domain-migration-karmahq-org.md).
