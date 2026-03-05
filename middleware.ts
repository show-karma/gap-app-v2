import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isUmbrellaDomain } from "./src/infrastructure/config/domain-constants";
import { isKnownTenant } from "./src/infrastructure/types/tenant";
import { chosenCommunities } from "./utilities/chosenCommunities";
import { redirectToGov, shouldRedirectToGov } from "./utilities/redirectHelpers";
import { hasForbiddenChars, sanitizeCommunitySlug } from "./utilities/sanitize";
import { getWhitelabelByDomain } from "./utilities/whitelabel-config";

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

    // /programs → homepage (already shows funding opportunities)
    if (normalizedPath.startsWith("/programs")) {
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
    const communitySubRoutes = new Set([
      "admin",
      "applications",
      "browse-applications",
      "claim-funds",
      "donate",
      "financials",
      "funding-opportunities",
      "impact",
      "karma-ai",
      "manage",
      "updates",
    ]);

    const firstSegment = normalizedPath.split("/")[1] || "";
    const isCommunityRoute = normalizedIsRoot || communitySubRoutes.has(firstSegment);

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

  // --- Umbrella whitelabel (app.karmahq.xyz/<slug>) ---
  if (isUmbrellaDomain(hostname)) {
    const segments = path.split("/").filter(Boolean);
    const slug = segments[0];

    if (!slug) {
      return NextResponse.redirect(new URL("/funding-map", request.url));
    }

    if (isKnownTenant(slug)) {
      const effectivePath = "/" + segments.slice(1).join("/") || "/";
      const slugPrefix = `/${slug}`;

      // Skip static assets under /<slug>/images/...
      if (/^\/(images|logo|tenants|icons|shared|fonts)\//i.test(effectivePath)) {
        return NextResponse.next();
      }

      // Strip /community/<slug> prefix: /<slug>/community/<slug>/x → /<slug>/x
      const communityPrefix = `/community/${slug}`;
      if (effectivePath.startsWith(communityPrefix)) {
        const cleanPath = effectivePath.slice(communityPrefix.length) || "/";
        const url = request.nextUrl.clone();
        url.pathname = `${slugPrefix}${cleanPath}`;
        return NextResponse.redirect(url);
      }

      // Redirect /programs to tenant root
      if (effectivePath.startsWith("/programs")) {
        const url = request.nextUrl.clone();
        url.pathname = slugPrefix;
        return NextResponse.redirect(url);
      }

      // /<slug>/applications or /<slug>/my-applications → /<slug>/dashboard
      if (effectivePath === "/applications" || effectivePath === "/my-applications") {
        const url = request.nextUrl.clone();
        url.pathname = `${slugPrefix}/dashboard`;
        return NextResponse.redirect(url);
      }

      // Check if community sub-route
      const communitySubRoutes = new Set([
        "admin",
        "applications",
        "browse-applications",
        "claim-funds",
        "donate",
        "financials",
        "funding-opportunities",
        "impact",
        "karma-ai",
        "manage",
        "updates",
      ]);

      const firstSegment = effectivePath.split("/")[1] || "";
      const effectiveIsRoot = effectivePath === "/" || effectivePath === "";
      const isCommunityRoute = effectiveIsRoot || communitySubRoutes.has(firstSegment);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-is-whitelabel", "true");
      requestHeaders.set("x-is-umbrella", "true");
      requestHeaders.set("x-community-slug", slug);
      requestHeaders.set("x-tenant-id", slug);
      requestHeaders.set("x-whitelabel-domain", hostname);

      if (!isCommunityRoute) {
        // Top-level route (e.g., /<slug>/dashboard, /<slug>/project/abc)
        const url = request.nextUrl.clone();
        url.pathname = effectivePath;
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      }

      // Community sub-route → rewrite to /community/<slug>/<route>
      const rewrittenPath = effectiveIsRoot
        ? `/community/${slug}/funding-opportunities`
        : `/community/${slug}${effectivePath}`;
      const url = request.nextUrl.clone();
      url.pathname = rewrittenPath;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // Not a known tenant — fall through to standard logic
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

  const communityMatch = path.match(/^\/([^/]+)(?:\/.*)?$/);

  if (communityMatch) {
    const communityId = communityMatch[1];
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
