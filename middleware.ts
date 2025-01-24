import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { chosenCommunities } from "./utilities/chosenCommunities";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const communityMatch = path.match(/^\/([^\/]+)(?:\/.*)?$/);

  if (communityMatch) {
    const communityId = communityMatch[1];
    const communities = chosenCommunities();
    const isChosenCommunity = communities.some(
      (community) =>
        community.slug === communityId ||
        community.uid.toLowerCase() === communityId.toLowerCase()
    );

    if (isChosenCommunity && !path.startsWith("/community/")) {
      const newPath = path.replace(/^\/([^\/]+)/, "/community/$1");
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
