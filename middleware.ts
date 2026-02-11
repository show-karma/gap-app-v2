import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { chosenCommunities } from "./utilities/chosenCommunities";
import { redirectToGov, shouldRedirectToGov } from "./utilities/redirectHelpers";
import { hasForbiddenChars, sanitizeCommunitySlug } from "./utilities/sanitize";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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
