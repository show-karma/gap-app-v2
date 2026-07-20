import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDomainInfo } from "./src/infrastructure/config/domain-constants";
import { isKnownTenant } from "./src/infrastructure/types/tenant";
import { chosenCommunities } from "./utilities/chosenCommunities";
import { COMMUNITY_SUB_ROUTE_SEGMENTS } from "./utilities/pages";
import {
  classifyProjectQuery,
  parseProjectIndexabilityRequest,
} from "./utilities/project-indexability";
import { fetchProjectIndexabilityDecision } from "./utilities/project-indexability-client";
import { redirectToGov, shouldRedirectToGov } from "./utilities/redirectHelpers";
import { hasForbiddenChars, sanitizeCommunitySlug } from "./utilities/sanitize";
import { getWhitelabelByDomain, getWhitelabelDomainForSlug } from "./utilities/whitelabel-config";

// --- Canonical host policy (ADR 0001) ---
// www.karmahq.xyz is the single canonical serving host. The production apex
// (karmahq.xyz) and the legacy GAP subdomain (gap.karmahq.xyz) are duplicate
// hosts; every request on them collapses to www in a single 308 so Google
// consolidates ranking signals onto one host instead of indexing three.
const CANONICAL_ORIGIN = "https://www.karmahq.xyz";
const ALIAS_HOSTS = new Set(["karmahq.xyz", "gap.karmahq.xyz"]);
const NOINDEX_FOLLOW = "noindex, follow";

function bareHostname(hostname: string): string {
  // Strip the port and lower-case, then drop a single trailing DNS dot:
  // `karmahq.xyz.` is the fully-qualified form of the same host and must still
  // match ALIAS_HOSTS, otherwise it would bypass the canonical redirect.
  return hostname.split(":")[0].toLowerCase().replace(/\.$/, "");
}

