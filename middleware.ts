import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDomainInfo } from "./src/infrastructure/config/domain-constants";
import { isKnownTenant } from "./src/infrastructure/types/tenant";
import { chosenCommunities } from "./utilities/chosenCommunities";
import { COMMUNITY_SUB_ROUTE_SEGMENTS } from "./utilities/pages";
import { redirectToGov, shouldRedirectToGov } from "./utilities/redirectHelpers";
import { hasForbiddenChars, sanitizeCommunitySlug } from "./utilities/sanitize";
import { getWhitelabelByDomain, getWhitelabelDomainForSlug } from "./utilities/whitelabel-config";

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

  // --- Standard karmahq.xyz logic below ---

  // Redirect frontend-nextjs routes to gov.karmahq.xyz
  if (shouldRedirectToGov(path)) {
    return redirectToGov(request);
  }

  // Dashboard redirects
  if (path === "/my-projects") {
    return NextResponse.redirect(new URL("/dashboard#projects", request.url), 301);
  }
  if (path === "/my-reviews") {
    return NextResponse.redirect(new URL("/dashboard#reviews", request.url), 301);
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

  if (path.startsWith("/project/")) {
    // Check if the path contains /grants and redirect to /funding
    if (path.includes("/grants") && !path.includes("/project/grants")) {
      const newPath = path.replace("/grants", "/funding");
      return NextResponse.redirect(new URL(newPath, request.url));
    }
    if (path.includes("/funding/create-grant")) {
      const newPath = path.replace("/funding/create-grant", "/funding/new");
      return NextResponse.redirect(new URL(newPath, request.url));
    }
    if (path.includes("/roadmap") && !path.includes("/project/roadmap")) {
      const newPath = path.replace("/roadmap", "/updates");
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  return NextResponse.next();
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
