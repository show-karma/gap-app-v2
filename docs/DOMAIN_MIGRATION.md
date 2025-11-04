# Domain Migration Strategy

## Overview

This document describes the domain migration strategy implemented to transition from the current domain structure to a new one, with automatic redirects to maintain backwards compatibility.

## Current State (Before Migration)

- `karmahq.xyz` → `frontend-nextjs` project (governance/DAO features)
- `gap.karmahq.xyz` → `gap-app-v2` project (grants accountability protocol)

## Target State (After Migration)

- `karmahq.xyz` → `gap-app-v2` project (main domain for GAP)
- `gov.karmahq.xyz` → `frontend-nextjs` project (governance subdomain)

## Implementation Details

### File Structure

The redirect implementation is organized across three files:

- **`middleware.ts`** - Main middleware entry point (clean and minimal)
- **`utilities/frontendNextjsRoutes.ts`** - Route configuration list
- **`utilities/redirectHelpers.ts`** - Redirect logic and helper functions

### Redirect Logic

The redirect logic is implemented in the middleware and utilities. When a request comes to `karmahq.xyz`, the middleware:

1. Checks if the path matches any route from the old frontend-nextjs application
2. If matched, issues a 308 Permanent Redirect to `gov.karmahq.xyz` with the same path
3. If not matched, allows gap-app-v2 to handle the request normally

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
  govUrl.hostname = "gov.karmahq.xyz";
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

1. **DNS Configuration**
   - [ ] Update `karmahq.xyz` DNS to point to gap-app-v2 deployment
   - [ ] Create `gov.karmahq.xyz` DNS entry pointing to frontend-nextjs deployment
   - [ ] Verify SSL certificates for both domains

2. **Application Configuration**
   - [ ] Update frontend-nextjs environment variables to use `gov.karmahq.xyz`
   - [ ] Update gap-app-v2 environment variables to use `karmahq.xyz`
   - [ ] Update any hardcoded domain references in both applications
   - [ ] Update API endpoint configurations

3. **Testing**
   - [ ] Test all redirect paths work correctly
   - [ ] Verify query parameters are preserved
   - [ ] Test gap-app-v2 routes work normally on `karmahq.xyz`
   - [ ] Verify no redirect loops
   - [ ] Test mobile and desktop views

4. **Monitoring**
   - [ ] Monitor 4xx and 5xx error rates after deployment
   - [ ] Track redirect performance metrics
   - [ ] Monitor user feedback channels
   - [ ] Set up alerts for increased error rates

5. **SEO Considerations**
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