function withRobots(response: Response, value: string): Response {
  response.headers.set("X-Robots-Tag", value);
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Whitelabel domain handling (must run before all other logic) ---
  const hostname = request.headers.get("host") || "";
  const whitelabel = getWhitelabelByDomain(hostname);

  if (whitelabel) {
    // Skip static asset paths that live in /public subdirectories.
    // The middleware matcher already excludes root-level files (e.g. /favicon.ico)
    // and /_next, but not subdirectory assets like /images/, /logo/, /tenants/.
    if (/^\/(images|logo|tenants|icons|shared|fonts)\//i.test(path)) {
      return NextResponse.next();
    }

    const { communitySlug, tenantId } = whitelabel;

    // In whitelabel mode, URLs should never show /community/<slug> in the browser.
    // If a component generates an href like `/community/optimism/programs/123`,
    // redirect to the clean path `/programs/123` so the browser URL stays clean.
    const communityPrefix = `/community/${communitySlug}`;
    if (path.startsWith(communityPrefix)) {
      const cleanPath = path.slice(communityPrefix.length) || "/";
      const url = request.nextUrl.clone();
      url.pathname = cleanPath;
      return NextResponse.redirect(url);
    }

    const normalizedPath = path;
    const normalizedIsRoot = normalizedPath === "/" || normalizedPath === "";

    // /programs (listing) → homepage (which shows funding opportunities)
    // But allow /programs/<id> through so detail pages work.
    if (normalizedPath === "/programs") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // /applications → /dashboard
    if (normalizedPath === "/applications" || normalizedPath === "/my-applications") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Paths that exist under /community/[communityId]/ and should be rewritten.
    // All other paths (e.g. /project/..., /funding-map, /donations) are top-level
    // routes — pass them through with whitelabel headers but no rewrite.
    const firstSegment = normalizedPath.split("/")[1] || "";
    const isCommunityRoute = normalizedIsRoot || COMMUNITY_SUB_ROUTE_SEGMENTS.has(firstSegment);

    if (!isCommunityRoute) {
      // Top-level route — pass through with whitelabel headers, no rewrite.
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-is-whitelabel", "true");
      requestHeaders.set("x-community-slug", communitySlug);
      requestHeaders.set("x-tenant-id", tenantId || communitySlug);
      requestHeaders.set("x-whitelabel-domain", whitelabel.domain);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Rewrite community sub-routes — prepend /community/<slug>
    const rewrittenPath = normalizedIsRoot
      ? `/community/${communitySlug}/funding-opportunities`
      : `/community/${communitySlug}${normalizedPath}`;

    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-is-whitelabel", "true");
    requestHeaders.set("x-community-slug", communitySlug);
    requestHeaders.set("x-tenant-id", tenantId || communitySlug);
    requestHeaders.set("x-whitelabel-domain", whitelabel.domain);

    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  // --- Legacy umbrella domain redirect (app.karmahq.xyz/<slug>/...) ---
  // These domains previously served all tenants via URL path prefixes.
  // Now redirect to the tenant's whitelabel domain or the main site.
  const domainInfo = getDomainInfo(hostname);
  if (domainInfo?.isLegacyUmbrella) {
    const segments = path.split("/").filter(Boolean);
    const slug = segments[0];

    const mainDomain = domainInfo.isProduction ? "karmahq.xyz" : "staging.karmahq.xyz";
    const protocol = request.nextUrl.protocol;

    // Path already starts with /community/ — redirect as-is to the main domain
    if (slug === "community") {
      return NextResponse.redirect(new URL(`${protocol}//${mainDomain}${path}`), 301);
    }

    if (slug && isKnownTenant(slug)) {
      const whitelabelDomain = getWhitelabelDomainForSlug(slug, domainInfo.isProduction);
      const restPath = `/${segments.slice(1).join("/")}` || "/";

      if (whitelabelDomain) {
        // Tenant has a whitelabel domain — redirect there
        return NextResponse.redirect(new URL(`${protocol}//${whitelabelDomain}${restPath}`), 301);
      }

      // No whitelabel domain — redirect to main site at /community/<slug>/path
      return NextResponse.redirect(
        new URL(`${protocol}//${mainDomain}/community/${slug}${restPath}`),
        301
      );
    }

    if (slug) {
      // Unknown slug — treat as community slug and redirect to /community/<slug>/path
      const restPath = `/${segments.slice(1).join("/")}` || "/";
      return NextResponse.redirect(
        new URL(`${protocol}//${mainDomain}/community/${slug}${restPath}`),
        301
      );
    }

    // No slug (root path) — redirect to main site homepage
    return NextResponse.redirect(new URL(`${protocol}//${mainDomain}${path}`), 301);
  }

  // --- Canonical host policy: collapse alias hosts to www (ADR 0001) ---
  const isAliasHost = ALIAS_HOSTS.has(bareHostname(hostname));

  // Non-project alias requests take one permanent hop to the canonical host,
  // preserving the exact path and query — no indexer round-trip needed. Project
  // requests fall through to the shared handler below so the alias-host switch
  // and any legacy/identifier normalization collapse into a single 308.
  if (isAliasHost && !path.startsWith("/project/")) {
    return NextResponse.redirect(
      new URL(`${CANONICAL_ORIGIN}${path}${request.nextUrl.search}`),
      308
    );
  }

  // --- Standard karmahq.xyz logic below ---

  // Redirect frontend-nextjs routes to gov.karmahq.xyz
  if (shouldRedirectToGov(path)) {
    return redirectToGov(request);
  }

  // Dashboard redirects — the drill-ins are real nested routes now
  // (/dashboard/[module]), not a #hash on the overview.
  if (path === "/my-projects") {
    return NextResponse.redirect(new URL("/dashboard/projects", request.url), 301);
  }
  if (path === "/my-reviews") {
    return NextResponse.redirect(new URL("/dashboard/reviews", request.url), 301);
  }

  // Handle community slugs with forbidden characters
  const communityPathMatch = path.match(/^\/community\/([^/]+)(\/.*)?$/);
  if (communityPathMatch) {
    const communitySlug = communityPathMatch[1];
    const restOfPath = communityPathMatch[2] || "";

    if (hasForbiddenChars(communitySlug)) {
      const cleanSlug = sanitizeCommunitySlug(communitySlug);
      const newPath = `/community/${cleanSlug}${restOfPath}`;
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  // --- Redirect /<slug> to whitelabel domain if one exists ---
  // e.g. karmahq.xyz/optimism → app.opgrants.io
  const communityMatch = path.match(/^\/([^/]+)(\/.*)?$/);

  if (communityMatch) {
    const communityId = communityMatch[1];
    const restOfCommunityPath = communityMatch[2] || "/";

    // Check if this slug has a whitelabel domain and redirect there
    if (domainInfo?.isShared && isKnownTenant(communityId)) {
      const whitelabelDomain = getWhitelabelDomainForSlug(communityId, domainInfo.isProduction);
      if (whitelabelDomain) {
        const protocol = request.nextUrl.protocol;
        return NextResponse.redirect(
          new URL(`${protocol}//${whitelabelDomain}${restOfCommunityPath}`),
          301
        );
      }
    }

    // No whitelabel — fall back to /community/<slug> rewrite for chosen communities
    const communities = chosenCommunities();
    const isChosenCommunity = communities.some(
      (community) =>
        community.slug === communityId || community.uid.toLowerCase() === communityId.toLowerCase()
    );
    if (isChosenCommunity && !path.startsWith("/community/")) {
      const newPath = path.replace(/^\/([^/]+)/, "/community/$1");
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  // The explorer listing at exactly /projects (or /projects/) is a static route
  // — no indexer lookup. A stateful query (filters/pagination) is a duplicate of
  // the clean listing, so mark it noindex,follow; clean or tracking-only stays
  // indexable. Alias hosts already 308'd above, so this only runs on www.
  if (path === "/projects" || path === "/projects/") {
    const response = NextResponse.next();
    return classifyProjectQuery(request.nextUrl.searchParams) === "stateful"
      ? withRobots(response, NOINDEX_FOLLOW)
      : response;
  }

  if (path.startsWith("/project/")) {
    return handleProjectIndexability(request, path, isAliasHost);
  }

  return NextResponse.next();
}

/**
 * Resolve the canonical indexability outcome for a `/project/...` request and
 * turn it into a single response (ADR 0001). The authoritative decision comes
 * from the indexer; this collapses the alias-host switch, legacy segment
 * normalization (grants → funding, create-grant → new), roadmap collapse, and
 * old-identifier redirects into exactly one 308 hop when the request is not
 * already at its canonical www URL. Any decision failure fails closed to
 * noindex,follow via the client.
 */
async function handleProjectIndexability(
  request: NextRequest,
  path: string,
  isAliasHost: boolean
): Promise<Response> {
  const parsed = parseProjectIndexabilityRequest(path);

  // Unknown project route — we cannot build a trusted indexer query for a route
  // we do not recognize, so never fetch. On an alias host we still owe the
  // caller the canonical-host hop (one 308 to www, preserving path + query); on
  // the canonical host we fail closed to noindex,follow.
  if (!parsed) {
    if (isAliasHost) {
      return NextResponse.redirect(
        new URL(`${CANONICAL_ORIGIN}${path}${request.nextUrl.search}`),
        308
      );
    }
    return withRobots(NextResponse.next(), NOINDEX_FOLLOW);
  }

  const isStatefulQuery = classifyProjectQuery(request.nextUrl.searchParams) === "stateful";

  const decision = await fetchProjectIndexabilityDecision(parsed, {
    // Read process.env at request time so tests can stub the base URL.
    baseUrl: process.env.NEXT_PUBLIC_GAP_INDEXER_URL ?? "",
  });

  // The final canonical path is the redirect target when the indexer relocates
  // the route, otherwise the normalized path parsed from the request. A gone
  // route has no relocation target, so it keeps its normalized path and the
  // canonical host answers the 404/410.
  const finalPath = decision.outcome === "redirect" ? decision.to : parsed.normalizedPath;

  // Alias hosts (karmahq.xyz / gap.karmahq.xyz) owe exactly ONE 308 to the
  // canonical www host for EVERY request — including gone routes. Answering the
  // 404/410 directly here would strand the response on a duplicate host, so we
  // always hop to www first (folding any normalization/relocation into the same
  // hop, preserving the query) and let the canonical host re-evaluate and return
  // the 404/410. This must run before the gone short-circuit below.
  if (isAliasHost) {
    return NextResponse.redirect(
      new URL(`${CANONICAL_ORIGIN}${finalPath}${request.nextUrl.search}`),
      308
    );
  }

  // Canonical / non-alias host (Vercel preview, staging, localhost, www) below.
  // Gone routes answer with their exact status and a noindex header — no hop.
  if (decision.outcome === "gone") {
    return withRobots(new NextResponse(null, { status: decision.status }), NOINDEX_FOLLOW);
  }

  // Not already at the canonical path (legacy/identifier drift or an indexer
  // relocation) — one 308 on the request's own origin so a preview/staging
  // normalization never emits a link to production. Query is preserved.
  if (finalPath !== path) {
    return NextResponse.redirect(
      new URL(`${finalPath}${request.nextUrl.search}`, request.url),
      308
    );
  }

  // Already canonical: pass through. A noindex-follow decision or any stateful
  // query suppresses indexing; canonical-indexable / duplicate-alias with a
  // clean or tracking-only query stay indexable.
  const shouldNoindex = decision.outcome === "noindex-follow" || isStatefulQuery;
  const response = NextResponse.next();
  return shouldNoindex ? withRobots(response, NOINDEX_FOLLOW) : response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};
