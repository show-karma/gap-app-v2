import { connection, type NextResponse } from "next/server";
import { sitemapIndexResponse } from "@/utilities/sitemap";

// Never prerender at build time — render on demand only. The indexer fetch is
// still cached via the Data Cache (see fetchSitemapCounts).
// Headroom for the cold counts fetch so the index itself never 504s.
export const maxDuration = 60;

// Legacy index URL. Google's stored state for it is stuck on a degraded May
// 2026 parse, so robots.txt now advertises /sitemap_index.xml instead (see
// that route for the full story). Kept serving so existing submissions and
// external references never break.
export async function GET(): Promise<NextResponse> {
  // Runtime-only. Replaces `export const dynamic = "force-dynamic"`, which
  // cacheComponents rejects — and simply dropping that export is NOT
  // equivalent: verified on a production build the route flips to `○`
  // (statically prerendered), baking the response at build time.
  await connection();

  return sitemapIndexResponse();
}
