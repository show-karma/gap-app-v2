import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { chosenCommunities } from "./utilities/chosenCommunities";
import type { Community } from "@show-karma/karma-gap-sdk";
import { envVars } from "./utilities/enviromentVars";

export async function middleware(request: NextRequest) {
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
      if (isChosenCommunity) {
        const newPath = path.replace(/^\/([^\/]+)/, "/community/$1");
        return NextResponse.redirect(new URL(newPath, request.url));
      }
      const communitiesFetched = await fetch(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/communities`
      );
      const communitiesJson: Community[] = await communitiesFetched.json();
      const communitiesArray = communitiesJson.map((community) => ({
        uid: community.uid,
        slug: community.details?.data?.slug,
      }));

      const findCommunity = communitiesArray.find(
        (community) =>
          community.uid.toLowerCase() === communityId.toLowerCase() ||
          community.slug === communityId
      );

      if (findCommunity) {
        const newPath = path.replace(/^\/([^\/]+)/, "/community/$1");
        return NextResponse.redirect(new URL(newPath, request.url));
      }
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
