import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
    const { communitySlug, tenantId } = whitelabel;
    const isRoot = path === "/" || path === "";

    // Rewrite ALL paths — prepend /community/<slug>
    const rewrittenPath = isRoot
      ? `/community/${communitySlug}`
      : `/community/${communitySlug}${path}`;

    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-is-whitelabel", "true");
    requestHeaders.set("x-community-slug", communitySlug);
    requestHeaders.set("x-tenant-id", tenantId || communitySlug);

    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
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
