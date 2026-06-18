import type { NextResponse } from "next/server";
import { sitemapIndexResponse } from "@/utilities/sitemap";

// `/sitemap.xml` is a reserved Next metadata path, so without this it gets
// statically prerendered at build time — which calls the indexer during the
// build (reintroducing build coupling) and bakes a failed response if the
// indexer is down. Force dynamic so the route is only ever rendered on demand;
// the indexer fetch is still cached via the Data Cache (see fetchSitemapCounts).
export const dynamic = "force-dynamic";
// Headroom for the cold counts fetch so the index itself never 504s.
export const maxDuration = 60;

// Legacy alias of the index. robots.txt now advertises /sitemap_index.xml
// instead (see that route for why); this URL keeps serving identical content
// because crawlers probe /sitemap.xml by convention.
export async function GET(): Promise<NextResponse> {
  return sitemapIndexResponse();
}
